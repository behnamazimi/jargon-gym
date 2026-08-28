-- Read mode: what Read (and the widget) show once the unknown pool is
-- empty for a user's active collections.

alter table public.user_settings
  add column read_mode text not null default 'unknown_only'
    check (read_mode in ('unknown_only', 'stale_known'));

comment on column public.user_settings.read_mode is
  'Read-mode fallback once the unknown pool is empty for active collections. "unknown_only" (default): Read/widget show "caught up", unchanged. "stale_known": fall back to known-pool terms ordered by staleness (oldest last_read_at first, nulls first, then read_count ascending) via pickStaleKnownTerms in lib/smart-queue/pick.ts. Global, not per-collection. Checked fresh on every fetch, so it never suppresses unknown terms that show up later — it only fills the gap when the unknown pool is truly empty at that moment.';
