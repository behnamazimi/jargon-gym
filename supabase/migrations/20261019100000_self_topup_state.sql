-- Whether the signed-in user can take the free top-up right now, so screens
-- only offer it when it will work. Mirrors the checks in
-- my_self_topup_ai_credits and never writes.
create function public.my_self_topup_state()
returns table (available boolean, amount integer, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  s public.ai_credit_settings;
  p public.credit_grant_policies;
  v_now timestamptz := now();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into s from public.ai_credit_settings where id;
  if s.id is null or not s.enabled then
    return query select false, 0, 'off'::text;
    return;
  end if;

  select * into p
  from public.credit_grant_policies q
  where q.on_request and q.source = 'self_topup'
    and q.effective_from <= v_now and (q.effective_to is null or q.effective_to > v_now)
  order by q.id desc
  limit 1;
  if not found then
    return query select false, 0, 'off'::text;
    return;
  end if;

  if (select b.remaining from public.ai_credit_balance(v_user) b)
     >= coalesce(p.only_when_balance_below, 2147483647) then
    return query select false, p.amount, 'balance'::text;
    return;
  end if;

  if exists (
    select 1 from public.ai_credit_ledger g
    where g.user_id = v_user and g.policy_id is not null
      and g.source = 'self_topup'
      and g.period_key = to_char(v_now at time zone 'utc', 'YYYY-MM-DD')
  ) then
    return query select false, p.amount, 'already-today'::text;
    return;
  end if;

  return query select true, p.amount, null::text;
end;
$$;

revoke all on function public.my_self_topup_state() from public, anon;
grant execute on function public.my_self_topup_state() to authenticated;
