# S03 — Ask: ответ без записи файлов

| Field | Value |
| --- | --- |
| ID | S03 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-B3 |
| Audit | A03 |

## Preconditions

- Открыт workspace; Ollama или OpenRouter BYOK (или stub).
- Режим Ask в Agents.

## Steps

1. Открыть Agents (`⌃⌘A` / палитра).
2. Выбрать Ask.
3. Задать вопрос о файле («how many lines», структура).
4. Дождаться ответа.

## Expected

- Ответ в чате.
- Ни один файл workspace не изменён (git status чист относительно старта хода).

## Negative

- Модель вернула текст похожий на патч — отображается как текст, не как Review apply.
- Нет провайдера — честный stub/ошибка, без записи.

## Acceptance

- [ ] Ask не создаёт Review apply и не пишет диск.
- [ ] Смена режима на Agent сохраняет draft текст.

## Code paths

- `extensions/triplecode-mvp/extension.js` (`propose`, Ask branch)  
- `webview/agent.tsx`  

## Verify

```bash
git status  # до/после Ask на контрольном репо
```
