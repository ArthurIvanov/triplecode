# S08 — @ context + rules badge

| Field | Value |
| --- | --- |
| ID | S08 |
| Role | Инженер AI + Продуктовый дизайнер |
| Stage | MVP (chips) → beta (`@` menu) |
| Roadmap | R-A / R-C4 |
| Audit | A08 |

## Preconditions

- Workspace с `.triplecode/rules.md`.
- Файл-секрет по имени (`*.env`) в дереве.

## Steps (MVP)

1. Attach active file / selection / workspace file via UI.
2. Убедиться в чипах (≤5) и Rules badge.
3. Проверить, что `*.env` не в авто-контексте.

## Steps (beta target)

1. Ввести `@` в composer — меню файлов/папок со стрелками.
2. Удалить чип с клавиатуры.
3. `/` либо убрать из placeholder, либо реализовать.

## Acceptance MVP

- [ ] Chips + rules в промпте.
- [ ] Secret-like имена исключены из авто-контекста.

## Acceptance beta

- [ ] Inline `@` picker без ухода в Quick Pick-only UX.
- [ ] Placeholder честен относительно реализованных символов.

## Code paths

- `extension.js` attach/rules  
- `webview/agent.tsx`  
