#!/usr/bin/env bash
# Two sessions start a run for the same user and feature at the same moment:
# exactly one may get a token. Needs a running local Supabase.
#   bash supabase/tests/ai_run_guard_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

USER_ID="$("${PSQL[@]}" <<'SQL'
with code as (
  insert into public.referral_codes (code) values ('G' || replace(gen_random_uuid()::text, '-', ''))
  returning code
)
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select gen_random_uuid(), 'guard-' || gen_random_uuid() || '@example.test',
       jsonb_build_object('referral_code', code), 'authenticated', 'authenticated'
from code
returning id;
SQL
)"
USER_ID="$(echo "$USER_ID" | head -n1)"

OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  "${PSQL[@]}" -c "delete from public.referral_codes where used_by = '$USER_ID'; delete from auth.users where id = '$USER_ID'" >/dev/null
}
trap cleanup EXIT

# Each session keeps its transaction open briefly so the two really overlap.
run_session() {
  "${PSQL[@]}" <<SQL
begin;
select coalesce(public.begin_ai_run('$USER_ID', 'quiz', 120)::text, 'busy');
select pg_sleep(1);
commit;
SQL
}

run_session > "$OUT_A" &
PID_A=$!
run_session > "$OUT_B" &
PID_B=$!
wait "$PID_A" "$PID_B"

WINNERS="$(cat "$OUT_A" "$OUT_B" | grep -Ec '^[0-9a-f]{8}-[0-9a-f]{4}-' || true)"
if [ "$WINNERS" != "1" ]; then
  echo "expected exactly one winner, got $WINNERS (A=$(head -n1 "$OUT_A"), B=$(head -n1 "$OUT_B"))" >&2
  exit 1
fi
echo "ai_run_guard_concurrency.sh: ok"
