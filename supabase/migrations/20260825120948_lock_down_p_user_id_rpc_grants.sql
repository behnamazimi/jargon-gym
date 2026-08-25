-- Every p_user_id-taking service-role RPC in this project was reachable by
-- anon/authenticated directly (Supabase's default privileges auto-grant
-- EXECUTE on new functions independently of `public`), letting anyone with
-- the public anon key call e.g. mark_term_known or reset_domain_progress
-- with an arbitrary p_user_id. All legitimate call sites already go through
-- a service_role client (Telegram bot, widget API, or the my_* wrappers
-- that resolve auth.uid() themselves), so this revoke changes no behavior.
revoke execute on function public.bump_streak(uuid) from anon, authenticated;
revoke execute on function public.clear_term_known(uuid, uuid) from anon, authenticated;
revoke execute on function public.get_review_candidates(uuid, uuid[], text) from anon, authenticated;
revoke execute on function public.get_term_card(uuid, uuid) from anon, authenticated;
revoke execute on function public.mark_term_known(uuid, uuid) from anon, authenticated;
revoke execute on function public.record_review_event(uuid, uuid, review_event) from anon, authenticated;
revoke execute on function public.record_telegram_send(uuid) from anon, authenticated;
revoke execute on function public.reset_domain_progress(uuid, uuid) from anon, authenticated;
revoke execute on function public.review_domain_ids(uuid) from anon, authenticated;
revoke execute on function public.set_telegram_all_caught_up(uuid) from anon, authenticated;
