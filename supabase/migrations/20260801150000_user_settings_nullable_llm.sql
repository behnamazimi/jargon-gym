-- Allow settings rows that only store review/quiz preferences (no LLM key yet).
alter table public.user_settings
  alter column provider drop not null,
  alter column api_key_encrypted drop not null,
  alter column api_key_last4 drop not null;

-- Ensure outcome validation is present (idempotent replace).
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
