# Оценка зрелости TripleCode vs Cursor / Devin

**Дата среза:** 25 ноября 2026 года.  
**База:** ветка с рабочим macOS MVP, ~106 коммитов на момент аудита.  
**Стратегический ответ:** [ADR 0004](adr/0004-continue-vs-rewrite.md), [strategy.md](strategy.md).

## Вердикт

TripleCode — **ранний закрытый MVP на macOS**: рабочий agent-loop «задача → Ask/Plan/Agent → multi-file Review → checks → Keep/Undo» поверх перепакованного VSCodium. Это не полноценный форк Code-OSS в дереве репозитория и не AI-платформа. Документы и дисциплина процесса выше фактической инженерной зрелости. До паритета Cursor (Tab, Cmd-K, MCP, indexing, streaming, tool-loop, cloud agents) и Devin (автономный cloud worker + PR) — отдельные волны стратегии, не «дополировать».

Честная стадия: **late Stage 0 / mid Stage 1**, pre-external-pilot.

## Оценки (1–10, где 10 = Cursor + Devin production)

| Ось | Оценка | Кратко |
| --- | ---: | --- |
| Продуктовое видение и роадмап | 7.5 | Wedge verify-before-accept, карта паритета, этапы 0–3 |
| Архитектурные решения / ADRs | 6.5 | ADR 0001–0004; ранее «форк» в docs расходился с деревом |
| Реализуемый macOS MVP (локальный агент) | 6 | P0 на macOS; Ask/Plan/Agent + Review + checks |
| AI-слой vs Cursor | 3.5 | Нет streaming, MCP, embeddings, tool-loop, Tab on, Cmd-K |
| Devin-паритет | 1.5 | Только roadmap Stage 3 |
| Качество / структура кода | 4 | ~2k LOC untyped `extension.js`; webview strict TS |
| Тесты + CI + релиз | 2 | Нет CI и своих автотестов; локальный `build-macos.sh` |
| Пилот / GTM | 2.5 | Логин E2E есть; кабинет/квоты/web-репо блокируют пилот |
| **Итого к заявленной цели** | **~3.5–4** | Сильный pre-pilot прототип |

## Фактическая архитектура на срезе

| Слой | Реализация |
| --- | --- |
| Runtime IDE | Скачиваемый VSCodium 1.143.17232 (ADR 0001), не `src/vs/` в репо |
| Shell / layout | ~17 замен в minified Workbench + CSS (ADR 0002) |
| Продукт | `extensions/triplecode-mvp` (extension host + React Agents webview) |
| Модели | Ollama + OpenRouter BYOK + stub; `stream: false` |
| Контекст | Вложения, `.triplecode/rules.md`, `findFiles` + READ-раунды; без embeddings |
| Аккаунт | PKCE → `triplecode.ru`; кабинет/квоты не закрыты |
| CI / multi-OS / updates | Не созданы |

Ключевые пути: `scripts/build-macos.sh`, `scripts/desktop/apply-workbench-layout.py`, `extensions/triplecode-mvp/`.

## Паритет (сжато)

| Класс | Статус |
| --- | --- |
| VS Code daily driver (editor/git/terminal/extensions pilot) | Частично (debug F5 — дыры QA) |
| Ask / Plan / Agent + Review + Stop + checks | Есть, P0 macOS |
| Profile import | Есть (E2E реального профиля pending) |
| Tab / NES / Cmd-K | Нет (inline infra выключена) |
| MCP, semantic index | Нет |
| Cloud agents / PR / isolation | Нет |

## Главный актив и главный долг

- **Актив:** продуктовая ясность, verify-first loop, привычный VS Code base, импорт профиля.
- **Долг:** расхождение «форк/паритет» ↔ repackage+extension; нет CI/тестов; нет AI runtime уровня Cursor.

## Решение по базе

Полный restart **отклонён**. Эволюция текущей базы с волнами A→E — в [strategy.md](strategy.md) и [ADR 0004](adr/0004-continue-vs-rewrite.md).
