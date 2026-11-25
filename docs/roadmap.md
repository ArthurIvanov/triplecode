# Роадмап TripleCode (функционал → визуал → разработка)

**Статус:** канон после аудита 25.11.2026.  
**Стратегия волн:** [strategy.md](strategy.md).  
**Аудит:** [competitive-audit-cursor-devin.md](competitive-audit-cursor-devin.md).  
**Сценарии:** [scenarios/](scenarios/).

Каждая строка — единица планирования. Реализация фичи без `Scenario` ID запрещена ([AGENTS.md](../AGENTS.md)).

## Легенда

| Поле | Значение |
| --- | --- |
| Wave | A пилот · B инженерный пол · C AI platform · D release · E Devin-класс |
| Stage | MVP / beta / full |
| Role | Ведущая роль из AGENTS |
| Screen | Состояния в [ide-design.md](ide-design.md) |

---

## Волна A — закрыть Stage 1 / пилот

| ID | Outcome | Scenario | Screen / states | Role | Deps | Stage |
| --- | --- | --- | --- | --- | --- | --- |
| R-A1 | Кабинет: план, квоты, usage | S09 | Account guest/waiting/signed-in; cabinet usage | Инженер AI + web | `triplecode-web` | MVP |
| R-A2 | Per-file Keep/Drop + Undo QA | S05 | Review list, conflict, stale | QA + IDE | — | MVP ✓ 25.11 |
| R-A3 | Check patch vs Run checks labeling | S07 | Review check badge, history | QA + AI | — | MVP ✓ 25.11 |
| R-A4 | Plan edit + Execute confirmed version | S04 | Plan card expanded/edit/execute | AI + Design | — | MVP ✓ 25.11 |
| R-A0 | First launch Open Folder without account | S01 | Welcome empty/recent | IDE | — | MVP ✓ 25.11 |
| R-A5 | E2E import real VS Code profile | S02 | Import preview/report/rollback | IDE + QA | — | MVP ✓ 25.11 (live E2E optional) |
| R-A6 | Docs SoT repaired (audit/architecture) | — | — | Продакт | — | MVP |

**Визуал A:** composer (empty, drafting, running, stopped, error); Review (proposed, checking, conflict); Account chip states. Tokens: `triplecode.chat.*`, button Primary/Secondary/Tertiary.  
**S12 (25.11):** turn chronology + Markdown answers + unified diff preview in Agents (Monaco remains full Review).

---

## Волна B — инженерный пол

| ID | Outcome | Scenario | Screen | Role | Deps | Stage |
| --- | --- | --- | --- | --- | --- | --- |
| R-B1 | CI PR: tsc webview + patch dry-check | — | — | Релизы | `.github/workflows` | MVP ✓ 25.11 |
| R-B2 | Build artifacts macOS/Win/Linux | — | — | Релизы | upstream.env | MVP→beta |
| R-B3 | Smoke stop/apply/undo/Ask | S03 S05 S06 | — | QA | CI | MVP ✓ S03/S05/S06 |
| R-B4 | Modularize/type `extension.js` | — | — | AI/IDE | — | MVP ✓ 25.11 (import/attach/check modules; typing later) |
| R-B5 | Release manifest + verify script | — | — | Релизы | ADR 0005 | beta |

**Визуал B:** нет новых экранов; галерея DS остаётся синхронной со Storybook.

---

## Волна C — AI platform (Cursor desktop parity floor)

| ID | Outcome | Scenario | Screen / states | Role | Deps | Stage |
| --- | --- | --- | --- | --- | --- | --- |
| R-C1 | Streaming tokens in Agents UI | S04/S05 | streaming, partial message | AI + Design | provider | beta (S12: chronology/MD shell without stream) |
| R-C2 | Tool-calling loop (read/edit/check) | S05 S07 S12 | timeline tool steps real | AI | — | beta (S12: turn+steps UX; real tools later) |
| R-C3 | MCP host + permissions UI | — | MCP connect/deny | AI + Security | — | beta |
| R-C4 | `@` picker + index/search context | S08 | @ menu, chips keyboard | AI + Design | — | MVP+beta ✓ 25.11 (index/search later) |
| R-C5 | Cmd-K + enable Tab | S10 | ghost text, selection edit | AI + Design | completion model | beta |
| R-C6 | Debug/diagnostics mode | — | debug collect logs | AI | — | beta |

**Визуал C:** `@` popover; streaming cursor; tool timeline expandable; Cmd-K peek; Tab ghost conflict with IntelliSense; MCP permission dialog. Upstream Monaco/Workbench for editor chrome; custom for composer overlays.

---

## Волна D — release floor

| ID | Outcome | Scenario | Role | Deps | Stage |
| --- | --- | --- | --- | --- | --- |
| R-D1 | Signed macOS + Win + Linux | — | Релизы | certs secrets | beta |
| R-D2 | Auto-update + rollback | — | Релизы | ADR 0005 | beta |
| R-D3 | Source-fork decision if patch thresholds hit | — | Архитектор | ADR 0002/0004 | beta |

**Визуал D:** About/Update dialog states (available, downloading, ready to restart, rollback).

---

## Волна E — Devin-класс

| ID | Outcome | Scenario | Screen | Role | Stage |
| --- | --- | --- | --- | --- | --- |
| R-E1 | Isolated worktrees / env prep | S11 | session prep card | Архитектор + AI | full |
| R-E2 | Background/cloud continue after IDE close | S11 | cloud status | AI + web | full |
| R-E3 | PR delivery + team handoff | S11 | PR card, history | AI + web | full |
| R-E4 | Team quotas / audit | — | cabinet admin | web + analytics | full |

**Визуал E:** session list ACC-like; cloud badge; handoff CTA; PR link. Не начинать макеты до закрытия C/D без явного решения продакта.

---

## Mapping audit → roadmap

| Audit | Roadmap |
| --- | --- |
| A01–A09 | R-A* + scenarios S01–S09 |
| A10, A13–A15 | R-C* |
| A11–A12 | R-E* |
| CI/release gaps | R-B* R-D* |
