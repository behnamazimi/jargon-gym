-- Authenticated wrapper for mark_term_known (single source of truth for marking terms known).

create or replace function public.my_mark_term_known(p_term_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_term_known(auth.uid(), p_term_id);
end;
$$;

revoke all on function public.my_mark_term_known(uuid) from public;
grant execute on function public.my_mark_term_known(uuid) to authenticated;
