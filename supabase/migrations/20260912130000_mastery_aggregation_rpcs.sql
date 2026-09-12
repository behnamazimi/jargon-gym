-- Two Mastery-page aggregates that previously pulled entire review_events
-- slices into JS just to compute a min()/count() Postgres can do
-- server-side — same fix pattern as my_term_relationships_by_domain
-- (20260912120000), applied to this append-only, unbounded-growth table.
--
-- my_first_seen_at_by_term: backs fetchFirstSeenAtByTermId
-- (lib/jargon/mastery.ts) — first-touch timestamp per mastered term, was
-- fetching every review_events row for the term instead of MIN(created_at)
-- GROUP BY term_id.
--
-- my_grade_distribution: backs fetchGradeDistribution
-- (lib/jargon/collection-mastery-snapshot.ts) — grade-usage histogram, was
-- fetching every graded row for the whole user instead of COUNT(*) GROUP
-- BY grade. review_events_user_grade_idx (partial, event-scoped, grade
-- included) added alongside it since this table has no bound on lifetime
-- growth and no existing index serves this query's (user_id, event)
-- predicate.
--
-- Session-only, both my_-prefixed with no p_user_id/service-role sibling —
-- both call sites (app/(private)/jargon/mastery/actions.ts) run exclusively
-- through requireAuthenticatedClient(); confirmed via repo-wide grep no
-- Telegram/widget/admin surface reads either value.

create or replace function public.my_first_seen_at_by_term(p_term_ids uuid[])
returns table (
  term_id uuid,
  first_seen_at timestamptz
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
  select re.term_id, min(re.created_at) as first_seen_at
  from public.review_events re
  where re.user_id = auth.uid()
    and re.term_id = any(p_term_ids)
  group by re.term_id;
end;
$$;

revoke all on function public.my_first_seen_at_by_term(uuid[]) from public;
grant execute on function public.my_first_seen_at_by_term(uuid[]) to authenticated;

create index review_events_user_grade_idx
  on public.review_events (user_id)
  include (grade)
  where event in ('review_pass', 'review_fail');

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
  group by re.grade;
end;
$$;

revoke all on function public.my_grade_distribution() from public;
grant execute on function public.my_grade_distribution() to authenticated;
