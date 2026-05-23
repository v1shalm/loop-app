-- 0015 — Manual task ordering
--
-- Adds a per-task sort_order so users can drag tasks into the position
-- they want. Falls back to created_at when sort_order is null so existing
-- rows keep their current implicit order until the first reorder.
--
-- Convention: sort_order DESC means top-of-list. We initialise existing
-- tasks with epoch-ms of created_at so newer tasks naturally sit higher
-- and the values are sparse enough that reorder writes only touch the
-- handful of rows that actually moved.

alter table public.tasks
  add column if not exists sort_order bigint;

update public.tasks
   set sort_order = (extract(epoch from created_at) * 1000)::bigint
 where sort_order is null;

create index if not exists tasks_sort_order_idx
  on public.tasks (sort_order desc);
