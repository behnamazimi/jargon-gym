-- Authenticated wrapper for the review-pool predicate (single source of truth in telegram_review_domain_ids).

create or replace function public.my_review_domain_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.telegram_review_domain_ids(auth.uid());
$$;

revoke all on function public.my_review_domain_ids() from public;
grant execute on function public.my_review_domain_ids() to authenticated;
