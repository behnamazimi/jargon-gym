-- One current Jev score per term. The judgment is about the term text, so a
-- later evaluation of the same term replaces the row. content_hash covers the
-- fields Jev saw, so a reader can tell whether the score still matches the text.

create table public.term_evaluations (
  term_id uuid primary key references public.terms (id) on delete cascade,
  schema_fit double precision not null,
  plain boolean not null,
  content_hash text not null,
  evaluated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint term_evaluations_schema_fit_range check (schema_fit >= 0 and schema_fit <= 1)
);

create trigger term_evaluations_set_updated_at
  before update on public.term_evaluations
  for each row
  execute function public.set_updated_at();

alter table public.term_evaluations enable row level security;

revoke all on table public.term_evaluations from public, anon, authenticated;
grant select, insert, update on public.term_evaluations to service_role;
