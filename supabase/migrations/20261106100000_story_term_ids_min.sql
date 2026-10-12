-- A story needs at least one term. The app sets the real minimum per length
-- (lib/stories/length.ts), and short pieces may use only one.

alter table public.stories
  drop constraint stories_term_ids_min_check,
  add constraint stories_term_ids_min_check check (cardinality(term_ids) >= 1);
