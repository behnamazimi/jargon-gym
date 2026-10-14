-- bump_streak's shield rules: earned on the 7th active day, covers exactly one
-- missed day, is lost when two days in a row are missed. One transaction that
-- rolls back:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/streak_shield.sql
begin;

create function pg_temp.make_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := 'T' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.referral_codes (code) values (v_code);
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_email, jsonb_build_object('referral_code', v_code), 'authenticated', 'authenticated');
  return v_id;
end;
$$;

-- Puts the member's last activity `p_days_ago` days back, then bumps.
create function pg_temp.bump_after_gap(p_user uuid, p_days_ago int)
returns void
language plpgsql
as $$
begin
  update public.user_settings
  set timezone = 'UTC',
      last_active_date = (now() at time zone 'UTC')::date - p_days_ago
  where user_id = p_user;
  perform public.bump_streak(p_user);
end;
$$;

do $$
declare
  u uuid := pg_temp.make_user('shield@example.test');
  r public.user_settings;
  i int;
begin
  insert into public.user_settings (user_id, timezone, current_streak, longest_streak,
                                    last_active_date, shield_progress)
  values (u, 'UTC', 0, 0, null, 0);

  for i in 1..7 loop
    perform pg_temp.bump_after_gap(u, case when i = 1 then 5 else 1 end);
  end loop;
  select * into r from public.user_settings where user_id = u;
  assert r.current_streak = 7 and r.shield_ready and r.shield_progress = 0,
    'the seventh active day earns a shield';

  perform pg_temp.bump_after_gap(u, 2);
  select * into r from public.user_settings where user_id = u;
  assert r.current_streak = 8, 'one missed day keeps the streak and the next day adds one';
  assert not r.shield_ready and r.shield_progress = 1, 'the shield is spent and the count restarts';
  assert r.shield_saved_date = (now() at time zone 'UTC')::date - 1, 'the covered day is recorded';
  assert r.shield_notice_pending, 'the member has a message to see';

  perform pg_temp.bump_after_gap(u, 2);
  select * into r from public.user_settings where user_id = u;
  assert r.current_streak = 1 and not r.shield_ready,
    'a missed day without a shield breaks the streak';
end;
$$;

do $$
declare
  u uuid := pg_temp.make_user('shield-two@example.test');
  r public.user_settings;
begin
  insert into public.user_settings (user_id, timezone, current_streak, longest_streak,
                                    last_active_date, shield_ready)
  values (u, 'UTC', 9, 9, (now() at time zone 'UTC')::date - 3, true);

  perform public.bump_streak(u);
  select * into r from public.user_settings where user_id = u;
  assert r.current_streak = 1 and not r.shield_ready and r.shield_progress = 1,
    'two missed days break the streak and the shield is lost';
  assert not r.shield_notice_pending, 'no message when the shield did not save anything';
end;
$$;

do $$
declare
  u uuid := pg_temp.make_user('shield-history@example.test');
  v_shielded date[];
begin
  insert into public.user_settings (user_id, timezone, current_streak, longest_streak,
                                    last_active_date, shield_ready)
  values (u, 'UTC', 9, 9, (now() at time zone 'UTC')::date - 2, true);

  select array_agg(day) into v_shielded
  from public.get_streak_history(u) where is_shielded;
  assert v_shielded = array[(now() at time zone 'UTC')::date - 1],
    'history shows the day the banked shield is about to cover';
end;
$$;

rollback;
