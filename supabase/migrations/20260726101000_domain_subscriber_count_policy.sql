-- Allow domain owners to read collection rows for domains they own (subscriber counts).
create policy "Owners read subscribers to their domains"
  on public.user_collection_domains for select
  to authenticated
  using (
    exists (
      select 1
      from public.domains d
      where d.id = domain_id
        and d.owner_id = auth.uid()
    )
  );
