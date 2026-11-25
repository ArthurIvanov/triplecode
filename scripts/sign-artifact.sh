#!/usr/bin/env bash
# R-D1: optional signing. Missing secrets → unsigned OK (exit 0) with a note.
# Usage:
#   bash scripts/sign-artifact.sh macos <TripleCode.app>
#   bash scripts/sign-artifact.sh windows <TripleCode-win32-x64-dir>
#   bash scripts/sign-artifact.sh linux <ignored>
set -euo pipefail

os="${1:-}"
target="${2:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"

note() { printf 'signing: %s\n' "$*"; }

case "$os" in
  macos)
    if [[ -z "$target" || ! -d "$target" ]]; then
      printf 'Usage: %s macos <App.app>\n' "$0" >&2
      exit 2
    fi
    identity="${TRIPLECODE_SIGNING_IDENTITY:-${APPLE_DEVELOPER_ID:--}}"
    codesign --force --deep --sign "$identity" "$target"
    codesign --verify --deep --strict "$target"
    if [[ "$identity" == "-" ]]; then
      note "macOS ad-hoc signature (set TRIPLECODE_SIGNING_IDENTITY / APPLE_DEVELOPER_ID for Developer ID)"
    else
      note "macOS signed with identity=${identity}"
      if [[ -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]]; then
        ditto -c -k --keepParent "$target" "${target}.zip"
        xcrun notarytool submit "${target}.zip" \
          --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" \
          --password "$APPLE_APP_SPECIFIC_PASSWORD" --wait || {
            note "notarization failed or unavailable; artifact remains signed locally"
          }
        rm -f "${target}.zip"
      else
        note "skip notarization (APPLE_ID / APPLE_TEAM_ID / APPLE_APP_SPECIFIC_PASSWORD not set)"
      fi
    fi
    ;;
  windows)
    if [[ -z "$target" || ! -d "$target" ]]; then
      printf 'Usage: %s windows <TripleCode-win32-x64 dir>\n' "$0" >&2
      exit 2
    fi
    if [[ -z "${WINDOWS_CERT_PFX:-}" ]]; then
      note "Windows unsigned (set WINDOWS_CERT_PFX path or base64 + WINDOWS_CERT_PASSWORD)"
      exit 0
    fi
    pfx="$WINDOWS_CERT_PFX"
    if [[ ! -f "$pfx" ]]; then
      # treat as base64 payload
      tmp="$(mktemp "$root/.triplecode-dev/win-cert.XXXXXX.pfx")"
      mkdir -p "$root/.triplecode-dev"
      printf '%s' "$WINDOWS_CERT_PFX" | base64 --decode > "$tmp"
      pfx="$tmp"
    fi
    password="${WINDOWS_CERT_PASSWORD:-}"
    signed=0
    if command -v osslsigncode >/dev/null 2>&1; then
      while IFS= read -r -d '' exe; do
        out="${exe}.signed"
        if osslsigncode sign -pkcs12 "$pfx" ${password:+-pass "$password"} -n TripleCode -in "$exe" -out "$out"; then
          mv "$out" "$exe"
          signed=$((signed + 1))
        else
          rm -f "$out"
        fi
      done < <(find "$target" -type f \( -iname '*.exe' -o -iname '*.dll' \) -print0)
      note "Windows Authenticode via osslsigncode ($signed files)"
    elif command -v signtool.exe >/dev/null 2>&1; then
      find "$target" -type f \( -iname '*.exe' -o -iname '*.dll' \) -print0 |
        while IFS= read -r -d '' exe; do
          signtool.exe sign //f "$pfx" ${password:+//p "$password"} //fd SHA256 "$exe" || true
        done
      note "Windows Authenticode via signtool"
    else
      note "WINDOWS_CERT_PFX set but neither osslsigncode nor signtool found — left unsigned"
    fi
    [[ -n "${tmp:-}" ]] && rm -f "$tmp"
    ;;
  linux)
    note "Linux artifacts ship as-is (no code signature step)"
    ;;
  *)
    printf 'Usage: %s macos|windows|linux [target]\n' "$0" >&2
    exit 2
    ;;
esac
