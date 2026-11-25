# Оценка зрелости TripleCode vs Cursor / Devin

**Дата среза:** 25 ноября 2026 года (вечерний refresh после волн C–E / V1–V3).  
**Стратегический ответ:** [ADR 0004](adr/0004-continue-vs-rewrite.md), [strategy.md](strategy.md).

## Вердикт

TripleCode — **закрытый macOS MVP + beta AI floor** на repackage VSCodium: agent-loop Ask/Plan/Agent → Review/Check patch → Keep/Undo, плюс streaming, text tool-loop, MCP stdio permissions, Tab/Cmd-K, session worktree/PR stub и visual parity V1–V3 в Agents. Это всё ещё не source-fork Code-OSS и не cloud Devin-runtime. Документы и код снова выровнены (R-A6).

Честная стадия: **late Stage 1 / early Stage 2**, pre-external-pilot (блокер: кабинет/квоты S09 + web).

## Оценки (1–10, где 10 = Cursor + Devin production)

| Ось | Оценка | Кратко |
| --- | ---: | --- |
| Продуктовое видение и роадмап | 8 | Waves A–E + V; wedge Check patch |
| Архитектурные решения / ADRs | 7.5 | ADR 0001–0006; architecture.md синхронизирован |
| Реализуемый macOS MVP (локальный агент) | 7 | P0 loop + packaging S17 |
| AI-слой vs Cursor | 5.5 | Stream/tools/MCP/Tab/Cmd-K floor; нет native tools / index / Agents Window |
| Devin-паритет | 3.5 | Worktree + Background/Cloud UI + PR URL; нет VM continue |
| Качество / структура кода | 5.5 | Модули host (session/mcp/tool/…); `extension.js` ещё крупный |
| Тесты + CI + релиз | 6 | Node tests per scenario + CI PR; optional signing/update |
| Пилот / GTM | 3 | Login PKCE есть; cabinet/quotas блокируют внешний пилот |
| **Итого к заявленной цели** | **~5** | Сильный internal beta; cloud + cabinet next |

## Фактическая архитектура на срезе

| Слой | Реализация |
| --- | --- |
| Runtime IDE | Pinned VSCodium (ADR 0001), не `src/vs/` в репо |
| Shell / layout | Minified Workbench patch + CSS (ADR 0002); порог ADR 0006 |
| Продукт | `extensions/triplecode-mvp` |
| Модели | Ollama + OpenRouter BYOK; streaming S13 |
| Контекст / tools | `@` picker, rules.md, READ/CHECK/FILE loop, MCP stdio |
| Sessions | Local/Background/Cloud UI + worktree + idempotent PR |
| Аккаунт | PKCE → `triplecode.ru`; кабинет/квоты open (S09) |
| CI / multi-OS / updates | Workflows + S17/S18 floor |

## Паритет (сжато)

| Класс | Статус |
| --- | --- |
| VS Code daily driver | Да (repackage) |
| Ask / Plan / Agent + Review + Stop + checks | Да |
| Streaming / tool-loop / MCP permissions | Floor да |
| Tab / Cmd-K | Floor да (S10) |
| Session rail / PR card / kind toggle | Floor да (V3 / E) |
| Semantic index / Agents Window shell | Нет (ADR 0004) |
| Cloud continue after IDE close | UI stub only (R-E2 runtime later) |
| Cabinet quotas | Blocker (S09 / web) |

## Решение по базе

Полный restart **отклонён**. Эволюция текущей базы — [strategy.md](strategy.md) · [ADR 0004](adr/0004-continue-vs-rewrite.md).
