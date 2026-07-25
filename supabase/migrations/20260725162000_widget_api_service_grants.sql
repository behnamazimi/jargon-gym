-- Widget API route handlers use the service-role client after Bearer token auth.
grant select on public.domains to service_role;
grant select on public.terms to service_role;
grant select on public.user_collection_domains to service_role;
grant select on public.user_active_domains to service_role;
grant select, insert, update on public.user_progress to service_role;
