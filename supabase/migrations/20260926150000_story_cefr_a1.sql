-- Stories can now be written at CEFR level A1.

alter table public.stories
  drop constraint stories_cefr_level_check,
  add constraint stories_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

alter table public.story_collection_prefs
  drop constraint story_collection_prefs_cefr_level_check,
  add constraint story_collection_prefs_cefr_level_check
    check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
