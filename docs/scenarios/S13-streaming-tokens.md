# S13 — Streaming tokens in Agents

| Field | Value |
| --- | --- |
| ID | S13 |
| Role | Инженер AI |
| Stage | beta |
| Roadmap | R-C1 |
| Status | Closed 25.11.2026 (Ollama + OpenRouter stream; stub stays non-stream) |

## Preconditions

- Provider Ollama или OpenRouter доступен.
- Agents панель.

## Steps

1. Ask или Plan → отправить запрос.
2. Наблюдать растущий ответ с курсором до финального Markdown.
3. Stop во время стрима — late chunks не применяются.

## Expected

- `stream-delta` обновляет bubble; финал — обычный turn answer.
- Парсеры NDJSON/SSE покрыты unit-тестами.

## Acceptance

- [x] `provider.chatStream` / `chatCompletionsStream` + `stream-logic.cjs`.
- [x] UI bubble + cursor (`agent.tsx`).
- [x] `npm test` включает S13.

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```
