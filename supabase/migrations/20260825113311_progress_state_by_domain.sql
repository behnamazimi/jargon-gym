create or replace function public.progress_state_by_domain(p_user_id uuid, p_domain_ids uuid[])
returns table (
  term_id uuid,
  domain_id uuid,
  known_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  review_recall_count int,
  last_review_recall_at timestamptz,
  review_streak int,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  quiz_streak int,
  review_fail_count int,
  quiz_fail_count int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.domain_id,
    up.known_at,
    coalesce(rs.read_count, 0)::int,
    rs.last_read_at,
    coalesce(rs.review_recall_count, 0)::int,
    rs.last_review_recall_at,
    coalesce(rs.review_streak, 0)::int,
    coalesce(rs.quiz_test_count, 0)::int,
    rs.last_quiz_tested_at,
    coalesce(rs.quiz_streak, 0)::int,
    coalesce(rs.review_fail_count, 0)::int,
    coalesce(rs.quiz_fail_count, 0)::int
  from public.terms t
  left join public.user_progress up on up.term_id = t.id and up.user_id = p_user_id
  left join public.review_state rs on rs.term_id = t.id and rs.user_id = p_user_id
  where t.domain_id = any(p_domain_ids);
$$;

revoke all on function public.progress_state_by_domain(uuid, uuid[]) from public;
grant execute on function public.progress_state_by_domain(uuid, uuid[]) to service_role;

create or replace function public.my_progress_state_by_domain(p_domain_ids uuid[])
returns table (
  term_id uuid,
  domain_id uuid,
  known_at timestamptz,
  read_count int,
  last_read_at timestamptz,
  review_recall_count int,
  last_review_recall_at timestamptz,
  review_streak int,
  quiz_test_count int,
  last_quiz_tested_at timestamptz,
  quiz_streak int,
  review_fail_count int,
  quiz_fail_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query select c.* from public.progress_state_by_domain(auth.uid(), p_domain_ids) as c;
end;
$$;

revoke all on function public.my_progress_state_by_domain(uuid[]) from public;
grant execute on function public.my_progress_state_by_domain(uuid[]) to authenticated;
