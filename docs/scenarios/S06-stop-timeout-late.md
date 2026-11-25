# S06 — Stop / timeout / late response

| Field | Value |
| --- | --- |
| ID | S06 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-B3 |
| Audit | A06 |
| QA | **Closed 25.11.2026** — `isActiveRun` smoke + prior P0 macOS (22.11) + `finishRun` guard |

## Preconditions

- Провайдер можно прервать (медленный Ollama или тестовый обрыв).

## Steps

1. Запустить Agent/Ask длинный запрос.
2. Нажать Stop (вместо Send).
3. Убедиться, что draft сохранён.
4. (Отдельно) дождаться timeout.
5. (Отдельно) смоделировать late response после смены чата.

## Expected

- Stop не пишет файлы.
- Late ответ не мутирует другой чат и не пишет диск (`finishRun` / `isActiveRun`).
- Draft остаётся в composer.

## Acceptance

- [x] P0 Stop/timeout/late — product-plan 22.11 macOS; регресс: unit `isActiveRun` + CI `npm test`.

## Code paths

- `extension.js` AbortController, `finishRun`, `stopRun`, `activeRun`  
- `review-logic.cjs` `isActiveRun`  
- `test/s05-s07-smoke.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
# optional GUI: TRIPLECODE_AGENT_STOP=1 / TRIPLECODE_AGENT_NETWORK=1
```
