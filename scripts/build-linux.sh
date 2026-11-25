#!/usr/bin/env bash
# Package TripleCode from pinned VSCodium Linux x64 tarball.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$root/scripts/upstream.env"
cd "$root"

version="$VSCODIUM_VERSION"
checksum="$VSCODIUM_LINUX_X64_SHA256"
asset="$VSCODIUM_LINUX_X64_ASSET"
cache="$root/.triplecode-dev/downloads"
out="$root/dist"
mkdir -p "$cache" "$out"
archive="$cache/$asset"
stage="$(mktemp -d "$out/.package-linux.XXXXXX")"
trap 'rm -rf "$stage"' EXIT

if [[ ! -f "$archive" ]]; then
  curl --fail --location --silent --show-error --retry 2 \
    "https://github.com/VSCodium/vscodium/releases/download/$version/$asset" -o "$archive"
fi
printf '%s  %s\n' "$checksum" "$archive" | shasum -a 256 -c

tar -xzf "$archive" -C "$stage"
resources="$(find "$stage" -type d -path '*/resources/app' | head -1 || true)"
if [[ -z "$resources" ]]; then
  printf 'Could not locate resources/app in Linux tarball\n' >&2
  find "$stage" -maxdepth 3 -type d | head -50 >&2
  exit 1
fi
app_dir="$(dirname "$(dirname "$resources")")"

extension=extensions/triplecode-mvp
npm --prefix "$extension" ci --no-audit --no-fund
npm --prefix "$extension" run build:webview
python3 "$root/scripts/embed-extension.py" "$extension" "$resources"

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
    urlProtocol='triplecode',
    enableTelemetry=False,
)
for key in ('updateUrl', 'downloadUrl', 'releaseNotesUrl', 'voiceWsUrl', 'trustedExtensionAuthAccess'):
    product.pop(key, None)
if update_url:
    product['updateUrl'] = update_url
product_file.write_text(json.dumps(product, indent=2) + '\n')
PY

python3 "$root/scripts/desktop/apply-workbench-layout.py" "$resources"

dest="$out/TripleCode-linux-x64"
rm -rf "$dest"
cp -R "$app_dir" "$dest"
(
  cd "$out"
  tar -czf TripleCode-linux-x64.tar.gz TripleCode-linux-x64
)
printf 'Linux package ready under %s\n' "$out"
