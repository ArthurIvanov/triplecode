#!/usr/bin/env python3
"""Copy triplecode-mvp into a packaged VSCodium resources/app/extensions tree."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

SKIP_NAMES = {"node_modules", "webview", "package-lock.json", ".git"}


def copy_extension(src: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)

    def ignore(_directory: str, names: list[str]) -> set[str]:
        return {name for name in names if name in SKIP_NAMES}

    shutil.copytree(src, dest, ignore=ignore)


def main() -> int:
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <extension-src> <resources/app>", file=sys.stderr)
        return 2
    src = Path(sys.argv[1]).resolve()
    resources = Path(sys.argv[2]).resolve()
    if not (src / "package.json").is_file():
        print(f"missing extension package.json: {src}", file=sys.stderr)
        return 1
    dest = resources / "extensions" / "triplecode-mvp"
    copy_extension(src, dest)
    print(f"embedded {src} -> {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
