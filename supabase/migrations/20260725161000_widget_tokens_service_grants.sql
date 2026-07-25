-- service_role is used by Next.js route handlers and server actions for widget token CRUD.
grant select, insert, update, delete on public.widget_tokens to service_role;
