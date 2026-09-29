-- Record why a request failed when its credits are refunded, so the admin page
-- can say what is going wrong (a revoked key, quota, unusable model replies)
-- instead of only that refunds are up. The reason goes in the refund row's
-- `note`. It is short, made in the app, and never holds a prompt or a key.
-- The argument list changes, so the function is dropped and created again.

drop function public.refund_ai_credits(bigint);

-- Safe to call twice: the unique refund_of makes the second call a no-op, and
-- the first reason is the one that stays.
create function public.refund_ai_credits(p_ledger_id bigint, p_reason text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_credit_ledger (user_id, kind, feature, amount, refund_of, note)
  select l.user_id, 'refund', l.feature, l.amount, l.id, left(nullif(trim(p_reason), ''), 300)
  from public.ai_credit_ledger l
  where l.id = p_ledger_id and l.kind = 'spend'
  on conflict (refund_of) do nothing;
$$;

revoke all on function public.refund_ai_credits(bigint, text) from public, anon, authenticated;
grant execute on function public.refund_ai_credits(bigint, text) to service_role;

-- The most common reasons for refunds in the last 24 hours, for the admin page.
create function public.admin_ai_credit_failure_reasons(p_limit integer default 5)
returns table (
  reason text,
  failures integer,
  people integer,
  last_seen timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view AI credit failures';
  end if;

  return query
  select
    coalesce(l.note, 'Unknown reason'),
    count(*)::integer,
    count(distinct l.user_id)::integer,
    max(l.created_at)
  from public.ai_credit_ledger l
  where l.kind = 'refund'
    and l.created_at > now() - interval '24 hours'
  group by coalesce(l.note, 'Unknown reason')
  order by count(*) desc, max(l.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
end;
$$;

revoke all on function public.admin_ai_credit_failure_reasons(integer) from public, anon;
grant execute on function public.admin_ai_credit_failure_reasons(integer) to authenticated;
