-- Public "request access" queue: anon inserts, admins review and approve.

create table public.waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null,
  status text not null default 'pending' check (status in ('pending', 'invited')),
  referral_code_id uuid references public.referral_codes (id) on delete set null,
  invited_by uuid references public.users (id) on delete set null,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint waitlist_requests_invited_pair check (
    (status = 'pending' and referral_code_id is null and invited_at is null)
    or (status = 'invited' and referral_code_id is not null and invited_at is not null)
  )
);

create unique index waitlist_requests_normalized_email_key
  on public.waitlist_requests (normalized_email);

create index waitlist_requests_created_at_idx
  on public.waitlist_requests (created_at desc);

alter table public.waitlist_requests enable row level security;

create policy "Anyone can request access"
  on public.waitlist_requests for insert
  to anon, authenticated
  with check (true);

create policy "Admins can read waitlist requests"
  on public.waitlist_requests for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update waitlist requests"
  on public.waitlist_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant insert on public.waitlist_requests to anon, authenticated;
grant select, update on public.waitlist_requests to authenticated;
