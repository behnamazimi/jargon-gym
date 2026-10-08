-- Credit ledger cleanup from the database audit.
--
-- 1. ai_credit_ledger.billable was always true (a CHECK said so) and only fed a
--    composite foreign key. Whether a feature can be charged is decided by
--    reserve_ai_credits, which reads ai_feature_settings.billable.
-- 2. ai_credit_settings.lots_after_id marked where the old two-pool ledger
--    ended. The rows before it are told apart from lots by their shape instead:
--    a lot (grant or refund) always carries a source, the old rows never did.
--
-- Behaviour is unchanged. The same lots, balances, refunds and admin usage come
-- out for the data that exists today.

-- billable ------------------------------------------------------------------

alter table public.ai_credit_ledger drop constraint ai_credit_ledger_feature_fkey;
alter table public.ai_credit_ledger drop constraint ai_credit_ledger_billable_true;
alter table public.ai_credit_ledger drop column billable;
alter table public.ai_credit_ledger
  add constraint ai_credit_ledger_feature_fkey
  foreign key (feature) references public.ai_feature_settings (feature);
alter table public.ai_feature_settings drop constraint ai_feature_settings_feature_billable_key;

-- lots_after_id -------------------------------------------------------------

-- Not validated: the refunds written by the old model have no source and stay
-- as history. Every new grant and refund must have one.
alter table public.ai_credit_ledger
  add constraint ai_credit_ledger_lot_has_source
  check (kind not in ('grant', 'refund') or source is not null) not valid;

create or replace function public._ai_credit_lots(p_user_id uuid)
returns table (lot_id bigint, amount integer, remaining integer, expires_at timestamptz, created_at timestamptz)
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
    and l.kind in ('grant', 'refund')
    and l.source is not null
$$;

create or replace function public.refund_ai_credits(p_ledger_id bigint, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.ai_credit_ledger;
  v_now timestamptz;
  v_note text := left(nullif(trim(p_reason), ''), 300);
begin
  select * into s from public.ai_credit_ledger where id = p_ledger_id and kind = 'spend';
  if not found then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(s.user_id::text, 0));
  v_now := clock_timestamp();

  -- A spend from the old model has no lots to give back to.
  if not exists (select 1 from public.ai_credit_allocations a where a.spend_id = s.id) then
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

-- Counts what happened in the lot model only: lots (they carry a source),
-- their expiry rows, and spends that were taken from lots.
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
  where l.source is not null
     or l.kind = 'expire'
     or (l.kind = 'spend'
         and exists (select 1 from public.ai_credit_allocations a where a.spend_id = l.id))
  group by u.id, u.email
  order by max(l.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

alter table public.ai_credit_settings drop column lots_after_id;
