#!/usr/bin/env bash
set -euo pipefail

manifest="${1:-}"
if [[ -z "$manifest" || ! -f "$manifest" ]]; then
  printf 'Usage: %s <release-manifest.json>\n' "$0" >&2
  exit 2
fi

python3 - "$manifest" <<'PY'
import hashlib, json, sys, urllib.request
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text())
required_top = {"version", "channel", "publishedAt", "artifacts"}
missing = required_top - set(data)
if missing:
    raise SystemExit(f"manifest missing keys: {sorted(missing)}")
if data["channel"] not in {"stable", "preview"}:
    raise SystemExit(f"invalid channel: {data['channel']}")
arts = data["artifacts"]
if not isinstance(arts, list) or not arts:
    raise SystemExit("artifacts must be a non-empty list")
for i, a in enumerate(arts):
    for key in ("os", "arch", "url", "sha512", "name"):
        if key not in a or not a[key]:
            raise SystemExit(f"artifact[{i}] missing {key}")
    if len(a["sha512"]) != 128:
        raise SystemExit(f"artifact[{i}] sha512 must be 128 hex chars")
print(f"OK {path} version={data['version']} artifacts={len(arts)}")
PY
