-- Self-serve account deletion. Mirrors admin_delete_user: deleting the auth user
-- cascades to everything the person owns. No audit row is written, so nothing
-- keeps their email afterwards.

create function public.delete_own_account(p_confirm_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.users;
  v_using integer;
begin
  if auth.uid() is null then
    raise exception 'Log in to delete your account.' using errcode = 'AD001';
  end if;

  select * into v_me from public.users where id = auth.uid() for update;
  if not found then
    raise exception 'That account no longer exists.' using errcode = 'AD001';
  end if;
  if v_me.role <> 'member' then
    raise exception 'Admin accounts can''t be deleted here. Contact support.' using errcode = 'AD001';
  end if;
  if lower(trim(coalesce(p_confirm_email, ''))) <> lower(v_me.email) then
    raise exception 'The email you typed doesn''t match.' using errcode = 'AD001';
  end if;

  perform 1 from public.domains where owner_id = v_me.id for update;
  perform 1 from public.terms t
    join public.domains d on d.id = t.domain_id
    where d.owner_id = v_me.id
    for update of t;

  v_using := public._admin_people_using_collections(v_me.id);
  if v_using > 0 then
    raise exception
      'Can''t delete yet: % other % use your collections. Make your collections private first.',
      v_using, case when v_using = 1 then 'person' else 'people' end
      using errcode = 'AD001';
  end if;

  delete from auth.users where id = v_me.id;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;
