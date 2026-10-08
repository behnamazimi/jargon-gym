-- Credit lots, step 1 of 2: the schema only. The ledger stays the one source of
-- truth and stays insert-only. Credits now enter as grant "lots" that can
-- expire; a spend is split across lots by allocations; every refund is a new
-- lot. Prices and grant policies become effective-dated rows instead of
-- columns on a settings row.
--
-- Nothing is read or written differently until the second migration replaces
-- the functions, so the deployed app keeps working between the two.

-- ---------------------------------------------------------------------------
-- Prices and grant policies
-- ---------------------------------------------------------------------------

-- price = ceil(base_credits + credits_per_unit * units / unit_size)
-- A price changes by adding a row with a later effective_from. Old spends keep
-- pointing at the row that priced them. unit_cost_usd and margin only record
-- why the price was chosen; the charge never reads them.
create table public.credit_prices (
  id bigint generated always as identity primary key,
  feature text not null references public.ai_feature_settings (feature),
  unit text not null,
  unit_size integer not null default 1 check (unit_size >= 1),
  unit_cost_usd numeric(12, 8) check (unit_cost_usd is null or unit_cost_usd >= 0),
  margin numeric(6, 2) check (margin is null or margin > 0),
  base_credits numeric(10, 3) not null default 0 check (base_credits >= 0),
  credits_per_unit numeric(10, 3) not null check (credits_per_unit > 0),
  effective_from timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint credit_prices_feature_from_key unique (feature, effective_from)
);

-- Who gets credits, how much, how often, and when they lapse. A policy is
-- changed by closing it (effective_to) and adding a new one.
--   cadence    once = one lot per account, monthly = one per UTC month,
--              daily = one per UTC day
--   on_request the person asks for it (the self top-up); otherwise it is
--              granted automatically the first time the account is settled
--   expiry     never, days after the grant, or the end of the UTC month
create table public.credit_grant_policies (
  id bigint generated always as identity primary key,
  source text not null check (source in ('starter', 'monthly', 'self_topup')),
  amount integer not null check (amount between 1 and 1000000),
  cadence text not null check (cadence in ('once', 'monthly', 'daily')),
  on_request boolean not null default false,
  expiry_kind text not null check (expiry_kind in ('never', 'days', 'month_end')),
  expiry_days integer check (expiry_days is null or expiry_days between 1 and 3650),
  only_when_balance_below integer check (only_when_balance_below is null or only_when_balance_below > 0),
  accounts_created_from timestamptz,
  accounts_created_to timestamptz,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  constraint credit_grant_policies_expiry_shape check ((expiry_kind = 'days') = (expiry_days is not null)),
  constraint credit_grant_policies_window check (effective_to is null or effective_to > effective_from)
);

alter table public.credit_prices enable row level security;
alter table public.credit_grant_policies enable row level security;

create policy "Admins read credit prices"
  on public.credit_prices for select to authenticated using (public.is_admin());
create policy "Admins read credit grant policies"
  on public.credit_grant_policies for select to authenticated using (public.is_admin());

revoke all on table public.credit_prices, public.credit_grant_policies
  from public, anon, authenticated, service_role;
grant select on public.credit_prices, public.credit_grant_policies to authenticated, service_role;

-- The peg and default margin are documentation for the prices above.
alter table public.ai_credit_settings
  add column peg_usd numeric(10, 6) not null default 0.004 check (peg_usd > 0),
  add column default_margin numeric(6, 2) not null default 3 check (default_margin > 0);

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------

alter table public.ai_credit_ledger
  drop constraint ai_credit_ledger_shape,
  drop constraint ai_credit_ledger_kind_check,
  drop constraint ai_credit_ledger_refund_of_key;

alter table public.ai_credit_ledger
  add column source text check (
    source in ('starter', 'monthly', 'self_topup', 'admin', 'opening', 'reset', 'refund')
  ),
  add column policy_id bigint references public.credit_grant_policies (id),
  add column period_key text,
  add column expires_at timestamptz,
  add column lot_id bigint references public.ai_credit_ledger (id),
  add column reason text check (reason in ('lapsed', 'reset')),
  add column price_id bigint references public.credit_prices (id),
  add column units integer check (units is null or units > 0);

alter table public.ai_credit_ledger
  add constraint ai_credit_ledger_kind_check
    check (kind in ('spend', 'refund', 'grant', 'reset', 'expire')),
  add constraint ai_credit_ledger_policy_period check (policy_id is null or period_key is not null),
  -- reset rows are only legacy; new resets are expire and grant rows.
  add constraint ai_credit_ledger_shape check (
    case kind
      when 'spend' then feature is not null and amount > 0 and refund_of is null and lot_id is null
      when 'refund' then refund_of is not null and amount > 0
      when 'grant' then amount > 0 and refund_of is null and lot_id is null
      when 'expire' then amount > 0 and refund_of is null and lot_id is not null and reason is not null
      else amount = 0 and refund_of is null
    end
  );

-- A spend is refunded once per lot it drew from. Spends from before lots
-- have no lots, so they are refunded once as a whole.
create unique index ai_credit_ledger_refund_lot_key
  on public.ai_credit_ledger (refund_of, lot_id)
  where refund_of is not null and lot_id is not null;
create unique index ai_credit_ledger_refund_whole_key
  on public.ai_credit_ledger (refund_of)
  where refund_of is not null and lot_id is null;
-- A lot is written off once.
create unique index ai_credit_ledger_expire_key
  on public.ai_credit_ledger (lot_id)
  where kind = 'expire';
-- A policy grant happens once per source and period, whichever policy row
-- made it, so changing a policy never regrants the period that is running.
create unique index ai_credit_ledger_period_grant_key
  on public.ai_credit_ledger (user_id, source, period_key)
  where policy_id is not null;

create index ai_credit_ledger_lots_idx
  on public.ai_credit_ledger (user_id, kind, expires_at);
create index ai_credit_ledger_lot_idx
  on public.ai_credit_ledger (lot_id) where lot_id is not null;

-- Insert-only, enforced. Deleting a user still removes their rows, because the
-- delete is allowed once the user row itself is gone.
create function public._ai_credit_insert_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from public.users u where u.id = old.user_id) then
    return old;
  end if;
  raise exception '% is insert-only', tg_table_name;
end;
$$;

revoke all on function public._ai_credit_insert_only() from public, anon, authenticated;

create trigger ai_credit_ledger_insert_only
  before update or delete on public.ai_credit_ledger
  for each row execute function public._ai_credit_insert_only();

-- ---------------------------------------------------------------------------
-- Allocations: which lots a spend drew from
-- ---------------------------------------------------------------------------

create table public.ai_credit_allocations (
  spend_id bigint not null references public.ai_credit_ledger (id) on delete cascade,
  lot_id bigint not null references public.ai_credit_ledger (id) on delete cascade,
  amount integer not null check (amount > 0),
  primary key (spend_id, lot_id)
);

create index ai_credit_allocations_lot_idx on public.ai_credit_allocations (lot_id);

-- The database refuses to give out more than a lot holds, whatever the
-- function that wrote the allocation did.
create function public._ai_credit_allocation_check()
returns trigger
language plpgsql
as $$
declare
  v_amount integer;
  v_used integer;
begin
  select l.amount into v_amount
  from public.ai_credit_ledger l
  where l.id = new.lot_id and l.kind in ('grant', 'refund');
  if v_amount is null then
    raise exception 'Credits can only be taken from a grant or refund lot';
  end if;

  select coalesce(sum(a.amount), 0) into v_used
  from public.ai_credit_allocations a
  where a.lot_id = new.lot_id;
  if v_used > v_amount then
    raise exception 'Lot % holds % credits but % were taken', new.lot_id, v_amount, v_used;
  end if;
  return null;
end;
$$;

revoke all on function public._ai_credit_allocation_check() from public, anon, authenticated;

create constraint trigger ai_credit_allocations_within_lot
  after insert on public.ai_credit_allocations
  deferrable initially immediate
  for each row execute function public._ai_credit_allocation_check();

create function public._ai_credit_allocation_insert_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and not exists (
    select 1 from public.ai_credit_ledger l where l.id = old.spend_id
  ) then
    return old;
  end if;
  raise exception '% is insert-only', tg_table_name;
end;
$$;

revoke all on function public._ai_credit_allocation_insert_only() from public, anon, authenticated;

create trigger ai_credit_allocations_insert_only
  before update or delete on public.ai_credit_allocations
  for each row execute function public._ai_credit_allocation_insert_only();

alter table public.ai_credit_allocations enable row level security;
create policy "Admins read ai credit allocations"
  on public.ai_credit_allocations for select to authenticated using (public.is_admin());
revoke all on table public.ai_credit_allocations from public, anon, authenticated, service_role;
grant select on public.ai_credit_allocations to authenticated;
grant select, insert on public.ai_credit_allocations to service_role;

-- ---------------------------------------------------------------------------
-- Provider cost of a spend, recorded after the call
-- ---------------------------------------------------------------------------

create table public.ai_credit_costs (
  spend_id bigint primary key references public.ai_credit_ledger (id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  reasoning_tokens integer check (reasoning_tokens is null or reasoning_tokens >= 0),
  characters integer check (characters is null or characters >= 0),
  cost_micro_usd bigint not null check (cost_micro_usd >= 0),
  calls integer not null default 1 check (calls >= 1),
  created_at timestamptz not null default now()
);

alter table public.ai_credit_costs enable row level security;
create policy "Admins read ai credit costs"
  on public.ai_credit_costs for select to authenticated using (public.is_admin());
revoke all on table public.ai_credit_costs from public, anon, authenticated, service_role;
grant select on public.ai_credit_costs to authenticated;
grant select, insert on public.ai_credit_costs to service_role;
