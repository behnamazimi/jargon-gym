-- Keep screen awake: per-person switches in the Read and Review gears.

alter table public.user_settings
  add column read_keep_awake boolean not null default false,
  add column review_keep_awake boolean not null default false;

comment on column public.user_settings.read_keep_awake is
  'Read (cards, stories, fullscreen feed and Shadowing) keeps the screen on until the person is idle for a couple of minutes. Off by default.';
comment on column public.user_settings.review_keep_awake is
  'Review keeps the screen on until the person is idle for a couple of minutes. Off by default.';
