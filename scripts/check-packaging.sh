#!/usr/bin/env bash
# R-B2 dry-check: upstream pins + three-OS packaging scripts stay aligned.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
# shellcheck disable=SC1091
source "$root/scripts/upstream.env"

fail=0
need() {
  local name="$1" value="${2:-}"
  if [[ -z "$value" ]]; then
    printf 'missing %s in upstream.env\n' "$name" >&2
    fail=1
  fi
}

need VSCODIUM_VERSION "$VSCODIUM_VERSION"
need VSCODE_COMMIT "$VSCODE_COMMIT"
need VSCODIUM_DARWIN_ARM64_ASSET "$VSCODIUM_DARWIN_ARM64_ASSET"
need VSCODIUM_DARWIN_ARM64_SHA256 "$VSCODIUM_DARWIN_ARM64_SHA256"
need VSCODIUM_WIN32_X64_ASSET "$VSCODIUM_WIN32_X64_ASSET"
need VSCODIUM_WIN32_X64_SHA256 "$VSCODIUM_WIN32_X64_SHA256"
need VSCODIUM_LINUX_X64_ASSET "$VSCODIUM_LINUX_X64_ASSET"
need VSCODIUM_LINUX_X64_SHA256 "$VSCODIUM_LINUX_X64_SHA256"

for hash in "$VSCODIUM_DARWIN_ARM64_SHA256" "$VSCODIUM_WIN32_X64_SHA256" "$VSCODIUM_LINUX_X64_SHA256"; do
  if [[ ! "$hash" =~ ^[a-fA-F0-9]{64}$ ]]; then
    printf 'checksum must be 64 hex chars: %s\n' "$hash" >&2
    fail=1
  fi
done

for script in build-macos.sh build-windows.sh build-linux.sh embed-extension.py \
  verify-release-manifest.sh check-layout-pin.sh desktop/apply-workbench-layout.py; do
  if [[ ! -e "$root/scripts/$script" ]]; then
    printf 'missing scripts/%s\n' "$script" >&2
    fail=1
  fi
done

for script in build-macos.sh build-windows.sh build-linux.sh; do
  if ! grep -q 'upstream.env' "$root/scripts/$script"; then
    printf '%s must source upstream.env\n' "$script" >&2
    fail=1
  fi
  if ! grep -q 'embed-extension.py' "$root/scripts/$script"; then
    printf '%s must call embed-extension.py\n' "$script" >&2
    fail=1
  fi
  if ! grep -q 'apply-workbench-layout.py' "$root/scripts/$script"; then
    printf '%s must apply workbench layout\n' "$script" >&2
    fail=1
  fi
done

bash "$root/scripts/check-layout-pin.sh"

python3 - <<'PY'
import json, pathlib, subprocess
sample = {
  "version": "0.0.0-packaging",
  "channel": "preview",
  "publishedAt": "2026-11-25T00:00:00Z",
  "artifacts": [
    {"os": "darwin", "arch": "arm64", "name": "TripleCode-darwin-arm64.zip",
     "url": "https://example.invalid/a.zip", "sha512": "a" * 128},
    {"os": "win32", "arch": "x64", "name": "TripleCode-win32-x64.zip",
     "url": "https://example.invalid/b.zip", "sha512": "b" * 128},
    {"os": "linux", "arch": "x64", "name": "TripleCode-linux-x64.tar.gz",
     "url": "https://example.invalid/c.tgz", "sha512": "c" * 128},
  ],
}
path = pathlib.Path("dist-packaging-manifest.json")
path.write_text(json.dumps(sample, indent=2) + "\n")
subprocess.check_call(["bash", "scripts/verify-release-manifest.sh", str(path)])
path.unlink(missing_ok=True)
print("OK three-OS sample manifest")
PY

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
printf 'OK packaging pins + scripts for darwin/win32/linux\n'
