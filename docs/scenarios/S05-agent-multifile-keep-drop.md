# S05 — Agent multi-file → per-file Keep/Drop

| Field | Value |
| --- | --- |
| ID | S05 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-A2 |
| Audit | A05 |
| QA | **Closed 25.11.2026** — logic smoke `npm --prefix extensions/triplecode-mvp test` + code path review |

## Preconditions

- Agent mode + AI provider (or stub comment patches for mechanical Keep/Drop).
- Workspace с ≥2 связанными файлами.

## Steps

1. Поручить правку, затрагивающую несколько файлов.
2. Открыть Review со списком файлов.
3. Keep один файл, Drop другой.
4. При необходимости Undo last AI apply после Keep; при ручной правке после apply — конфликт.

## Expected

- Частичное применение сохраняет остальные файлы в proposal (`remainingAfterApply`).
- Stale-проверка при ручной правке после proposal (`isStale`).
- Undo пропускает файлы с последующими ручными правками (`classifyUndo`) и показывает warning.

## Negative

- Путь вне workspace — отвергнут.
- Late response после Stop не применяет файлы (см. S06).

## Acceptance

- [x] Per-file Keep/Drop работает (UI Keep/Drop → `apply([index])` / `discardFile`; unit: selectFiles + remainingAfterApply).
- [x] Undo last AI apply с конфликтом (unit: classifyUndo; host: `undoLastApply`).
- [x] Ручная QA pending закрыта в [pilot-qa.md](../pilot-qa.md) (логика + smoke; GUI spot-check рекомендуем при сборке).

## Code paths

- `review-logic.cjs`, `extension.js` apply/undo/discardFile  
- `webview/agent.tsx` Keep/Drop buttons  
- `test/s05-s07-smoke.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```
