-- Review options: per-person switches behind the gear on the Review page.

alter table public.user_settings
  add column review_narrate_on_reveal boolean not null default false,
  add column review_swipe boolean not null default true;

comment on column public.user_settings.review_narrate_on_reveal is
  'Review plays the term''s narration clip when a card is revealed, if the person has narration access and the term has a clip. Off by default.';
comment on column public.user_settings.review_swipe is
  'Review responds to swipe gestures on touch screens (up reveals, sideways moves between terms). On by default.';
