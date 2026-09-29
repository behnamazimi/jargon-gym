-- One settings row per AI feature, replacing the per-feature columns and
-- tables that grew up separately. This is the expand step: nothing existing is
-- dropped or renamed, and the deployed app keeps working on the old columns.
--
--   * ai_feature_settings   - switch, who may use it, cap, credit cost.
--   * ai_feature_allowlist  - per-feature allowlist (never one global list).
--   * ai_feature_runs       - one in-flight run per user and feature.
--
-- Features that cost credits are "billable". Only those may appear in the
-- credit ledger; narration is never billable.

-- ---------------------------------------------------------------------------
-- Feature settings
-- ---------------------------------------------------------------------------

create table public.ai_feature_settings (
  feature text primary key,
  billable boolean not null,
  enabled boolean not null default false,
  access_mode text not null default 'admin'
    check (access_mode in ('everyone', 'allowlist', 'admin')),
  -- Rolling 24 hours, counted per user and feature. Null means no cap.
  daily_cap integer check (daily_cap is null or daily_cap > 0),
  credit_cost integer check (credit_cost is null or credit_cost between 1 and 1000),
  unit text not null,
  updated_at timestamptz not null default now(),
  -- Billable exactly when a credit cost is set.
  constraint ai_feature_settings_cost_shape check (billable = (credit_cost is not null)),
  -- Not redundant with the primary key: it is the target of the ledger's
  -- (feature, billable) foreign key, which keeps non-billable features out.
  constraint ai_feature_settings_feature_billable_key unique (feature, billable)
);

create trigger ai_feature_settings_set_updated_at
  before update on public.ai_feature_settings
  for each row
  execute function public.set_updated_at();

-- Today's behavior, copied so nothing changes when the app starts reading this.
insert into public.ai_feature_settings (feature, billable, enabled, access_mode, daily_cap, credit_cost, unit)
select 'quiz', true, true, 'everyone', null, quiz_credits_per_question, 'question'
from public.ai_credit_settings where id;

insert into public.ai_feature_settings (feature, billable, enabled, access_mode, daily_cap, credit_cost, unit)
select 'story', true, true, 'everyone', null, story_credits_per_term, 'term'
from public.ai_credit_settings where id;

insert into public.ai_feature_settings (feature, billable, enabled, access_mode, daily_cap, unit)
values ('term_evaluation', false, true, 'admin', null, 'term');

insert into public.ai_feature_settings (feature, billable, enabled, access_mode, daily_cap, unit)
select 'narration_term', false, s.enabled, 'allowlist', null, 'clip'
from public.narration_settings s where s.id;

insert into public.ai_feature_settings (feature, billable, enabled, access_mode, daily_cap, unit)
select 'narration_story', false, s.enabled, 'allowlist', 20, 'clip'
from public.narration_settings s where s.id;

alter table public.ai_feature_settings enable row level security;

create policy "Signed-in users read ai feature settings"
  on public.ai_feature_settings for select
  to authenticated
  using (true);

create policy "Admins update ai feature settings"
  on public.ai_feature_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins change only the switch, who may use it, and the cap. Costs follow
-- ai_credit_settings for now, so they can't drift.
revoke all on table public.ai_feature_settings from public, anon, authenticated, service_role;
grant select on public.ai_feature_settings to authenticated, service_role;
grant update (enabled, access_mode, daily_cap) on public.ai_feature_settings to authenticated;

-- Keep credit_cost in step with the costs the admin page still edits.
create function public.sync_ai_feature_costs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_feature_settings set credit_cost = new.quiz_credits_per_question
  where feature = 'quiz';
  update public.ai_feature_settings set credit_cost = new.story_credits_per_term
  where feature = 'story';
  return new;
end;
$$;

revoke all on function public.sync_ai_feature_costs() from public, anon, authenticated;

create trigger ai_credit_settings_sync_feature_costs
  after update of quiz_credits_per_question, story_credits_per_term on public.ai_credit_settings
  for each row
  execute function public.sync_ai_feature_costs();

-- ---------------------------------------------------------------------------
-- Allowlist (per feature)
-- ---------------------------------------------------------------------------

create table public.ai_feature_allowlist (
  feature text not null references public.ai_feature_settings (feature) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feature, user_id)
);

-- Everyone on today's narration allowlist stays on it for both narration features.
insert into public.ai_feature_allowlist (feature, user_id)
select f.feature, a.user_id
from public.narration_allowlist a
cross join (values ('narration_term'), ('narration_story')) as f (feature);

alter table public.ai_feature_allowlist enable row level security;

create policy "Admins manage ai feature allowlist"
  on public.ai_feature_allowlist for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.ai_feature_allowlist from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.ai_feature_allowlist to authenticated;
grant select on public.ai_feature_allowlist to service_role;

-- ---------------------------------------------------------------------------
-- Ledger: only billable features may be spent
-- ---------------------------------------------------------------------------

alter table public.ai_credit_ledger drop constraint if exists ai_credit_ledger_feature_check;

alter table public.ai_credit_ledger
  add column billable boolean not null default true,
  add constraint ai_credit_ledger_billable_true check (billable),
  add constraint ai_credit_ledger_feature_fkey
    foreign key (feature, billable) references public.ai_feature_settings (feature, billable);

-- Same signature and result as before. Refuses features that are not billable
-- and reports "disabled" when the feature is switched off.
create or replace function public.reserve_ai_credits(p_user_id uuid, p_feature text, p_cost integer)
returns table (status text, remaining integer, ledger_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  f public.ai_feature_settings;
  v_ledger_id bigint;
begin
  if p_cost is null or p_cost <= 0 then
    raise exception 'Cost must be positive';
  end if;

  select * into f from public.ai_feature_settings where feature = p_feature;
  if not found or not f.billable then
    raise exception 'Feature % cannot be charged in credits', p_feature;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into b from public.ai_credit_balance(p_user_id);

  if not b.enabled or not f.enabled then
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

-- ---------------------------------------------------------------------------
-- In-flight guard: one running request per user and feature
-- ---------------------------------------------------------------------------

create table public.ai_feature_runs (
  user_id uuid not null references public.users (id) on delete cascade,
  feature text not null references public.ai_feature_settings (feature) on delete cascade,
  token uuid not null,
  started_at timestamptz not null default now(),
  primary key (user_id, feature)
);

alter table public.ai_feature_runs enable row level security;

revoke all on table public.ai_feature_runs from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.ai_feature_runs to service_role;

-- Returns a token when this request may run, or null while another one is
-- running. A run that never finishes (the process was killed) frees itself
-- after the timeout. One statement, so two requests cannot both win.
create function public.begin_ai_run(p_user_id uuid, p_feature text, p_ttl_seconds integer default 120)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into public.ai_feature_runs as r (user_id, feature, token)
  values (p_user_id, p_feature, gen_random_uuid())
  on conflict (user_id, feature) do update
    set token = excluded.token, started_at = now()
    where r.started_at < now() - make_interval(secs => p_ttl_seconds)
  returning r.token;
$$;

-- Only the run that holds the token can release it, so a slow run can't free a
-- newer run's guard.
create function public.end_ai_run(p_user_id uuid, p_feature text, p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_feature_runs
  where user_id = p_user_id and feature = p_feature and token = p_token;
$$;

revoke all on function public.begin_ai_run(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.begin_ai_run(uuid, text, integer) to service_role;
revoke all on function public.end_ai_run(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.end_ai_run(uuid, text, uuid) to service_role;
