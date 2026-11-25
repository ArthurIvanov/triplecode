# S02 — Импорт профиля VS Code → отчёт → rollback

| Field | Value |
| --- | --- |
| ID | S02 |
| Role | Инженер IDE |
| Stage | MVP |
| Roadmap | R-A5 |
| Audit | A02 |

## Preconditions

- Локально установлен VS Code с профилем **или** файл `.code-profile`.
- QA user-data-dir.

## Steps

1. Открыть Import from VS Code (Settings / команда TripleCode).
2. Пройти preview категорий.
3. Применить импорт.
4. Прочитать отчёт (перенесённое / пропущенное).
5. Выполнить rollback.

## Expected

- Preview до записи.
- Секреты/сессии не импортируются.
- Rollback возвращает предыдущее состояние профиля TripleCode.

## Negative

- VS Code не найден → предложить импорт файла через Profiles.
- Частичный отказ расширения отражён в отчёте, не как silent fail.

## Acceptance

- [ ] Preview → apply → report на реальном профиле.
- [ ] Rollback проверен.
- [ ] ADR 0003 соблюдён (Profiles API).

## Code paths

- `extensions/triplecode-mvp/extension.js` (import flows)  
- import webview  

## Verify

```bash
# ручной E2E на машине с VS Code
bash scripts/run-macos-qa.sh
```

## Links

[adr/0003-profile-import.md](../adr/0003-profile-import.md) · [profile-import-analysis.md](../profile-import-analysis.md)
