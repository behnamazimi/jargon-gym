-- Tracks the widget version last reported by each token, so Settings can
-- show real per-install update status instead of static instructions.

alter table public.widget_tokens
  add column widget_version text;
