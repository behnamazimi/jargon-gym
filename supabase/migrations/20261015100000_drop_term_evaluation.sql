-- Term evaluation is gone: drop its scores and its AI feature row.

drop table if exists public.term_evaluations;

delete from public.ai_usage_events where feature = 'term_evaluation';
delete from public.ai_feature_settings where feature = 'term_evaluation';
