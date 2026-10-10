-- Stories no longer ask how much help each term gets, so nothing writes
-- reading_level any more. It becomes optional so the app can deploy before or
-- after this runs. The unused reading_level and new_term_ids columns are dropped
-- in a later migration, once no running version of the app reads them.
alter table public.stories alter column reading_level drop not null;
alter table public.story_collection_prefs alter column reading_level drop not null;
