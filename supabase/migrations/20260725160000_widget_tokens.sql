-- Personal API tokens for the Übersicht desktop widget.

create table public.widget_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Übersicht widget',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index widget_tokens_user_id_idx on public.widget_tokens (user_id);

alter table public.widget_tokens enable row level security;

create policy "Users read own widget tokens"
  on public.widget_tokens for select
  using (user_id = auth.uid());

create policy "Users delete own widget tokens"
  on public.widget_tokens for delete
  using (user_id = auth.uid());

grant select, delete on public.widget_tokens to authenticated;
