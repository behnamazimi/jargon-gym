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
record = os.environ.get("RECORD_FLAG") == "--record"

def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload))
    raise SystemExit(code)

def load_json(path, fallback):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback

config = load_json(config_path, None)
state = load_json(state_path, {"pool": [], "knownCount": 0, "totalCount": 0, "latestWidgetVersion": None})
state.setdefault("pool", [])
state.setdefault("knownCount", 0)
state.setdefault("totalCount", 0)
state.setdefault("latestWidgetVersion", None)

app_base = ((config or {}).get("appBaseUrl") or (config or {}).get("apiBaseUrl") or "http://localhost:3000").rstrip("/")
# No "version" field means this is a dev symlink install — always current
# by definition, so the update nag never applies to it.
widget_version = (config or {}).get("version")

def current_payload():
    current = state["pool"][0] if state["pool"] else None
    return {
        "current": current,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": state.get("totalCount", 0),
        "knownCount": state.get("knownCount", 0),
        "widgetVersion": widget_version,
        "latestWidgetVersion": state.get("latestWidgetVersion"),
    }

if not config or not config.get("apiToken") or not config.get("apiBaseUrl"):
    emit(current_payload())

pool = state["pool"]

# Stale-click guard: only advance if the term shown still matches what the
# widget last rendered. A mismatched id (double-click before UI refresh)
# is a no-op — just re-emit the current state.
if not pool or pool[0].get("id") != term_id:
    emit(current_payload())

# Exclude everything currently on screen so the replacement can't be the
# term we're dropping or the one still showing.
exclude_ids = [t["id"] for t in pool]

try:
    api_base = config["apiBaseUrl"].rstrip("/")
    api_token = config["apiToken"]
    req = urllib.request.Request(
        f"{api_base}/api/widget/advance",
        data=json.dumps({
            "termId": term_id,
            "record": record,
            "excludeIds": exclude_ids,
        }).encode(),
        headers={
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read().decode())
except Exception as err:
    # Don't drop the term locally if we couldn't confirm the read was
    # recorded (when record=True) — leave the pool untouched so a retry
    # (another Next click) can try again instead of silently losing it.
    print(f"warning: advance failed for {term_id}: {err}", file=sys.stderr)
    emit(current_payload())

pool.pop(0)
if result.get("term"):
    pool.append(result["term"])

state["pool"] = pool
state["knownCount"] = result.get("knownCount", state["knownCount"])
state["totalCount"] = result.get("totalCount", state["totalCount"])
state["latestWidgetVersion"] = result.get("latestWidgetVersion", state["latestWidgetVersion"])

state_path.write_text(json.dumps(state, indent=2))

emit(current_payload())
PY
