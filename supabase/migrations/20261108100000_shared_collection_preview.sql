-- What a shared link (/c/<id>) shows: a shared collection's name, kind, the
-- count of its finished terms and up to 10 of them picked at random. Signed-out
-- visitors can't read member collections through RLS, so this definer function
-- returns only what the page needs, and nothing at all once the collection is
-- unshared or its sharing is blocked. No owner details leave it.
-- Rollback: drop function public.get_shared_collection_preview(uuid);
--           drop function public.shared_collection_link(uuid);

create or replace function public.get_shared_collection_preview(p_collection_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'kind', c.kind,
    'language', c.language,
    'is_public', c.is_public,
    'slug', c.slug,
    'term_count', (
      select count(*)
      from public.terms t
      where t.collection_id = c.id
        and nullif(btrim(t.definition), '') is not null
    ),
    'terms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'term', picked.term,
        'definition', picked.definition,
        'example', picked.example
      ))
      from (
        select t.term, t.definition, t.example
        from public.terms t
        where t.collection_id = c.id
          and nullif(btrim(t.definition), '') is not null
        order by random()
        limit 10
      ) picked
    ), '[]'::jsonb)
  )
  from public.collections c
  where c.id = p_collection_id
    and c.visibility = 'shared'
    and c.share_blocked_at is null;
$function$;

revoke all on function public.get_shared_collection_preview(uuid) from public;
grant execute on function public.get_shared_collection_preview(uuid) to anon, authenticated;

-- The proxy's check before /c/<id> renders, so a dead link is a real 404 and a
-- built-in's link a real redirect: null when the link doesn't work, otherwise
-- the public page's slug (null for member collections).
create or replace function public.shared_collection_link(p_collection_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object('public_slug', case when c.is_public then c.slug end)
  from public.collections c
  where c.id = p_collection_id
    and c.visibility = 'shared'
    and c.share_blocked_at is null;
$function$;

revoke all on function public.shared_collection_link(uuid) from public;
grant execute on function public.shared_collection_link(uuid) to anon, authenticated;
