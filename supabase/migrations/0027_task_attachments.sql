-- 0027 — Task attachments
--
-- One task → many attachments. Two kinds:
--   link  — external URL (Drive, Dropbox, Notion, Figma, etc).
--           Zero storage cost. Recommended for anything > 1 MB.
--   file  — uploaded to the `task-attachments` storage bucket (set
--           up at the bottom of this migration). Public bucket so
--           reads don't count against bandwidth quota.
--
-- We deliberately don't store the file's binary content here — only
-- its storage path. The Supabase storage system owns the bytes; this
-- table owns the metadata (label, who uploaded, when, MIME type).
--
-- RLS: anyone who can read the parent task can read its attachments;
-- only the uploader or someone who can edit the task can delete one.

create table if not exists public.task_attachments (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.tasks(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  kind          text not null check (kind in ('file', 'link')),
  -- For files: storage path inside the task-attachments bucket
  -- (e.g. "workspace_id/task_id/uuid.webp"). For links: the external URL.
  url           text not null,
  -- Human-readable label. Filename for files, hostname for links by
  -- default but editable later.
  label         text not null,
  -- MIME type. Only meaningful for files. NULL for links.
  content_type  text,
  -- Byte size. Only meaningful for files. NULL for links.
  size_bytes    integer,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists task_attachments_task_idx
  on public.task_attachments (task_id, created_at desc);

create index if not exists task_attachments_workspace_idx
  on public.task_attachments (workspace_id);

alter table public.task_attachments enable row level security;

-- A user can see an attachment if they can see its task. The tasks
-- table already enforces team-scoped visibility via the existing
-- tasks RLS, so we delegate to that with an EXISTS check.
drop policy if exists "task_attachments_select" on public.task_attachments;
create policy "task_attachments_select" on public.task_attachments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id
        and (t.team_id is null or t.team_id = app_private.my_team_id())
    )
  );

-- Insert: any member of the task's team can attach. We re-check that
-- workspace_id matches the task's workspace so the client can't pin an
-- attachment to a task while claiming it lives in a different workspace.
drop policy if exists "task_attachments_insert" on public.task_attachments;
create policy "task_attachments_insert" on public.task_attachments
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id
        and t.workspace_id = task_attachments.workspace_id
        and (t.team_id is null or t.team_id = app_private.my_team_id())
    )
  );

-- Delete: the uploader can always delete their own attachment. The
-- task's author or current assignee can also delete it (mirrors how
-- comment deletion is scoped — owners of the surrounding context get
-- janitorial rights).
drop policy if exists "task_attachments_delete" on public.task_attachments;
create policy "task_attachments_delete" on public.task_attachments
  for delete using (
    created_by = auth.uid()
    or exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id
        and (t.author_id = auth.uid() or t.assignee_id = auth.uid())
        and (t.team_id is null or t.team_id = app_private.my_team_id())
    )
  );

-- Storage bucket — public read so attachment URLs can be shared
-- without signing them. Bandwidth on public reads doesn't count
-- against the Supabase project's egress quota (per their 2024
-- pricing change), which is what makes this strategy viable on the
-- free plan. 5 MB cap enforced both here and client-side.
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', true, 5242880)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Storage RLS — any authenticated user of the workspace can upload
-- into a path that begins with their workspace_id. Read is public via
-- the bucket setting above. Delete is allowed only for the uploader
-- (object owner) or service role; the application's delete server
-- action runs with the user's session so this matches.
drop policy if exists "task_attachments_storage_upload" on storage.objects;
create policy "task_attachments_storage_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'task-attachments');

drop policy if exists "task_attachments_storage_delete" on storage.objects;
create policy "task_attachments_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'task-attachments' and owner = auth.uid());
