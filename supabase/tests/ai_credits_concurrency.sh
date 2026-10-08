#!/usr/bin/env bash
# 1. Two parallel reserves for one user with 10 credits left and a cost of 8:
#    exactly one may win.
# 2. Two parallel first charges for a brand-new user: both succeed, and the
#    free-tier grants are written once.
# Needs a running local Supabase (`pnpm supabase:start`).
#   bash supabase/tests/ai_credits_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

new_user() {
  "${PSQL[@]}" <<'SQL' | head -n1
with code as (
  insert into public.referral_codes (code) values ('C' || replace(gen_random_uuid()::text, '-', ''))
  returning code
)
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select gen_random_uuid(), 'concurrency-' || gen_random_uuid() || '@example.test',
       jsonb_build_object('referral_code', code), 'authenticated', 'authenticated'
from code
returning id;
SQL
}

USER_ID="$(new_user)"
USER_B="$(new_user)"

OUT_A="$(mktemp)"

cleanup() {
  rm -f "$OUT_A"
  for id in "$USER_ID" "$USER_B"; do
    "${PSQL[@]}" -c "delete from public.referral_codes where used_by = '$id'; delete from auth.users where id = '$id'" >/dev/null
  done
}
trap cleanup EXIT

# Leave exactly 10 credits: 50 starter + 20 monthly - 60 spent.
"${PSQL[@]}" -c "select public.reserve_ai_credits('$USER_ID', 'quiz', 60)" >/dev/null

# The first session holds its transaction open so the second must wait on the lock.
"${PSQL[@]}" > "$OUT_A" <<SQL &
begin;
select status from public.reserve_ai_credits('$USER_ID', 'quiz', 8);
select pg_sleep(1.5);
commit;
SQL
PID_A=$!
sleep 0.5
RESULT_B="$("${PSQL[@]}" -c "select status from public.reserve_ai_credits('$USER_ID', 'quiz', 8)")"
wait "$PID_A"
RESULT_A="$(head -n1 "$OUT_A")"

OK_COUNT=0
for r in "$RESULT_A" "$RESULT_B"; do [ "$r" = "ok" ] && OK_COUNT=$((OK_COUNT + 1)); done

if [ "$OK_COUNT" -ne 1 ] || { [ "$RESULT_A" != "insufficient" ] && [ "$RESULT_B" != "insufficient" ]; }; then
  echo "FAIL: expected one ok and one insufficient, got A=$RESULT_A B=$RESULT_B" >&2
  exit 1
fi

# Scenario 2: the first session holds its first charge open, so the second
# waits on the lock and must not write the same grants again.
"${PSQL[@]}" > "$OUT_A" <<SQL &
begin;
select status from public.reserve_ai_credits('$USER_B', 'quiz', 1);
select pg_sleep(1.5);
commit;
SQL
PID_A=$!
sleep 0.5
"${PSQL[@]}" -c "select status from public.reserve_ai_credits('$USER_B', 'quiz', 1)" >/dev/null
wait "$PID_A"
GRANTS="$("${PSQL[@]}" -c "select count(*) from public.ai_credit_ledger where user_id = '$USER_B' and kind = 'grant'")"
REMAINING="$("${PSQL[@]}" -c "select remaining from public.ai_credit_balance('$USER_B')")"
if [ "$GRANTS" != "2" ] || [ "$REMAINING" != "68" ]; then
  echo "FAIL: expected 2 grants and 68 credits left, got grants=$GRANTS remaining=$REMAINING" >&2
  exit 1
fi
echo "ai_credits_concurrency.sh: ok (A=$RESULT_A, B=$RESULT_B, grants=$GRANTS, remaining=$REMAINING)"
