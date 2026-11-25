# S08 — @ context + rules badge

| Field | Value |
| --- | --- |
| ID | S08 |
| Role | Инженер AI + Продуктовый дизайнер |
| Stage | MVP (chips) → beta (`@` menu) |
| Roadmap | R-A / R-C4 |
| Audit | A08 |
| QA MVP | **Closed 25.11.2026** — `context-rules.cjs` + attach gates + Rules badge |

## Preconditions

- Workspace с `.triplecode/rules.md`.
- Файл-секрет по имени (`*.env`) в дереве.

## Steps (MVP)

1. Attach active file / selection / workspace file via `@` или attach menu.
2. Убедиться в чипах (≤5) и Rules badge.
3. Проверить, что `*.env` / secret-like пути не в авто-контексте и не аттачатся.

## Steps (beta target)

1. Inline `@` picker в composer (не только Quick Pick).
2. Удалить чип с клавиатуры.
3. `/` либо убрать из placeholder, либо реализовать — placeholder сейчас только `@`.

## Acceptance MVP

- [x] Chips + rules в промпте (`rulesSuffix` / Rules badge).
- [x] Secret-like имена исключены из авто-контекста и attach (`isSensitivePath` / `canAttachFile`).

## Acceptance beta

- [ ] Inline `@` picker без ухода в Quick Pick-only UX.
- [x] Placeholder честен: `Type @ for context.` (без `/`).

## Code paths

- `context-rules.cjs`, `extension.js` attach/rules/projectTree  
- `webview/agent.tsx` chips + Rules badge  
- `test/s08-context-rules.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```
