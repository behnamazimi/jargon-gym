-- Align smart-queue outcomes across surfaces:
-- - add 'shown' (delivery/reveal) distinct from 'skipped' (explicit skip)
-- - no-increment updates only change last_outcome (do not bump last_seen_at)

alter table public.review_state
  drop constraint if exists review_state_last_outcome_check;

alter table public.review_state
  add constraint review_state_last_outcome_check
  check (last_outcome in (
    'unseen', 'shown', 'learning', 'solid', 'skipped', 'verified', 'forgot'
  ));

comment on column public.review_state.last_outcome is
  'Last event: unseen (default), shown (delivered/revealed), learning, solid, skipped (explicit), verified, forgot.';

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
  if p_outcome not in (
    'unseen', 'shown', 'learning', 'solid', 'skipped', 'verified', 'forgot'
  ) then
    raise exception 'Invalid review outcome: %', p_outcome;
  end if;

  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.review_state (user_id, term_id, seen_count, last_seen_at, last_outcome)
  values (
    p_user_id,
    p_term_id,
    case when p_increment_seen then 1 else 0 end,
    case when p_increment_seen then now() else null end,
    p_outcome
  )
  on conflict (user_id, term_id) do update
  set
    seen_count = case
      when p_increment_seen then public.review_state.seen_count + 1
      else public.review_state.seen_count
    end,
    last_seen_at = case
      when p_increment_seen then now()
      else public.review_state.last_seen_at
    end,
    last_outcome = p_outcome;
end;
$$;

comment on function public.pick_multiple_unknown_terms(uuid, int, uuid[]) is
  'DEPRECATED: use smart-queue pickReviewTerms. Kept temporarily for compatibility.';

comment on function public.pick_multiple_known_terms(uuid, int, uuid[]) is
  'DEPRECATED: use smart-queue pickReviewTerms. Kept temporarily for compatibility.';

comment on function public.pick_random_unknown_term(uuid) is
  'DEPRECATED: use smart-queue pickReviewTerms. Kept temporarily for compatibility.';
