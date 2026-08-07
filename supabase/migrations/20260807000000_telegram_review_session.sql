-- Persist Telegram /review flashcard-style session + setup wizard state.

alter table public.telegram_links
  add column if not exists review_setup jsonb,
  add column if not exists review_session jsonb;

comment on column public.telegram_links.review_setup is
  'In-progress /review setup wizard state. Null when not configuring a review session.';

comment on column public.telegram_links.review_session is
  'Active /review session state: termIds, progress, reveal state, ratings. Null when no session.';
