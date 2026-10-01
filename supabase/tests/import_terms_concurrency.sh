#!/usr/bin/env bash
# Two submits of one import id at the same time import once. Needs a running local Supabase.
#   bash supabase/tests/import_terms_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

USER_ID=""
IMPORT_ID="$("${PSQL[@]}" -c "select gen_random_uuid()")"
OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  if [ -n "$USER_ID" ]; then
    "${PSQL[@]}" -c "delete from public.domains where owner_id = '$USER_ID'; delete from public.referral_codes where used_by = '$USER_ID'; delete from auth.users where id = '$USER_ID'" >/dev/null
  fi
}
trap cleanup EXIT

USER_ID="$("${PSQL[@]}" <<'SQL'
with code as (
  insert into public.referral_codes (code) values ('C' || replace(gen_random_uuid()::text, '-', ''))
  returning code
)
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select gen_random_uuid(), 'import-race-' || gen_random_uuid() || '@example.test',
       jsonb_build_object('referral_code', code), 'authenticated', 'authenticated'
from code
returning id;
SQL
)"
USER_ID="$(echo "$USER_ID" | head -n1)"

submit() {
  local out="$1"
  psql "$DB_URL" -qtA > "$out" 2>&1 <<SQL || true
begin;
select set_config('request.jwt.claims', json_build_object('sub', '$USER_ID', 'role', 'authenticated')::text, true);
set local role authenticated;
select (public.my_import_terms('$IMPORT_ID', '{"name": "Race"}', '[{"term":"A","definition":"a"},{"term":"B"}]', '[]', 'skip'))->>'already_applied';
select pg_sleep(1);
commit;
SQL
}

submit "$OUT_A" &
submit "$OUT_B" &
wait

APPLIED="$(cat "$OUT_A" "$OUT_B" | grep -c '^false$' || true)"
REPEATED="$(cat "$OUT_A" "$OUT_B" | grep -c '^true$' || true)"
TERMS="$("${PSQL[@]}" -c "select count(*) from public.terms t join public.domains d on d.id = t.domain_id where d.owner_id = '$USER_ID'")"
COLLECTIONS="$("${PSQL[@]}" -c "select count(*) from public.domains where owner_id = '$USER_ID'")"

if [ "$APPLIED" != "1" ] || [ "$REPEATED" != "1" ] || [ "$TERMS" != "2" ] || [ "$COLLECTIONS" != "1" ]; then
  echo "FAIL: applied=$APPLIED repeated=$REPEATED terms=$TERMS collections=$COLLECTIONS"
  cat "$OUT_A" "$OUT_B"
  exit 1
fi
echo "ok: two parallel submits imported once"
