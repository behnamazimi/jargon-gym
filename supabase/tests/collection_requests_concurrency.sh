#!/usr/bin/env bash
# Two things that must stay all-or-nothing under a race. Needs a running local Supabase.
#   1. Two submits from one person at the same time create one request.
#   2. A cancel and a delivery of the same request at the same time: exactly one wins.
#   bash supabase/tests/collection_requests_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

USER_ID=""
ADMIN_ID=""
WAS_ENABLED=""
OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  for id in "$USER_ID" "$ADMIN_ID"; do
    if [ -n "$id" ]; then
      "${PSQL[@]}" -c "delete from public.collections where owner_id = '$id'; delete from public.referral_codes where used_by = '$id'; delete from auth.users where id = '$id'" >/dev/null
    fi
  done
  if [ -n "$WAS_ENABLED" ]; then
    "${PSQL[@]}" -c "update public.collection_request_settings set enabled = $WAS_ENABLED" >/dev/null
  fi
}
trap cleanup EXIT

make_user() {
  "${PSQL[@]}" <<'SQL' | head -n1
with code as (
  insert into public.referral_codes (code) values ('C' || replace(gen_random_uuid()::text, '-', ''))
  returning code
)
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select gen_random_uuid(), 'request-race-' || gen_random_uuid() || '@example.test',
       jsonb_build_object('referral_code', code), 'authenticated', 'authenticated'
from code
returning id;
SQL
}

USER_ID="$(make_user)"
ADMIN_ID="$(make_user)"
"${PSQL[@]}" -c "update public.users set role = 'admin' where id = '$ADMIN_ID'" >/dev/null
WAS_ENABLED="$("${PSQL[@]}" -c "select enabled::text from public.collection_request_settings")"
"${PSQL[@]}" -c "update public.collection_request_settings set enabled = true" >/dev/null

as_user() {
  local id="$1"
  echo "begin; select set_config('request.jwt.claims', json_build_object('sub', '$id', 'role', 'authenticated')::text, true); set local role authenticated;"
}

# 1. Two submits at once.
submit() {
  psql "$DB_URL" -qtA > "$1" 2>&1 <<SQL || true
$(as_user "$USER_ID")
select 'created' from (select public.my_create_collection_request('Race topic', 'jargon', 'en')) s;
select pg_sleep(1);
commit;
SQL
}
submit "$OUT_A" &
submit "$OUT_B" &
wait

CREATED="$(cat "$OUT_A" "$OUT_B" | grep -c '^created$' || true)"
REFUSED="$(cat "$OUT_A" "$OUT_B" | grep -c 'request_open_exists' || true)"
ROWS="$("${PSQL[@]}" -c "select count(*) from public.collection_requests where user_id = '$USER_ID'")"
if [ "$CREATED" != "1" ] || [ "$REFUSED" != "1" ] || [ "$ROWS" != "1" ]; then
  echo "FAIL (create): created=$CREATED refused=$REFUSED rows=$ROWS"
  cat "$OUT_A" "$OUT_B"
  exit 1
fi

# 2. Cancel against delivery of the same request.
REQUEST_ID="$("${PSQL[@]}" -c "update public.collection_requests set status = 'in_progress', accepted_at = now() where user_id = '$USER_ID' returning id")"
REQUEST_ID="$(echo "$REQUEST_ID" | head -n1)"

cancel() {
  psql "$DB_URL" -qtA > "$1" 2>&1 <<SQL || true
$(as_user "$USER_ID")
select public.my_cancel_collection_request('$REQUEST_ID');
select pg_sleep(1);
select 'cancelled';
commit;
SQL
}
deliver() {
  psql "$DB_URL" -qtA > "$1" 2>&1 <<SQL || true
$(as_user "$ADMIN_ID")
select 'delivered' from (select public.admin_deliver_request('$REQUEST_ID', 'Race', '[{"term":"A","definition":"a"}]', '[]', 'lines')) s;
select pg_sleep(1);
commit;
SQL
}
cancel "$OUT_A" &
deliver "$OUT_B" &
wait

WON="$(cat "$OUT_A" "$OUT_B" | grep -cE '^(cancelled|delivered)$' || true)"
STATUS="$("${PSQL[@]}" -c "select status from public.collection_requests where id = '$REQUEST_ID'")"
COLLECTIONS="$("${PSQL[@]}" -c "select count(*) from public.collections where owner_id = '$USER_ID'")"
if [ "$WON" != "1" ]; then
  echo "FAIL (race): winners=$WON status=$STATUS"
  cat "$OUT_A" "$OUT_B"
  exit 1
fi
if { [ "$STATUS" = "cancelled" ] && [ "$COLLECTIONS" != "0" ]; } || { [ "$STATUS" = "ready" ] && [ "$COLLECTIONS" != "1" ]; }; then
  echo "FAIL (race): status=$STATUS collections=$COLLECTIONS"
  exit 1
fi
echo "ok: one submit created one request; cancel and delivery had one winner ($STATUS)"
