-- Stories no longer ask how much help each term gets, so the setting is not kept.
alter table public.stories drop column reading_level;
alter table public.story_collection_prefs drop column reading_level;
