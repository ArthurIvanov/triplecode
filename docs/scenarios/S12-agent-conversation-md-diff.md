# S12 — Agent chronology + Markdown + diff preview

| Field | Value |
| --- | --- |
| ID | S12 |
| Role | Инженер AI + Продуктовый дизайнер |
| Stage | MVP polish → beta floor |
| Roadmap | Visual A / R-C1–C2 slice |
| Audit | A05 + conversation UX vs Cursor/Devin |
| Status | **Closed 25.11.2026** — chronology + MD + unified hunk preview |

## Preconditions

- Workspace open; Agent panel; Ask/Plan/Agent available.
- Model or stub that returns Markdown-ish text and a multi-line edit.

## Steps

1. Ask: получить ответ с heading / list / fenced code — увидеть отрендеренный Markdown (не сырой `**`).
2. Agent: пройти ход Request → Steps → (optional text) → Review.
3. В Review увидеть unified preview (`-` удаления и `+` добавления).
4. Кликом по файлу / Review открыть штатный Monaco `vscode.diff`.
5. History accordion показывает `N steps`, не голый «Timeline».

## Expected

- Хронология хода читается сверху вниз без обязательного sidebar.
- Assistant bubbles — безопасный Markdown subset.
- Patch preview — hunk с ctx/add/del; Monaco остаётся SoT для полного Review.
- Live progress steps привязаны к текущему ходу.

## Negative

- Raw HTML / `javascript:` links не исполняются.
- Ask markdown, похожий на патч, не становится Applyable Review.

## Acceptance

- [x] Turn grouping: request → steps → assistant → review.
- [x] Markdown subset + sanitize tests.
- [x] `describeEditHunk` unified preview in chat.
- [x] Monaco diff via existing Review action.

## Code paths

- `review-logic.cjs` — `describeEditHunk`
- `markdown-logic.cjs` + `webview/markdown.tsx`
- `webview/agent.tsx` — turns / preview
- `extension.js` — `describePatch` hunk payload
- `test/s12-*.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

## Links

[ide-design.md](../ide-design.md) · [competitive-audit-agent-conversation.md](../competitive-audit-agent-conversation.md)
