#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
host="${TRIPLECODE_HOST:-/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code}"
data="$root/.triplecode-dev"
if [[ ! -x "$host" ]]; then
  printf '%s\n' 'Set TRIPLECODE_HOST to an executable Code — OSS or VS Code launcher.' >&2
  exit 1
fi

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
