-- Only admins may make a collection built-in or public. Members own their
-- collections and could otherwise set both flags themselves, on insert or update.
create or replace function public._collections_guard_publish_flags()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.is_builtin or new.is_public then
        raise exception 'publish_flags_protected';
      end if;
    elsif new.is_builtin is distinct from old.is_builtin
       or new.is_public is distinct from old.is_public then
      raise exception 'publish_flags_protected';
    end if;
  end if;
  return new;
end;
$$;

create trigger collections_guard_publish_flags
  before insert or update on public.collections
  for each row execute function public._collections_guard_publish_flags();

-- The public form can only add a pending request. Inviting is an admin step.
drop policy "Anyone can request access" on public.waitlist_requests;
create policy "Anyone can request access"
  on public.waitlist_requests for insert
  to anon, authenticated
  with check (status = 'pending' and referral_code_id is null and invited_at is null and invited_by is null);
