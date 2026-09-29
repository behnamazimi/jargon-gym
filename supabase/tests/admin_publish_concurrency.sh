#!/usr/bin/env bash
# Two races on publishing. Needs a running local Supabase (`pnpm supabase:start`).
#   1. Two collections racing for one slug: exactly one wins, the other fails
#      with a unique violation on domains_slug_idx and stays private.
#   2. Two publishes of the same collection: both succeed with the same slug.
#   bash supabase/tests/admin_publish_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

ADMIN_ID=""
D1=""
D2=""
OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  if [ -n "$D1" ]; then "${PSQL[@]}" -c "delete from public.domains where id in ('$D1', '$D2')" >/dev/null; fi
  if [ -n "$ADMIN_ID" ]; then
    "${PSQL[@]}" -c "delete from public.referral_codes where used_by = '$ADMIN_ID'; delete from auth.users where id = '$ADMIN_ID'" >/dev/null
  fi
}
trap cleanup EXIT

ADMIN_ID="$("${PSQL[@]}" <<'SQL'
with code as (
  insert into public.referral_codes (code) values ('C' || replace(gen_random_uuid()::text, '-', ''))
  returning code
)
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select gen_random_uuid(), 'publish-race-' || gen_random_uuid() || '@example.test',
       jsonb_build_object('referral_code', code), 'authenticated', 'authenticated'
from code
returning id;
SQL
)"
ADMIN_ID="$(echo "$ADMIN_ID" | head -n1)"
"${PSQL[@]}" -c "update public.users set role = 'admin' where id = '$ADMIN_ID'" >/dev/null

D1="$("${PSQL[@]}" -c "select gen_random_uuid()")"
D2="$("${PSQL[@]}" -c "select gen_random_uuid()")"
"${PSQL[@]}" -c "insert into public.domains (id, name, owner_id, is_builtin) values ('$D1', 'Race A', '$ADMIN_ID', true), ('$D2', 'Race B', '$ADMIN_ID', true)" >/dev/null

# Holds its transaction open for a second, so the other session has to wait on the lock or index.
publish() {
  local domain="$1" slug="$2" out="$3"
  psql "$DB_URL" -qtA > "$out" 2>&1 <<SQL || true
begin;
select set_config('request.jwt.claims', json_build_object('sub', '$ADMIN_ID', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.admin_publish_collection('$domain', '$slug', '{}'::jsonb);
select pg_sleep(1);
commit;
SQL
}

fail() {
  echo "FAIL: $1"
  cat "$OUT_A" "$OUT_B"
  exit 1
}

# 1. Two collections, one slug.
SLUG="race-$(date +%s)"
publish "$D1" "$SLUG" "$OUT_A" &
sleep 0.3
publish "$D2" "$SLUG" "$OUT_B" &
wait

[ "$(grep -cx "$SLUG" "$OUT_A")" -eq 1 ] || fail "the first publish should have won"
grep -q "domains_slug_idx" "$OUT_B" || fail "the second publish should fail on domains_slug_idx"
public_count="$("${PSQL[@]}" -c "select count(*) from public.domains where id in ('$D1', '$D2') and is_public")"
[ "$public_count" -eq 1 ] || fail "exactly one collection should be public (got $public_count)"
loser_slug="$("${PSQL[@]}" -c "select count(*) from public.domains where id = '$D2' and slug is null and not is_public")"
[ "$loser_slug" -eq 1 ] || fail "the losing collection should be untouched"

# 2. The same collection twice.
"${PSQL[@]}" -c "update public.domains set is_public = false, slug = null where id = '$D1'" >/dev/null
SLUG="same-$(date +%s)"
publish "$D1" "$SLUG" "$OUT_A" &
sleep 0.3
publish "$D1" "$SLUG" "$OUT_B" &
wait

[ "$(grep -cx "$SLUG" "$OUT_A")" -eq 1 ] || fail "the first publish of the same collection should succeed"
[ "$(grep -cx "$SLUG" "$OUT_B")" -eq 1 ] || fail "the second publish of the same collection should succeed too"

echo "admin_publish_concurrency.sh: ok"
