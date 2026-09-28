-- AI credits: lets every account use the app's own AI key for AI quizzes and
-- Stories until they save a key of their own. Usage is an append-only ledger;
-- the balance is derived from it, never stored, so it can't drift.
--
-- Two pools feed a balance:
--   * starter - `default_allowance`, lifetime.
--   * monthly - `monthly_refill`, resets each UTC calendar month, no rollover.
-- Spending draws the monthly pool first, then the starter pool. Admin grants
-- add to the starter pool. A reset clears usage but keeps every row.

-- ---------------------------------------------------------------------------
-- Settings (singleton, admin-managed)
-- ---------------------------------------------------------------------------

create table public.ai_credit_settings (
  id boolean primary key default true,
  enabled boolean not null default true,
  default_allowance integer not null default 100
    check (default_allowance between 0 and 1000000),
  monthly_refill integer not null default 30 check (monthly_refill between 0 and 1000000),
  quiz_credits_per_question integer not null default 1
    check (quiz_credits_per_question between 1 and 1000),
  story_credits_per_term integer not null default 1
    check (story_credits_per_term between 1 and 1000),
  updated_at timestamptz not null default now(),
  constraint ai_credit_settings_singleton check (id)
);

insert into public.ai_credit_settings (id) values (true);

create trigger ai_credit_settings_set_updated_at
  before update on public.ai_credit_settings
  for each row
  execute function public.set_updated_at();

alter table public.ai_credit_settings enable row level security;

create policy "Admins manage ai credit settings"
  on public.ai_credit_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.ai_credit_settings from public, anon, authenticated, service_role;
grant select, update on public.ai_credit_settings to authenticated;
grant select on public.ai_credit_settings to service_role;

-- ---------------------------------------------------------------------------
-- Ledger (append-only; written only by the functions below)
-- ---------------------------------------------------------------------------

create table public.ai_credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('spend', 'refund', 'grant', 'reset')),
  feature text check (feature in ('quiz', 'story')),
  amount integer not null check (amount >= 0),
  refund_of bigint unique references public.ai_credit_ledger (id),
  created_by uuid references public.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint ai_credit_ledger_shape check (
    case kind
      when 'spend' then feature is not null and amount > 0 and refund_of is null
      when 'refund' then refund_of is not null and amount > 0
      when 'grant' then amount > 0 and refund_of is null
      else amount = 0 and refund_of is null
    end
  )
);

create index ai_credit_ledger_user_idx on public.ai_credit_ledger (user_id, id);

alter table public.ai_credit_ledger enable row level security;

create policy "Admins read ai credit ledger"
  on public.ai_credit_ledger for select
  to authenticated
  using (public.is_admin());

revoke all on table public.ai_credit_ledger from public, anon, authenticated, service_role;
grant select on public.ai_credit_ledger to authenticated;
grant select, insert on public.ai_credit_ledger to service_role;

-- ---------------------------------------------------------------------------
-- Balance
-- ---------------------------------------------------------------------------

create function public.ai_credit_balance(p_user_id uuid)
returns table (
  enabled boolean,
  total integer,
  remaining integer,
  quiz_credits_per_question integer,
  story_credits_per_term integer
)
language plpgsql
stable
security definer
set search_path = public
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

  -- Net spend per UTC month: spends after the last reset that were not refunded.
  with monthly as (
    select
      date_trunc('month', l.created_at at time zone 'utc') as month,
      sum(l.amount)::integer as spent
    from public.ai_credit_ledger l
    where l.user_id = p_user_id
      and l.kind = 'spend'
      and l.id > v_reset_id
      and not exists (
        select 1 from public.ai_credit_ledger r where r.refund_of = l.id
      )
    group by 1
  )
  select
    coalesce(sum(greatest(0, m.spent - s.monthly_refill)), 0),
    coalesce(
      sum(m.spent) filter (
        where m.month = date_trunc('month', now() at time zone 'utc')
      ),
      0
    )
  into v_starter_used, v_month_spent
  from monthly m;

  return query select
    s.enabled,
    s.default_allowance + v_granted + s.monthly_refill,
    greatest(0, s.default_allowance + v_granted - v_starter_used)
      + greatest(0, s.monthly_refill - v_month_spent),
    s.quiz_credits_per_question,
    s.story_credits_per_term;
end;
$$;

revoke all on function public.ai_credit_balance(uuid) from public, anon, authenticated;
grant execute on function public.ai_credit_balance(uuid) to service_role;

-- The signed-in user's own state (setup screens, Settings, menu).
create function public.my_ai_credit_state()
returns table (
  enabled boolean,
  total integer,
  remaining integer,
  quiz_credits_per_question integer,
  story_credits_per_term integer
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

  return query select * from public.ai_credit_balance(auth.uid());
end;
$$;

revoke all on function public.my_ai_credit_state() from public, anon;
grant execute on function public.my_ai_credit_state() to authenticated;

-- ---------------------------------------------------------------------------
-- Reserve / refund
-- ---------------------------------------------------------------------------

-- Charges before the model call. The per-user advisory lock makes two parallel
-- requests check and spend one after the other, so both can't pass the cap.
create function public.reserve_ai_credits(p_user_id uuid, p_feature text, p_cost integer)
returns table (status text, remaining integer, ledger_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_ledger_id bigint;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'Cost must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into b from public.ai_credit_balance(p_user_id);

  if not b.enabled then
    return query select 'disabled'::text, b.remaining, null::bigint;
    return;
  end if;

  if p_cost > b.remaining then
    return query select 'insufficient'::text, b.remaining, null::bigint;
    return;
  end if;

  insert into public.ai_credit_ledger (user_id, kind, feature, amount)
  values (p_user_id, 'spend', p_feature, p_cost)
  returning id into v_ledger_id;

  return query select 'ok'::text, b.remaining - p_cost, v_ledger_id;
end;
$$;

revoke all on function public.reserve_ai_credits(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(uuid, text, integer) to service_role;

-- Safe to call twice: the unique refund_of makes the second call a no-op.
create function public.refund_ai_credits(p_ledger_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_credit_ledger (user_id, kind, feature, amount, refund_of)
  select l.user_id, 'refund', l.feature, l.amount, l.id
  from public.ai_credit_ledger l
  where l.id = p_ledger_id and l.kind = 'spend'
  on conflict (refund_of) do nothing;
$$;

revoke all on function public.refund_ai_credits(bigint) from public, anon, authenticated;
grant execute on function public.refund_ai_credits(bigint) to service_role;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

create function public.admin_grant_ai_credits(p_user_id uuid, p_amount integer, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can grant AI credits';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'Amount must be between 1 and 10000';
  end if;

  insert into public.ai_credit_ledger (user_id, kind, amount, created_by, note)
  values (p_user_id, 'grant', p_amount, auth.uid(), nullif(trim(p_note), ''));
end;
$$;

revoke all on function public.admin_grant_ai_credits(uuid, integer, text) from public, anon;
grant execute on function public.admin_grant_ai_credits(uuid, integer, text) to authenticated;

-- Clears usage from now on; earlier rows stay. Grants are kept.
create function public.admin_reset_ai_credits(p_user_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can reset AI credits';
  end if;

  insert into public.ai_credit_ledger (user_id, kind, amount, created_by, note)
  values (p_user_id, 'reset', 0, auth.uid(), nullif(trim(p_note), ''));
end;
$$;

revoke all on function public.admin_reset_ai_credits(uuid, text) from public, anon;
grant execute on function public.admin_reset_ai_credits(uuid, text) to authenticated;

create function public.admin_ai_credit_usage(p_limit integer default 200)
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
        and l.id > rs.reset_id
        and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id)
    ), 0)::integer,
    coalesce(sum(l.amount) filter (where l.kind = 'grant'), 0)::integer,
    (select b.remaining from public.ai_credit_balance(u.id) b),
    max(l.created_at)
  from public.users u
  join public.ai_credit_ledger l on l.user_id = u.id
  cross join lateral (
    select coalesce(max(r.id), 0) as reset_id
    from public.ai_credit_ledger r
    where r.user_id = u.id and r.kind = 'reset'
  ) rs
  group by u.id, u.email, rs.reset_id
  order by max(l.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

revoke all on function public.admin_ai_credit_usage(integer) from public, anon;
grant execute on function public.admin_ai_credit_usage(integer) to authenticated;
