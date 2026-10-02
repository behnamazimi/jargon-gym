-- Per-collection counts of the terms Read, Review, Quiz and Stories can serve:
-- terms with a definition, minus the ones this user marked known (those are
-- skipped by every study mode). Same signature as before.

create or replace function public.my_study_collection_term_counts()
returns table (domain_id uuid, term_count int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select t.domain_id, count(*)::int
  from public.terms t
  where t.definition is not null
    and t.domain_id in (
      select d.id from public.domains d where d.owner_id = auth.uid()
      union
      select ucd.domain_id from public.user_collection_domains ucd where ucd.user_id = auth.uid()
    )
    and not exists (
      select 1
      from public.review_state rs
      where rs.user_id = auth.uid()
        and rs.term_id = t.id
        and rs.marked_known_at is not null
    )
  group by t.domain_id;
end;
$$;
