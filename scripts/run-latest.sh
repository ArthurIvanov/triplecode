#!/usr/bin/env bash
# Build the latest TripleCode app from the current tree and launch it with the QA profile.
# Usage: scripts/run-latest.sh [run-macos-qa.sh args...]
#        scripts/run-latest.sh --real-keychain   # keychain QA variant
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "--real-keychain" ]]; then
  "$root/scripts/build-macos.sh" --keychain-qa
  exec "$root/scripts/run-macos-qa.sh" "$@"
fi

"$root/scripts/build-macos.sh"
exec "$root/scripts/run-macos-qa.sh" "$@"
