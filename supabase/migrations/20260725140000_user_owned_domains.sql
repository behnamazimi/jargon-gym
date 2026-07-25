-- User-owned domains with collection membership and active review selection.

create type public.domain_visibility as enum ('private', 'shared');

-- Wipe existing global catalog (seed will no longer insert sample domains).
truncate public.term_relationships, public.user_progress, public.terms, public.domains cascade;

-- Domains: rename created_by → owner_id, add visibility
alter table public.domains rename column created_by to owner_id;
alter table public.domains alter column owner_id set not null;
alter table public.domains
  add column visibility public.domain_visibility not null default 'private';

create unique index domains_owner_name_idx on public.domains (owner_id, lower(name));
create unique index domains_shared_name_idx
  on public.domains (lower(name))
  where visibility = 'shared';

-- Term uniqueness within a domain
create unique index terms_domain_term_idx on public.terms (domain_id, lower(term));

-- Collection: shared domains a user has added (live reference, not a copy)
create table public.user_collection_domains (
  user_id uuid not null references public.users (id) on delete cascade,
  domain_id uuid not null references public.domains (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, domain_id)
);

-- Active review: which collection domains the user is currently studying
create table public.user_active_domains (
  user_id uuid not null references public.users (id) on delete cascade,
  domain_id uuid not null references public.domains (id) on delete cascade,
  primary key (user_id, domain_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_read_domain(p_domain_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.domains d
    where d.id = p_domain_id
      and (d.owner_id = auth.uid() or d.visibility = 'shared')
  );
$$;

create or replace function public.owns_domain(p_domain_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.domains d
    where d.id = p_domain_id
      and d.owner_id = auth.uid()
  );
$$;

create or replace function public.is_domain_in_collection(p_domain_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.owns_domain(p_domain_id)
    or exists (
      select 1
      from public.user_collection_domains ucd
      where ucd.domain_id = p_domain_id
        and ucd.user_id = auth.uid()
    );
$$;

create or replace function public.can_read_term(p_term_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.terms t
    where t.id = p_term_id
      and public.can_read_domain(t.domain_id)
  );
$$;

-- Unshare removes domain from other users' collections
create or replace function public.handle_domain_unshare()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.visibility = 'shared' and new.visibility = 'private' then
    delete from public.user_collection_domains
    where domain_id = new.id
      and user_id <> new.owner_id;

    delete from public.user_active_domains
    where domain_id = new.id
      and user_id <> new.owner_id;
  end if;

  return new;
end;
$$;

create trigger domains_unshare_cleanup
  after update of visibility on public.domains
  for each row
  execute function public.handle_domain_unshare();

-- ---------------------------------------------------------------------------
-- RLS: replace admin-write with owner-write
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated can read domains" on public.domains;
drop policy if exists "Admins write domains" on public.domains;
drop policy if exists "Authenticated can read terms" on public.terms;
drop policy if exists "Admins write terms" on public.terms;
drop policy if exists "Authenticated can read term relationships" on public.term_relationships;
drop policy if exists "Admins write term relationships" on public.term_relationships;

alter table public.user_collection_domains enable row level security;
alter table public.user_active_domains enable row level security;

-- domains
create policy "Users read own or shared domains"
  on public.domains for select
  to authenticated
  using (owner_id = auth.uid() or visibility = 'shared');

create policy "Owners manage domains"
  on public.domains for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners update domains"
  on public.domains for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners delete domains"
  on public.domains for delete
  to authenticated
  using (owner_id = auth.uid());

-- terms
create policy "Users read visible terms"
  on public.terms for select
  to authenticated
  using (public.can_read_domain(domain_id));

create policy "Owners insert terms"
  on public.terms for insert
  to authenticated
  with check (public.owns_domain(domain_id));

create policy "Owners update terms"
  on public.terms for update
  to authenticated
  using (public.owns_domain(domain_id))
  with check (public.owns_domain(domain_id));

create policy "Owners delete terms"
  on public.terms for delete
  to authenticated
  using (public.owns_domain(domain_id));

-- term_relationships
create policy "Users read visible relationships"
  on public.term_relationships for select
  to authenticated
  using (
    public.can_read_term(source_term_id)
    and public.can_read_term(target_term_id)
  );

create policy "Owners insert relationships"
  on public.term_relationships for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.terms s
      join public.terms t on t.id = target_term_id
      where s.id = source_term_id
        and public.owns_domain(s.domain_id)
        and public.owns_domain(t.domain_id)
        and s.domain_id = t.domain_id
    )
  );

create policy "Owners update relationships"
  on public.term_relationships for update
  to authenticated
  using (
    exists (
      select 1
      from public.terms s
      where s.id = source_term_id
        and public.owns_domain(s.domain_id)
    )
  )
  with check (
    exists (
      select 1
      from public.terms s
      join public.terms t on t.id = target_term_id
      where s.id = source_term_id
        and public.owns_domain(s.domain_id)
        and public.owns_domain(t.domain_id)
        and s.domain_id = t.domain_id
    )
  );

create policy "Owners delete relationships"
  on public.term_relationships for delete
  to authenticated
  using (
    exists (
      select 1
      from public.terms s
      where s.id = source_term_id
        and public.owns_domain(s.domain_id)
    )
  );

-- user_collection_domains
create policy "Users read own collection"
  on public.user_collection_domains for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users add shared domains to collection"
  on public.user_collection_domains for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.domains d
      where d.id = domain_id
        and d.visibility = 'shared'
        and d.owner_id <> auth.uid()
    )
  );

create policy "Users remove from collection"
  on public.user_collection_domains for delete
  to authenticated
  using (user_id = auth.uid());

-- user_active_domains
create policy "Users read own active domains"
  on public.user_active_domains for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users set active domains"
  on public.user_active_domains for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_domain_in_collection(domain_id)
  );

create policy "Users unset active domains"
  on public.user_active_domains for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.user_collection_domains to authenticated;
grant select, insert, update, delete on public.user_active_domains to authenticated;
