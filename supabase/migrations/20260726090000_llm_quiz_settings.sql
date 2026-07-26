-- LLM provider settings for quiz generation.

create table public.user_llm_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'anthropic')),
  api_key_encrypted text not null,
  api_key_last4 text not null,
  mark_unknown_on_fail boolean not null default true,
  mark_known_on_pass boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_llm_settings enable row level security;

create policy "Users manage own llm settings"
  on public.user_llm_settings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_llm_settings to authenticated;
