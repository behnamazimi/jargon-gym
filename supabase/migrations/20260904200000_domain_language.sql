-- Per-collection content language. Drives narration's template phrasing and
-- ElevenLabs language_code — no DB check constraint on the value, since the
-- set of *offered* languages is enforced app-side (see lib/jargon/languages.ts),
-- so adding a new language later never needs a migration.

alter table public.domains add column language text not null default 'en';
