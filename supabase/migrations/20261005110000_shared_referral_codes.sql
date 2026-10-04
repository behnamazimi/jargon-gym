-- Shared reference codes: one code that several people can use, until a seat
-- count or an end date runs out. Every code gets a seat count (a single-use code
-- has one seat), so there is still one way to redeem.
--
-- Email signups with a shared code take their seat when the email is confirmed,
-- so a made-up address can't use one up. Until then the account is unverified
-- and holds the code in users.pending_referral_code.
--
-- Rollback (as a new migration, history is append-only): drop the trigger and
-- functions created here, restore handle_new_user and redeem_referral_code from
-- 20260727120000_google_oauth_referral_gate.sql, drop referral_redemptions, and
-- drop the added columns.

-- ---------------------------------------------------------------------------
-- Columns and the record of who took which seat. user_id is cleared when the
-- account is deleted, but the row stays, so a used seat stays used.
-- ---------------------------------------------------------------------------

alter table public.referral_codes
  add column max_uses integer not null default 1 check (max_uses >= 1),
  add column use_count integer not null default 0,
  add column expires_at timestamptz,
  add column label text,
  add constraint referral_codes_use_count_range check (use_count between 0 and max_uses);

update public.referral_codes set use_count = 1 where used_at is not null;

create table public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.referral_codes (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);

create index referral_redemptions_code_id_idx on public.referral_redemptions (code_id);

alter table public.referral_redemptions enable row level security;
revoke all on public.referral_redemptions from anon, authenticated;

alter table public.users add column pending_referral_code text;

-- ---------------------------------------------------------------------------
-- Helpers. Only the functions below call them.
-- ---------------------------------------------------------------------------

-- Why a code can't be used right now, or null if it can.
create function public._referral_code_problem(p_row public.referral_codes)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when p_row.id is null then 'Invalid or already used referral code'
    when p_row.max_uses = 1 and (p_row.used_by is not null or not p_row.is_active)
      then 'Invalid or already used referral code'
    when not p_row.is_active or p_row.use_count >= p_row.max_uses
      or (p_row.expires_at is not null and p_row.expires_at <= now())
      then 'Referral code is full or expired'
    else null
  end;
$$;

-- Takes one seat for this person. Locks the code, so two people can't take the
-- last seat together.
create function public._consume_referral_code(p_user uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.referral_codes;
  v_problem text;
begin
  select * into v_row from public.referral_codes where code = p_code for update;
  v_problem := public._referral_code_problem(v_row);
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  insert into public.referral_redemptions (code_id, user_id) values (v_row.id, p_user);

  if v_row.max_uses = 1 then
    update public.referral_codes
    set use_count = 1, used_by = p_user, used_at = now(), is_active = false
    where id = v_row.id;
  else
    update public.referral_codes set use_count = use_count + 1 where id = v_row.id;
  end if;
end;
$$;

revoke all on function public._referral_code_problem(public.referral_codes) from public, anon, authenticated;
revoke all on function public._consume_referral_code(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Redeeming after sign-in (Google, or an email account still unverified).
-- ---------------------------------------------------------------------------

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
  set referral_verified = true, pending_referral_code = null
  where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Email signup. A single-use code is taken now, as before. A shared code is
-- checked now (so the form can say it's full) but taken once the email is
-- confirmed, or right away if the project doesn't ask for confirmation.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.referral_codes;
  v_problem text;
  v_provider text;
begin
  v_provider := coalesce(new.raw_app_meta_data->>'provider', 'email');

  if v_provider = 'email' then
    v_code := nullif(trim(coalesce(new.raw_user_meta_data->>'referral_code', '')), '');

    if v_code is null then
      raise exception 'Referral code is required to sign up';
    end if;

    select * into v_row from public.referral_codes where code = v_code;
    v_problem := public._referral_code_problem(v_row);
    if v_problem is not null then
      raise exception '%', v_problem;
    end if;

    if v_row.max_uses = 1 then
      insert into public.users (id, email, role, referral_verified)
      values (new.id, new.email, 'member', true);
      perform public._consume_referral_code(new.id, v_code);
    elsif new.email_confirmed_at is not null then
      insert into public.users (id, email, role, referral_verified)
      values (new.id, new.email, 'member', true);
      perform public._consume_referral_code(new.id, v_code);
    else
      insert into public.users (id, email, role, referral_verified, pending_referral_code)
      values (new.id, new.email, 'member', false, v_code);
    end if;
  else
    insert into public.users (id, email, role, referral_verified)
    values (new.id, new.email, 'member', false);
  end if;

  return new;
end;
$$;

-- When the email is confirmed, the person takes the seat they held a code for.
-- If the code filled up or expired in the meantime they stay unverified, and
-- the app asks them for a code on /complete-signup.
create function public.handle_email_confirmed()
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
  exception when raise_exception then
    update public.users set pending_referral_code = null where id = new.id;
  end;

  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_email_confirmed();

-- ---------------------------------------------------------------------------
-- Admin: create, pause and list shared codes. Errors written for the admin to
-- read use the code AD001.
-- ---------------------------------------------------------------------------

create function public.admin_create_shared_referral_code(
  p_code text,
  p_label text,
  p_max_uses integer,
  p_expires_at timestamptz
)
returns public.referral_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_label text := trim(coalesce(p_label, ''));
  v_row public.referral_codes;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can create shared codes';
  end if;
  if v_code !~ '^[A-Z0-9]{4,32}$' then
    raise exception 'Use 4 to 32 letters and numbers.' using errcode = 'AD001';
  end if;
  if char_length(v_label) not between 1 and 60 then
    raise exception 'Give the code a label of up to 60 characters.' using errcode = 'AD001';
  end if;
  if p_max_uses is null or p_max_uses not between 2 and 10000 then
    raise exception 'Seats must be between 2 and 10000.' using errcode = 'AD001';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'Pick an end date in the future.' using errcode = 'AD001';
  end if;

  begin
    insert into public.referral_codes (code, created_by, max_uses, expires_at, label)
    values (v_code, auth.uid(), p_max_uses, p_expires_at, v_label)
    returning * into v_row;
  exception when unique_violation then
    raise exception 'That code already exists.' using errcode = 'AD001';
  end;

  perform public._admin_audit_insert(
    'create_shared_referral_code', 'referral_code', v_row.id::text,
    jsonb_build_object('label', v_label, 'max_uses', p_max_uses, 'expires_at', p_expires_at)
  );

  return v_row;
end;
$$;

create function public.admin_set_referral_code_active(p_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.referral_codes;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can pause shared codes';
  end if;

  select * into v_row from public.referral_codes where id = p_id for update;
  if not found then
    raise exception 'That code no longer exists.' using errcode = 'AD001';
  end if;
  if v_row.max_uses = 1 then
    raise exception 'Only shared codes can be paused.' using errcode = 'AD001';
  end if;
  if v_row.is_active = p_active then
    return;
  end if;

  update public.referral_codes set is_active = p_active where id = p_id;
  perform public._admin_audit_insert(
    'set_referral_code_active', 'referral_code', p_id::text,
    jsonb_build_object('label', v_row.label, 'active', p_active)
  );
end;
$$;

create function public.admin_list_shared_referral_codes()
returns table (
  id uuid,
  code text,
  label text,
  max_uses integer,
  use_count integer,
  expires_at timestamptz,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can list shared codes';
  end if;

  return query
  select
    rc.id, rc.code, rc.label, rc.max_uses, rc.use_count, rc.expires_at,
    case
      when not rc.is_active then 'paused'
      when rc.use_count >= rc.max_uses then 'full'
      when rc.expires_at is not null and rc.expires_at <= now() then 'expired'
      else 'active'
    end,
    rc.created_at
  from public.referral_codes rc
  where rc.max_uses > 1
  order by rc.created_at desc;
end;
$$;

revoke all on function public.admin_create_shared_referral_code(text, text, integer, timestamptz) from public, anon;
revoke all on function public.admin_set_referral_code_active(uuid, boolean) from public, anon;
revoke all on function public.admin_list_shared_referral_codes() from public, anon;
grant execute on function public.admin_create_shared_referral_code(text, text, integer, timestamptz) to authenticated;
grant execute on function public.admin_set_referral_code_active(uuid, boolean) to authenticated;
grant execute on function public.admin_list_shared_referral_codes() to authenticated;
