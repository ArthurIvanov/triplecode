# Closed pilot — протокол и метрики (S22 / R-β6)

**Цель:** измерить Stage 1 exit из [product-plan.md](../product-plan.md) —
≥80% участников завершают import + первую AI-задачу без помощи, медиана ≤15 мин —
или зафиксировать tooling-ready + явный No-Go.

**Статус:** tooling ready 25.11.2026. Field results — ожидаются (см. `memo.md`).

## Участники

- N = **6–8** разработчиков с реальным TS/Node.js репозиторием и привычками VS Code.
- Каждый участник получает: сборку `TripleCode.app` (QA или signed), свой `task_id`
  (`P01`…`P08`), инструкцию пройти сценарий **без помощи**.
- Запрещено подсказывать команды; наблюдатель только фиксирует.

## Обязательные поля на участника (run card)

См. [run-card.md](run-card.md). Минимум:

| Поле | Пример |
| --- | --- |
| `task_id` | `P03` |
| App version / build SHA | `0.0.1+abc1234` |
| OS / arch | macOS 15 arm64 |
| AI provider / model | Ollama `qwen2.5-coder:7b` или OpenRouter BYOK |
| Repo (тип, без содержимого) | private TS monorepo |
| Start commit | `main@a1b2c3` |
| Import: success / time / help? | yes / 4 мин / no |
| First agent task: success / time / help? | yes / 11 мин / no |
| Review keep / rollback | kept 2 files / — |
| Blockers | свободный текст без кода |

## Порядок сессии (одинаковый для всех)

1. Установить/запустить TripleCode, войти в аккаунт (S09 PKCE).
2. `TripleCode: Import from VS Code` → пройти wizard → Restart.
3. Открыть свой проект → Agents → выполнить **одну** реальную задачу
   (например: «добавь обработку ошибок в X и покрой тестом»).
4. Пройти Review: Run checks / Check patch → Keep или Drop.
5. `TripleCode: Mark Pilot Step` → `done` (если шаги не пометились авто).

`task_id` задаётся командой Mark Pilot Step (спросит при первом вызове)
или настройкой `triplecode.pilot.taskId`. Авто-шаги: `import` (wizard),
`first_agent` (первый ok agent/plan turn), `review_keep` (первый Keep).

## Метрики и знаменатели

См. [events.md](events.md). Знаменатели:

- **Completion rate** = tasks с `import` + `first_agent` / все выданные `task_id`.
- **Unaided rate** = run cards без `help=yes` / всего карточек.
- **Median time** = медиана `first_agent.ts − session start` по карточкам
  (авто-события дают только порядок шагов, не стенное время — время берём из карточки).
- **Accept ratio** = `accepted / (accepted+rejected)` по usage events.

## Go / No-Go

Шаблон мемо — [memo.md](memo.md). Решение Продакта фиксируется датой в
[product-plan.md](../product-plan.md) (статус Этапа 1) и строке R-β6 в roadmap.

## Запреты

- Никаких промптов, кода, путей файлов и секретов в телеметрии и карточках.
- Нельзя заявлять ≥80% без заполненных карточек участников.
- Телеметрия trust-based — для аналитики, не для биллинга.
