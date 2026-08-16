-- Built-in collections that can be marked public and get static SEO pages.

alter table public.domains
  add column is_builtin boolean not null default false,
  add column is_public boolean not null default false,
  add column slug text,
  add column updated_at timestamptz not null default now();

alter table public.terms
  add column slug text,
  add column updated_at timestamptz not null default now();

alter table public.domains
  add constraint domains_public_requires_builtin check (not is_public or is_builtin);

create unique index domains_slug_idx on public.domains (slug) where slug is not null;
create unique index terms_domain_slug_idx on public.terms (domain_id, slug) where slug is not null;

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger domains_set_updated_at
  before update on public.domains
  for each row
  execute function public.set_updated_at();

create trigger terms_set_updated_at
  before update on public.terms
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Public read access for published collections
-- ---------------------------------------------------------------------------

create policy "Anyone can read public domains"
  on public.domains for select
  to anon
  using (is_public = true);

create policy "Anyone can read public terms"
  on public.terms for select
  to anon
  using (
    exists (
      select 1 from public.domains d
      where d.id = terms.domain_id and d.is_public = true
    )
  );

create policy "Anyone can read public term relationships"
  on public.term_relationships for select
  to anon
  using (
    exists (
      select 1 from public.terms t
      join public.domains d on d.id = t.domain_id
      where t.id = term_relationships.source_term_id and d.is_public = true
    )
    and exists (
      select 1 from public.terms t
      join public.domains d on d.id = t.domain_id
      where t.id = term_relationships.target_term_id and d.is_public = true
    )
  );

grant select on public.domains to anon;
grant select on public.terms to anon;
grant select on public.term_relationships to anon;

-- ---------------------------------------------------------------------------
-- Admin curation: flip is_builtin/is_public/slug on any domain
-- ---------------------------------------------------------------------------

create policy "Admins update any domain"
  on public.domains for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins update any term"
  on public.terms for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
