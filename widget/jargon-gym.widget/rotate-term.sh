#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
TERM_ID="${1:-}"

if [[ -z "$TERM_ID" ]]; then
  echo "Usage: rotate-term.sh <termId>" >&2
  exit 1
fi

export WIDGET_DIR
export TERM_ID

/usr/bin/python3 - <<'PY'
import json
import os
import pathlib

widget_dir = pathlib.Path(os.environ["WIDGET_DIR"])
state_path = widget_dir / "state.json"
term_id = os.environ["TERM_ID"]

try:
    pool = json.loads(state_path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    pool = {"remaining": [], "staged": [], "batchIds": [], "knownCount": 0, "totalCount": 0}

pool.setdefault("remaining", [])
pool.setdefault("staged", [])
pool.setdefault("batchIds", [])

remaining = pool["remaining"]
if remaining and remaining[0].get("id") == term_id:
    remaining.pop(0)

if not remaining and pool["staged"]:
    pool["remaining"] = pool["staged"]
    pool["batchIds"] = [t["id"] for t in pool["staged"]]
    pool["staged"] = []
else:
    pool["remaining"] = remaining

state_path.write_text(json.dumps(pool, indent=2))
PY
