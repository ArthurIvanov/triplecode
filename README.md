# TripleCode

TripleCode — проект настольной IDE со встроенным AI. Первый целевой сценарий — открыть существующий репозиторий, поручить агенту изменение и принять проверенный diff в редакторе.

Owner: Artur

Сейчас это **закрытый macOS MVP** на базе VSCodium + расширения `triplecode-mvp` (не полное дерево форка Code-OSS). Базу развиваем эволюционно, без rewrite ([ADR 0004](docs/adr/0004-continue-vs-rewrite.md), [strategy.md](docs/strategy.md)).

- [Дизайн IDE, экраны и токены](docs/ide-design.md)
- [Роли и порядок работы AI-агентов](AGENTS.md)
- [Правила разработки IDE и передачи задач](docs/engineering.md)
- [Исследование конкурентов и архитектура](docs/architecture.md)
- [Продуктовый план, карта паритета и дорожная карта](docs/product-plan.md)
- [Стратегия после аудита зрелости](docs/strategy.md)
- [Срез зрелости vs Cursor / Devin](docs/maturity-assessment.md)
- [Роадмап функционал→визуал](docs/roadmap.md)
- [Сценарии для разработки](docs/scenarios/README.md)
- [Аудит Cursor / Devin](docs/competitive-audit-cursor-devin.md)
- [Релизы и update](docs/release.md)
- [Аккаунт, подписка и аналитика](docs/accounts.md)
- [Структура репозиториев и выпуск сборок](docs/repositories.md)
- [Синхронизация API-контрактов](docs/contracts-sync.md)
- [Каталог проверок](TEST.md)

В репозитории есть первый рабочий срез для Workbench. Его можно запустить отдельно от основного профиля редактора.

## Самостоятельная сборка MVP для macOS

На Apple Silicon из корня репозитория: