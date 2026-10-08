#!/usr/bin/env bash
# Checks that the credit lots migrations keep every existing balance exactly.
# It rewinds the LOCAL database to just before them, builds people with
# old-model histories, applies the migrations and compares balances. The local
# database is reset to the full schema at the end.
#   bash supabase/tests/credit_lots_opening_parity.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)
trap 'pnpm -s supabase db reset >/dev/null 2>&1' EXIT

pnpm -s supabase db reset --version 20261017100000 >/dev/null 2>&1

"${PSQL[@]}" <<'SQL'
create table public._parity (label text primary key, user_id uuid, expected integer);

create function pg_temp.person(p_label text) returns uuid language plpgsql as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text := 'P' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.referral_codes (code) values (v_code);
  insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values (v_id, p_label || '@parity.test', jsonb_build_object('referral_code', v_code), 'authenticated', 'authenticated');
  return v_id;
end $$;

do $$
declare
  u uuid;
  v_spend bigint;
  last_month timestamptz := date_trunc('month', now()) - interval '2 days';
begin
  u := pg_temp.person('untouched');
  insert into public._parity values ('untouched', u, null);

  u := pg_temp.person('spent-some');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u, 'spend', 'quiz', 20);
  insert into public._parity values ('spent-some', u, null);

  u := pg_temp.person('spent-into-starter');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u, 'spend', 'quiz', 50);
  insert into public._parity values ('spent-into-starter', u, null);

  u := pg_temp.person('overflowed-last-month');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount, created_at)
  values (u, 'spend', 'quiz', 50, last_month);
  insert into public._parity values ('overflowed-last-month', u, null);

  u := pg_temp.person('grant-reset');
  insert into public.ai_credit_ledger (user_id, kind, amount, note) values (u, 'grant', 25, 'admin');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u, 'spend', 'story', 40);
  insert into public.ai_credit_ledger (user_id, kind, amount) values (u, 'reset', 0);
  insert into public._parity values ('grant-reset', u, null);

  u := pg_temp.person('refunded');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u, 'spend', 'quiz', 10)
  returning id into v_spend;
  insert into public.ai_credit_ledger (user_id, kind, feature, amount, refund_of)
  values (u, 'refund', 'quiz', 10, v_spend);
  insert into public._parity values ('refunded', u, null);

  u := pg_temp.person('over-spent');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u, 'spend', 'quiz', 500);
  insert into public._parity values ('over-spent', u, null);

  u := pg_temp.person('topped-up');
  insert into public.ai_credit_ledger (user_id, kind, feature, amount) values (u, 'spend', 'quiz', 125);
  insert into public.ai_credit_ledger (user_id, kind, amount, created_by, note)
  values (u, 'grant', 30, u, 'self_topup');
  insert into public._parity values ('topped-up', u, null);

  update public._parity p
  set expected = (select b.remaining from public.ai_credit_balance(p.user_id) b);
end $$;

select label || ' expects ' || expected from public._parity order by label;
SQL

pnpm -s supabase migration up >/dev/null 2>&1

FAILED="$("${PSQL[@]}" <<'SQL'
select string_agg(p.label || ': expected ' || p.expected || ', got ' || b.remaining, '; ')
from public._parity p
cross join lateral public.ai_credit_balance(p.user_id) b
where b.remaining <> p.expected;
SQL
)"

if [ -n "$FAILED" ]; then
  echo "FAIL: $FAILED" >&2
  exit 1
fi

# The opening lots exist and are the only grants these people have.
OPENING="$("${PSQL[@]}" -c "select count(*) from public.ai_credit_ledger l join public._parity p on p.user_id = l.user_id where l.source = 'opening'")"
[ "$OPENING" -gt 0 ] || { echo "FAIL: no opening lots were written" >&2; exit 1; }

# Nobody who existed at the cutover is granted a second starter or this month's refill.
"${PSQL[@]}" -c "select public.reserve_ai_credits(user_id, 'quiz', 1) from public._parity where label = 'untouched'" >/dev/null
EXTRA="$("${PSQL[@]}" -c "select count(*) from public.ai_credit_ledger l join public._parity p on p.user_id = l.user_id where l.policy_id is not null")"
[ "$EXTRA" = "0" ] || { echo "FAIL: $EXTRA policy grants were written for existing accounts" >&2; exit 1; }

echo "credit_lots_opening_parity.sh: ok"
