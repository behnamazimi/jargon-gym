#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIDGET_SRC="$ROOT/widget/jargon-gym.widget"
OUT_DIR="$ROOT/public/downloads"
OUT_ZIP="$OUT_DIR/jargon-gym.widget.zip"
INSTALL_SCRIPT_SRC="$ROOT/scripts/widget-install.sh"
INSTALL_SCRIPT_OUT="$ROOT/public/install-widget.sh"
PRODUCTION_URL="${1:-${WIDGET_PRODUCTION_URL:-}}"

if [[ -z "$PRODUCTION_URL" && -n "${VERCEL_PROJECT_PRODUCTION_URL:-}" ]]; then
  PRODUCTION_URL="https://${VERCEL_PROJECT_PRODUCTION_URL}"
fi

if [[ -z "$PRODUCTION_URL" ]]; then
  if [[ -n "${VERCEL:-}" ]]; then
    echo "error: production URL required on Vercel" >&2
    echo "Set WIDGET_PRODUCTION_URL in project env, or rely on VERCEL_PROJECT_PRODUCTION_URL." >&2
    exit 1
  fi
  PRODUCTION_URL="http://localhost:3000"
  echo "warning: WIDGET_PRODUCTION_URL not set — using $PRODUCTION_URL for widget artifacts" >&2
fi

PRODUCTION_URL="${PRODUCTION_URL%/}"

if [[ ! -d "$WIDGET_SRC" ]]; then
  echo "error: widget source not found at $WIDGET_SRC" >&2
  exit 1
fi

if [[ ! -f "$INSTALL_SCRIPT_SRC" ]]; then
  echo "error: missing $INSTALL_SCRIPT_SRC" >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

mkdir -p "$OUT_DIR"
cp -R "$WIDGET_SRC" "$TMP/jargon-gym.widget"

/usr/bin/python3 - <<PY
import json
import pathlib

path = pathlib.Path("$TMP/jargon-gym.widget/config.json")
if path.exists():
    data = json.loads(path.read_text())
else:
    data = {"apiToken": ""}

data["apiToken"] = ""
data["appBaseUrl"] = "$PRODUCTION_URL"
data["apiBaseUrl"] = "$PRODUCTION_URL"
data.pop("rotationIntervalMinutes", None)
path.write_text(json.dumps(data, indent=2) + "\n")
PY

rm -f "$OUT_ZIP"
(
  cd "$TMP"
  zip -qr "$OUT_ZIP" jargon-gym.widget
)

sed "s|BAKED_BASE_URL=\"__JARGON_BASE_URL__\"|BAKED_BASE_URL=\"$PRODUCTION_URL\"|" "$INSTALL_SCRIPT_SRC" > "$INSTALL_SCRIPT_OUT"
chmod +x "$INSTALL_SCRIPT_OUT"

echo "Created $OUT_ZIP"
echo "Created $INSTALL_SCRIPT_OUT"
echo "  appBaseUrl=$PRODUCTION_URL"
echo "  apiBaseUrl=$PRODUCTION_URL"
echo ""
echo "Install command:"
echo "  curl -fsSL $PRODUCTION_URL/install-widget.sh | bash"
