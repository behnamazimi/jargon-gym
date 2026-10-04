#!/usr/bin/env bash
# Many people racing for the last seats of a shared code: exactly as many win as
# there are seats, and the code never goes over. Needs a running local Supabase
# (`pnpm supabase:start`).
#   bash supabase/tests/shared_referral_codes_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)
SEATS=3
RACERS=10
CODE="RACE$(date +%s)"
OUT_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$OUT_DIR"
  "${PSQL[@]}" -c "
    delete from auth.users where email like 'code-race-%@example.test';
    delete from public.referral_codes where code = '$CODE';" >/dev/null
}
trap cleanup EXIT

"${PSQL[@]}" -c "insert into public.referral_codes (code, max_uses, expires_at, label)
  values ('$CODE', $SEATS, now() + interval '1 day', 'race')" >/dev/null

for i in $(seq 1 "$RACERS"); do
  (
    if "${PSQL[@]}" -c "insert into auth.users (id, email, raw_user_meta_data, aud, role, email_confirmed_at)
      values (gen_random_uuid(), 'code-race-$i@example.test', jsonb_build_object('referral_code', '$CODE'), 'authenticated', 'authenticated', now())" >/dev/null 2>&1; then
      touch "$OUT_DIR/won-$i"
    fi
  ) &
done
wait

WON="$(find "$OUT_DIR" -name 'won-*' | wc -l | tr -d ' ')"
USED="$("${PSQL[@]}" -c "select use_count from public.referral_codes where code = '$CODE'")"
ROWS="$("${PSQL[@]}" -c "select count(*) from public.referral_redemptions r join public.referral_codes c on c.id = r.code_id where c.code = '$CODE'")"

if [ "$WON" != "$SEATS" ] || [ "$USED" != "$SEATS" ] || [ "$ROWS" != "$SEATS" ]; then
  echo "FAIL: $WON of $RACERS signed up, use_count=$USED, redemptions=$ROWS (expected $SEATS each)"
  exit 1
fi
echo "ok: $WON of $RACERS got a seat, use_count=$USED"
