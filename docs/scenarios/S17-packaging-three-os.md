# S17 — Packaging artifacts macOS / Windows / Linux

| Field | Value |
| --- | --- |
| ID | S17 |
| Role | Инженер релизов |
| Stage | MVP→beta |
| Roadmap | R-B2 · R-B5 |
| Status | Closed 25.11.2026 (scripts+CI dry-check; signed public beta → R-D1) |

## Preconditions

- `scripts/upstream.env` pin актуален.
- CI runners: macos-14, windows-latest, ubuntu-latest (workflow_dispatch / release tag).

## Steps

1. `bash scripts/check-packaging.sh` — pins, embed+layout на всех трёх `build-*.sh`, sample manifest.
2. `bash scripts/build-macos.sh` → `dist/TripleCode.app` (+ CI zip `TripleCode-darwin-arm64.zip`).
3. `bash scripts/build-windows.sh` → `dist/TripleCode-win32-x64.zip` (stdlib zip, layout applied).
4. `bash scripts/build-linux.sh` → `dist/TripleCode-linux-x64.tar.gz` (layout applied).
5. Tag `v*` → `release.yml` собирает три артефакта + `release-manifest.json` → `verify-release-manifest.sh`.

## Expected

- Один `VSCODIUM_VERSION` / checksums на все ОС.
- Extension + workbench layout во всех трёх пакетах.
- Манифест: version, channel, artifacts[{os,arch,name,url,sha512}].

## Negative

- Битый checksum upstream → build abort.
- Layout pin drift (`VSCODE_COMMIT`) → `check-layout-pin` / packaging fail.

## Acceptance

- [x] `embed-extension.py` + layout на darwin/win32/linux.
- [x] Windows всегда пишет `.zip` без зависимости от `zip`/`rsync`.
- [x] CI `check-packaging.sh`; workflows upload ожидаемые имена артефактов.
- [x] `verify-release-manifest.sh` в release + packaging dry-check.

## Code paths

- `scripts/build-macos.sh`, `build-windows.sh`, `build-linux.sh`
- `scripts/embed-extension.py`, `check-packaging.sh`, `verify-release-manifest.sh`
- `.github/workflows/{ci,build-*,release}.yml`

## Verify

```bash
bash scripts/check-packaging.sh
# Optional full packs (downloads upstream):
# bash scripts/build-macos.sh
# bash scripts/build-windows.sh
# bash scripts/build-linux.sh
```

## Links

- [release.md](../release.md) · [roadmap.md](../roadmap.md) R-B2/R-B5 · ADR 0005
