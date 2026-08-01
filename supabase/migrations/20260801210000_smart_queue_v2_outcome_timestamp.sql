-- Smart queue v2: last_seen_at = last queue event (every outcome write),
-- not only when seen_count increments. Enables solid cooldown after
-- mark-known without increment.

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
declare
  v_outcome public.review_outcome;
begin
  begin
    v_outcome := p_outcome::public.review_outcome;
  exception
    when invalid_text_representation then
      raise exception 'Invalid review outcome: %', p_outcome;
  end;

  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  insert into public.review_state (user_id, term_id, seen_count, last_seen_at, last_outcome)
  values (
    p_user_id,
    p_term_id,
    case when p_increment_seen then 1 else 0 end,
    now(),
    v_outcome
  )
  on conflict (user_id, term_id) do update
  set
    seen_count = case
      when p_increment_seen then public.review_state.seen_count + 1
      else public.review_state.seen_count
    end,
    last_seen_at = now(),
    last_outcome = v_outcome;
end;
$$;

comment on column public.review_state.last_seen_at is
  'Timestamp of the last queue event (any outcome write). Used for staleness and solid cooldown.';

revoke all on function public.record_review_outcome(uuid, uuid, text, boolean) from public;
grant execute on function public.record_review_outcome(uuid, uuid, text, boolean) to service_role;
