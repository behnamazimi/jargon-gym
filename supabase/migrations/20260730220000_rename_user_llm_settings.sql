-- user_llm_settings grew to include quiz progress preferences; rename to user_settings.

alter table public.user_llm_settings rename to user_settings;

drop policy if exists "Users manage own llm settings" on public.user_settings;

create policy "Users manage own settings"
  on public.user_settings for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_settings to authenticated;
