# Исследование конкурентов и архитектура TripleCode

Срез публичных источников на 21 ноября 2026 года. Описание конкурентов основано на исходниках и документации производителей. Производительность, долю совместимых расширений и качество AI предстоит измерить на одинаковых задачах.

## VS Code

- Code — OSS написан на TypeScript. `base` содержит общие примитивы, `platform` — сервисы, `editor` — Monaco, `workbench` — представления и интеграции, `code` — desktop и CLI, `server` — серверную точку входа. В текущих правилах исходников также выделен слой `sessions` для окна сессий. Разделение по runtime ограничивает доступ к Node и Electron из UI. [Правила организации исходников](https://github.com/microsoft/vscode/blob/main/.github/instructions/source-code-organization.instructions.md)
- Workbench реализует оболочку, палитру, панели и API расширений. Monaco покрывает редактор, а расширения исполняются через Extension Host. Новый shell поверх одного Monaco потребовал бы заново реализовать эти контракты и заново проверить совместимость. [Source Code Organization](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)
- Microsoft ведёт публичный репозиторий и публикует планы итераций. Руководство описывает локальную сборку, запуск из исходников и тестирование. Для TripleCode это исходная точка CI и сопровождения форка. [How to Contribute](https://github.com/microsoft/vscode/wiki/How-to-Contribute)
- Репозиторий доступен по MIT. Дистрибутив Microsoft добавляет собственные материалы, Marketplace и часть интеграций Remote Development. Доступность исходников, право распространения расширения и его фактическая работоспособность проверяются отдельно. [Лицензия репозитория](https://github.com/microsoft/vscode/blob/main/LICENSE.txt) · [FAQ Microsoft](https://code.visualstudio.com/docs/supporting/faq)
- Сильные стороны для наших пользователей — API расширений, отладка, терминал, Git, профили и привычные команды. VS Code также предлагает интерактивные, фоновые и облачные сессии. Эти возможности нужно учитывать при оценке паритета. [Профили](https://code.visualstudio.com/docs/configure/profiles) · [Агенты](https://code.visualstudio.com/features/agents) · [Agent harnesses](https://code.visualstudio.com/docs/agents/run/agent-harnesses)

## Cursor

- Cursor подтверждает происхождение от Code — OSS и описывает регулярные слияния с upstream и отдельный перенос критичных исправлений. Полезный вывод для TripleCode — сделать обновление upstream частью CI с самого начала и измерять стоимость каждого изменения ядра. [Cursor Security](https://www.cursor.com/en/security)
- Миграция построена вокруг переноса расширений, тем, настроек и клавиш, включая импорт профиля. В рабочем процессе Cursor различает Ask, Plan, Agent и Debug и показывает изменения в diff. Сильная сторона — короткий переход от обычного редактирования к AI-задаче. [Миграция](https://docs.cursor.com/get-started/migrate-from-vs-code) · [Agent mode](https://prod.cursor.com/help/ai-features/agent)
- Текущая документация описывает Instant Grep с локальным поисковым индексом. Открытый агентом фрагмент при этом может попасть в запрос модели. Для MVP отсюда следует раздельно проектировать локальный поиск и правила отправки контекста. [Cursor Search](https://cursor.com/docs/agent/tools/search)
- Облачные задачи имеют подготовку среды, ветку для PR и настройки команды. Отчёт Composer 2 описывает обучение и инфраструктуру AnyRun для исследовательских запусков, но оставляет детали производственной архитектуры неполными. Точные внутренние контракты, затраты и текущий production-стек Cursor публично не установлены. [Cloud Agents](https://prod.cursor.com/docs/cloud-agent/settings) · [Composer 2 Technical Report](https://cursor.com/resources/Composer2.pdf)

## Devin

Сильная сторона — асинхронная работа от постановки задачи и предварительного плана до просмотра в IDE и PR. Cognition описывает подготовленные окружения, переиспользуемые знания о репозитории и делегирование частей задачи отдельным сессиям. TripleCode может перенять плавную передачу работы между человеком и сессией. Для MVP достаточно одной возобновляемой интерактивной сессии с результатами проверок. [Devin Docs](https://docs.devin.ai/get-started/devin-intro) · [Devin 2.0](https://cognition.com/blog/devin-2) · [Manage Devins](https://cognition.com/blog/devin-can-now-manage-devins)

## Как Cursor меняет оболочку

Cursor подтверждает форк Code — OSS. Есть и прямое свидетельство о стоимости поддержки UI: разработчик Cursor объяснил переход в версии 2.6 тем, что классическая и новая агентская компоновки имели отдельные реализации, которые команда больше не могла развивать параллельно. В Cursor 3 появилось отдельное Agents Window. Оно может быть открыто одновременно с IDE и получило собственное деление на плитки с восстановлением состояния. Публичные материалы описывают эти решения на уровне продукта и сопровождения. Граница между их собственным кодом и унаследованным Workbench в каждом окне остаётся неизвестной. [Cursor Security](https://www.cursor.com/en/security) · [Ответ разработчика о версии 2.6](https://forum.cursor.com/t/old-editor-ui-broke-up-after-update/154545/6) · [Cursor 3.0](https://cursor.com/changelog/3-0) · [Cursor 3.1](https://cursor.com/changelog/3-1)

### Что именно можно перемещать в Code — OSS

| Изменение | Уровень реализации |
| --- | --- |
| Поменять сторону Sidebar или положение Panel | Штатные настройки и команды Workbench |
| Перенести отдельное представление или его контейнер между доступными областями | Механизм views и контейнеров. В исходниках местоположение сохраняет `ViewDescriptorService`. Допустимость переноса зависит от представления |
| Вложить терминал под редактором, оставив соседний чат на всю высоту, если штатные варианты не дают нужную геометрию | Изменить топологию сетки Workbench и согласовать фокус, ограничения размеров, сворачивание, команды и восстановление состояния |
| Сделать окно AI-задач с другим набором частей | Собственная композиция на уровне окна / `sessions` или отдельный Agents Window; для MVP TripleCode использует Secondary Side Bar + минимальный патч сетки (ADR 0002) |

## Текущая архитектура TripleCode (канон на 25.11.2026)

Репозиторий `triplecode` **сегодня** — не дерево исходников Code-OSS. Рабочая модель:

1. **Дистрибуция** — pinned VSCodium (Code-OSS) → rebrand → встраивание `triplecode-mvp` → ad hoc подпись macOS arm64 ([ADR 0001](adr/0001-macos-mvp-distribution.md), `scripts/build-macos.sh`).
2. **Workbench** — минимальный патч топологии сетки и chrome в minified bundle, привязанный к SHA ([ADR 0002](adr/0002-workbench-layout-patch.md)).
3. **Продукт** — first-party extension: Agents webview, Ask/Plan/Agent, Review/diff/checks, импорт профиля ([ADR 0003](adr/0003-profile-import.md)), desktop-аккаунт.
4. **AI transport** — Ollama и OpenRouter BYOK из extension host; бэкенд TripleCode для inference на Stage 1 не обязателен.
5. **Целевая эволюция** — source fork и `triplecode-web` по [repositories.md](repositories.md) и [strategy.md](strategy.md); restart IDE отклонён ([ADR 0004](adr/0004-continue-vs-rewrite.md)).

```text
VSCodium zip (pinned)
  → product.json / branding / Open VSX posture
  → apply-macos-keychain + apply-workbench-layout
  → embed extensions/triplecode-mvp
  → TripleCode.app

triplecode-mvp
  ├── extension host (agent orchestration, patch, checks, import, account)
  ├── provider (LLM HTTP + stream)
  ├── tool-loop / MCP stdio + permissions
  ├── session-host (worktree / Local|Background|Cloud stub / PR)
  ├── inline + Cmd-K
  └── webview React (Agents UI, design system, session rail)
```

### Статус волн (25.11.2026 evening)

| Wave | Floor in tree |
| --- | --- |
| A | S01–S08, S12; S09 cabinet/quotas → `triplecode-web` |
| B | CI, packaging S17, modular host modules |
| C | Stream S13, tool-loop S14, MCP S15, @ S08, Tab/Cmd-K S10, diagnostics S16 |
| D | Optional signing + update manifest S18; ADR 0006 stay-repackage |
| E | Local worktree + Background/Cloud **UI** + idempotent PR; cloud VM runtime later |
| V | R-V1–V3 UX parity in Agents; evidence pack R-V4 |

SoT сценариев: [roadmap.md](roadmap.md) · [competitive-visual-parity.md](competitive-visual-parity.md).  
Не обещать Devin cloud continue / Cursor Agents Window shell до отдельного ADR.

### Границы доверия MVP

- Правки модели не пишутся в workspace без Review / Keep.
- Авто-контекст исключает пути, похожие на секреты, по имени файла.
- Пути правок ограничены workspace.
- Run checks относится к рабочему дереву; Check patch — к временной копии с предложением.
- Сторонний Marketplace и Microsoft Copilot chat в дистрибутиве отключены политикой продукта.

### Условия пересмотра глубины форка

Переход с repackage на дерево `src/` обязателен, если сработали пороги ADR 0002, публичная бета требует регулярного upstream merge, либо обязательный UX нельзя выразить через Extension API и минимальный патч. До этого момента новые возможности AI добавляем в extension и webview, а не в минифицированный Workbench.

Срез зрелости: [maturity-assessment.md](maturity-assessment.md). Продуктовые этапы: [product-plan.md](product-plan.md).