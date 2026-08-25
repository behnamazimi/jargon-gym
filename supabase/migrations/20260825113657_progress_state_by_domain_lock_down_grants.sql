-- Supabase's default privileges auto-grant EXECUTE on new functions to
-- anon/authenticated/service_role, so `revoke all ... from public` alone
-- does not remove anon/authenticated access — it must be revoked explicitly.
revoke execute on function public.progress_state_by_domain(uuid, uuid[]) from anon, authenticated;
revoke execute on function public.my_progress_state_by_domain(uuid[]) from anon;
