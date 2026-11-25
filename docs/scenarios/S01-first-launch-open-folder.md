# S01 — Первый запуск → Open Folder без аккаунта

| Field | Value |
| --- | --- |
| ID | S01 |
| Role | Инженер IDE |
| Stage | MVP |
| Roadmap | R-A (baseline) |
| Audit | A01 |

## Preconditions

- Свежий `--user-data-dir` (например `scripts/run-macos-qa.sh`).
- Аккаунт TripleCode не обязателен.
- macOS arm64 сборка `dist/TripleCode.app`.

## Steps

1. Запустить приложение.
2. На Welcome выбрать Open Folder (мышь или клавиатура).
3. Выбрать локальный Node/TS репозиторий.
4. Убедиться, что Explorer показывает дерево, редактор открывает файл.

## Expected

- Проект открыт без регистрации.
- Фокус пригоден для дальнейшей работы (Explorer или editor).

## Negative

- Отмена диалога выбора папки возвращает на Welcome без ошибки.
- Несуществующий путь не оставляет полуоткрытый workspace.

## Acceptance

- [ ] Open Folder завершается без аккаунта.
- [ ] Повторный запуск показывает recent project.
- [ ] Нет предложения Microsoft/Copilot login.

## Code paths

- `extensions/triplecode-mvp/` welcome contributions  
- Workbench upstream Welcome  

## Verify

```bash
bash scripts/run-macos-qa.sh
# ручной проход Welcome → Open Folder
```

## Links

[ide-design.md](../ide-design.md) · [competitive-audit-cursor-devin.md](../competitive-audit-cursor-devin.md)
