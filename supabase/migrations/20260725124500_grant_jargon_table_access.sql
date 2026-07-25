-- RLS policies alone are not enough; roles need table-level grants too.
grant select on public.domains to authenticated;
grant select on public.terms to authenticated;
grant select on public.term_relationships to authenticated;
grant select, insert, update, delete on public.user_progress to authenticated;

-- Admin write policies on content tables
grant insert, update, delete on public.domains to authenticated;
grant insert, update, delete on public.terms to authenticated;
grant insert, update, delete on public.term_relationships to authenticated;
