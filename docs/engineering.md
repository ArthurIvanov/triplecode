# Правила разработки TripleCode IDE

## Источники контекста

| Где | Что |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Роли, старт сессии, DoD |
| [docs/scenarios/](scenarios/) | Контракты фич (`Scenario: Sxx`) |
| [docs/roadmap.md](roadmap.md) | Backlog волны A–E |
| [docs/product-plan.md](product-plan.md) | Паритет и этапы релиза |
| [docs/strategy.md](strategy.md) | Стратегический курс |
| [docs/architecture.md](architecture.md) | Устройство сейчас |
| [docs/adr/](adr/) | Решения |
| [docs/release.md](release.md) | Tag, promote, rollback |
| `extensions/triplecode-mvp/AGENTS.md` | Границы extension |
| `../triplecode-web` | Кабинет/API/contracts |

## Карта каталогов — куда класть изменения

| Изменение | Куда |
| --- | --- |
| Agent UX, apply/undo, import, account client | `extensions/triplecode-mvp/` |
| LLM HTTP / prompts | `extensions/triplecode-mvp/provider.js` |
| React UI / DS components | `extensions/triplecode-mvp/webview/` |
| Workbench layout / chrome CSS / icons | `scripts/desktop/` (+ ADR 0002) |
| Branding / pin upstream | `scripts/build-*.sh`, `scripts/upstream.env`, `resources/` |
| CI / release | `.github/workflows/`, `docs/release.md` |
| Продуктовые контракты сценариев | `docs/scenarios/` |
| API/кабинет | репозиторий `triplecode-web` |
| Sync IDE↔API types | [contracts-sync.md](contracts-sync.md) |

**Сейчас** репозиторий — VSCodium repackage + extension, не полное дерево `src/vs/`. Source fork — по триггерам ADR 0002/0004.

## Definition of Ready

- Есть `Scenario: Sxx` или явные AC.
- Известна роль и этап (MVP/beta/full).
- Нет пересечения dirty-файлов без владельца интеграции.
- Для Workbench-патча — оценка числа замен vs порог ADR 0002.

## Definition of Done

- AC сценария проверены на целевой ОС или помечены blocked.
- PR содержит команды проверки и результат.
- Webview: `npm --prefix extensions/triplecode-mvp run build:webview` (tsc) проходит.
- CI workflow `ci.yml` зелёный на PR.
- Секреты не в diff.

## Команды

```bash
# Webview typecheck + bundle
npm --prefix extensions/triplecode-mvp ci
npm --prefix extensions/triplecode-mvp run build:webview

# macOS app (Apple Silicon)
bash scripts/build-macos.sh

# Windows / Linux packaging (CI or matching host)
bash scripts/build-windows.sh
bash scripts/build-linux.sh

# QA launch isolated profile
bash scripts/run-macos-qa.sh

# Validate release manifest JSON
bash scripts/verify-release-manifest.sh path/to/release-manifest.json

# Three-OS packaging pins + script alignment (R-B2 / S17)
bash scripts/check-packaging.sh
```

CI jobs: `ci` (includes `check-packaging.sh`), `build-macos`, `build-windows`, `build-linux`, `release` (tag `v*`). См. [TEST.md](../TEST.md) · [S17](scenarios/S17-packaging-three-os.md).

## ADR

Решения о формате данных, контрактах, глубине форка, update — `docs/adr/000N-topic.md`. Обновляй `architecture.md`.

## Чеклист релиза (кратко)

1. Scenarios P0 зелёные на macOS.  
2. Tag `vX.Y.Z` → workflow `release.yml`.  
3. `verify-release-manifest.sh` OK.  
4. Promote манифеста на update endpoint (см. release.md).  
5. Signing secrets: skip if missing на Stage 1; обязательны для публичной беты.  

Полный текст: [release.md](release.md).

## Передача

Формат записи — в [AGENTS.md](../AGENTS.md). Независимая AI-сессия для миграций, update, agent apply paths, extension compatibility.
