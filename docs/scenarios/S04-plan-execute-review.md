# S04 — Plan → edit → Execute → Review

| Field | Value |
| --- | --- |
| ID | S04 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-A4 |
| Audit | A04 |
| QA | **Closed 25.11.2026** — editable plan + `buildExecuteRequest` / >8k body smoke |

## Preconditions

- AI provider доступен (Execute approved plan требует AI).
- Agents панель.

## Steps

1. Режим Plan; отправить задачу на несколько файлов.
2. Развернуть план (карточка).
3. Уточнить критерий в textarea плана (blur сохраняет `update-plan`).
4. Execute plan.
5. Получить Review с diff (не silent write).

## Expected

- Исполняется подтверждённая (в т.ч. отредактированная) версия плана.
- План >8000 символов целиком уходит в agent request (`approvedPlan` снимает лимит 500).
- Review открывает proposal; диск меняется только после Keep.

## Negative

- Execute без провайдера — ошибка, файлы не тронуты.
- Discard plan — execute недоступен.
- Пустой текст плана после edit — отклоняется.

## Acceptance

- [x] План >8000 символов передаётся целиком после confirm (unit + `approvedPlan`).
- [x] Execute создаёт proposal, не silent write (agent path → `pending`).
- [x] Edit plan перед Execute (`update-plan` + textarea).

## Code paths

- `agent-modes.cjs`, `extension.js` execute/update-plan  
- `webview/agent.tsx` plan textarea  
- `test/s03-s04-modes.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```
