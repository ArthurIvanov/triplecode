#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
app_name=TripleCode
profile="$root/.triplecode-dev/qa"
build_command=./scripts/build-macos.sh
keychain_args=(--use-mock-keychain)
if [[ "${1:-}" == --real-keychain ]]; then
  shift
  app_name='TripleCode Keychain QA'
  profile="$root/.triplecode-dev/kc"
  build_command='./scripts/build-macos.sh --keychain-qa'
  keychain_args=()
fi

for arg in "$@"; do
  case "$arg" in
    --user-data-dir|--user-data-dir=*|--extensions-dir|--extensions-dir=*|--use-mock-keychain*)
      printf 'The QA launcher manages %s.\n' "$arg" >&2
      exit 2
      ;;
  esac
done

executable="$root/dist/$app_name.app/Contents/MacOS/TripleCode"
if [[ ! -x "$executable" ]]; then
  printf 'Build the QA app first with %s.\n' "$build_command" >&2
  exit 1
fi

exec "$executable" ${keychain_args[@]+"${keychain_args[@]}"} \
  --user-data-dir "$profile/user" --extensions-dir "$profile/extensions" "$@"
