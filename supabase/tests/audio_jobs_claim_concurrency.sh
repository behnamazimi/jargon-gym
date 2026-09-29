#!/usr/bin/env bash
# Two sessions claim the same audio subject at once: exactly one wins.
# Then both reclaim one stale pending row: exactly one wins again.
# Needs a running local Supabase.
#   bash supabase/tests/audio_jobs_claim_concurrency.sh
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -qtA)

SUBJECT="$(uuidgen | tr '[:upper:]' '[:lower:]')"

OUT_A="$(mktemp)"
OUT_B="$(mktemp)"

cleanup() {
  rm -f "$OUT_A" "$OUT_B"
  "${PSQL[@]}" -c "delete from public.audio_jobs where subject_id = '$SUBJECT'" >/dev/null
}
trap cleanup EXIT

run_claim() {
  "${PSQL[@]}" <<SQL
begin;
select coalesce(id::text, 'none')
from public.claim_audio_job('term', '$SUBJECT', null, 'race-hash', 2, false);
select pg_sleep(1);
commit;
SQL
}

run_claim > "$OUT_A" &
PID_A=$!
run_claim > "$OUT_B" &
PID_B=$!
wait "$PID_A" "$PID_B"

WINNERS="$(cat "$OUT_A" "$OUT_B" | grep -Ec '^[0-9a-f]{8}-[0-9a-f]{4}-' || true)"
if [ "$WINNERS" != "1" ]; then
  echo "expected exactly one first claim, got $WINNERS (A=$(head -n1 "$OUT_A"), B=$(head -n1 "$OUT_B"))" >&2
  exit 1
fi

LIVE="$("${PSQL[@]}" -c "select count(*) from public.audio_jobs where subject_id = '$SUBJECT' and status <> 'superseded'")"
if [ "$LIVE" != "1" ]; then
  echo "expected one live job after the first claim, got $LIVE" >&2
  exit 1
fi

# The pending row is still fresh: a second pair must not start another job.
: > "$OUT_A"
: > "$OUT_B"
run_claim > "$OUT_A" &
PID_A=$!
run_claim > "$OUT_B" &
PID_B=$!
wait "$PID_A" "$PID_B"
WINNERS="$(cat "$OUT_A" "$OUT_B" | grep -Ec '^[0-9a-f]{8}-[0-9a-f]{4}-' || true)"
if [ "$WINNERS" != "0" ]; then
  echo "expected no winner on a fresh pending job, got $WINNERS" >&2
  exit 1
fi

"${PSQL[@]}" -c "update public.audio_jobs set requested_at = now() - interval '3 minutes' where subject_id = '$SUBJECT' and status = 'pending'" >/dev/null

: > "$OUT_A"
: > "$OUT_B"
run_claim > "$OUT_A" &
PID_A=$!
run_claim > "$OUT_B" &
PID_B=$!
wait "$PID_A" "$PID_B"
WINNERS="$(cat "$OUT_A" "$OUT_B" | grep -Ec '^[0-9a-f]{8}-[0-9a-f]{4}-' || true)"
if [ "$WINNERS" != "1" ]; then
  echo "expected exactly one stale reclaim, got $WINNERS (A=$(head -n1 "$OUT_A"), B=$(head -n1 "$OUT_B"))" >&2
  exit 1
fi

ATTEMPTS="$("${PSQL[@]}" -c "select attempts from public.audio_jobs where subject_id = '$SUBJECT' and status = 'pending'")"
SUPERSEDED="$("${PSQL[@]}" -c "select count(*) from public.audio_jobs where subject_id = '$SUBJECT' and status = 'superseded'")"
LIVE="$("${PSQL[@]}" -c "select count(*) from public.audio_jobs where subject_id = '$SUBJECT' and status <> 'superseded'")"
if [ "$ATTEMPTS" != "2" ] || [ "$SUPERSEDED" != "1" ] || [ "$LIVE" != "1" ]; then
  echo "stale reclaim left attempts=$ATTEMPTS superseded=$SUPERSEDED live=$LIVE" >&2
  exit 1
fi

echo "audio_jobs_claim_concurrency.sh: ok"
