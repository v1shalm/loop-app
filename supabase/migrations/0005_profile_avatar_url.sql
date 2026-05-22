-- ─────────────────────────────────────────────────────────────────────────────
-- 0005 — Google profile picture support
-- Adds avatar_url to profiles, backfills from auth.users, and updates the
-- handle_new_user trigger to capture it for every new signup.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists avatar_url text;

-- Backfill existing rows. Google sends the picture under avatar_url; some
-- providers use 'picture' instead.
update public.profiles p
set avatar_url = coalesce(
  u.raw_user_meta_data->>'avatar_url',
  u.raw_user_meta_data->>'picture'
)
from auth.users u
where u.id = p.id
  and p.avatar_url is null;

-- Replace the trigger so future signups capture the avatar + a fuller name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  display_name text;
  init_char    text;
  picture      text;
  ws_id        uuid := '00000000-0000-0000-0000-000000000001';
  palette      text[] := array[
    '#E8B4A0', '#B4D4E8', '#C4E8B4', '#E8D4B4',
    '#D4B4E8', '#E8C4B4', '#B4E8D4', '#E8E0B4'
  ];
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  init_char := upper(substring(display_name from 1 for 1));
  picture := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (id, name, initials, avatar_color, avatar_url)
  values (
    new.id,
    display_name,
    init_char,
    palette[1 + (abs(hashtext(new.id::text)) % array_length(palette, 1))],
    picture
  )
  on conflict (id) do nothing;

  -- Auto-join the default workspace if it exists.
  if exists (select 1 from public.workspaces where id = ws_id) then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'member')
    on conflict do nothing;
  end if;

  return new;
end;
$$;
