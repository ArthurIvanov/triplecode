# Структура репозиториев TripleCode

Два репозитория: IDE (`triplecode`) и веб-платформа (`triplecode-web`, рядом на диске `../triplecode-web`).

## IDE (`triplecode`) — текущее состояние

**Сейчас:** pinned VSCodium repackage + Workbench/Electron patches + `extensions/triplecode-mvp` ([architecture.md](architecture.md), [ADR 0001](adr/0001-macos-mvp-distribution.md), [ADR 0004](adr/0004-continue-vs-rewrite.md)). Не полное дерево `src/vs/`.

**Цель:** source fork Code-OSS по триггерам ADR 0002/0004 + CI артефактов.

| Репозиторий | Сейчас | Цель | Артефакты |
| --- | --- | --- | --- |
| `triplecode` | Repackage + extension + docs + GitHub Actions | Fork + product layers | Installers + `release-manifest.json` |
| `triplecode-web` | Существует: `apps/web`, `apps/api`, `packages/contracts` | Кабинет, квоты, downloads | Web + API |

## CI IDE

Workflows в `.github/workflows/`: `ci.yml`, `build-macos.yml`, `build-windows.yml`, `build-linux.yml`, `release.yml`. Pin upstream: `scripts/upstream.env`. Процесс: [release.md](release.md).

## Связь

- Контракты: [contracts-sync.md](contracts-sync.md) → `triplecode-web/packages/contracts`.
- Downloads page читает release manifest, который публикует IDE CI.
- Desktop login уже ходит на `https://triplecode.ru` (см. accounts.md).

## Структура web (факт)

```text
triplecode-web/
  AGENTS.md
  apps/web/
  apps/api/
  packages/contracts/
  docs/
```

Новые изменения кабинета/квот — в `triplecode-web`, не в этом репо.
