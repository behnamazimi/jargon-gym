-- Built-in or public collections can't be deleted, even by their owner.

drop policy if exists "Owners delete domains" on public.domains;

create policy "Owners delete domains"
  on public.domains for delete
  to authenticated
  using (owner_id = auth.uid() and not is_builtin and not is_public);
