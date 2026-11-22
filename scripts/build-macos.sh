#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ]]; then
  printf '%s\n' 'This build targets macOS on Apple Silicon.' >&2
  exit 1
fi

# Base: VSCodium 1.143.17232 (VS Code 1.143.1)
# Tag SHA: ca7f7b4
# Release: https://github.com/VSCodium/vscodium/releases/tag/1.143.17232
version=1.143.17232
checksum=ade8f5e0ebf47e5ea9e2478844f150c68e43def192b6f8be05d0329d25ec0917
asset="VSCodium-darwin-arm64-$version.zip"
cache="$root/.triplecode-dev/downloads"
out="$root/dist"
app_name=TripleCode
signing_identity=-
case "${1:-}" in
  --keychain-qa)
    app_name='TripleCode Keychain QA'
    signing_identity="${TRIPLECODE_QA_SIGNING_IDENTITY:--}"
    ;;
  '') ;;
  *) printf 'Usage: %s [--keychain-qa]\n' "$0" >&2; exit 2 ;;
esac
destination="$out/$app_name.app"
archive="$cache/$asset"
mkdir -p "$cache" "$out"
stage="$(mktemp -d "$out/.package.XXXXXX")"
download=
trap 'rm -rf "$stage"; if [[ -n "$download" ]]; then rm -f "$download"; fi' EXIT

verify_archive() {
  printf '%s  %s\n' "$checksum" "$1" | shasum -a 256 -c
}

if [[ ! -f "$archive" ]]; then
  download="$(mktemp "$cache/.download.XXXXXX")"
  curl --fail --location --silent --show-error --retry 2 \
    "https://github.com/VSCodium/vscodium/releases/download/$version/$asset" -o "$download"
  verify_archive "$download"
  mv "$download" "$archive"
  download=
else
  verify_archive "$archive"
fi

ditto -x -k "$archive" "$stage"
app="$stage/TripleCode.app"
mv "$stage/VSCodium.app" "$app"
resources="$app/Contents/Resources/app"
extension=extensions/triplecode-mvp
npm --prefix "$extension" ci --no-audit --no-fund
npm --prefix "$extension" run build:webview
rsync -a --exclude=/node_modules/ --exclude=/webview/ --exclude=/package-lock.json \
  "$extension/" "$resources/extensions/triplecode-mvp/"

python3 - "$app" "$app_name" <<'PY'
import json
from pathlib import Path
import plistlib
import sys

contents = Path(sys.argv[1]) / 'Contents'
product_file = contents / 'Resources/app/product.json'
product = json.loads(product_file.read_text())
app_name = sys.argv[2]
qa = app_name != 'TripleCode'
application_name = 'triplecode-keychain-qa' if qa else 'triplecode'
bundle_identifier = 'com.tripleform.triplecode'
if qa:
    bundle_identifier += '.keychain-qa'
product.update(
    nameShort=app_name,
    nameLong=app_name,
    applicationName=application_name,
    dataFolderName='.' + application_name,
    sharedDataFolderName='.' + application_name + '-shared',
    darwinBundleIdentifier=bundle_identifier,
    urlProtocol=application_name,
    enableTelemetry=False,
)
# Workbench startup reads defaultChatAgent even with chat disabled.
for key in (
    'updateUrl', 'downloadUrl', 'releaseNotesUrl',
    'voiceWsUrl', 'trustedExtensionAuthAccess',
):
    product.pop(key, None)
product_file.write_text(json.dumps(product, indent=2) + '\n')

plist_file = contents / 'Info.plist'
with plist_file.open('rb') as file:
    plist = plistlib.load(file)
plist.update(
    CFBundleName=app_name,
    CFBundleExecutable='TripleCode',
    CFBundleDisplayName=app_name,
    CFBundleIdentifier=product['darwinBundleIdentifier'],
)
for entry in plist.get('CFBundleURLTypes', []):
    entry['CFBundleURLName'] = product['darwinBundleIdentifier']
    entry['CFBundleURLSchemes'] = [application_name]
with plist_file.open('wb') as file:
    plistlib.dump(plist, file)

(contents / 'MacOS/VSCodium').rename(contents / 'MacOS/TripleCode')
for helper in sorted((contents / 'Frameworks').glob('VSCodium Helper*.app')):
    previous_name = helper.stem
    name = previous_name.replace('VSCodium', app_name, 1)
    executable = helper / 'Contents/MacOS' / previous_name
    executable.rename(executable.with_name(name))
    info = helper / 'Contents/Info.plist'
    with info.open('rb') as file:
        data = plistlib.load(file)
    data.update(
        CFBundleName=name,
        CFBundleExecutable=name,
        CFBundleIdentifier=product['darwinBundleIdentifier'] + '.helper',
    )
    with info.open('wb') as file:
        plistlib.dump(data, file)
    helper.rename(helper.with_name(name + '.app'))

cli = contents / 'Resources/app/bin/codium'
cli.write_text(cli.read_text().replace('/MacOS/VSCodium', '/MacOS/TripleCode'))
cli.rename(cli.with_name('triplecode'))
PY

python3 scripts/desktop/apply-macos-keychain.py "$resources"
python3 scripts/desktop/apply-workbench-layout.py "$resources"
/usr/bin/clang -Os -Wall -Wextra -Werror scripts/desktop/keychain-parent.c \
  -o "$app/Contents/Resources/keychain-parent"
codesign --force --sign - "$app/Contents/Resources/keychain-parent"

codesign --force --deep --sign "$signing_identity" "$app"
codesign --verify --deep --strict "$app"

if [[ -e "$destination" ]]; then
  mv "$destination" "$stage/previous.app"
fi
if ! mv "$app" "$destination"; then
  if [[ -e "$stage/previous.app" ]]; then
    mv "$stage/previous.app" "$destination"
  fi
  exit 1
fi
printf 'Built %s\n' "$destination"
