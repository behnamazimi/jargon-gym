-- Per-collection narration mode, visible to and editable by admins only.
--
-- 'term' speaks the term name only; 'full' speaks the term, definition and the
-- optional fields. A collection with no row here is 'term'. The table is kept
-- apart from domains because members can read their collections.
--
-- Rollback (as a new migration, history is append-only): drop table
-- public.collection_narration_settings. Collections then fall back to 'term'.

create table public.collection_narration_settings (
  domain_id uuid primary key references public.domains (id) on delete cascade,
  mode text not null check (mode in ('term', 'full')),
  updated_at timestamptz not null default now()
);

create trigger collection_narration_settings_set_updated_at
  before update on public.collection_narration_settings
  for each row
  execute function public.set_updated_at();

alter table public.collection_narration_settings enable row level security;

create policy "Admins can read narration settings"
  on public.collection_narration_settings for select
  to authenticated
  using (public.is_admin());

create policy "Admins can add narration settings"
  on public.collection_narration_settings for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can change narration settings"
  on public.collection_narration_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can remove narration settings"
  on public.collection_narration_settings for delete
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.collection_narration_settings to authenticated;
grant select, insert, update, delete on public.collection_narration_settings to service_role;
