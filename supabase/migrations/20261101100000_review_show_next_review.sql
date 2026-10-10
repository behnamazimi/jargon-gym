-- Review option: show on each grade button roughly when the term comes back.

alter table public.user_settings
  add column review_show_next_review boolean not null default true;

comment on column public.user_settings.review_show_next_review is
  'Review shows under each grade button roughly when the term comes back after that grade (an estimate from TRACE, not a due date). On by default.';
