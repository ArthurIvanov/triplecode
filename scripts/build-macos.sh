#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ ! -f "$root/resources/logo.icns" ]]; then
  printf '%s\n' 'Missing resources/logo.icns' >&2
  exit 1
fi

if [[ "$(uname -s)" != Darwin || "$(uname -m)" != arm64 ]]; then
  printf '%s\n' 'This build targets macOS on Apple Silicon.' >&2
  exit 1
fi

# Base pin: scripts/upstream.env
# shellcheck disable=SC1091
source "$root/scripts/upstream.env"
# VSCodium $VSCODIUM_VERSION (tag $VSCODIUM_TAG_SHA)
version="$VSCODIUM_VERSION"
checksum="$VSCODIUM_DARWIN_ARM64_SHA256"
asset="$VSCODIUM_DARWIN_ARM64_ASSET"
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
python3 "$root/scripts/embed-extension.py" "$extension" "$resources"

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
    CFBundleIconFile='TripleCode.icns',
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

# Replace app icon with TripleCode logo
cp "$root/resources/logo.icns" "$app/Contents/Resources/TripleCode.icns"
rm -f "$app/Contents/Resources/VSCodium.icns"

codesign --force --deep --sign "$signing_identity" "$app"
codesign --verify --deep --strict "$app"

python3 - "$app" "$app_name" <<'PY'
import json
import plistlib
import sys
from pathlib import Path

app = Path(sys.argv[1])
app_name = sys.argv[2]
qa = app_name != 'TripleCode'
application_name = 'triplecode-keychain-qa' if qa else 'triplecode'
bundle_identifier = 'com.tripleform.triplecode' + ('.keychain-qa' if qa else '')
errors = []
contents = app / 'Contents'

with (contents / 'Info.plist').open('rb') as file:
    plist = plistlib.load(file)
for key, expected in {
    'CFBundleName': app_name,
    'CFBundleExecutable': 'TripleCode',
    'CFBundleDisplayName': app_name,
    'CFBundleIdentifier': bundle_identifier,
    'CFBundleIconFile': 'TripleCode.icns',
}.items():
    if plist.get(key) != expected:
        errors.append(f'Info.plist {key}={plist.get(key)!r}, expected {expected!r}')

product = json.loads((contents / 'Resources/app/product.json').read_text())
for key, expected in {
    'nameShort': app_name,
    'nameLong': app_name,
    'applicationName': application_name,
    'urlProtocol': application_name,
    'darwinBundleIdentifier': bundle_identifier,
}.items():
    if product.get(key) != expected:
        errors.append(f'product.json {key}={product.get(key)!r}, expected {expected!r}')
if product.get('enableTelemetry') is not False:
    errors.append('product.json enableTelemetry is not false')

if not (contents / 'Resources/TripleCode.icns').is_file():
    errors.append('Resources/TripleCode.icns is missing')
if (contents / 'Resources/VSCodium.icns').exists():
    errors.append('Resources/VSCodium.icns is still present')
for relative in (
    'MacOS/TripleCode',
    'Resources/app/bin/triplecode',
    'Resources/app/extensions/triplecode-mvp/package.json',
):
    if not (contents / relative).exists():
        errors.append(f'missing Contents/{relative}')

css = (contents / 'Resources/app/out/vs/workbench/workbench.desktop.main.css').read_bytes()
js = (contents / 'Resources/app/out/vs/workbench/workbench.desktop.main.js').read_bytes()
for marker in (b'triplecode-gutter', b'triplecode-editor-tab'):
    if marker not in css:
        errors.append(f'workbench css missing {marker.decode()}')
for marker in (b'triplecode.gutter.', b'triplecode.newChat'):
    if marker not in js:
        errors.append(f'workbench js missing {marker.decode()}')

if errors:
    print('TripleCode app verification failed:', file=sys.stderr)
    for error in errors:
        print(f' - {error}', file=sys.stderr)
    sys.exit(1)
PY

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

# Keep the user-facing copy in ~/Applications in sync so protocol handlers
# (triplecode://) and LaunchServices always resolve to the latest build.
install_app="$HOME/Applications/$app_name.app"
if [[ -d "$HOME/Applications" || "${TRIPLECODE_INSTALL:-1}" == "1" ]]; then
  mkdir -p "$HOME/Applications"
  rsync -a --delete "$destination/" "$install_app/"
  lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
  "$lsregister" -f "$install_app" >/dev/null 2>&1 || true
  printf 'Installed %s\n' "$install_app"
fi
