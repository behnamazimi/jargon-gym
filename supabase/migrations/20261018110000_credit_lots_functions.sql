-- Credit lots, step 2 of 2: opening balances, seeds and the functions.
--
-- Cutover. Everything in the ledger up to `lots_after_id` belongs to the old
-- two-pool model and is only history. Each existing person gets opening-balance
-- lots equal to what the old balance function says they have left, so nobody
-- gains or loses credits. From there the balance is the sum of live lots.
--
-- Run it with no AI request in flight (the run guard times out after 70
-- seconds), so no charge or refund straddles the cutover.

-- ---------------------------------------------------------------------------
-- Cutover marker, seeds and opening balances
-- ---------------------------------------------------------------------------

alter table public.ai_credit_settings
  add column lots_after_id bigint not null default 0;

-- The old pools, as the old balance function computed them. Used once below.
create function pg_temp.old_pools(p_user_id uuid)
returns table (starter integer, monthly integer)
language plpgsql
as $$
declare
  s public.ai_credit_settings;
  v_reset_id bigint;
  v_granted integer;
  v_starter_used integer;
  v_month_spent integer;
begin
  select * into s from public.ai_credit_settings where id;

  select coalesce(max(l.id), 0) into v_reset_id
  from public.ai_credit_ledger l
  where l.user_id = p_user_id and l.kind = 'reset';

  select coalesce(sum(l.amount), 0) into v_granted
  from public.ai_credit_ledger l
  where l.user_id = p_user_id and l.kind = 'grant';

  with monthly as (
    select
      date_trunc('month', l.created_at at time zone 'utc') as month,
      sum(l.amount)::integer as spent
    from public.ai_credit_ledger l
    where l.user_id = p_user_id
      and l.kind = 'spend'
      and l.id > v_reset_id
      and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id)
    group by 1
  )
  select
    coalesce(sum(greatest(0, m.spent - s.monthly_refill)), 0),
    coalesce(sum(m.spent) filter (
      where m.month = date_trunc('month', now() at time zone 'utc')
    ), 0)
  into v_starter_used, v_month_spent
  from monthly m;

  return query select
    greatest(0, s.default_allowance + v_granted - v_starter_used),
    greatest(0, s.monthly_refill - v_month_spent);
end;
$$;

do $$
declare
  v_cutover timestamptz := now();
  v_next_month timestamptz :=
    (date_trunc('month', now() at time zone 'utc') + interval '1 month') at time zone 'utc';
  s public.ai_credit_settings;
begin
  select * into s from public.ai_credit_settings where id;

  update public.ai_credit_settings
  set lots_after_id = (select coalesce(max(l.id), 0) from public.ai_credit_ledger l)
  where id;

  -- New accounts: 50 to start and 20 a month. Existing accounts keep the
  -- monthly refill they have today, starting next month (this month's
  -- remainder comes from the opening lot).
  insert into public.credit_grant_policies
    (source, amount, cadence, on_request, expiry_kind, expiry_days,
     only_when_balance_below, accounts_created_from, accounts_created_to, effective_from)
  values
    ('starter', 50, 'once', false, 'never', null, null, v_cutover, null, v_cutover),
    ('monthly', 20, 'monthly', false, 'month_end', null, null, v_cutover, null, v_cutover),
    ('self_topup', s.self_topup_amount, 'daily', true, 'days', 90, 10, null, null, v_cutover);

  if s.monthly_refill > 0 then
    insert into public.credit_grant_policies
      (source, amount, cadence, on_request, expiry_kind, expiry_days,
       only_when_balance_below, accounts_created_from, accounts_created_to, effective_from)
    values
      ('monthly', s.monthly_refill, 'monthly', false, 'month_end', null, null,
       null, v_cutover, v_next_month);
  end if;

  -- cost per unit_size is documentation only; the charge reads the credits.
  insert into public.credit_prices
    (feature, unit, unit_size, unit_cost_usd, margin, base_credits, credits_per_unit, effective_from)
  values
    ('quiz', 'question', 1, 0.0014, 2.9, 0, 1, v_cutover),
    ('story', 'term', 1, 0.00126, 2.6, 2, 0.5, v_cutover),
    ('narration_story', 'character', 1000, 0.01, 3, 0, 7.5, v_cutover);

  insert into public.ai_credit_ledger (user_id, kind, amount, source, expires_at, note)
  select u.id, 'grant', p.starter, 'opening', null, 'Opening balance: starter and grants'
  from public.users u
  cross join lateral pg_temp.old_pools(u.id) p
  where p.starter > 0;

  insert into public.ai_credit_ledger (user_id, kind, amount, source, expires_at, note)
  select u.id, 'grant', p.monthly, 'opening', v_next_month, 'Opening balance: this month'
  from public.users u
  cross join lateral pg_temp.old_pools(u.id) p
  where p.monthly > 0;
end;
$$;

-- Everyone signed in can read prices (the setup screens show them).
drop policy "Admins read credit prices" on public.credit_prices;
create policy "Signed-in users read credit prices"
  on public.credit_prices for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Lots
-- ---------------------------------------------------------------------------

-- Every lot of a person since the cutover, with what is left in it. Callers
-- decide which are live. Internal.
create function public._ai_credit_lots(p_user_id uuid)
returns table (
  lot_id bigint,
  amount integer,
  remaining integer,
  expires_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.amount,
    (l.amount - coalesce(a.used, 0) - coalesce(e.amount, 0))::integer,
    l.expires_at,
    l.created_at
  from public.ai_credit_ledger l
  cross join (select s.lots_after_id from public.ai_credit_settings s where s.id) c
  left join lateral (
    select sum(al.amount) as used
    from public.ai_credit_allocations al
    where al.lot_id = l.id
  ) a on true
  left join lateral (
    select x.amount
    from public.ai_credit_ledger x
    where x.kind = 'expire' and x.lot_id = l.id
  ) e on true
  where l.user_id = p_user_id
    and l.id > c.lots_after_id
    and l.kind in ('grant', 'refund')
$$;

revoke all on function public._ai_credit_lots(uuid) from public, anon, authenticated;

-- Grants the person is owed right now and does not have yet: policies that
-- apply to this account, are in effect, and have no lot for this period.
-- Internal.
create function public._ai_credit_due_grants(p_user_id uuid, p_at timestamptz)
returns table (
  policy_id bigint,
  source text,
  amount integer,
  period_key text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (p.source, pk.k)
    p.id,
    p.source,
    p.amount,
    pk.k,
    case p.expiry_kind
      when 'never' then null::timestamptz
      when 'days' then p_at + make_interval(days => p.expiry_days)
      else (date_trunc('month', p_at at time zone 'utc') + interval '1 month') at time zone 'utc'
    end
  from public.credit_grant_policies p
  join public.users u on u.id = p_user_id
  cross join lateral (
    select case p.cadence
      when 'once' then 'once'
      when 'monthly' then to_char(p_at at time zone 'utc', 'YYYY-MM')
      else to_char(p_at at time zone 'utc', 'YYYY-MM-DD')
    end as k
  ) pk
  where not p.on_request
    and p.effective_from <= p_at
    and (p.effective_to is null or p.effective_to > p_at)
    and (p.accounts_created_from is null or u.created_at >= p.accounts_created_from)
    and (p.accounts_created_to is null or u.created_at < p.accounts_created_to)
    and not exists (
      select 1
      from public.ai_credit_ledger g
      where g.user_id = p_user_id
        and g.policy_id is not null
        and g.source = p.source
        and g.period_key = pk.k
    )
  order by p.source, pk.k, p.id desc
$$;

revoke all on function public._ai_credit_due_grants(uuid, timestamptz) from public, anon, authenticated;

-- The one function that writes on a person's behalf besides a spend, refund or
-- admin action: it adds the grants that are due and writes off lapsed lots.
-- Takes the per-user lock (every ledger writer does) and returns the instant it
-- used, read after the lock was held. Internal.
create function public._ai_credit_settle(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  v_now := clock_timestamp();

  insert into public.ai_credit_ledger
    (user_id, kind, amount, source, policy_id, period_key, expires_at)
  select p_user_id, 'grant', d.amount, d.source, d.policy_id, d.period_key, d.expires_at
  from public._ai_credit_due_grants(p_user_id, v_now) d
  on conflict (user_id, source, period_key) where policy_id is not null do nothing;

  insert into public.ai_credit_ledger (user_id, kind, amount, lot_id, reason)
  select p_user_id, 'expire', l.remaining, l.lot_id, 'lapsed'
  from public._ai_credit_lots(p_user_id) l
  where l.expires_at is not null and l.expires_at <= v_now and l.remaining > 0
  on conflict (lot_id) where kind = 'expire' do nothing;

  return v_now;
end;
$$;

revoke all on function public._ai_credit_settle(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Prices
-- ---------------------------------------------------------------------------

-- What `p_units` of a feature cost right now (or at `p_at`), and which price
-- row says so.
create function public.ai_credit_price(
  p_feature text,
  p_units integer,
  p_at timestamptz default now()
)
returns table (price_id bigint, credits integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    greatest(1, ceil(p.base_credits + p.credits_per_unit * p_units / p.unit_size))::integer
  from public.credit_prices p
  where p.feature = p_feature and p.effective_from <= p_at
  order by p.effective_from desc
  limit 1
$$;

revoke all on function public.ai_credit_price(text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.ai_credit_price(text, integer, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- Balance (read-only)
-- ---------------------------------------------------------------------------

-- Never writes. It counts grants that are due but not yet written, so a new
-- month shows its credits before the first spend. `total` is what the live
-- lots held when they were granted.
create or replace function public.ai_credit_balance(p_user_id uuid)
returns table (enabled boolean, total integer, remaining integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.ai_credit_settings;
  v_now timestamptz := clock_timestamp();
  v_total integer;
  v_remaining integer;
  v_due integer;
begin
  select * into s from public.ai_credit_settings where id;

  select coalesce(sum(l.amount), 0), coalesce(sum(l.remaining), 0)
  into v_total, v_remaining
  from public._ai_credit_lots(p_user_id) l
  where l.remaining > 0 and (l.expires_at is null or l.expires_at > v_now);

  select coalesce(sum(d.amount), 0) into v_due
  from public._ai_credit_due_grants(p_user_id, v_now) d;

  return query select s.enabled, v_total + v_due, v_remaining + v_due;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reserve and refund
-- ---------------------------------------------------------------------------

-- The third argument used to be the cost. It is now the number of units
-- (questions, terms or characters); the price comes from credit_prices. For
-- quiz and story the units equal the old cost, so an app that has not been
-- redeployed yet keeps working.
drop function public.reserve_ai_credits(uuid, text, integer);

create function public.reserve_ai_credits(p_user_id uuid, p_feature text, p_units integer)
returns table (status text, remaining integer, ledger_id bigint, credits integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.ai_feature_settings;
  b record;
  pr record;
  v_now timestamptz;
  v_spend_id bigint;
  v_left integer;
  v_take integer;
  lot record;
begin
  if p_units is null or p_units <= 0 then
    raise exception 'Units must be positive';
  end if;

  select * into f from public.ai_feature_settings where feature = p_feature;
  if not found or not f.billable then
    raise exception 'Feature % cannot be charged in credits', p_feature;
  end if;

  v_now := public._ai_credit_settle(p_user_id);

  select * into pr from public.ai_credit_price(p_feature, p_units, v_now);
  if not found then
    raise exception 'Feature % has no price', p_feature;
  end if;

  select * into b from public.ai_credit_balance(p_user_id);

  if not b.enabled or not f.enabled then
    return query select 'disabled'::text, b.remaining, null::bigint, pr.credits;
    return;
  end if;

  if pr.credits > b.remaining then
    return query select 'insufficient'::text, b.remaining, null::bigint, pr.credits;
    return;
  end if;

  insert into public.ai_credit_ledger (user_id, kind, feature, amount, price_id, units)
  values (p_user_id, 'spend', p_feature, pr.credits, pr.price_id, p_units)
  returning id into v_spend_id;

  -- Soonest expiry first, then the oldest lot; lots that never expire last.
  v_left := pr.credits;
  for lot in
    select l.lot_id, l.remaining
    from public._ai_credit_lots(p_user_id) l
    where l.remaining > 0 and (l.expires_at is null or l.expires_at > v_now)
    order by l.expires_at asc nulls last, l.created_at asc, l.lot_id asc
  loop
    exit when v_left = 0;
    v_take := least(v_left, lot.remaining);
    insert into public.ai_credit_allocations (spend_id, lot_id, amount)
    values (v_spend_id, lot.lot_id, v_take);
    v_left := v_left - v_take;
  end loop;

  if v_left > 0 then
    raise exception 'Credits changed while charging';
  end if;

  return query select 'ok'::text, b.remaining - pr.credits, v_spend_id, pr.credits;
end;
$$;

revoke all on function public.reserve_ai_credits(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(uuid, text, integer) to service_role;

-- Returns what a spend took, lot by lot, as new lots. Safe to call twice: each
-- refund row is unique per spend and source lot, and the first reason stays.
-- A lot an admin reset wrote off is not refunded into. A spend from before the
-- cutover has no lots, so it is refunded once, whole, as a 30-day lot.
create or replace function public.refund_ai_credits(p_ledger_id bigint, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.ai_credit_ledger;
  v_cutover bigint;
  v_now timestamptz;
  v_note text := left(nullif(trim(p_reason), ''), 300);
begin
  select * into s from public.ai_credit_ledger where id = p_ledger_id and kind = 'spend';
  if not found then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(s.user_id::text, 0));
  v_now := clock_timestamp();
  select c.lots_after_id into v_cutover from public.ai_credit_settings c where c.id;

  if s.id <= v_cutover then
    insert into public.ai_credit_ledger
      (user_id, kind, feature, amount, refund_of, source, expires_at, note)
    values
      (s.user_id, 'refund', s.feature, s.amount, s.id, 'refund',
       v_now + interval '30 days', v_note)
    on conflict (refund_of) where lot_id is null and refund_of is not null do nothing;
    return;
  end if;

  insert into public.ai_credit_ledger
    (user_id, kind, feature, amount, refund_of, lot_id, source, expires_at, note)
  select
    s.user_id, 'refund', s.feature, a.amount, s.id, a.lot_id, 'refund',
    case
      when src.expires_at is null then null
      else greatest(src.expires_at, v_now + interval '30 days')
    end,
    v_note
  from public.ai_credit_allocations a
  join public.ai_credit_ledger src on src.id = a.lot_id
  where a.spend_id = s.id
    and not exists (
      select 1 from public.ai_credit_ledger x
      where x.kind = 'expire' and x.lot_id = a.lot_id and x.reason = 'reset'
    )
  on conflict (refund_of, lot_id) where refund_of is not null and lot_id is not null do nothing;
end;
$$;

revoke all on function public.refund_ai_credits(bigint, text) from public, anon, authenticated;
grant execute on function public.refund_ai_credits(bigint, text) to service_role;

-- What a call really cost, recorded after the spend. Best effort: a second
-- call for the same spend does nothing.
create function public.record_ai_credit_cost(
  p_spend_id bigint,
  p_provider text,
  p_model text,
  p_cost_micro_usd bigint,
  p_calls integer default 1,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_reasoning_tokens integer default null,
  p_characters integer default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_credit_costs
    (spend_id, provider, model, input_tokens, output_tokens, reasoning_tokens,
     characters, cost_micro_usd, calls)
  select l.id, p_provider, p_model, p_input_tokens, p_output_tokens, p_reasoning_tokens,
         p_characters, greatest(0, p_cost_micro_usd), greatest(1, coalesce(p_calls, 1))
  from public.ai_credit_ledger l
  where l.id = p_spend_id and l.kind = 'spend'
  on conflict (spend_id) do nothing;
$$;

revoke all on function public.record_ai_credit_cost(
  bigint, text, text, bigint, integer, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.record_ai_credit_cost(
  bigint, text, text, bigint, integer, integer, integer, integer, integer
) to service_role;

-- ---------------------------------------------------------------------------
-- Self top-up
-- ---------------------------------------------------------------------------

-- A grant from the on-request top-up policy, with an audit row in the same
-- transaction. Allowed only while the balance is under the policy's limit, and
-- at most once per UTC day (the policy's period key).
create or replace function public.my_self_topup_ai_credits()
returns table (added integer, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  s public.ai_credit_settings;
  p public.credit_grant_policies;
  v_now timestamptz;
  v_key text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into s from public.ai_credit_settings where id;
  if s.id is null or not s.enabled then
    raise exception 'topup_unavailable';
  end if;

  v_now := public._ai_credit_settle(v_user);

  select * into p
  from public.credit_grant_policies q
  where q.on_request and q.source = 'self_topup'
    and q.effective_from <= v_now and (q.effective_to is null or q.effective_to > v_now)
  order by q.id desc
  limit 1;
  if not found then
    raise exception 'topup_unavailable';
  end if;

  if (select b.remaining from public.ai_credit_balance(v_user) b)
     >= coalesce(p.only_when_balance_below, 2147483647) then
    raise exception 'topup_not_needed';
  end if;

  v_key := to_char(v_now at time zone 'utc', 'YYYY-MM-DD');
  if exists (
    select 1 from public.ai_credit_ledger g
    where g.user_id = v_user and g.policy_id is not null
      and g.source = 'self_topup' and g.period_key = v_key
  ) then
    raise exception 'topup_already_today';
  end if;

  insert into public.ai_credit_ledger
    (user_id, kind, amount, source, policy_id, period_key, expires_at, created_by, note)
  values
    (v_user, 'grant', p.amount, 'self_topup', p.id, v_key,
     case p.expiry_kind
       when 'days' then v_now + make_interval(days => p.expiry_days)
       else null
     end,
     v_user, 'self_topup');

  perform public._admin_audit_insert(
    'self_topup_ai_credits', 'user', v_user::text,
    jsonb_build_object('amount', p.amount)
  );

  return query
  select p.amount, b.remaining
  from public.ai_credit_balance(v_user) b;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: grant, reset and settings
-- ---------------------------------------------------------------------------

drop function public.admin_grant_ai_credits(uuid, integer, text);

create function public.admin_grant_ai_credits(
  p_user_id uuid,
  p_amount integer,
  p_note text,
  p_expires_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can grant AI credits';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'Amount must be between 1 and 10000';
  end if;

  v_now := public._ai_credit_settle(p_user_id);
  if p_expires_at is not null and p_expires_at <= v_now then
    raise exception 'The expiry must be in the future';
  end if;

  insert into public.ai_credit_ledger
    (user_id, kind, amount, source, expires_at, created_by, note)
  values
    (p_user_id, 'grant', p_amount, 'admin', p_expires_at, auth.uid(), nullif(trim(p_note), ''));

  perform public._admin_audit_insert(
    'grant_ai_credits', 'user', p_user_id::text,
    jsonb_build_object('amount', p_amount, 'note', p_note)
      || case when p_expires_at is null then '{}'::jsonb
              else jsonb_build_object('expires_at', p_expires_at) end
  );
end;
$$;

revoke all on function public.admin_grant_ai_credits(uuid, integer, text, timestamptz)
  from public, anon;
grant execute on function public.admin_grant_ai_credits(uuid, integer, text, timestamptz)
  to authenticated;

-- Restores a person's free allowance: whatever is left of their starter,
-- monthly, top-up and opening lots is written off, and they get fresh lots from
-- the starter and monthly policies that apply to their account. Admin grants
-- and refunds are not touched.
create or replace function public.admin_reset_ai_credits(p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;
  v_note text := nullif(trim(p_note), '');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can reset AI credits';
  end if;

  v_now := public._ai_credit_settle(p_user_id);

  insert into public.ai_credit_ledger (user_id, kind, amount, lot_id, reason, created_by, note)
  select p_user_id, 'expire', l.remaining, l.lot_id, 'reset', auth.uid(), v_note
  from public._ai_credit_lots(p_user_id) l
  join public.ai_credit_ledger g on g.id = l.lot_id
  where l.remaining > 0
    and (l.expires_at is null or l.expires_at > v_now)
    and g.source in ('starter', 'monthly', 'self_topup', 'opening');

  insert into public.ai_credit_ledger
    (user_id, kind, amount, source, expires_at, created_by, note)
  select
    p_user_id, 'grant', p.amount, 'reset',
    case p.expiry_kind
      when 'never' then null::timestamptz
      when 'days' then v_now + make_interval(days => p.expiry_days)
      else (date_trunc('month', v_now at time zone 'utc') + interval '1 month') at time zone 'utc'
    end,
    auth.uid(), v_note
  from public.credit_grant_policies p
  join public.users u on u.id = p_user_id
  where not p.on_request
    and p.source in ('starter', 'monthly')
    and p.effective_from <= v_now
    and (p.effective_to is null or p.effective_to > v_now)
    and (p.accounts_created_from is null or u.created_at >= p.accounts_created_from)
    and (p.accounts_created_to is null or u.created_at < p.accounts_created_to);

  perform public._admin_audit_insert(
    'reset_ai_credits', 'user', p_user_id::text, jsonb_build_object('note', v_note)
  );
end;
$$;

-- Changes the amount of every active or upcoming policy of one source that
-- applies to new accounts. A policy already in effect is closed and replaced
-- by a copy with the new amount; one that has not started yet is edited in
-- place. Zero ends them. Policies kept for accounts that existed at the cutover
-- are left alone.
create function public._credit_policy_set_amount(p_source text, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.credit_grant_policies;
  v_now timestamptz := clock_timestamp();
begin
  for p in
    select * from public.credit_grant_policies
    where source = p_source and amount <> p_amount
      and accounts_created_to is null
      and (effective_to is null or effective_to > v_now)
    for update
  loop
    if p.effective_from > v_now then
      if p_amount = 0 then
        delete from public.credit_grant_policies where id = p.id;
      else
        update public.credit_grant_policies set amount = p_amount where id = p.id;
      end if;
    else
      update public.credit_grant_policies set effective_to = v_now where id = p.id;
      if p_amount > 0 then
        insert into public.credit_grant_policies
          (source, amount, cadence, on_request, expiry_kind, expiry_days,
           only_when_balance_below, accounts_created_from, accounts_created_to, effective_from)
        values
          (p.source, p_amount, p.cadence, p.on_request, p.expiry_kind, p.expiry_days,
           p.only_when_balance_below, p.accounts_created_from, p.accounts_created_to, v_now);
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public._credit_policy_set_amount(text, integer)
  from public, anon, authenticated;

-- Adds a price row when the numbers differ from the current one.
create function public._credit_price_set(p_feature text, p_base numeric, p_per_unit numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.credit_prices;
begin
  select * into c
  from public.credit_prices
  where feature = p_feature and effective_from <= clock_timestamp()
  order by effective_from desc
  limit 1;
  if not found then
    raise exception 'Feature % has no price to change', p_feature;
  end if;
  if c.base_credits = p_base and c.credits_per_unit = p_per_unit then
    return;
  end if;

  insert into public.credit_prices
    (feature, unit, unit_size, unit_cost_usd, margin, base_credits, credits_per_unit,
     effective_from, created_by)
  values
    (c.feature, c.unit, c.unit_size, c.unit_cost_usd, c.margin, p_base, p_per_unit,
     greatest(clock_timestamp(), c.effective_from + interval '1 microsecond'), auth.uid());
end;
$$;

revoke all on function public._credit_price_set(text, numeric, numeric)
  from public, anon, authenticated;

drop function public.admin_set_ai_credit_settings(integer, integer, integer, integer, integer);

create function public.admin_set_ai_credit_settings(
  p_starter integer,
  p_monthly integer,
  p_topup integer,
  p_quiz_per_question numeric,
  p_story_base numeric,
  p_story_per_term numeric,
  p_narration_per_thousand numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can change AI credit settings';
  end if;
  if p_starter is null or p_starter not between 0 and 1000000
     or p_monthly is null or p_monthly not between 0 and 1000000 then
    raise exception 'Allowances must be between 0 and 1000000';
  end if;
  if p_topup is null or p_topup not between 1 and 10000 then
    raise exception 'The top-up amount must be between 1 and 10000';
  end if;
  if p_quiz_per_question is null or p_quiz_per_question not between 0.001 and 1000
     or p_story_per_term is null or p_story_per_term not between 0.001 and 1000
     or p_narration_per_thousand is null or p_narration_per_thousand not between 0.001 and 1000
     or p_story_base is null or p_story_base not between 0 and 1000 then
    raise exception 'Prices must be between 0.001 and 1000 (the base between 0 and 1000)';
  end if;

  select jsonb_build_object(
    'starter', (select max(amount) from public.credit_grant_policies
                where source = 'starter' and effective_to is null),
    'monthly', (select max(amount) from public.credit_grant_policies
                where source = 'monthly' and effective_to is null),
    'topup', (select max(amount) from public.credit_grant_policies
              where source = 'self_topup' and effective_to is null),
    'prices', (select jsonb_object_agg(f, jsonb_build_array(base_credits, credits_per_unit))
               from (
                 select distinct on (feature) feature as f, base_credits, credits_per_unit
                 from public.credit_prices
                 where effective_from <= clock_timestamp()
                 order by feature, effective_from desc
               ) x)
  ) into v_old;

  perform public._credit_policy_set_amount('starter', p_starter);
  perform public._credit_policy_set_amount('monthly', p_monthly);
  perform public._credit_policy_set_amount('self_topup', p_topup);
  perform public._credit_price_set('quiz', 0, p_quiz_per_question);
  perform public._credit_price_set('story', p_story_base, p_story_per_term);
  perform public._credit_price_set('narration_story', 0, p_narration_per_thousand);

  perform public._admin_audit_insert(
    'set_ai_credit_settings', 'settings', 'ai_credits',
    jsonb_build_object(
      'old', v_old,
      'new', jsonb_build_object(
        'starter', p_starter, 'monthly', p_monthly, 'topup', p_topup,
        'quiz', p_quiz_per_question,
        'story', jsonb_build_array(p_story_base, p_story_per_term),
        'narration', p_narration_per_thousand
      )
    )
  );
end;
$$;

revoke all on function public.admin_set_ai_credit_settings(
  integer, integer, integer, numeric, numeric, numeric, numeric
) from public, anon;
grant execute on function public.admin_set_ai_credit_settings(
  integer, integer, integer, numeric, numeric, numeric, numeric
) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: summary, usage and failures, read from lots
-- ---------------------------------------------------------------------------

create or replace function public.admin_ai_credit_summary()
returns table (
  total_users integer,
  users_with_use integer,
  users_exhausted integer,
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

  select coalesce(min(p.credits), 1)
  into v_cheapest
  from public.ai_feature_settings f
  cross join lateral public.ai_credit_price(f.feature, 1) p
  where f.billable;

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
    coalesce((select sum(k.amount) from kept_spends k), 0)::integer,
    (
      select count(*) from public.ai_credit_ledger l
      where l.kind = 'spend' and l.created_at > now() - interval '24 hours'
    )::integer,
    (
      select count(distinct l.refund_of) from public.ai_credit_ledger l
      where l.kind = 'refund' and l.created_at > now() - interval '24 hours'
    )::integer,
    (
      select count(distinct l.user_id) from public.ai_credit_ledger l
      where l.kind = 'refund' and l.created_at > now() - interval '24 hours'
    )::integer;
end;
$$;

create or replace function public.admin_ai_credit_usage(p_limit integer default 200)
returns table (
  user_id uuid,
  email text,
  spent integer,
  granted integer,
  remaining integer,
  last_activity timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can view AI credit usage';
  end if;

  return query
  select
    u.id,
    u.email,
    coalesce(sum(l.amount) filter (
      where l.kind = 'spend'
        and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id)
    ), 0)::integer,
    coalesce(sum(l.amount) filter (where l.kind = 'grant'), 0)::integer,
    (select b.remaining from public.ai_credit_balance(u.id) b),
    max(l.created_at)
  from public.users u
  join public.ai_credit_ledger l on l.user_id = u.id
  cross join (select s.lots_after_id from public.ai_credit_settings s where s.id) c
  where l.id > c.lots_after_id
  group by u.id, u.email
  order by max(l.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

create or replace function public.admin_ai_credit_failure_reasons(p_limit integer default 5)
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
    count(distinct l.refund_of)::integer,
    count(distinct l.user_id)::integer,
    max(l.created_at)
  from public.ai_credit_ledger l
  where l.kind = 'refund'
    and l.created_at > now() - interval '24 hours'
  group by coalesce(l.note, 'Unknown reason')
  order by count(distinct l.refund_of) desc, max(l.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
end;
$$;

-- ---------------------------------------------------------------------------
-- Prices live in credit_prices now; narration of stories is billable
-- ---------------------------------------------------------------------------

alter table public.ai_feature_settings
  drop constraint ai_feature_settings_cost_shape,
  drop column credit_cost;

update public.ai_feature_settings
set billable = true, unit = '1,000 characters'
where feature = 'narration_story';

alter table public.ai_credit_settings
  drop column default_allowance,
  drop column monthly_refill,
  drop column self_topup_amount;
