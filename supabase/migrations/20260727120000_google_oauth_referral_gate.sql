-- OAuth signup: defer referral verification to post-auth redeem_referral_code RPC.

alter table public.users
  add column referral_verified boolean not null default false;

update public.users
set referral_verified = true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_referral_id uuid;
  v_provider text;
begin
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');

  if v_provider = 'email' then
    v_code := nullif(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')), '');

    if v_code is null then
      raise exception 'Referral code is required to sign up';
    end if;

    select id into v_referral_id
    from public.referral_codes
    where code = v_code
      and is_active
      and used_by is null
    for update;

    if v_referral_id is null then
      raise exception 'Invalid or already used referral code';
    end if;

    insert into public.users (id, email, role, referral_verified)
    values (new.id, new.email, 'member', true);

    update public.referral_codes
    set
      used_by = new.id,
      used_at = now(),
      is_active = false
    where id = v_referral_id;
  else
    insert into public.users (id, email, role, referral_verified)
    values (new.id, new.email, 'member', false);
  end if;

  return new;
end;
$$;

create or replace function public.redeem_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_code text;
  v_referral_id uuid;
  v_verified boolean;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select referral_verified into v_verified
  from public.users
  where id = v_uid;

  if v_verified is null then
    raise exception 'User profile not found';
  end if;

  if v_verified then
    raise exception 'Referral code already redeemed';
  end if;

  v_code := upper(nullif(trim(p_code), ''));

  if v_code is null then
    raise exception 'Referral code is required';
  end if;

  select id into v_referral_id
  from public.referral_codes
  where code = v_code
    and is_active
    and used_by is null
  for update;

  if v_referral_id is null then
    raise exception 'Invalid or already used referral code';
  end if;

  update public.referral_codes
  set
    used_by = v_uid,
    used_at = now(),
    is_active = false
  where id = v_referral_id;

  update public.users
  set referral_verified = true
  where id = v_uid;
end;
$$;

revoke all on function public.redeem_referral_code(text) from public;
grant execute on function public.redeem_referral_code(text) to authenticated;
