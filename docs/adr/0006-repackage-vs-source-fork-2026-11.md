# 0006. Решение: остаёмся на VSCodium repackage (срез 25.11.2026)

**Статус** — принято, 25 ноября 2026 года.  
**Связь** — ADR 0002 (пороги патча), ADR 0004 (эволюция vs rewrite), roadmap R-D3.

## Контекст

После закрытия волн B/C нужна явная развилка: продолжать repackage + `apply-workbench-layout.py` или поднимать source-fork Code-OSS.

## Измерение

| Метрика | Значение | Порог ADR 0002 |
| --- | --- | --- |
| JS-замен в Workbench layout | **24** (`bash scripts/check-fork-threshold.sh`) | > 30 → пересмотр |
| Подсистемы | layout + title bar (≤2) | > 2 → пересмотр |
| Upstream pin | `VSCODE_COMMIT` в `scripts/upstream.env` | — |

## Решение

**Остаёмся на VSCodium repackage** до следующего триггера:

1. `check-fork-threshold.sh` красный (замены > 30), или  
2. Нужен UX, невозможный без `src/vs` (Agents Window / sessions isolation), или  
3. Публичная бета требует регулярный upstream merge чаще, чем позволяет minified patch.

Пока триггеры не сработали — не начинать source-fork tree в этом репозитории.

## Последствия

- CI держит `check-fork-threshold.sh` рядом с packaging dry-check.
- Любой рост патча Workbench сопровождается пересчётом порога в PR.
- Wave E (cloud/worktrees) может стать отдельным триггером раньше порога 30.

## Ссылки

- [0002-workbench-layout-patch.md](0002-workbench-layout-patch.md)  
- [0004-continue-vs-rewrite.md](0004-continue-vs-rewrite.md)  
- [roadmap.md](../roadmap.md) R-D3
