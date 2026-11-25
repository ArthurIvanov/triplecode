# S10 — Tab autocomplete + Cmd-K (beta)

| Field | Value |
| --- | --- |
| ID | S10 |
| Role | Инженер AI |
| Stage | beta |
| Roadmap | R-C5 |
| Audit | A10 |

## Preconditions

- `triplecode.ai.inlineEnabled` можно включить.
- Отдельная completion-модель (блокер продукта).
- Cmd-K команда реализована (сейчас отсутствует — AC на реализацию).

## Steps (target)

1. Включить inline; набрать код — ghost text.
2. Accept / partial accept / Escape; конфликт с IntelliSense.
3. Выделить код → Cmd-K → preview → apply/discard.

## Acceptance

- [ ] Tab не ломает IntelliSense.
- [ ] Latency при медленном провайдере сообщена пользователю.
- [ ] Cmd-K не пишет диск без подтверждения.
- [ ] Блокер «нет своей completion-модели» снят или явно заменён BYOK completion endpoint.

## Code paths

- `inline.js`  
- future cmd-k contribution  

## Notes

До закрытия блокера модели сценарий — спецификация, не регресс CI.
