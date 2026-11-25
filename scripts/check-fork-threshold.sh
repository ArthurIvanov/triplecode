#!/usr/bin/env bash
# R-D3: measure Workbench JS replacement count vs ADR 0002 thresholds.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
script="$root/scripts/desktop/apply-workbench-layout.py"
# shellcheck disable=SC1091
source "$root/scripts/upstream.env"

python3 - "$script" "$VSCODE_COMMIT" <<'PY'
import ast, sys
from pathlib import Path

path = Path(sys.argv[1])
commit = sys.argv[2]
src = path.read_text()
tree = ast.parse(src)
replacements = 0
for node in ast.walk(tree):
    if isinstance(node, ast.For) and isinstance(node.iter, ast.Tuple):
        # the for before, after in ( ... ): block
        replacements = len(node.iter.elts)
        break
# fallback: count js = js.replace
if replacements == 0:
    replacements = src.count("js = js.replace(")

THRESHOLD = 30
SUBSYSTEM_NOTE = "layout+titlebar (≤2 subsystems)"
print(f"Workbench JS replacements: {replacements}")
print(f"ADR 0002 threshold: {THRESHOLD}")
print(f"Upstream commit pin: {commit}")
print(f"Subsystems touched (manual): {SUBSYSTEM_NOTE}")
if replacements > THRESHOLD:
    print("DECISION: TRIGGER source-fork review (replacements exceed ADR 0002)")
    raise SystemExit(2)
print("DECISION: stay on VSCodium repackage (below ADR 0002 thresholds)")
PY
