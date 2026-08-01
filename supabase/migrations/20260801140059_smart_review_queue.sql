-- Smart review queue: replace random selection with priority-scored queue.
-- Tracks per-term review history and user preset for scoring weights.

-- Review state table: per-user, per-term review history
create table public.review_state (
  user_id      uuid not null references public.users(id) on delete cascade,
  term_id      uuid not null references public.terms(id) on delete cascade,
  seen_count   int not null default 0 check (seen_count >= 0),
  last_seen_at timestamptz,
  last_outcome text not null default 'unseen'
    check (last_outcome in ('unseen','learning','solid','skipped','verified','forgot')),
  primary key (user_id, term_id)
);

comment on table public.review_state is
  'Per-user, per-term review history for smart queue scoring. Missing rows treated as unseen.';

comment on column public.review_state.seen_count is
  'Number of times user has seen this term. 0 = unseen (row may not exist).';

comment on column public.review_state.last_seen_at is
  'Last time this term was shown to the user. Null for unseen terms.';

comment on column public.review_state.last_outcome is
  'Last rating: unseen (default), learning (struggling), solid (got it), skipped, verified (known refresh), forgot (marked unknown again).';

create index review_state_user_last_seen_idx on public.review_state(user_id, last_seen_at);

alter table public.review_state enable row level security;

create policy "Users manage own review state"
  on public.review_state for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.review_state to authenticated;
grant select, insert, update, delete on public.review_state to service_role;

-- Add review preset to user_settings
alter table public.user_settings
  add column if not exists review_preset text not null default 'balanced'
  check (review_preset in ('balanced', 'learn_new', 'drill_weak'));

-- Allow settings rows that only store review preferences (no LLM key yet).
alter table public.user_settings
  alter column provider drop not null,
  alter column api_key_encrypted drop not null,
  alter column api_key_last4 drop not null;

comment on column public.user_settings.review_preset is
  'Smart queue scoring preset: balanced (default), learn_new (prioritize unseen), drill_weak (prioritize struggling terms).';

-- RPC: record review outcome (upsert review_state)
create or replace function public.record_review_outcome(
  p_user_id uuid,
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_outcome not in ('unseen', 'learning', 'solid', 'skipped', 'verified', 'forgot') then
    raise exception 'Invalid review outcome: %', p_outcome;
  end if;

  -- Validate term is in user's review pool
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  -- Upsert review state
  insert into public.review_state (user_id, term_id, seen_count, last_seen_at, last_outcome)
  values (
    p_user_id,
    p_term_id,
    case when p_increment_seen then 1 else 0 end,
    now(),
    p_outcome
  )
  on conflict (user_id, term_id) do update
  set
    seen_count = case
      when p_increment_seen then public.review_state.seen_count + 1
      else public.review_state.seen_count
    end,
    last_seen_at = now(),
    last_outcome = p_outcome;
end;
$$;

revoke all on function public.record_review_outcome(uuid, uuid, text, boolean) from public;
grant execute on function public.record_review_outcome(uuid, uuid, text, boolean) to service_role;

-- Auth wrapper for web (session-based)
create or replace function public.my_record_review_outcome(
  p_term_id uuid,
  p_outcome text,
  p_increment_seen boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  perform public.record_review_outcome(v_user_id, p_term_id, p_outcome, p_increment_seen);
end;
$$;

revoke all on function public.my_record_review_outcome(uuid, text, boolean) from public;
grant execute on function public.my_record_review_outcome(uuid, text, boolean) to authenticated;
