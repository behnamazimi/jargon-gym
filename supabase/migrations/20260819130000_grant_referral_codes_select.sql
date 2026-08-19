-- referral_codes was previously only reachable through SECURITY DEFINER RPCs
-- (create_referral_code, redeem_referral_code), which run as the function
-- owner and don't need caller-level table grants. The admin invites list
-- needs to embed referral_codes directly from a client query, which does.
-- Existing RLS policies already scope rows correctly for this grant.

grant select on public.referral_codes to authenticated;
