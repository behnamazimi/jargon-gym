-- Stories: short AI-written pieces built around a user's Read queue. Each
-- row is one generated piece; "mark as read" credits a normal TRACE read to
-- every term in term_ids, once (read_at is set at most once).

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  domain_id uuid references public.domains (id) on delete set null,
  language text not null,
  format text not null,
  tone text not null,
  reading_level text not null,
  cefr_level text not null,
  outline text,
  title text not null,
  segments jsonb not null,
  term_ids uuid[] not null,
  new_term_ids uuid[] not null default '{}',
  vote smallint,
  read_at timestamptz,
  narration_status text not null default 'none',
  narration_path text,
  narration_requested_at timestamptz,
  created_at timestamptz not null default now(),
  constraint stories_reading_level_check
    check (reading_level in ('plain', 'professional', 'expert')),
  constraint stories_cefr_level_check
    check (cefr_level in ('A2', 'B1', 'B2', 'C1', 'C2')),
  constraint stories_outline_length_check
    check (outline is null or char_length(outline) between 1 and 280),
  constraint stories_term_ids_min_check check (cardinality(term_ids) >= 3),
  constraint stories_vote_check check (vote is null or vote in (-1, 1)),
  constraint stories_narration_status_check
    check (narration_status in ('none', 'pending', 'ready', 'failed'))
);

create index stories_user_created_idx on public.stories (user_id, created_at desc);
create index stories_user_narration_requested_idx
  on public.stories (user_id, narration_requested_at);

alter table public.stories enable row level security;

revoke all on table public.stories from public, anon, authenticated;
grant select, insert, update on public.stories to service_role;

-- Reading level and CEFR level are remembered per collection.
create table public.story_collection_prefs (
  user_id uuid not null references public.users (id) on delete cascade,
  domain_id uuid not null references public.domains (id) on delete cascade,
  reading_level text not null,
  cefr_level text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain_id),
  constraint story_collection_prefs_reading_level_check
    check (reading_level in ('plain', 'professional', 'expert')),
  constraint story_collection_prefs_cefr_level_check
    check (cefr_level in ('A2', 'B1', 'B2', 'C1', 'C2'))
);

alter table public.story_collection_prefs enable row level security;

revoke all on table public.story_collection_prefs from public, anon, authenticated;
grant select, insert, update on public.story_collection_prefs to service_role;

alter table public.user_settings
  add column story_last_domain_id uuid references public.domains (id) on delete set null;
