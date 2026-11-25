# S08 — @ context + rules badge

| Field | Value |
| --- | --- |
| ID | S08 |
| Role | Инженер AI + Продуктовый дизайнер |
| Stage | MVP (chips) → beta (`@` menu) |
| Roadmap | R-A / R-C4 |
| Audit | A08 |
| QA MVP | **Closed 25.11.2026** — `context-rules.cjs` + attach gates + Rules badge |
| QA beta | **Closed 25.11.2026** — inline `@` picker + chip Backspace + unit coverage |

## Preconditions

- Workspace с `.triplecode/rules.md`.
- Файл-секрет по имени (`*.env`) в дереве.

## Steps (MVP)

1. Attach active file / selection / workspace file via `@` или attach menu.
2. Убедиться в чипах (≤5) и Rules badge.
3. Проверить, что `*.env` / secret-like пути не в авто-контексте и не аттачатся.

## Steps (beta)

1. Inline `@` picker в composer (не Quick Pick-only).
2. Стрелки / Enter / Tab / Esc в picker; клик по пункту.
3. Backspace на пустом draft снимает последний чип.
4. Paperclip тоже открывает inline picker (Quick Pick — fallback без webview).

## Acceptance MVP

- [x] Chips + rules в промпте (`rulesSuffix` / Rules badge).
- [x] Secret-like имена исключены из авто-контекста и attach (`isSensitivePath` / `canAttachFile`).

## Acceptance beta

- [x] Inline `@` picker без ухода в Quick Pick-only UX (`attach-candidates` / `at-picker`).
- [x] Placeholder честен: `Type @ for context.` (без `/`).
- [x] Клавиатурное удаление чипа с пустого draft.

## Code paths

- `context-rules.cjs` — secrets, `parseAtQuery`, `filterAttachCandidates`, chip Backspace  
- `extension.js` — `listAttachCandidates`, `attach-query` / `attach-pick`  
- `webview/agent.tsx` — inline picker UI  
- `test/s08-context-rules.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```
