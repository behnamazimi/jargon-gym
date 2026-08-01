#!/bin/bash
set -euo pipefail

WIDGET_DIR="$(cd "$(dirname "$0")" && pwd)"
export WIDGET_DIR

/usr/bin/python3 - <<'PY'
import json
import math
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

widget_dir = pathlib.Path(os.environ["WIDGET_DIR"])
config_path = widget_dir / "config.json"
state_path = widget_dir / "state.json"

def emit(payload, code=0):
    sys.stdout.write(json.dumps(payload))
    raise SystemExit(code)

def load_json(path, fallback):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback

try:
    config = load_json(config_path, None)
    if not config or not config.get("apiToken") or not config.get("apiBaseUrl"):
        emit({
            "error": "Missing config.json — set apiToken and apiBaseUrl in config.json.",
            "terms": [],
            "knownTermIds": [],
            "current": None,
            "widgetDir": str(widget_dir),
            "appBaseUrl": "http://localhost:3000",
            "totalCount": 0,
            "knownCount": 0,
        }, 1)

    api_token = config["apiToken"]
    api_base = config["apiBaseUrl"].rstrip("/")
    app_base = (config.get("appBaseUrl") or api_base).rstrip("/")
    rotation_minutes = int(config.get("rotationIntervalMinutes") or 60)

    req = urllib.request.Request(
        f"{api_base}/api/widget/state",
        headers={"Authorization": f"Bearer {api_token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            api_state = json.loads(resp.read().decode())
    except urllib.error.HTTPError as err:
        body = err.read().decode()
        try:
            message = json.loads(body).get("error") or f"API error ({err.code})"
        except json.JSONDecodeError:
            message = f"API error ({err.code})"
        emit({
            "error": message,
            "terms": [],
            "knownTermIds": [],
            "current": None,
            "widgetDir": str(widget_dir),
            "appBaseUrl": app_base,
            "totalCount": 0,
            "knownCount": 0,
        }, 1)
    except Exception:
        emit({
            "error": "fetch failed",
            "terms": [],
            "knownTermIds": [],
            "current": None,
            "widgetDir": str(widget_dir),
            "appBaseUrl": app_base,
            "totalCount": 0,
            "knownCount": 0,
        }, 1)

    local_state = load_json(state_path, {"rotationOffset": 0})
    known_ids = set(api_state.get("knownTermIds") or [])
    terms = api_state.get("terms") or []
    unknown = [t for t in terms if t.get("id") not in known_ids]

    interval_ms = rotation_minutes * 60 * 1000
    interval_bucket = math.floor(time.time() * 1000 / interval_ms)
    rotation_offset = int(local_state.get("rotationOffset") or 0)

    def hash_int(n):
        n = (n ^ 61) ^ (n >> 16)
        n = n + (n << 3)
        n = n ^ (n >> 4)
        n = (n * 0x27D4EB2D) & 0xFFFFFFFF
        n = n ^ (n >> 15)
        return n & 0xFFFFFFFF

    current = None
    if unknown:
        idx = (hash_int(interval_bucket) + rotation_offset) % len(unknown)
        current = unknown[idx]

    emit({
        "terms": terms,
        "knownTermIds": list(known_ids),
        "current": current,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": api_state.get("totalCount", len(terms)),
        "knownCount": api_state.get("knownCount", len(known_ids)),
    })
except SystemExit:
    raise
except Exception as err:
    emit({
        "error": str(err) or "Couldn't load widget state.",
        "terms": [],
        "knownTermIds": [],
        "current": None,
        "widgetDir": str(widget_dir),
        "appBaseUrl": "http://localhost:3000",
        "totalCount": 0,
        "knownCount": 0,
    }, 1)
PY
