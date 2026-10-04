-- When a shared code fills up or expires between someone's signup and their
-- email confirmation, remember it, so /complete-signup can say why they are
-- being asked for a code. Cleared when they redeem one.

alter table public.users add column referral_code_ran_out boolean not null default false;

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  select pending_referral_code into v_code
  from public.users
  where id = new.id and not referral_verified
  for update;

  if v_code is null then
    return new;
  end if;

  begin
    perform public._consume_referral_code(new.id, v_code);
    update public.users
    set referral_verified = true, pending_referral_code = null
    where id = new.id;
  exception
    when raise_exception then
      update public.users
      set pending_referral_code = null, referral_code_ran_out = true
      where id = new.id;
    when others then
      -- Whatever went wrong, the email confirmation must not fail because of the code.
      raise warning 'Could not take a seat for % on confirmation: %', new.id, sqlerrm;
      update public.users set pending_referral_code = null where id = new.id;
  end;

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

  perform public._consume_referral_code(v_uid, v_code);

  update public.users
  set referral_verified = true, pending_referral_code = null, referral_code_ran_out = false
  where id = v_uid;
end;
$$;
