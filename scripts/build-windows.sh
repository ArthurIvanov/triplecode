#!/usr/bin/env bash
# Package TripleCode from pinned VSCodium Windows x64 zip (rebrand + embed extension).
# Intended for windows-latest CI or a Windows host with bash (Git Bash) + python3 + npm.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$root/scripts/upstream.env"
cd "$root"

version="$VSCODIUM_VERSION"
checksum="$VSCODIUM_WIN32_X64_SHA256"
asset="$VSCODIUM_WIN32_X64_ASSET"
cache="$root/.triplecode-dev/downloads"
out="$root/dist"
mkdir -p "$cache" "$out"
archive="$cache/$asset"
stage="$(mktemp -d "$out/.package-win.XXXXXX")"
trap 'rm -rf "$stage"' EXIT

if [[ ! -f "$archive" ]]; then
  curl --fail --location --silent --show-error --retry 2 \
    "https://github.com/VSCodium/vscodium/releases/download/$version/$asset" -o "$archive"
fi
printf '%s  %s\n' "$checksum" "$archive" | shasum -a 256 -c

python3 - "$archive" "$stage" <<'PY'
import zipfile, sys
from pathlib import Path
zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])
print("extracted", sys.argv[2])
PY

# VSCodium windows zip typically extracts to VSCodium.exe + resources/
app_dir="$stage"
if [[ -d "$stage/VSCodium" ]]; then
  app_dir="$stage/VSCodium"
fi
resources="$app_dir/resources/app"
if [[ ! -d "$resources" ]]; then
  # some zips nest under a single folder
  resources="$(find "$stage" -type d -path '*/resources/app' | head -1)"
fi
if [[ -z "${resources:-}" || ! -d "$resources" ]]; then
  printf 'Could not locate resources/app in Windows zip\n' >&2
  find "$stage" -maxdepth 3 -type d | head -50 >&2
  exit 1
fi

extension=extensions/triplecode-mvp
npm --prefix "$extension" ci --no-audit --no-fund
npm --prefix "$extension" run build:webview
mkdir -p "$resources/extensions/triplecode-mvp"
rsync -a --exclude=/node_modules/ --exclude=/webview/ --exclude=/package-lock.json \
  "$extension/" "$resources/extensions/triplecode-mvp/"

python3 - "$resources" "${TRIPLECODE_UPDATE_URL:-}" <<'PY'
import json, sys
from pathlib import Path
resources = Path(sys.argv[1])
update_url = sys.argv[2]
product_file = resources / 'product.json'
product = json.loads(product_file.read_text())
product.update(
    nameShort='TripleCode',
    nameLong='TripleCode',
    applicationName='triplecode',
    dataFolderName='.triplecode',
    win32MutexName='triplecode',
    urlProtocol='triplecode',
    enableTelemetry=False,
)
for key in ('updateUrl', 'downloadUrl', 'releaseNotesUrl', 'voiceWsUrl', 'trustedExtensionAuthAccess'):
    product.pop(key, None)
if update_url:
    product['updateUrl'] = update_url
product_file.write_text(json.dumps(product, indent=2) + '\n')
PY

dest="$out/TripleCode-win32-x64"
rm -rf "$dest"
mkdir -p "$out"
cp -R "$app_dir" "$dest"
(
  cd "$out"
  if command -v zip >/dev/null; then
    rm -f TripleCode-win32-x64.zip
    zip -qr TripleCode-win32-x64.zip TripleCode-win32-x64
  else
    tar -czf TripleCode-win32-x64.tar.gz TripleCode-win32-x64
  fi
)
printf 'Windows package ready under %s\n' "$out"
