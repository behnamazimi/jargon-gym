#!/usr/bin/env bash
# Two parallel reserves for one user with 10 credits left and a cost of 8:
# exactly one may win. Needs a running local Supabase (`pnpm supabase:start`).
#   bash supabase/tests/ai_credits_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

USER_ID="$("${PSQL[@]}" <<'SQL'
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
)"
USER_ID="$(echo "$USER_ID" | head -n1)"

OUT_A="$(mktemp)"

cleanup() {
  rm -f "$OUT_A"
  "${PSQL[@]}" -c "delete from public.referral_codes where used_by = '$USER_ID'; delete from auth.users where id = '$USER_ID'" >/dev/null
}
trap cleanup EXIT

# Leave exactly 10 credits: default 100 + 30 monthly - 120 spent.
"${PSQL[@]}" -c "insert into public.ai_credit_ledger (user_id, kind, feature, amount) values ('$USER_ID', 'spend', 'quiz', 120)" >/dev/null

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
echo "ai_credits_concurrency.sh: ok (A=$RESULT_A, B=$RESULT_B)"
