-- A shared code can switch narration on for everyone who takes a seat with it.
-- The grant is the same pair of allowlist rows an admin adds by hand, written in
-- the transaction that takes the seat, so it covers email signups, email
-- confirmation and Google sign-ups redeeming on /complete-signup. It adds rows
-- only: the narration switch, access mode and daily caps still apply, and
-- nothing is taken away if the code is paused, expires or is changed later.
--
-- Rollback (as a new migration, history is append-only): restore
-- _consume_referral_code, admin_create_shared_referral_code and
-- admin_list_shared_referral_codes from 20261005110000_shared_referral_codes.sql,
-- drop _system_audit_insert, and drop referral_codes.grants_narration.

alter table public.referral_codes
  add column grants_narration boolean not null default false;

-- ---------------------------------------------------------------------------
-- Audit rows written by the database itself, with no admin behind them.
-- ---------------------------------------------------------------------------

create function public._system_audit_insert(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_log (actor_id, actor_email, action, target_type, target_id, details)
  values (null, null, p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public._system_audit_insert(text, text, text, jsonb)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Taking a seat also grants narration when the code says so.
-- ---------------------------------------------------------------------------

create or replace function public._consume_referral_code(p_user uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.referral_codes;
  v_problem text;
  v_added integer;
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

  if v_row.grants_narration then
    insert into public.ai_feature_allowlist (feature, user_id)
    select f.feature, p_user
    from (values ('narration_term'), ('narration_story')) as f (feature)
    on conflict do nothing;
    get diagnostics v_added = row_count;

    if v_added > 0 then
      perform public._system_audit_insert(
        'narration_granted_by_code', 'user', p_user::text,
        jsonb_build_object('label', v_row.label)
      );
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: create and list shared codes with the new flag. New signatures, so the
-- old ones go first.
-- ---------------------------------------------------------------------------

drop function public.admin_create_shared_referral_code(text, text, integer, timestamptz);
drop function public.admin_list_shared_referral_codes();

create function public.admin_create_shared_referral_code(
  p_code text,
  p_label text,
  p_max_uses integer,
  p_expires_at timestamptz,
  p_grants_narration boolean default false
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
    insert into public.referral_codes (code, created_by, max_uses, expires_at, label, grants_narration)
    values (v_code, auth.uid(), p_max_uses, p_expires_at, v_label, coalesce(p_grants_narration, false))
    returning * into v_row;
  exception when unique_violation then
    raise exception 'That code already exists.' using errcode = 'AD001';
  end;

  perform public._admin_audit_insert(
    'create_shared_referral_code', 'referral_code', v_row.id::text,
    jsonb_build_object(
      'label', v_label, 'max_uses', p_max_uses, 'expires_at', p_expires_at,
      'grants_narration', v_row.grants_narration
    )
  );

  return v_row;
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
  created_at timestamptz,
  grants_narration boolean
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
    rc.created_at,
    rc.grants_narration
  from public.referral_codes rc
  where rc.max_uses > 1
  order by rc.created_at desc;
end;
$$;

revoke all on function public.admin_create_shared_referral_code(text, text, integer, timestamptz, boolean) from public, anon;
revoke all on function public.admin_list_shared_referral_codes() from public, anon;
grant execute on function public.admin_create_shared_referral_code(text, text, integer, timestamptz, boolean) to authenticated;
grant execute on function public.admin_list_shared_referral_codes() to authenticated;
