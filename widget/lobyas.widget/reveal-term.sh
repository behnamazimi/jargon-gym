#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
TERM_ID="${1:-}"

if [[ -z "$TERM_ID" ]]; then
  echo "Usage: reveal-term.sh <termId>" >&2
  exit 1
fi

export WIDGET_DIR
export TERM_ID

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

# Serialize against advance-term.sh/read-state.sh touching the same
# state.json. Without this, two scripts started close together each read
# state, do their own (slow) network call, then write back what they read —
# whichever writes last silently clobbers the other's update (lost pool
# progress, or a read double-counted). The widget's UI already updates
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
    s.setdefault("termsLearnedCount", 0)
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
        "termsLearnedCount": source_state.get("termsLearnedCount", 0),
        "widgetVersion": widget_version,
        "latestWidgetVersion": source_state.get("latestWidgetVersion"),
        "revealed": source_state.get("currentRevealed", False),
    }

if not config or not config.get("apiToken") or not config.get("apiBaseUrl"):
    emit(current_payload(state))

pool = state["pool"]

# Stale-click guard: only record if the term shown still matches what the
# widget last rendered. A mismatched id (double-click before UI refresh, or
# the pool already rotated) is a no-op — just re-emit the current state.
if not pool or pool[0].get("id") != term_id:
    emit(current_payload(state))

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
        f"{api_base}/api/widget/reveal",
        data=json.dumps({"termId": term_id}).encode(),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        json.loads(resp.read().decode())
except Exception as err:
    # Don't mark it revealed locally if we couldn't confirm the read was
    # recorded — leave state untouched so a retry (another click) can try
    # again instead of silently losing the read.
    print(f"warning: reveal failed for {term_id}: {err}", file=sys.stderr)
    emit(current_payload(state))

# Safe to mutate `state` directly and write it back as-is: the lock above
# means nothing else touched state.json between our read at the top and
# here, so pool[0] is still guaranteed to be term_id.
state["currentRevealed"] = True
state_path.write_text(json.dumps(state, indent=2))

emit(current_payload(state))
PY
