-- RLS on public.users is not enough; authenticated needs table-level SELECT
-- for proxy.ts to read referral_verified (and other profile fields).
grant select on public.users to authenticated;
