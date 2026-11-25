# S06 — Stop / timeout / late response

| Field | Value |
| --- | --- |
| ID | S06 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-B3 |
| Audit | A06 |

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
- Late ответ не мутирует другой чат и не пишет диск.
- Draft остаётся в composer.

## Acceptance

- [ ] P0 Stop/timeout/late — как в product-plan (проверено 22.11; регресс обязателен в CI smoke).

## Code paths

- `extension.js` AbortController, `finishRun`, `activeRun`  

## Verify

`TRIPLECODE_AGENT_STOP=1` / `TRIPLECODE_AGENT_NETWORK=1` ui-check или ручной прогон.
