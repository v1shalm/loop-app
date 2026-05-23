-- Free-form description on projects, surfaced as the body text on the
-- /projects index cards and editable in-place on the project detail page.
alter table public.projects
  add column if not exists description text;
