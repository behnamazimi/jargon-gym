-- Issue reports: members tell us about a problem or share an idea, with an
-- optional screenshot. Admins read them and mark them done, won't do, or
-- delete them. Nothing is sent back to the member.
--
-- Screenshots live in the private 'issue-screenshots' bucket, written and read
-- only by the server through the S3 endpoint (lib/issues/storage.ts), the same
-- shape as the narration bucket: no anon or authenticated storage policies.
-- Rows cascade with the account; the server removes the files.
--
-- Rollback (as a new migration, history is append-only): drop function
-- submit_issue_report, drop table issue_reports, and delete the
-- 'issue-screenshots' bucket through the Storage API once it is empty.

create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null check (kind in ('problem', 'idea')),
  body text not null check (char_length(body) between 10 and 2000),
  page_path text check (char_length(page_path) <= 500),
  user_agent text check (char_length(user_agent) <= 500),
  viewport text check (char_length(viewport) <= 20),
  screenshot_path text check (char_length(screenshot_path) <= 200),
  status text not null default 'new' check (status in ('new', 'done', 'wont_do')),
  created_at timestamptz not null default now(),
  status_changed_at timestamptz
);

create index issue_reports_user_created_idx on public.issue_reports (user_id, created_at desc);
create index issue_reports_status_created_idx on public.issue_reports (status, created_at desc);

alter table public.issue_reports enable row level security;

create policy "Admins read issue reports"
  on public.issue_reports for select
  to authenticated
  using (public.is_admin());

create policy "Admins update issue reports"
  on public.issue_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins delete issue reports"
  on public.issue_reports for delete
  to authenticated
  using (public.is_admin());

revoke all on table public.issue_reports from public, anon, authenticated, service_role;
grant select, delete on public.issue_reports to authenticated;
grant update (status, status_changed_at) on public.issue_reports to authenticated;

create function public.submit_issue_report(
  p_id uuid,
  p_kind text,
  p_body text,
  p_page_path text default null,
  p_user_agent text default null,
  p_viewport text default null,
  p_screenshot_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_used integer;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_id is null
     or p_kind is null or p_kind not in ('problem', 'idea')
     or char_length(v_body) < 10 or char_length(v_body) > 2000
     or (p_screenshot_path is not null
         and p_screenshot_path <> v_user::text || '/' || p_id::text || '.webp') then
    raise exception 'invalid_issue';
  end if;

  -- Serialises two reports from the same person, so the limit holds.
  perform 1 from public.users where id = v_user for update;

  select count(*) into v_used
  from public.issue_reports
  where user_id = v_user and created_at > now() - interval '24 hours';
  if v_used >= 10 then
    raise exception 'issue_quota_reached';
  end if;

  insert into public.issue_reports (
    id, user_id, kind, body, page_path, user_agent, viewport, screenshot_path
  )
  values (
    p_id, v_user, p_kind, v_body,
    left(nullif(btrim(coalesce(p_page_path, '')), ''), 500),
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 500),
    left(nullif(btrim(coalesce(p_viewport, '')), ''), 20),
    p_screenshot_path
  );

  return p_id;
end;
$$;

revoke all on function public.submit_issue_report(uuid, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.submit_issue_report(uuid, text, text, text, text, text, text)
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('issue-screenshots', 'issue-screenshots', false, 2097152, array['image/webp'])
on conflict (id) do nothing;
