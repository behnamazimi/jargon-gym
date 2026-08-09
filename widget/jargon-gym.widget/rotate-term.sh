#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
TERM_ID="${1:-}"

if [[ -z "$TERM_ID" ]]; then
  echo "Usage: rotate-term.sh <termId>" >&2
  exit 1
fi

export WIDGET_DIR TERM_ID

/usr/bin/python3 - <<'PY'
import json
import os
import pathlib

widget_dir = pathlib.Path(os.environ["WIDGET_DIR"])
state_path = widget_dir / "state.json"

try:
    state = json.loads(state_path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    state = {"rotationOffset": 0}

state["rotationOffset"] = int(state.get("rotationOffset") or 0) + 1
state_path.write_text(json.dumps(state, indent=2))
PY
