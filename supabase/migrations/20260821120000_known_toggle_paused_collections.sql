-- Known/unknown is a per-term self-report on the collection page, not a
-- queue action. Pause only drops a collection from Read/Review/Quiz; it
-- must not block marking terms known or unknown while browsing.
--
-- Access check matches reset_domain_progress: owned or added to the
-- user's collection, whether or not the domain is in user_active_domains.

create or replace function public.mark_term_known(p_user_id uuid, p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.terms t
    join public.domains d on d.id = t.domain_id
    where t.id = p_term_id
      and (
        d.owner_id = p_user_id
        or exists (
          select 1
          from public.user_collection_domains ucd
          where ucd.domain_id = t.domain_id
            and ucd.user_id = p_user_id
        )
      )
  ) then
    raise exception 'That term isn''t in your collection.';
  end if;

  insert into public.user_progress (user_id, term_id, known_at)
  values (p_user_id, p_term_id, now())
  on conflict (user_id, term_id) do nothing;

  update public.telegram_links
  set all_caught_up_at = null, updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke all on function public.mark_term_known(uuid, uuid) from public;
grant execute on function public.mark_term_known(uuid, uuid) to service_role;

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
    join public.domains d on d.id = t.domain_id
    where t.id = p_term_id
      and (
        d.owner_id = p_user_id
        or exists (
          select 1
          from public.user_collection_domains ucd
          where ucd.domain_id = t.domain_id
            and ucd.user_id = p_user_id
        )
      )
  ) then
    raise exception 'That term isn''t in your collection.';
  end if;

  delete from public.user_progress
  where user_id = p_user_id
    and term_id = p_term_id;
end;
$$;

revoke all on function public.clear_term_known(uuid, uuid) from public;
grant execute on function public.clear_term_known(uuid, uuid) to service_role;
