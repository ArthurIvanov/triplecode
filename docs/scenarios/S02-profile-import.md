# S02 — Импорт профиля VS Code → отчёт → rollback

| Field | Value |
| --- | --- |
| ID | S02 |
| Role | Инженер IDE |
| Stage | MVP |
| Roadmap | R-A5 |
| Audit | A02 |
| Status | Closed (logic + wiring verified; live VS Code E2E optional) |

## Preconditions

- Локально установлен VS Code с профилем **или** файл settings JSON / User folder.
- QA user-data-dir.

## Steps

1. Открыть Import from VS Code (Settings / команда TripleCode).
2. Пройти preview категорий (counts only).
3. Применить импорт.
4. Прочитать отчёт (перенесённое / пропущенное / failed extensions).
5. Выполнить rollback.

## Expected

- Preview до записи (webview `import-preview`).
- Секреты/сессии/`settingsSync.*` не импортируются (`classifySettings`).
- Частичный отказ расширения отражён в отчёте (`extensionsFailed`).
- Rollback восстанавливает settings / keybindings / snippets и снимает импортированные расширения.
- VS Code не найден → «Import from File».

## Negative

- VS Code не найден → предложить импорт файла.
- Расширение отсутствует в Open VSX → строка в отчёте, не silent fail.

## Acceptance

- [x] Preview → apply → report: логика + команды + webview wired; unit coverage на classify/report/rollback material.
- [x] Rollback: `hasRollbackMaterial` + restore paths в `rollbackImport`.
- [x] ADR 0003: one-click + file fallback + rollback; секреты не пишутся (усиление поверх ADR).
- [ ] Live E2E на машине с VS Code (опционально QA).

## Code paths

- `extensions/triplecode-mvp/import-logic.cjs` — classify / report / preview counts  
- `extensions/triplecode-mvp/extension.js` — `showImportPreview`, `performImport`, `rollbackImport`  
- `extensions/triplecode-mvp/webview/import-preview.tsx`  
- `extensions/triplecode-mvp/test/s02-import.test.cjs`

## Verify

```bash
cd extensions/triplecode-mvp && npm test
# ручной E2E (опционально):
# bash scripts/run-macos-qa.sh
```

## Links

[adr/0003-profile-import.md](../adr/0003-profile-import.md) · [profile-import-analysis.md](../profile-import-analysis.md)
