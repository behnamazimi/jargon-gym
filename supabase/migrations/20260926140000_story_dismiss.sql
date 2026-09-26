-- A story the user closed without marking it read. Only the newest unread,
-- undismissed story is offered as the current one, so older abandoned pieces
-- never come back.
alter table public.stories add column dismissed_at timestamptz;

-- Keep only each user's newest unread story current.
update public.stories s
set dismissed_at = now()
where s.read_at is null
  and exists (
    select 1
    from public.stories newer
    where newer.user_id = s.user_id
      and newer.read_at is null
      and newer.created_at > s.created_at
  );

create index stories_user_current_idx
  on public.stories (user_id, created_at desc)
  where read_at is null and dismissed_at is null;
