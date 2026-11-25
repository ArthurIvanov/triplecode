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
| Локальные apps | Cursor `3.32.4` (Pro); Devin `3.14.30833` / CLI `1.141.2` (Free). Снято `screencapture` evening 25.11 (CU не трогает Cursor) |
| Evidence | Pack: [docs/evidence/2026-11-25/](evidence/2026-11-25/) (Cursor + Devin) · индекс [competitive-audit-evidence.md](competitive-audit-evidence.md) |

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
| R-V1 | Composer/mode/@ keyboard parity with Cursor sidepane | S19 | ✓ Shift+Tab + @ states + empty CTA |
| R-V2 | Timeline/diff/queue visual language (Cursor 2/3 cues) | S19 | ✓ changes strip + Build + queue/live |
| R-V3 | Session rail ACC-like (Devin) + PR/handoff cards | S11+S19 | ✓ rail + kind toggle + PR card |
| R-V4 | Evidence pack screenshots | evidence | ✓ Cursor+Devin 25.11; TripleCode side-by-side optional |

**Принцип:** сходство для миграции ≠ клон. Бренд TripleCode, layout IDE-first (ADR 0004), wedge Check patch остаётся дифференциатором.

## Findings from evidence pack (25.11 evening)

Индекс файлов: [evidence/2026-11-25/README.md](evidence/2026-11-25/README.md).

### Cursor — наблюдаемый UI-язык

1. **Два контура:** IDE+sidepane (`cursor-ide-agent`) и отдельный **Agents Window** (multi-repo rail + center transcript + right tool tabs Files/Changes/Terminal/Browser).  
2. **Composer:** явная mode pill (**Ask** / Agent), hint `Plan, Build, / for skills, @ for context`, Auto, mic, attach.  
3. **Plan:** editable plan + todo progress («3 of 3») + оранжевый **Build**.  
4. **Changes:** dedicated Changes surface + Create Branch & Commit (не только Monaco diff).  
5. **Empty IDE:** shortcut CTA (⌘L New Agent, maximize chat) + Tab/Agent stats in status bar.

### Devin — наблюдаемый UI-язык

1. **ACC Home:** sessions rail + Local/Cloud toggle + ⌘K tip + onboarding checklist.  
2. **Session:** status «awaiting instructions», strip **N files changed +/−**, **Quick review** / **View changes**, Bypass Permissions, model picker in composer.  
3. **IDE Cascade:** agent sidepane over classic explorer/editor/terminal; Changes as first-class tab.  
4. **Правая tool-rail** в ACC: Changes / Progress / Files / Browser / Terminal — близко к Cursor Agents Window.

### Gaps vs TripleCode (приоритет для V1–V3)

| # | Gap | Конкурент | Наш сейчас | Wave |
| --- | --- | --- | --- | --- |
| 1 | Mode pill + Shift+Tab cycle visibly | Cursor Ask/Plan/Agent | Mode есть, слабый visual/keyboard | **V1** |
| 2 | Composer hints `@` `/` Plan·Build | Cursor | Частично S08 | **V1** |
| 3 | Files-changed strip + Quick review над input | Devin | Changes strip + Quick/View | **V2 ✓** |
| 4 | Plan → Build primary CTA | Cursor | Build CTA | **V2 ✓** |
| 5 | Session rail (not only tabs) + Local/Cloud | Devin ACC | Session rail + kind toggle | **V3 ✓** |
| 6 | Changes as tool tab beside chat | Both | Monaco Review + changes strip | **V2 ✓** |
| 7 | Empty-state shortcut CTA | Cursor | Empty Agents CTA | **V1 ✓** |

## Следующие действия

1. **R-E2 runtime** — cloud VM continue (web); UI already marks awaiting cloud.  
2. **R-A1 / S09** — cabinet quotas в `triplecode-web`.  
3. Опционально: скрины TripleCode Agents в evidence; не строить Agents Window shell (ADR 0004).

## Links

- [competitive-audit-cursor-devin.md](competitive-audit-cursor-devin.md)  
- [ide-design.md](ide-design.md)  
- [roadmap.md](roadmap.md) волны E + V  
- cursor.com/docs/agent/* · docs.devin.ai/desktop/*
