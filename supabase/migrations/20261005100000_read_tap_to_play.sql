-- Per-user option: tap a sentence in Read > Stories to play it.
alter table public.user_settings
  add column read_tap_to_play boolean not null default true;
