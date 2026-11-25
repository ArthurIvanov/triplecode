#!/usr/bin/env bash
# Dry check: workbench layout script pin matches upstream.env
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$root/scripts/upstream.env"
script="$root/scripts/desktop/apply-workbench-layout.py"
if ! grep -q "$VSCODE_COMMIT" "$script"; then
  printf 'apply-workbench-layout.py missing commit pin %s\n' "$VSCODE_COMMIT" >&2
  exit 1
fi
printf 'OK layout pin %s matches upstream.env\n' "$VSCODE_COMMIT"
