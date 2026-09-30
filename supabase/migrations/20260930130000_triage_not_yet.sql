-- Triage "Not yet": terms a user set aside while sorting, kept per user so
-- the choice follows them across devices. Triage-only — TRACE, Read, Review,
-- Quiz and Mastery never read it.

create table public.triage_not_yet (
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id)
);

alter table public.triage_not_yet enable row level security;

grant select on public.triage_not_yet to authenticated;

create policy "Users read their own triage not yet"
  on public.triage_not_yet for select
  using (user_id = auth.uid());

-- Writes go through the RPCs below, like review_state.

create function public.my_add_not_yet_terms(p_term_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.triage_not_yet (user_id, term_id)
  select auth.uid(), t.id
  from public.terms t
  where t.id = any(p_term_ids)
  on conflict do nothing;
end;
$$;

revoke all on function public.my_add_not_yet_terms(uuid[]) from public;
grant execute on function public.my_add_not_yet_terms(uuid[]) to authenticated;

create function public.my_remove_not_yet_term(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.triage_not_yet
  where user_id = auth.uid() and term_id = p_term_id;
end;
$$;

revoke all on function public.my_remove_not_yet_term(uuid) from public;
grant execute on function public.my_remove_not_yet_term(uuid) to authenticated;

create function public.my_clear_not_yet_domain(p_domain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.triage_not_yet n
  using public.terms t
  where n.user_id = auth.uid()
    and n.term_id = t.id
    and t.domain_id = p_domain_id;
end;
$$;

revoke all on function public.my_clear_not_yet_domain(uuid) from public;
grant execute on function public.my_clear_not_yet_domain(uuid) to authenticated;

-- Resetting a collection's progress also gives its Triage deck a fresh start.
create or replace function public.reset_domain_progress(p_user_id uuid, p_domain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_ids uuid[];
begin
  if not exists (
    select 1 from public.domains d
    where d.id = p_domain_id and d.owner_id = p_user_id
  ) and not exists (
    select 1 from public.user_collection_domains ucd
    where ucd.domain_id = p_domain_id and ucd.user_id = p_user_id
  ) then
    raise exception 'Domain not in user collection';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into v_term_ids
  from public.terms t
  where t.domain_id = p_domain_id;

  if cardinality(v_term_ids) = 0 then
    return;
  end if;

  delete from public.review_state
  where user_id = p_user_id
    and term_id = any(v_term_ids);

  delete from public.triage_not_yet
  where user_id = p_user_id
    and term_id = any(v_term_ids);
end;
$$;
