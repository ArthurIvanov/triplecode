#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
host="${TRIPLECODE_HOST:-}"
if [[ -z "$host" || ! -x "$host" ]]; then
  printf '%s\n' 'Set TRIPLECODE_HOST to a Code — OSS or VS Code launcher for extension-host testing. For the TripleCode shell use scripts/run-macos-qa.sh.' >&2
  exit 1
fi

data="$root/.triplecode-dev"
npm --prefix "$root/extensions/triplecode-mvp" run build:webview

mkdir -p "$data/user/User"
if [[ ! -e "$data/user/User/settings.json" ]]; then
  cat > "$data/user/User/settings.json" <<'SETTINGS'
{
  "chat.disableAIFeatures": true,
  "telemetry.telemetryLevel": "off",
  "workbench.startupEditor": "none",
  "window.restoreWindows": "none"
}
SETTINGS
fi

exec "$host" --new-window --user-data-dir "$data/user" --extensions-dir "$data/extensions" \
  --extensionDevelopmentPath="$root/extensions/triplecode-mvp" "$@"
