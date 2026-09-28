-- Guided tour. Every account, existing ones included, starts 'pending' and
-- sees it once; a user with no settings row yet reads as pending too.
alter table public.user_settings
  add column tour_status text not null default 'pending'
    check (tour_status in ('pending', 'done')),
  add column tour_seen text[] not null default '{}';

-- Records one finished chapter in a single statement, so two tabs finishing
-- different chapters can't overwrite each other. The tour is done once every
-- chapter the app knows about has been seen.
create function public.my_mark_tour_chapter_seen(p_chapter text, p_all_chapters text[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.user_settings (user_id, tour_seen)
  values (auth.uid(), array[p_chapter])
  on conflict (user_id) do update
    set tour_seen = case
          when p_chapter = any (user_settings.tour_seen) then user_settings.tour_seen
          else user_settings.tour_seen || p_chapter
        end,
        updated_at = now();

  update public.user_settings
  set tour_status = 'done'
  where user_id = auth.uid() and p_all_chapters <@ tour_seen;
end;
$$;

grant execute on function public.my_mark_tour_chapter_seen(text, text[]) to authenticated;
