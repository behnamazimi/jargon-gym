-- The piece length the user picks in Stories setup, saved per collection
-- like the levels, and on each story for the record.

alter table public.stories
  add column piece_length text not null default 'medium',
  add constraint stories_piece_length_check
    check (piece_length in ('short', 'medium', 'long'));

alter table public.story_collection_prefs
  add column piece_length text not null default 'medium',
  add constraint story_collection_prefs_piece_length_check
    check (piece_length in ('short', 'medium', 'long'));
