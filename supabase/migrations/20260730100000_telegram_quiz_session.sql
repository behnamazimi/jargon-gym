-- Persist Telegram quiz sessions across stateless Edge Function invocations.

alter table public.telegram_links
  add column if not exists quiz_session jsonb;

comment on column public.telegram_links.quiz_session is
  'Active /quiz session state: termIds, progress, score. Null when no session.';
