-- Two refinements to the admin summary:
--   * "ran out" now means the person can't afford the cheapest thing they could
--     ask for, not only a balance of exactly zero.
--   * it also reports how many different people had a refund in the last day,
--     so one person's flaky session doesn't look like a revoked key.
-- The return type changes, so the function is dropped and created again.

drop function public.admin_ai_credit_summary();

create function public.admin_ai_credit_summary()
returns table (
  total_users integer,
  users_with_use integer,
  users_exhausted integer,
  users_with_own_key integer,
  credits_spent integer,
  spends_24h integer,
  refunds_24h integer,
  refund_users_24h integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cheapest integer;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view AI credit metrics';
  end if;

  select least(s.quiz_credits_per_question, s.story_credits_per_term)
  into v_cheapest
  from public.ai_credit_settings s
  where s.id;

  return query
  with kept_spends as (
    select l.user_id, l.amount
    from public.ai_credit_ledger l
    where l.kind = 'spend'
      and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id)
  ),
  users_used as (
    select distinct k.user_id from kept_spends k
  )
  select
    (select count(*) from public.users)::integer,
    (select count(*) from users_used)::integer,
    (
      select count(*)
      from users_used u
      where (select b.remaining from public.ai_credit_balance(u.user_id) b) < v_cheapest
    )::integer,
    (
      select count(*)
      from users_used u
      join public.user_settings s on s.user_id = u.user_id
      where s.api_key_last4 is not null
    )::integer,
    coalesce((select sum(k.amount) from kept_spends k), 0)::integer,
    (
      select count(*) from public.ai_credit_ledger l
      where l.kind = 'spend' and l.created_at > now() - interval '24 hours'
    )::integer,
    (
      select count(*) from public.ai_credit_ledger l
      where l.kind = 'refund' and l.created_at > now() - interval '24 hours'
    )::integer,
    (
      select count(distinct l.user_id) from public.ai_credit_ledger l
      where l.kind = 'refund' and l.created_at > now() - interval '24 hours'
    )::integer;
end;
$$;

revoke all on function public.admin_ai_credit_summary() from public, anon;
grant execute on function public.admin_ai_credit_summary() to authenticated;
