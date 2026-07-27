-- Local bootstrap: one admin + spare referral codes for manual testing.
-- Admin login: admin@jargon.local / password123

create extension if not exists pgcrypto with schema extensions;

-- Bootstrap code used to create the seeded admin (consumed below)
insert into public.referral_codes (code, is_active)
values ('BOOTSTRAP', true);

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@jargon.local',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"referral_code":"BOOTSTRAP"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_admin_id,
    format(
      '{"sub":"%s","email":"%s","email_verified":true,"phone_verified":false}',
      v_admin_id,
      'admin@jargon.local'
    )::jsonb,
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  );

  update public.users
  set role = 'admin', referral_verified = true
  where id = v_admin_id;

  -- Spare single-use codes for signup testing (created by admin)
  insert into public.referral_codes (code, created_by)
  values
    ('WELCOME1', v_admin_id),
    ('WELCOME2', v_admin_id),
    ('WELCOME3', v_admin_id);
end;
$$;
