# Pilot event schema (S22)

## Канал

`POST https://triplecode.ru/api/usage/event` — Bearer access_token сессии
устройства (S09). Тот же endpoint для usage и pilot-маркеров.

## Usage event

```json
{ "feature": "agent|plan|ask|rewrite|inline|other",
  "provider": "ollama|openrouter|auto|null",
  "model": "string|null",
  "duration_ms": 0,
  "outcome": "ok|error|stopped|accepted|rejected" }
```

Пишется в `usage_events(email, ts, feature, provider, model, duration_ms, outcome)`.
Неизвестные `feature`/`outcome` коэрсятся в `other`/`error`.

## Pilot step (опционально)

```json
{ "pilot": { "task_id": "P03", "step": "review_keep", "duration_ms": 0 } }
```

- `task_id`: `^[A-Za-z0-9_-]{1,64}$` — выдаёт координатор пилота.
- `step`: `import` | `first_agent` | `review_keep` | `done`.
- Пишется в отдельную таблицу `pilot_events(email, ts, task_id, step, duration_ms)`.
- Невалидный `pilot` игнорируется; usage-часть события пишется всегда.
- `duration_ms` опционален (0 от ручных маркеров).

## Источник в IDE

- `triplecode.pilot.taskId` (setting) или `triplecode.pilot.taskId` в globalState
  (спросит команда **TripleCode: Mark Pilot Step**).
- Авто-маркеры: `import` — завершение import wizard; `first_agent` — первый
  `ok` turn agent/plan; `review_keep` — первое применение патча (Keep).
- Авто-шаги шлются один раз на `task_id` (dedupe в globalState).
- `done` — только вручную через Mark Pilot Step.

## Агрегация (внутренний отчёт)

`pilotSummary(email)` в `triplecode-web/apps/api/usage-events.mjs` возвращает
по задачам: steps, duration, completed + totals (tasks, completed,
importDone, firstAgentDone, reviewKeepDone). SQL-эквивалент для разовых
выборок по `DESKTOP_GRANT_DB`:

```sql
SELECT task_id, step, ts, duration_ms FROM pilot_events ORDER BY ts;
```

## Запреты (PII)

Не передавать: код, промпты, содержимое файлов, абсолютные пути, email
(кроме auth email на сервере), API-ключи. `task_id` — псевдоним участника.
