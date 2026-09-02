#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
TERM_ID="${1:-}"
RECORD_FLAG="${2:-}"

if [[ -z "$TERM_ID" ]]; then
  echo "Usage: advance-term.sh <termId> [--record]" >&2
  exit 1
fi

export WIDGET_DIR
export TERM_ID
export RECORD_FLAG

/usr/bin/python3 - <<'PY'
import fcntl
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

widget_dir = pathlib.Path(os.environ["WIDGET_DIR"])
config_path = widget_dir / "config.json"
state_path = widget_dir / "state.json"
term_id = os.environ["TERM_ID"]
record_requested = os.environ.get("RECORD_FLAG") == "--record"

# Serialize against reveal-term.sh/read-state.sh touching the same
# state.json. Without this, two scripts started close together each read
# state, do their own (slow) network call, then write back what they read —
# whichever writes last silently clobbers the other's update (lost pool
# progress, or a read double-counted, e.g. if a reveal is still in flight
# when this runs with --record). The widget's UI already updates
# optimistically in JS before this script even runs, so blocking here on a
# concurrent action costs nothing the user can see.
lock_file = open(widget_dir / ".widget.lock", "a+")
fcntl.flock(lock_file, fcntl.LOCK_EX)

def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload))
    raise SystemExit(code)

def load_json(path, fallback):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback

def normalize_state(s):
    s.setdefault("pool", [])
    s.setdefault("knownCount", 0)
    s.setdefault("totalCount", 0)
    s.setdefault("latestWidgetVersion", None)
    s.setdefault("currentRevealed", False)
    return s

config = load_json(config_path, None)
state = normalize_state(load_json(state_path, {}))

app_base = ((config or {}).get("appBaseUrl") or (config or {}).get("apiBaseUrl") or "http://localhost:3000").rstrip("/")
# No "version" field means this is a dev symlink install — always current
# by definition, so the update nag never applies to it.
widget_version = (config or {}).get("version")

def current_payload(source_state):
    current = source_state["pool"][0] if source_state["pool"] else None
    next_term = source_state["pool"][1] if len(source_state["pool"]) > 1 else None
    return {
        "current": current,
        "next": next_term,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": source_state.get("totalCount", 0),
        "knownCount": source_state.get("knownCount", 0),
        "widgetVersion": widget_version,
        "latestWidgetVersion": source_state.get("latestWidgetVersion"),
        "revealed": source_state.get("currentRevealed", False),
    }

if not config or not config.get("apiToken") or not config.get("apiBaseUrl"):
    emit(current_payload(state))

pool = state["pool"]

# Stale-click guard: only advance if the term shown still matches what the
# widget last rendered. A mismatched id (double-click before UI refresh)
# is a no-op — just re-emit the current state.
if not pool or pool[0].get("id") != term_id:
    emit(current_payload(state))

# `--record` means "record a read for this term unless it's already been
# revealed in place" — the caller (index.jsx's "Read more" / click-through)
# doesn't decide this itself, because that click can fire right after a
# reveal click, before the UI has any chance to reflect the reveal locally
# (a stale-closure race, not a network one). state["currentRevealed"] is
# the authoritative local record of whether reveal-term.sh already ran for
# this term, freshly loaded above, so check that instead of trusting a
# value the client captured at click time.
record = record_requested and not state["currentRevealed"]

# Exclude everything currently on screen so the replacement can't be the
# term we're dropping or the one still showing.
exclude_ids = [t["id"] for t in pool]

try:
    api_base = config["apiBaseUrl"].rstrip("/")
    api_token = config["apiToken"]
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    if widget_version:
        headers["X-Widget-Version"] = widget_version
    req = urllib.request.Request(
        f"{api_base}/api/widget/advance",
        data=json.dumps({
            "termId": term_id,
            "record": record,
            "excludeIds": exclude_ids,
        }).encode(),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read().decode())
except Exception as err:
    # Don't drop the term locally if we couldn't confirm the read was
    # recorded (when record=True) — leave the pool untouched so a retry
    # (another Next click) can try again instead of silently losing it.
    print(f"warning: advance failed for {term_id}: {err}", file=sys.stderr)
    emit(current_payload(state))

# Safe to mutate `state` directly and write it back as-is: the lock above
# means nothing else touched state.json between our read at the top and
# here, so pool[0] is still guaranteed to be term_id.
pool.pop(0)
if result.get("term"):
    pool.append(result["term"])

state["pool"] = pool
# The new pool[0] (whatever it is) was never revealed in place.
state["currentRevealed"] = False
state["knownCount"] = result.get("knownCount", state["knownCount"])
state["totalCount"] = result.get("totalCount", state["totalCount"])
state["latestWidgetVersion"] = result.get("latestWidgetVersion", state["latestWidgetVersion"])

state_path.write_text(json.dumps(state, indent=2))

emit(current_payload(state))
PY
