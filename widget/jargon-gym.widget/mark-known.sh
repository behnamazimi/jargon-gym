#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
TERM_ID="${1:-}"

if [[ -z "$TERM_ID" ]]; then
  echo "Usage: mark-known.sh <termId>" >&2
  exit 1
fi

export WIDGET_DIR TERM_ID

/usr/bin/python3 - <<'PY'
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

widget_dir = pathlib.Path(os.environ["WIDGET_DIR"])
term_id = os.environ["TERM_ID"]
config_path = widget_dir / "config.json"
state_path = widget_dir / "state.json"

config = json.loads(config_path.read_text())
api_token = config["apiToken"]
api_base = config["apiBaseUrl"].rstrip("/")

req = urllib.request.Request(
    f"{api_base}/api/widget/mark-known",
    data=json.dumps({"termId": term_id}).encode(),
    headers={
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(req):
        pass
except urllib.error.HTTPError as err:
    body = err.read().decode()
    try:
        message = json.loads(body).get("error") or f"API error ({err.code})"
    except json.JSONDecodeError:
        message = f"API error ({err.code})"
    sys.stderr.write(message + "\n")
    raise SystemExit(1)

try:
    state = json.loads(state_path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    state = {"rotationOffset": 0}

state["rotationOffset"] = int(state.get("rotationOffset") or 0) + 1
state_path.write_text(json.dumps(state, indent=2))
PY
