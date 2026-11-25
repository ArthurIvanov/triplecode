# Работа AI-агентов в TripleCode

## Старт любой сессии (обязательно)

1. Прочитай этот файл и [docs/engineering.md](docs/engineering.md).
2. `git branch --show-current` и `git status` — не трогай чужие dirty-файлы.
3. Определи **ведущую роль** (дерево ниже) и запиши: роль, `Scenario: Sxx` (если фича), AC, путь артефакта.
4. Открой релевантные docs: [strategy.md](docs/strategy.md), [roadmap.md](docs/roadmap.md), [product-plan.md](docs/product-plan.md), ADR при смене границ.
5. **Запрет:** полный rewrite IDE / новый shell поверх Monaco. База эволюционирует ([ADR 0004](docs/adr/0004-continue-vs-rewrite.md)).
6. **Запрет:** продуктовая фича без ID сценария из [docs/scenarios/](docs/scenarios/) или явных AC в задаче.

## Дерево выбора роли

| Запрос похож на… | Роль |
| --- | --- |
| Приоритет релиза, scope, wedge | Продакт-менеджер |
| Как у Cursor/Devin, исследование UX | Продуктовый исследователь |
| Экраны, состояния, клавиатура, a11y | Продуктовый дизайнер |
| Токены, Figma↔код, галерея | Архитектор дизайн-системы |
| Метрики, эксперимент, AI quality | Продуктовый аналитик |
| Fork depth, модули, контракты | Архитектор |
| Workbench patch, профили, desktop shell | Инженер IDE |
| Agent/chat/provider/tools/MCP | Инженер AI |
| Приёмка сценариев, регресс | QA-инженер |
| Секреты, границы доверия, MCP permissions | Инженер безопасности |
| CI, артефакты, update, tag | Инженер релизов |

Одна сессия может сменить роль; критичные изменения проверяет **отдельная** AI-сессия по задаче + diff + тестам.

## Роли: вход → запреты → DoD

| Роль | Вход | Нельзя | DoD / куда писать |
| --- | --- | --- | --- |
| Продакт | strategy, product-plan, roadmap | Менять архитектуру без ADR | Обновить product-plan/roadmap; решение в PR |
| Исследователь | competitive-audit, живые версии | Смешивать гипотезу и наблюдение | audit + evidence |
| Дизайнер | ide-design, Figma, scenarios | Ломать upstream chrome без пометки | ide-design + AC дизайна |
| DS-архитектор | design system rules, gallery | Расхождение Figma/gallery/app | PR с проверкой в обоих местах |
| Аналитик | accounts, usage events | Логировать код/промпты | Отчёт + знаменатели |
| Архитектор | architecture, ADR | Тихий рост minified patch | ADR + architecture.md |
| Инженер IDE | engineering, ADR 0001–0003, scripts/desktop | Патч Workbench без ADR 0002 порогов | Сценарий зелёный на macOS QA |
| Инженер AI | scenarios S03–S11, extension AGENTS | Tool/MCP без permissions UX | Scenario AC + ручной/CI smoke |
| QA | scenarios, pilot-qa | Закрывать AC без лога | pilot-qa / PR checklist |
| Security | architecture trust bounds | Секреты в git | Блок релиза или approve |
| Релизы | release.md, ADR 0005, workflows | Force-push release tags без просьбы | Артефакты + manifest verify |

## Обязательные правила

- Ветку веди отдельно; параллель — worktree. Не пушь в `master`; не force-push без явной просьбы.
- После запроса (если пользователь/правила репо требуют): `git add` → `commit` → `push` в **свою** ветку; перед этим сверь `git status`.
- Крупная работа: `fetch`/`pull` до и после; конфликты — сначала merge, потом фичи.
- UI: [design system rules](design%20system%20rules/README.md).
- Extension-задачи: [extensions/triplecode-mvp/AGENTS.md](extensions/triplecode-mvp/AGENTS.md).
- Web/кабинет: репозиторий `../triplecode-web` + [docs/contracts-sync.md](docs/contracts-sync.md).

## Передача работы (формат в PR)

- Задача, роль, `Scenario: Sxx`, AC  
- Ветка, base SHA, проверенный commit  
- Что сделано / файлы  
- Команды и результаты  
- Что осталось / блокер / next  

Гипотезы помечай явно. При смене объёма релиза — product-plan + roadmap. При смене курса — architecture + ADR.
