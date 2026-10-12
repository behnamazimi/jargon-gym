-- The Mastery grade-usage panel counts a learner's real Review grades. A
-- learning-step retry (a missed term re-asked minutes later in the same
-- session) is not a new test, so it is left out here too; otherwise one miss
-- could add up to three more Again/Good rows.

create or replace function public.my_grade_distribution()
returns table (
  grade smallint,
  count integer
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

  return query
  select re.grade, count(*)::integer as count
  from public.review_events re
  where re.user_id = auth.uid()
    and re.event in ('review_pass', 'review_fail')
    and not re.is_retry
  group by re.grade;
end;
$$;

revoke all on function public.my_grade_distribution() from public;
grant execute on function public.my_grade_distribution() to authenticated;
