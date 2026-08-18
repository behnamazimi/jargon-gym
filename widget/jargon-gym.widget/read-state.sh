#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
export WIDGET_DIR

RESET_FLAG="0"
if [[ "${1:-}" == "--reset" ]]; then
  RESET_FLAG="1"
fi
export RESET_FLAG

/usr/bin/python3 - <<'PY'
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

widget_dir = pathlib.Path(os.environ["WIDGET_DIR"])
config_path = widget_dir / "config.json"
state_path = widget_dir / "state.json"
reset = os.environ.get("RESET_FLAG") == "1"

def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload))
    raise SystemExit(code)

def load_json(path, fallback):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback

def error_payload(message, app_base="http://localhost:3000"):
    return {
        "error": message,
        "current": None,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": 0,
        "knownCount": 0,
    }

try:
    config = load_json(config_path, None)
    if not config or not config.get("apiToken") or not config.get("apiBaseUrl"):
        emit(
            error_payload(
                "Missing config.json — set apiToken and apiBaseUrl in config.json."
            ),
            1,
        )

    api_token = config["apiToken"]
    api_base = config["apiBaseUrl"].rstrip("/")
    app_base = (config.get("appBaseUrl") or api_base).rstrip("/")
    # No "version" field means this is a dev symlink install (widget:link) —
    # always current by definition, so the update nag never applies to it.
    widget_version = config.get("version")

    def fetch_state():
        url = f"{api_base}/api/widget/state"
        headers = {"Authorization": f"Bearer {api_token}"}
        if widget_version:
            headers["X-Widget-Version"] = widget_version
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())

    default_state = {"pool": [], "knownCount": 0, "totalCount": 0, "latestWidgetVersion": None}
    state = default_state if reset else load_json(state_path, default_state)
    state.setdefault("pool", [])
    state.setdefault("knownCount", 0)
    state.setdefault("totalCount", 0)
    state.setdefault("latestWidgetVersion", None)

    # Only hit the network on --reset or when the local pool is empty (first
    # run, or corrupted state). Every other rotation is handled by
    # advance-term.sh, which keeps the pool replenished against the live
    # queue as it drops terms — this is just a cheap re-read of that pool.
    try:
        if reset or not state["pool"]:
            api_state = fetch_state()
            state["pool"] = api_state.get("terms") or []
            state["knownCount"] = api_state.get("knownCount", 0)
            state["totalCount"] = api_state.get("totalCount", 0)
            state["latestWidgetVersion"] = api_state.get("latestWidgetVersion")
    except urllib.error.HTTPError as err:
        body = err.read().decode()
        try:
            message = json.loads(body).get("error") or f"API error ({err.code})"
        except json.JSONDecodeError:
            message = f"API error ({err.code})"
        emit(error_payload(message, app_base), 1)
    except Exception:
        emit(error_payload("fetch failed", app_base), 1)

    state_path.write_text(json.dumps(state, indent=2))

    current = state["pool"][0] if state["pool"] else None

    emit({
        "current": current,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": state.get("totalCount", 0),
        "knownCount": state.get("knownCount", 0),
        "widgetVersion": widget_version,
        "latestWidgetVersion": state.get("latestWidgetVersion"),
    })
except SystemExit:
    raise
except Exception as err:
    emit(error_payload(str(err) or "Couldn't load widget state."), 1)
PY
