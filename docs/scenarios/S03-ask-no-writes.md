# S03 — Ask: ответ без записи файлов

| Field | Value |
| --- | --- |
| ID | S03 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-B3 |
| Audit | A03 |
| QA | **Closed 25.11.2026** — `agent-modes.cjs` + `npm test` (Ask/Plan reply-only) |

## Preconditions

- Открыт workspace; Ollama или OpenRouter BYOK (или stub).
- Режим Ask в Agents.

## Steps

1. Открыть Agents (`⌃⌘A` / палитра).
2. Выбрать Ask.
3. Задать вопрос о файле («how many lines», структура).
4. Дождаться ответа.
5. Переключить режим на Agent — draft в composer сохраняется.

## Expected

- Ответ в чате.
- Ни один файл workspace не изменён; Review/pending не создаётся.
- Смена режима сохраняет draft.

## Negative

- Модель вернула текст похожий на патч — отображается как текст, не как Review apply.
- Нет провайдера — stub `answerAsk`, без записи.

## Acceptance

- [x] Ask не создаёт Review apply и не пишет диск (`modeMayWriteDisk('ask') === false`; ветка `mode === 'ask'` только `completeChatTurn`).
- [x] Смена режима на Agent сохраняет draft текст (`mode` handler не трогает draft).

## Code paths

- `agent-modes.cjs`, `extension.js` (`proposeInRun` Ask)  
- `webview/agent.tsx` mode dropdown  
- `test/s03-s04-modes.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```
