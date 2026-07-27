-- Remove anonymous referral-code oracle; enforce minimum entropy on admin-created codes.

revoke execute on function public.is_referral_code_valid(text) from anon, authenticated;
drop function public.is_referral_code_valid(text);

create or replace function public.create_referral_code(p_code text default null)
returns public.referral_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row public.referral_codes;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Only admins can create referral codes';
  end if;

  if nullif(trim(p_code), '') is null then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  else
    v_code := upper(trim(p_code));

    if length(v_code) < 12 then
      raise exception 'Custom referral codes must be at least 12 characters';
    end if;

    if v_code !~ '^[A-Z0-9]+$' then
      raise exception 'Referral codes may only contain letters and numbers';
    end if;
  end if;

  insert into public.referral_codes (code, created_by)
  values (v_code, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;
