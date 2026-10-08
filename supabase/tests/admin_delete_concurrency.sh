#!/usr/bin/env bash
# Races on deleting an account. Needs a running local Supabase (`pnpm supabase:start`).
#   1. A subscribe that arrives while a delete is in flight never survives it: the
#      delete wins and the subscribe fails on the foreign key (no orphan row).
#   2. A delete that arrives while a subscribe is in flight sees the subscriber and refuses.
#   3. Two deletes of the same account: one succeeds, the other says it no longer exists.
#   bash supabase/tests/admin_delete_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  "${PSQL[@]}" -c "delete from auth.users where email like 'delrace-%@example.test'; delete from public.referral_codes where code like 'DELRACE%'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1"
  echo "--- session A:"; cat "$OUT_A"
  echo "--- session B:"; cat "$OUT_B"
  exit 1
}

make_user() {
  local email="$1" admin="${2:-false}" id code
  code="DELRACE$(date +%s%N)$RANDOM"
  id="$("${PSQL[@]}" <<SQL | head -n1
with c as (insert into public.referral_codes (code) values ('$code') returning code)
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select gen_random_uuid(), '$email', jsonb_build_object('referral_code', code), 'authenticated', 'authenticated' from c
returning id;
SQL
)"
  if [ "$admin" = true ]; then "${PSQL[@]}" -c "update public.users set role = 'admin' where id = '$id'" >/dev/null; fi
  echo "$id"
}

# A member who owns one shared collection with one term.
make_owner() {
  local owner="$1" collection
  collection="$("${PSQL[@]}" -c "insert into public.collections (name, owner_id, visibility) values ('Race ' || gen_random_uuid(), '$owner', 'shared') returning id" | head -n1)"
  "${PSQL[@]}" -c "insert into public.terms (collection_id, term, category, definition) values ('$collection', 'race', 'c', 'd')" >/dev/null
  echo "$collection"
}

# Runs as the admin; holds its transaction open for a second after the delete, so the other session has to wait on its locks.
delete_user() {
  local admin="$1" target="$2" email="$3" out="$4"
  psql "$DB_URL" -qtA > "$out" 2>&1 <<SQL || true
begin;
select set_config('request.jwt.claims', json_build_object('sub', '$admin', 'role', 'authenticated')::text, true);
set local role authenticated;
select 'deleted' from public.admin_delete_user('$target', '$email', 'race test');
select pg_sleep(1);
commit;
SQL
}

subscribe() {
  local user="$1" collection="$2" out="$3" hold="$4"
  psql "$DB_URL" -qtA > "$out" 2>&1 <<SQL || true
begin;
insert into public.user_collections (user_id, collection_id) values ('$user', '$collection');
select 'subscribed';
select pg_sleep($hold);
commit;
SQL
}

ADMIN="$(make_user "delrace-admin-$RANDOM@example.test" true)"

# 1. Delete first, subscribe arrives mid-delete.
OWNER1_EMAIL="delrace-owner1-$RANDOM@example.test"
OWNER1="$(make_user "$OWNER1_EMAIL")"
FAN1="$(make_user "delrace-fan1-$RANDOM@example.test")"
DOM1="$(make_owner "$OWNER1")"
delete_user "$ADMIN" "$OWNER1" "$OWNER1_EMAIL" "$OUT_A" &
PID_A=$!
sleep 0.4
subscribe "$FAN1" "$DOM1" "$OUT_B" 0 &
PID_B=$!
wait $PID_A $PID_B
grep -q '^deleted' "$OUT_A" || fail "1: the delete should have won"
grep -q 'foreign key\|violates' "$OUT_B" || fail "1: the late subscribe should have failed on the foreign key"
[ "$("${PSQL[@]}" -c "select count(*) from public.user_collections where collection_id = '$DOM1'")" = "0" ] || fail "1: an orphan subscription survived"
echo "ok 1: subscribe during a delete fails cleanly"

# 2. Subscribe first (holding its transaction), delete arrives and must see it.
OWNER2_EMAIL="delrace-owner2-$RANDOM@example.test"
OWNER2="$(make_user "$OWNER2_EMAIL")"
FAN2="$(make_user "delrace-fan2-$RANDOM@example.test")"
DOM2="$(make_owner "$OWNER2")"
subscribe "$FAN2" "$DOM2" "$OUT_B" 1 &
PID_B=$!
sleep 0.4
delete_user "$ADMIN" "$OWNER2" "$OWNER2_EMAIL" "$OUT_A" &
PID_A=$!
wait $PID_A $PID_B
grep -q '^subscribed' "$OUT_B" || fail "2: the subscribe should have committed"
grep -q "Can't delete: 1 other person" "$OUT_A" || fail "2: the delete should have refused"
[ "$("${PSQL[@]}" -c "select count(*) from public.users where id = '$OWNER2'")" = "1" ] || fail "2: the owner was deleted anyway"
[ "$("${PSQL[@]}" -c "select count(*) from public.user_collections where collection_id = '$DOM2'")" = "1" ] || fail "2: the subscription was lost"
echo "ok 2: delete during a subscribe refuses"

# 3. Two deletes at once.
OWNER3_EMAIL="delrace-owner3-$RANDOM@example.test"
OWNER3="$(make_user "$OWNER3_EMAIL")"
delete_user "$ADMIN" "$OWNER3" "$OWNER3_EMAIL" "$OUT_A" &
PID_A=$!
sleep 0.2
delete_user "$ADMIN" "$OWNER3" "$OWNER3_EMAIL" "$OUT_B" &
PID_B=$!
wait $PID_A $PID_B
OK_COUNT="$(cat "$OUT_A" "$OUT_B" | grep -c '^deleted' || true)"
[ "$OK_COUNT" = "1" ] || fail "3: expected exactly one delete to succeed, got $OK_COUNT"
cat "$OUT_A" "$OUT_B" | grep -q 'no longer exists' || fail "3: the second delete should say the account no longer exists"
[ "$("${PSQL[@]}" -c "select count(*) from public.admin_audit_log where action = 'delete_user' and target_id = '$OWNER3'")" = "1" ] || fail "3: expected exactly one audit row"
echo "ok 3: two deletes, one winner, one audit row"

echo "all delete races passed"
