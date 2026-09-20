-- Admin-only batch narration: one background job at a time fills missing
-- term audio for a chosen collection. Writes go through service_role; admins
-- can read rows so the status panel can poll.

create table public.narration_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.domains (id) on delete cascade,
  started_by uuid not null references public.users (id) on delete restrict,
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  term_ids uuid[] not null,
  cursor int not null default 0 check (cursor >= 0),
  generated_count int not null default 0 check (generated_count >= 0),
  failed_count int not null default 0 check (failed_count >= 0),
  last_error text,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create trigger narration_sync_jobs_set_updated_at
  before update on public.narration_sync_jobs
  for each row
  execute function public.set_updated_at();

-- At most one queued/running job in the whole table.
create unique index narration_sync_jobs_one_active
  on public.narration_sync_jobs ((true))
  where status in ('queued', 'running');

create index narration_sync_jobs_created_at_idx
  on public.narration_sync_jobs (created_at desc);

-- Atomically lease the active job and return the term at the current cursor.
-- A held lease (expires in the future) blocks other workers, including Resume.
-- Abandoned leases older than 2 minutes can be reclaimed, matching
-- claim_term_narration's stale-pending window.
create or replace function public.claim_narration_sync_tick()
returns table (
  job_id uuid,
  term_id uuid,
  cursor int,
  term_count int
)
language sql
security definer
set search_path = public
as $$
  update public.narration_sync_jobs
  set
    status = 'running',
    lease_expires_at = now() + interval '2 minutes'
  where id = (
    select id
    from public.narration_sync_jobs
    where status in ('queued', 'running')
      and cursor < coalesce(cardinality(term_ids), 0)
      and (lease_expires_at is null or lease_expires_at < now())
    order by created_at
    limit 1
    for update skip locked
  )
  returning
    id,
    term_ids[cursor + 1],
    cursor,
    coalesce(cardinality(term_ids), 0);
$$;

revoke all on function public.claim_narration_sync_tick() from public;
grant execute on function public.claim_narration_sync_tick() to service_role;

alter table public.narration_sync_jobs enable row level security;

create policy "Admins can read narration sync jobs"
  on public.narration_sync_jobs for select
  to authenticated
  using (public.is_admin());

grant select on public.narration_sync_jobs to authenticated;
grant select, insert, update on public.narration_sync_jobs to service_role;
