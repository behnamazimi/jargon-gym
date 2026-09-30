-- Per-user option: highlight the sentence being narrated in Read > Stories.
alter table public.user_settings
  add column read_narration_highlight boolean not null default true;
