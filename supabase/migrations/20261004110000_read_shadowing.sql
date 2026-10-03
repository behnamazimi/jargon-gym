-- Per-user options for Shadowing in Read > Stories: replay and pause sentence
-- by sentence so the reader can repeat after the narration.
-- read_shadowing_gap is the pause after a sentence as a multiple of the
-- sentence's length; read_shadowing_repeats is how many times a looped
-- sentence plays (0 = until looping is turned off).
alter table public.user_settings
  add column read_shadowing boolean not null default false,
  add column read_shadowing_pause boolean not null default true,
  add column read_shadowing_gap numeric(2, 1) not null default 1.0
    check (read_shadowing_gap in (1.0, 1.5, 2.0)),
  add column read_shadowing_repeats smallint not null default 2
    check (read_shadowing_repeats in (0, 2, 3, 5));
