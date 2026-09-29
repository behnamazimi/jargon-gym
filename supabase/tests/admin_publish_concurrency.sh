#!/usr/bin/env bash
# Two collections racing for one slug: exactly one publish may win, the other
# must fail with a unique violation and leave nothing behind. Needs a running
# local Supabase (`pnpm supabase:start`).
#   bash supabase/tests/admin_publish_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

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
SLUG="race-$(date +%s)"
D1="$(uuidgen | tr 'A-Z' 'a-z')"
D2="$(uuidgen | tr 'A-Z' 'a-z')"

OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  "${PSQL[@]}" -c "delete from public.domains where id in ('$D1', '$D2'); delete from public.referral_codes where used_by = '$ADMIN_ID'; delete from auth.users where id = '$ADMIN_ID'" >/dev/null
}
trap cleanup EXIT

"${PSQL[@]}" -c "insert into public.domains (id, name, owner_id, is_builtin) values ('$D1', 'Race A', '$ADMIN_ID', true), ('$D2', 'Race B', '$ADMIN_ID', true)" >/dev/null

publish() {
  local domain="$1" out="$2"
  # The first session holds its transaction so the second must wait on the unique index.
  psql "$DB_URL" -qtA > "$out" 2>&1 <<SQL || true
begin;
select set_config('request.jwt.claims', json_build_object('sub', '$ADMIN_ID', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.admin_publish_collection('$domain', '$SLUG', '{}'::jsonb);
select pg_sleep(1);
commit;
SQL
}

publish "$D1" "$OUT_A" &
sleep 0.3
publish "$D2" "$OUT_B" &
wait

won=0
for out in "$OUT_A" "$OUT_B"; do
  if grep -q "$SLUG" "$out" && ! grep -qi "duplicate key" "$out"; then won=$((won + 1)); fi
done
public_count="$("${PSQL[@]}" -c "select count(*) from public.domains where id in ('$D1', '$D2') and is_public")"

if [ "$won" -ne 1 ] || [ "$public_count" -ne 1 ]; then
  echo "FAIL: expected exactly one winner (won=$won, public=$public_count)"
  cat "$OUT_A" "$OUT_B"
  exit 1
fi
echo "admin_publish_concurrency.sh: ok"
