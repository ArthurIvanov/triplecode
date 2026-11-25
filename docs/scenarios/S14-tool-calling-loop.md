# S14 — Tool-calling loop (read / edit / check)

| Field | Value |
| --- | --- |
| ID | S14 |
| Role | Инженер AI |
| Stage | beta |
| Roadmap | R-C2 |
| Status | Closed 25.11.2026 (text tool protocol + multi-turn host loop; native OpenAI tools later) |

## Preconditions

- Agent mode + AI provider.
- Workspace с исходниками; `triplecode.checkCommand` настроен (по умолчанию `npm test`).

## Steps

1. Поручить задачу, требующую чтения соседнего файла (модель выдаёт `READ:`).
2. Наблюдать в Steps отдельные шаги `Read …`, не один «Expand context».
3. При запросе проверки моделью (`CHECK:`) — шаг `Check …` с exit code; результат уходит обратно в диалог.
4. Финальные `FILE:` → Review как в S05; Ask по-прежнему без записи.

## Expected

- Цикл раундов: model → tool result → model, лимит раундов.
- Timeline отражает реальные tools: Read / Check / Edit.
- Пути вне workspace отвергаются.
- Stop / abort прерывает цикл (S06).

## Negative

- Пустой / непарсируемый ответ — ошибка parse, без apply.
- `CHECK` без folder — ошибка «Open a project folder».
- Ask mode не вызывает tool-loop записи.

## Acceptance

- [x] `tool-loop.cjs`: parse turn, decision, format read/check results.
- [x] `aiSpecs` — multi-turn messages + per-tool timeline.
- [x] Prompt `multiFileMessages` документирует READ / FILE / CHECK / ANSWER / NOCHANGE.
- [x] `npm test` включает S14; Ask/Plan без регрессии стрима (S13).

## Code paths

- `tool-loop.cjs`, `provider.js` (`multiFileMessages`), `extension.js` (`aiSpecs`)
- `test/s14-tool-loop.test.cjs`
- Timeline UI уже S12 (`webview/agent.tsx`)

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

## Links

- [roadmap.md](../roadmap.md) R-C2  
- S05 Keep/Drop · S07 checks · S12 chronology · S13 streaming
