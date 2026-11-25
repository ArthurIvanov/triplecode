# Visual + UX parity plan — Cursor & Devin → TripleCode

**Дата:** 25.11.2026  
**Роль:** Продуктовый исследователь + дизайнер  
**Цель:** новым пользователям Cursor/Devin было «привычно» в TripleCode без копирования бренда 1:1.

## Статус в плане

До этого среза визуальный паритет был **фрагментарным**: конкурентный аудит сценариев есть ([competitive-audit-cursor-devin.md](competitive-audit-cursor-devin.md)), экраны в [ide-design.md](ide-design.md), но **отдельной волны «Visual parity» с AC и матрицей UI-языка не было**.  
→ Внесено: **волна V** в [roadmap.md](roadmap.md) + этот документ как SoT.

## Метод (этот проход)

| Источник | Статус |
| --- | --- |
| Официальные docs Cursor (Agents Window, Plan, Agent overview) | Прочитаны 25.11 |
| Официальные docs Devin (ACC, Desktop, handoff, changelog) | Прочитаны 25.11 |
| Локальные apps | Cursor `3.31.15`, Devin `3.14.30833` запущены; Computer Use **не смог** сделать скриншоты (нужны Accessibility + Screen Recording для Cursor Computer Use) |
| Evidence | [competitive-audit-evidence.md](competitive-audit-evidence.md) — follow-up со скринами вручную |

## Что копируем как язык (не бренд)

### Cursor → TripleCode

| Паттерн | Cursor | TripleCode сейчас | Паритет-цель |
| --- | --- | --- | --- |
| IDE chrome | VS Code–like, agent справа / Agents Window | VSCodium + Agents side panel | Сохранить IDE-first; не уходить в agent-only shell (ADR 0004) |
| Composer modes | Ask / Plan / Agent, Shift+Tab | Ask / Plan / Agent | Визуально явный mode switch + keyboard cycle (V1) |
| Turn timeline | Steps + streaming | S12/S13 | Усилить running/tool states как у Cursor inbox (V2) |
| @ context | Popover над input | Inline @ picker (S08) | Довести keyboard + empty/loading/no-results (V1) |
| Diff review | Diffs view + PR | Review + Keep/Drop + hunk preview | Check-patch wedge заметнее; PR card из E (V2) |
| Agents Window | Multi-agent sidebar | Multi-chat tabs | Session list ACC-like (V3 / E) |
| Cmd-K / Tab | Native | S10 | Visual polish ghost + Cmd-K peek (V2) |

### Devin → TripleCode

| Паттерн | Devin | TripleCode сейчас | Паритет-цель |
| --- | --- | --- | --- |
| Agent Command Center | Sidebar sessions local+cloud, filter/group | Chat tabs + session bar (E) | Session rail: badge Local/Background/Cloud, status (V3) |
| Cloud continue | VM after laptop close | Background stub (E) | UI states ready; runtime — R-E2 |
| Handoff / PR | `/handoff`, PR in editor | Deliver PR command (E) | PR card + reuse idempotent (V3) |
| Queue edit | Editable queued messages | Queue note | Editable queue chip (V2) |
| Notifications | OS notify when needs input | Нет | Opt-in notify (V3) |

## Волны визуального паритета (V)

| ID | Outcome | Scenario | Stage |
| --- | --- | --- | --- |
| R-V1 | Composer/mode/@ keyboard parity with Cursor sidepane | S19 | beta polish |
| R-V2 | Timeline/diff/queue visual language (Cursor 2/3 cues) | S19 | beta |
| R-V3 | Session rail ACC-like (Devin) + PR/handoff cards | S11+S19 | full |
| R-V4 | Evidence pack: screenshots Cursor+Devin+TripleCode side-by-side | evidence | continuous |

**Принцип:** сходство для миграции ≠ клон. Бренд TripleCode, layout IDE-first (ADR 0004), wedge Check patch остаётся дифференциатором.

## Следующие действия

1. Включить Accessibility + Screen Recording → доснятие evidence.  
2. Реализовать R-V1 (mode cycle + @ empty/loading) поверх текущего Agents panel.  
3. Не начинать отдельный Agents Window shell до триггера ADR 0006 / Wave E cloud.

## Links

- [competitive-audit-cursor-devin.md](competitive-audit-cursor-devin.md)  
- [ide-design.md](ide-design.md)  
- [roadmap.md](roadmap.md) волны E + V  
- cursor.com/docs/agent/* · docs.devin.ai/desktop/*
