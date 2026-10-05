-- Which blocks of a term's body sit under "More" while studying. Holds a
-- default map and per-collection maps; a missing block means shown, so an
-- empty object leaves every card as it was.
-- Rollback: alter table public.user_settings drop column term_layout;
alter table public.user_settings
  add column term_layout jsonb not null default '{}';

comment on column public.user_settings.term_layout is
  'Term body layout: {"default": {block: "shown"|"more"}, "collections": {domain_id: {block: ...}}}.';
