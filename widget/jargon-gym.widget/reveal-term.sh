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
state.setdefault("currentRevealed", False)

app_base = ((config or {}).get("appBaseUrl") or (config or {}).get("apiBaseUrl") or "http://localhost:3000").rstrip("/")
# No "version" field means this is a dev symlink install — always current
# by definition, so the update nag never applies to it.
widget_version = (config or {}).get("version")

def current_payload():
    current = state["pool"][0] if state["pool"] else None
    next_term = state["pool"][1] if len(state["pool"]) > 1 else None
    return {
        "current": current,
        "next": next_term,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": state.get("totalCount", 0),
        "knownCount": state.get("knownCount", 0),
        "widgetVersion": widget_version,
        "latestWidgetVersion": state.get("latestWidgetVersion"),
        "revealed": state.get("currentRevealed", False),
    }

if not config or not config.get("apiToken") or not config.get("apiBaseUrl"):
    emit(current_payload())

pool = state["pool"]

# Stale-click guard: only record if the term shown still matches what the
# widget last rendered. A mismatched id (double-click before UI refresh, or
# the pool already rotated) is a no-op — just re-emit the current state.
if not pool or pool[0].get("id") != term_id:
    emit(current_payload())

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
    emit(current_payload())

state["currentRevealed"] = True
state_path.write_text(json.dumps(state, indent=2))

emit(current_payload())
PY
