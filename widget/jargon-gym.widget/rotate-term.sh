#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_PATH="$WIDGET_DIR/state.json"

/usr/bin/python3 - <<PY
import json
import pathlib

state_path = pathlib.Path("$STATE_PATH")
try:
    state = json.loads(state_path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    state = {"rotationOffset": 0}

state["rotationOffset"] = int(state.get("rotationOffset") or 0) + 1
state_path.write_text(json.dumps(state, indent=2))
PY
