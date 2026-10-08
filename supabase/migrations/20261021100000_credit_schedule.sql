-- What a person's credits will do next: the soonest expiry and the next monthly
-- refill, so Settings can say so instead of credits quietly vanishing at month
-- end. Read-only; nothing here writes to the ledger.
--
-- Rollback (as a new migration): drop function public.my_credit_schedule().

create function public.my_credit_schedule()
returns table (
  next_refill_at timestamptz,
  next_refill_amount integer,
  expiring_at timestamptz,
  expiring_amount integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_next_month timestamptz;
  v_refill_amount integer;
  v_expiring_at timestamptz;
  v_expiring_amount integer;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not coalesce((select s.enabled from public.ai_credit_settings s where s.id), false) then
    return query select null::timestamptz, null::integer, null::timestamptz, null::integer;
    return;
  end if;

  v_next_month := (date_trunc('month', v_now at time zone 'utc') + interval '1 month') at time zone 'utc';

  select d.amount into v_refill_amount
  from public._ai_credit_due_grants(v_user, v_next_month) d
  where d.source = 'monthly'
  limit 1;

  -- Written lots plus this period's grants that are due but not yet written
  -- (the balance counts those too), grouped by when they lapse.
  select x.expires_at, sum(x.credits)::integer
  into v_expiring_at, v_expiring_amount
  from (
    select l.expires_at, l.remaining as credits
    from public._ai_credit_lots(v_user) l
    where l.remaining > 0
    union all
    select d.expires_at, d.amount as credits
    from public._ai_credit_due_grants(v_user, v_now) d
  ) x
  where x.expires_at is not null and x.expires_at > v_now
  group by x.expires_at
  order by x.expires_at
  limit 1;

  return query select
    case when v_refill_amount is null then null::timestamptz else v_next_month end,
    v_refill_amount,
    v_expiring_at,
    v_expiring_amount;
end;
$$;

revoke all on function public.my_credit_schedule() from public, anon;
grant execute on function public.my_credit_schedule() to authenticated;
