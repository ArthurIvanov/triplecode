# S04 — Plan → edit → Execute → Review

| Field | Value |
| --- | --- |
| ID | S04 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-A4 |
| Audit | A04 |

## Preconditions

- AI provider доступен.
- Agents панель.

## Steps

1. Режим Plan; отправить задачу на несколько файлов.
2. Прочитать план целиком (> длинный текст при необходимости).
3. Уточнить критерий в плане (edit).
4. Execute / подтвердить.
5. Получить Review с diff.

## Expected

- Исполняется подтверждённая версия плана.
- Review открывает штатный diff.
- Ask/Plan draft не теряется при смене режима до execute.

## Negative

- Execute без провайдера — ошибка, файлы не тронуты.
- Отмена execute не применяет патч.

## Acceptance

- [ ] План >8000 символов передаётся целиком после confirm (P0).
- [ ] Execute создаёт proposal, не silent write.

## Code paths

- `extension.js` plan/execute  
- `webview/agent.tsx` plan bar  

## Verify

P0: `TRIPLECODE_AGENT_PLAN=1` ui-check если harness доступен; иначе ручной прогон.
