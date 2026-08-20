#!/usr/bin/env bash
set -euo pipefail

# Production URL is baked in by scripts/widget-zip.sh (see BAKED_BASE_URL below).
BAKED_BASE_URL="__JARGON_BASE_URL__"
if [[ -n "${JARGON_BASE_URL:-}" ]]; then
  BASE_URL="$JARGON_BASE_URL"
elif [[ "$BAKED_BASE_URL" != "__JARGON_BASE_URL__" ]]; then
  BASE_URL="$BAKED_BASE_URL"
else
  BASE_URL="${1:-https://jargon-gym.vercel.app}"
fi

if [[ -z "$BASE_URL" ]]; then
  echo "error: base URL required" >&2
  echo "usage: curl -fsSL <site>/install-widget.sh | bash" >&2
  echo "  or:  JARGON_BASE_URL=https://example.com bash install-widget.sh" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
WIDGET_NAME="jargon-gym.widget"
WIDGETS_DIR="${HOME}/Library/Application Support/Übersicht/widgets"
INSTALL_DIR="${WIDGETS_DIR}/${WIDGET_NAME}"
ZIP_URL="${BASE_URL}/downloads/jargon-gym.widget.zip"
API_TOKEN="${JARGON_WIDGET_TOKEN:-}"

inject_api_token() {
  local config="${INSTALL_DIR}/config.json"

  if [[ -z "$API_TOKEN" ]]; then
    return 0
  fi

  if [[ ! -f "$config" ]]; then
    echo "error: config.json not found at ${config}" >&2
    exit 1
  fi

  CONFIG_PATH="$config" API_TOKEN="$API_TOKEN" /usr/bin/python3 - <<'PY'
import json
import os
import pathlib

path = pathlib.Path(os.environ["CONFIG_PATH"])
data = json.loads(path.read_text())
data["apiToken"] = os.environ["API_TOKEN"]
path.write_text(json.dumps(data, indent=2) + "\n")
PY

  echo "API token written to ${config}"
}

if ! command -v unzip >/dev/null 2>&1; then
  echo "error: unzip is required" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "Downloading widget from ${ZIP_URL} ..."
HTTP_CODE="$(curl -fsSL -w "%{http_code}" "$ZIP_URL" -o "${TMP}/widget.zip")"
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "error: download failed (HTTP ${HTTP_CODE})" >&2
  exit 1
fi
if ! head -c 2 "${TMP}/widget.zip" | grep -q '^PK'; then
  echo "error: download did not return a zip file — check the site URL and try again" >&2
  exit 1
fi

mkdir -p "$WIDGETS_DIR"

# Reinstalling to update: keep the token already in config.json unless the
# caller explicitly passed a new one, so "update the widget" never requires
# generating a fresh token.
if [[ -z "$API_TOKEN" && -f "${INSTALL_DIR}/config.json" ]]; then
  EXISTING_TOKEN="$(CONFIG_PATH="${INSTALL_DIR}/config.json" /usr/bin/python3 - <<'PY'
import json
import os
import pathlib

path = pathlib.Path(os.environ["CONFIG_PATH"])
try:
    data = json.loads(path.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    data = {}
print(data.get("apiToken") or "")
PY
)"
  if [[ -n "$EXISTING_TOKEN" ]]; then
    API_TOKEN="$EXISTING_TOKEN"
    echo "Preserving existing API token from previous install."
  fi
fi

if [[ -e "$INSTALL_DIR" ]]; then
  echo "Removing existing widget at ${INSTALL_DIR}"
  rm -rf "$INSTALL_DIR"
fi

unzip -q "${TMP}/widget.zip" -d "$WIDGETS_DIR"

if [[ ! -f "${INSTALL_DIR}/config.json" ]]; then
  echo "error: install failed — config.json missing from zip" >&2
  exit 1
fi

inject_api_token

echo ""
echo "Installed to ${INSTALL_DIR}"

if [[ -n "$API_TOKEN" ]]; then
  echo ""
  echo "Next step: refresh Übersicht (or restart it)."
else
  echo ""
  echo "Next steps:"
  echo "  1. Open ${BASE_URL}/jargon/settings and generate a widget API token"
  echo "  2. Re-run install with JARGON_WIDGET_TOKEN set, or paste the token into ${INSTALL_DIR}/config.json"
  echo "  3. Refresh Übersicht (or restart it)"
fi
