-- One-row summary for the AI credits admin page: is the feature being used,
-- how many people hit the end of their credits, how many then added their own
-- key, how much has been spent, and how many requests failed (and were
-- refunded) in the last day. A spike in refunds usually means the app's key
-- was revoked or ran out of quota.

create function public.admin_ai_credit_summary()
returns table (
  total_users integer,
  users_with_use integer,
  users_exhausted integer,
  users_with_own_key integer,
  credits_spent integer,
  spends_24h integer,
  refunds_24h integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view AI credit metrics';
  end if;

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
      where (select b.remaining from public.ai_credit_balance(u.user_id) b) = 0
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
    )::integer;
end;
$$;

revoke all on function public.admin_ai_credit_summary() from public, anon;
grant execute on function public.admin_ai_credit_summary() to authenticated;
