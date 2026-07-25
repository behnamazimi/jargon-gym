-- Roles
create type public.user_role as enum ('admin', 'member');

-- Users (1:1 with auth.users)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- Referral / reference codes (admin-issued, single-use)
create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  used_by uuid references public.users (id) on delete set null,
  used_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint referral_codes_used_pair check (
    (used_by is null and used_at is null)
    or (used_by is not null and used_at is not null)
  )
);

create index referral_codes_active_unused_idx
  on public.referral_codes (code)
  where is_active and used_by is null;

-- Domains
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Terms
create table public.terms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  category text not null,
  definition text not null,
  example text,
  discussion text,
  domain_id uuid not null references public.domains (id) on delete cascade,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index terms_domain_id_idx on public.terms (domain_id);

-- Per-user term progress
create table public.user_progress (
  user_id uuid not null references public.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  is_known boolean not null default false,
  primary key (user_id, term_id)
);

-- Term relationships
create table public.term_relationships (
  id uuid primary key default gen_random_uuid(),
  source_term_id uuid not null references public.terms (id) on delete cascade,
  target_term_id uuid not null references public.terms (id) on delete cascade,
  relationship_type text not null,
  description text not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint term_relationships_no_self check (source_term_id <> target_term_id),
  constraint term_relationships_unique_pair unique (
    source_term_id,
    target_term_id,
    relationship_type
  )
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_referral_code_valid(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.referral_codes
    where code = trim(p_code)
      and is_active
      and used_by is null
  );
$$;

revoke all on function public.is_referral_code_valid(text) from public;
grant execute on function public.is_referral_code_valid(text) to anon, authenticated;

-- Admin-only: create a referral code (random if omitted)
create or replace function public.create_referral_code(p_code text default null)
returns public.referral_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.referral_codes;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can create referral codes';
  end if;

  v_code := coalesce(
    nullif(trim(p_code), ''),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  insert into public.referral_codes (code, created_by)
  values (v_code, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_referral_code(text) from public;
grant execute on function public.create_referral_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Signup gate: require a valid unused referral code in user metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_referral_id uuid;
begin
  v_code := nullif(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')), '');

  if v_code is null then
    raise exception 'Referral code is required to sign up';
  end if;

  select id into v_referral_id
  from public.referral_codes
  where code = v_code
    and is_active
    and used_by is null
  for update;

  if v_referral_id is null then
    raise exception 'Invalid or already used referral code';
  end if;

  insert into public.users (id, email, role)
  values (new.id, new.email, 'member');

  update public.referral_codes
  set
    used_by = new.id,
    used_at = now(),
    is_active = false
  where id = v_referral_id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.referral_codes enable row level security;
alter table public.domains enable row level security;
alter table public.terms enable row level security;
alter table public.user_progress enable row level security;
alter table public.term_relationships enable row level security;

-- users
create policy "Users can read own profile"
  on public.users for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Users can update own email"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select u.role from public.users u where u.id = auth.uid())
  );

create policy "Admins can update any user"
  on public.users for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No direct client inserts into users (trigger only)

-- referral_codes: admins manage; members can see codes they used
create policy "Admins manage referral codes"
  on public.referral_codes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users can read own used referral code"
  on public.referral_codes for select
  to authenticated
  using (used_by = auth.uid());

-- domains / terms / relationships: authenticated read; admin write
create policy "Authenticated can read domains"
  on public.domains for select
  to authenticated
  using (true);

create policy "Admins write domains"
  on public.domains for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Authenticated can read terms"
  on public.terms for select
  to authenticated
  using (true);

create policy "Admins write terms"
  on public.terms for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Authenticated can read term relationships"
  on public.term_relationships for select
  to authenticated
  using (true);

create policy "Admins write term relationships"
  on public.term_relationships for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- user_progress: own rows only
create policy "Users manage own progress"
  on public.user_progress for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins read all progress"
  on public.user_progress for select
  to authenticated
  using (public.is_admin());
