# S18 — Signing + update check (Wave D)

| Field | Value |
| --- | --- |
| ID | S18 |
| Role | Инженер релизов |
| Stage | beta |
| Roadmap | R-D1 · R-D2 |
| Status | Closed 25.11.2026 (optional signing + manifest check; notarization/Authenticode when secrets present) |

## Preconditions

- Сборка через `scripts/build-*.sh`.
- Секреты подписи опциональны (без них — unsigned / ad-hoc, не блок CI).

## Steps

### Signing (R-D1)

1. macOS без `APPLE_DEVELOPER_ID` → ad-hoc `codesign` (как сейчас).
2. С `TRIPLECODE_SIGNING_IDENTITY` / `APPLE_DEVELOPER_ID` → Developer ID; notarization если заданы `APPLE_ID` + team + app password.
3. Windows без `WINDOWS_CERT_PFX` → zip unsigned + note.
4. Linux → tar.gz as-is.

### Updates (R-D2)

1. Задать `triplecode.update.manifestUrl` на HTTPS `release-manifest.json`.
2. **TripleCode: Check for Updates** → idle / available / rollback.
3. Available → Open download (artifact URL); диск не пишется автоматически.
4. **TripleCode: About** — version + channel.

## Acceptance

- [x] `scripts/sign-artifact.sh` wired into three build scripts.
- [x] `update-logic.cjs` + `update-host.cjs` commands.
- [x] Missing secrets do not fail packaging.
- [x] `npm test` covers update decide/compare.

## Verify

```bash
bash scripts/sign-artifact.sh linux
bash scripts/check-fork-threshold.sh
npm --prefix extensions/triplecode-mvp test
```

## Links

- ADR 0005 · ADR 0006 · [release.md](../release.md)
