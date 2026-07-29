#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIDGET_SRC="$ROOT/widget/jargon-gym.widget"
WIDGET_NAME="jargon-gym.widget"
WIDGETS_DIR="${HOME}/Library/Application Support/Übersicht/widgets"
INSTALL_DIR="${WIDGETS_DIR}/${WIDGET_NAME}"

if [[ ! -d "$WIDGET_SRC" ]]; then
  echo "error: widget source not found at $WIDGET_SRC" >&2
  exit 1
fi

mkdir -p "$WIDGETS_DIR"

if [[ -e "$INSTALL_DIR" && ! -L "$INSTALL_DIR" ]]; then
  echo "error: ${INSTALL_DIR} exists and is not a symlink — remove it or use widget:install" >&2
  exit 1
fi

ln -sfn "$WIDGET_SRC" "$INSTALL_DIR"

echo "Linked ${INSTALL_DIR} -> ${WIDGET_SRC}"
echo ""
echo "Next steps:"
echo "  1. Set apiToken and localhost URLs in ${WIDGET_SRC}/config.json"
echo "  2. Run pnpm dev so the widget API is available"
echo "  3. Refresh Übersicht (or restart it)"
