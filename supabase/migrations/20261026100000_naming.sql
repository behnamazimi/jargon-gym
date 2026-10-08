-- Naming cleanup from the database audit. No data changes.
--
-- triage_not_yet is a person's list of terms they set aside in Triage. It is
-- named after the button, not the thing, so it becomes triage_deferrals, and
-- the three functions that write it follow. Renaming a table does not rewrite
-- function bodies, so those functions are created again.
--
-- This is not compatible with the previous app build, which reads the old table
-- and calls the old function names; Triage is the only screen that uses them.

alter table public.user_settings
  rename constraint user_llm_settings_pkey to user_settings_pkey;

alter table public.triage_not_yet rename to triage_deferrals;
alter table public.triage_deferrals
  rename constraint triage_not_yet_pkey to triage_deferrals_pkey;
alter table public.triage_deferrals
  rename constraint triage_not_yet_term_id_fkey to triage_deferrals_term_id_fkey;
alter table public.triage_deferrals
  rename constraint triage_not_yet_user_id_fkey to triage_deferrals_user_id_fkey;
alter index public.triage_not_yet_term_id_idx rename to triage_deferrals_term_id_idx;
alter policy "Users read their own triage not yet" on public.triage_deferrals
  rename to "Users read their own triage deferrals";

drop function public.my_add_not_yet_terms(uuid[]);
drop function public.my_remove_not_yet_term(uuid);
drop function public.my_clear_not_yet_collection(uuid);

create function public.my_add_deferred_terms(p_term_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.triage_deferrals (user_id, term_id)
  select auth.uid(), t.id
  from public.terms t
  where t.id = any(p_term_ids)
  on conflict do nothing;
end;
$$;

create function public.my_remove_deferred_term(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.triage_deferrals
  where user_id = auth.uid() and term_id = p_term_id;
end;
$$;

create function public.my_clear_deferred_collection(p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.triage_deferrals n
  using public.terms t
  where n.user_id = auth.uid()
    and n.term_id = t.id
    and t.collection_id = p_collection_id;
end;
$$;

revoke all on function public.my_add_deferred_terms(uuid[]) from public, anon;
revoke all on function public.my_remove_deferred_term(uuid) from public, anon;
revoke all on function public.my_clear_deferred_collection(uuid) from public, anon;
grant execute on function public.my_add_deferred_terms(uuid[]) to authenticated;
grant execute on function public.my_remove_deferred_term(uuid) to authenticated;
grant execute on function public.my_clear_deferred_collection(uuid) to authenticated;

create or replace function public.reset_collection_progress(p_user_id uuid, p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_ids uuid[];
begin
  if not exists (
    select 1 from public.collections d
    where d.id = p_collection_id and d.owner_id = p_user_id
  ) and not exists (
    select 1 from public.user_collections ucd
    where ucd.collection_id = p_collection_id and ucd.user_id = p_user_id
  ) then
    raise exception 'Collection not in user collection';
  end if;

  select coalesce(array_agg(t.id), '{}'::uuid[])
  into v_term_ids
  from public.terms t
  where t.collection_id = p_collection_id;

  if cardinality(v_term_ids) = 0 then
    return;
  end if;

  delete from public.review_state
  where user_id = p_user_id
    and term_id = any(v_term_ids);

  delete from public.triage_deferrals
  where user_id = p_user_id
    and term_id = any(v_term_ids);
end;
$$;
