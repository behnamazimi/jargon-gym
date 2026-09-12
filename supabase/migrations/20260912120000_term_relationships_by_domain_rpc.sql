-- Domain-scoped read of term relationships, replacing the .or() + term-id-
-- array pattern used by the Jargon collection page. termIds there is
-- always "every term in domain X" (lib/jargon/load-jargon-page-data.ts),
-- so "relationships where source OR target is in that id list" is
-- mathematically identical to "relationships touching domain X" — and
-- source/target are provably always in the same domain (RLS enforces
-- s.domain_id = t.domain_id on every insert/update of term_relationships,
-- see 20260725140000_user_owned_domains.sql). This RPC joins server-side
-- by domain_id instead, avoiding a term-id list in an `.in()`/`.or()`
-- filter that blows past PostgREST's URL length limit for large domains —
-- same fix already applied to progress_state_by_domain, see the comment
-- above fetchProgressStateByDomain in lib/jargon/known-state.ts.
--
-- Session-only: loadJargonPageData (the only caller) always runs through
-- requireAuthenticatedClient(), never an admin/service-role client — see
-- lib/auth/require-session.ts. No p_user_id/service-role variant exists
-- because term_relationships has no per-user columns to join, and every
-- other consumer of this table (Telegram: get_term_card,
-- telegram_term_message_enrichment, telegram_quiz_setup,
-- review_session_rpcs) already writes its own tailored inline join rather
-- than sharing a table-level RPC.

create function public.my_term_relationships_by_domain(p_domain_id uuid)
returns table (
  id uuid,
  relationship_type text,
  description text,
  source_term_id uuid,
  target_term_id uuid,
  source_term_name text,
  target_term_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    tr.id,
    tr.relationship_type,
    tr.description,
    tr.source_term_id,
    tr.target_term_id,
    s.term as source_term_name,
    t.term as target_term_name
  from public.term_relationships tr
  join public.terms s on s.id = tr.source_term_id
  join public.terms t on t.id = tr.target_term_id
  where s.domain_id = p_domain_id or t.domain_id = p_domain_id;
end;
$$;

revoke all on function public.my_term_relationships_by_domain(uuid) from public;
grant execute on function public.my_term_relationships_by_domain(uuid) to authenticated;
