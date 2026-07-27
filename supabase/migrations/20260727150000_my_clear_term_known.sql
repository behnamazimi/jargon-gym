-- Clearing known status used direct DELETE, but RLS policies called
-- telegram_review_domain_ids(uuid) which authenticated cannot execute.
-- Marking known already goes through my_mark_term_known (security definer).

create or replace function public.clear_term_known(p_user_id uuid, p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and t.domain_id in (select public.telegram_review_domain_ids(p_user_id))
  ) then
    raise exception 'Term not in review pool';
  end if;

  delete from public.user_progress
  where user_id = p_user_id
    and term_id = p_term_id;
end;
$$;

revoke all on function public.clear_term_known(uuid, uuid) from public;
grant execute on function public.clear_term_known(uuid, uuid) to service_role;

create or replace function public.my_clear_term_known(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.clear_term_known(auth.uid(), p_term_id);
end;
$$;

revoke all on function public.my_clear_term_known(uuid) from public;
grant execute on function public.my_clear_term_known(uuid) to authenticated;

-- Fix RLS policies to use the authenticated wrapper for review-pool checks.
drop policy if exists "Users insert own progress in review pool" on public.user_progress;
drop policy if exists "Users update own progress in review pool" on public.user_progress;
drop policy if exists "Users delete own progress in review pool" on public.user_progress;

create policy "Users insert own progress in review pool"
  on public.user_progress for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.terms t
      where t.id = term_id
        and t.domain_id in (select public.my_review_domain_ids())
    )
  );

create policy "Users update own progress in review pool"
  on public.user_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.terms t
      where t.id = term_id
        and t.domain_id in (select public.my_review_domain_ids())
    )
  );

create policy "Users delete own progress in review pool"
  on public.user_progress for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.terms t
      where t.id = term_id
        and t.domain_id in (select public.my_review_domain_ids())
    )
  );
