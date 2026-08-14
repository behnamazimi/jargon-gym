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

    def fetch_state(exclude_ids):
        query = urllib.parse.urlencode([("exclude", tid) for tid in exclude_ids], doseq=True)
        url = f"{api_base}/api/widget/state"
        if query:
            url = f"{url}?{query}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_token}"})
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())

    default_pool = {
        "remaining": [],
        "staged": [],
        "batchIds": [],
        "knownCount": 0,
        "totalCount": 0,
    }
    pool = default_pool if reset else load_json(state_path, default_pool)
    pool.setdefault("remaining", [])
    pool.setdefault("staged", [])
    pool.setdefault("batchIds", [])
    pool.setdefault("knownCount", 0)
    pool.setdefault("totalCount", 0)

    def fetch_and_replace_batch():
        api_state = fetch_state([])
        terms = api_state.get("terms") or []
        pool["remaining"] = terms
        pool["batchIds"] = [t["id"] for t in terms]
        pool["staged"] = []
        pool["knownCount"] = api_state.get("knownCount", 0)
        pool["totalCount"] = api_state.get("totalCount", 0)

    try:
        if len(pool["remaining"]) == 0:
            # Initial load, empty pool, or --reset: fetch a fresh top 10.
            fetch_and_replace_batch()
        elif len(pool["remaining"]) == 1 and not pool["staged"]:
            # One term left on screen and nothing staged yet — prefetch the
            # next batch, excluding the whole batch currently on screen.
            batch_ids = set(pool["batchIds"])
            try:
                api_state = fetch_state(pool["batchIds"])
                terms = api_state.get("terms") or []
                # Defense in depth: never stage a term from the batch just finished.
                pool["staged"] = [t for t in terms if t.get("id") not in batch_ids]
                pool["knownCount"] = api_state.get("knownCount", pool["knownCount"])
                pool["totalCount"] = api_state.get("totalCount", pool["totalCount"])
            except Exception:
                # Prefetch failed — keep showing the last term rather than
                # flashing an error or "all known" state.
                pass
        # Otherwise (remaining > 1, or remaining == 1 with staged filled):
        # serve locally, no API call.
    except urllib.error.HTTPError as err:
        body = err.read().decode()
        try:
            message = json.loads(body).get("error") or f"API error ({err.code})"
        except json.JSONDecodeError:
            message = f"API error ({err.code})"
        emit(error_payload(message, app_base), 1)
    except Exception:
        emit(error_payload("fetch failed", app_base), 1)

    state_path.write_text(json.dumps(pool, indent=2))

    current = pool["remaining"][0] if pool["remaining"] else None

    emit({
        "current": current,
        "widgetDir": str(widget_dir),
        "appBaseUrl": app_base,
        "totalCount": pool.get("totalCount", 0),
        "knownCount": pool.get("knownCount", 0),
    })
except SystemExit:
    raise
except Exception as err:
    emit(error_payload(str(err) or "Couldn't load widget state."), 1)
PY
