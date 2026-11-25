# S01 — Первый запуск → Open Folder без аккаунта

| Field | Value |
| --- | --- |
| ID | S01 |
| Role | Инженер IDE |
| Stage | MVP |
| Roadmap | R-A (baseline) |
| Audit | A01 |
| QA | **Closed 25.11.2026** — `welcome-logic.cjs` + package defaults + cancel/missing path handling |

## Preconditions

- Свежий `--user-data-dir` (например `scripts/run-macos-qa.sh`).
- Аккаунт TripleCode не обязателен.
- macOS arm64 сборка `dist/TripleCode.app`.

## Steps

1. Запустить приложение без папки.
2. На Welcome выбрать Open project (мышь или клавиатура).
3. Выбрать локальный Node/TS репозиторий.
4. Убедиться, что Explorer показывает дерево.
5. Закрыть и снова открыть без папки — recent projects на Welcome.

## Expected

- Проект открыт без регистрации.
- Recent обновляется (MRU, до 8).
- `chat.disableAIFeatures: true` — нет Microsoft/Copilot login на первом запуске.

## Negative

- Отмена диалога выбора папки возвращает на Welcome без ошибки.
- Несуществующий путь из recent — ошибка «Folder not found», workspace не полуоткрыт; битые recent чистятся при показе Welcome.

## Acceptance

- [x] Open Folder завершается без аккаунта (`showWelcome` / `openFolder`).
- [x] Повторный запуск показывает recent project (`updateRecentFolders`).
- [x] Нет предложения Microsoft/Copilot login (`chat.disableAIFeatures` default + assertFirstLaunchDefaults).

## Code paths

- `welcome-logic.cjs`, `extension.js` showWelcome/openFolder  
- `media/workbench.js` recent list  
- `package.json` configurationDefaults  
- `test/s01-welcome.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
bash scripts/run-macos-qa.sh   # optional GUI: empty profile → Welcome → Open
```

## Links

[ide-design.md](../ide-design.md) · [competitive-audit-cursor-devin.md](../competitive-audit-cursor-devin.md)
