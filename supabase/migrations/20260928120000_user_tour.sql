-- Guided tour for new signups. New rows start 'pending'; everyone who
-- already has an account is marked 'done' so the tour never shows to them.
alter table public.user_settings
  add column tour_status text not null default 'pending'
    check (tour_status in ('pending', 'done')),
  add column tour_seen text[] not null default '{}';

-- Settings rows are created lazily, so give existing users without one a
-- row now; otherwise their first lazy insert would read as a new signup.
insert into public.user_settings (user_id, tour_status)
select id, 'done' from public.users
on conflict (user_id) do nothing;

update public.user_settings set tour_status = 'done';
