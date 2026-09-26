-- Per-user Read page options, set from the gear sheet on Read.
alter table public.user_settings
  add column read_stories_default boolean not null default false,
  add column read_hide_question boolean not null default false,
  add column read_revealed_default boolean not null default false;
