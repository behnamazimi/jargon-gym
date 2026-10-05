-- Typed (text-entry) quiz answers are logged with their own question type.

alter table public.review_events
  drop constraint review_events_question_type_check,
  add constraint review_events_question_type_check
    check (question_type is null or question_type in ('multiple_choice', 'true_false', 'typed'));

comment on column public.review_events.question_type is
  'multiple_choice | true_false | typed — set on quiz_pass/quiz_fail only, needed to interpret guess-rate baselines.';
