# Cursor и Devin — предметный аудит сценариев и интерфейса

**Срез:** 25 ноября 2026 года.  
**Роль:** продуктовый исследователь.  
**Машина аудита:** macOS 27.3 (Build 26C5035r), Apple Silicon.  
**Установленные приложения (Info.plist, вечер):** Cursor `3.32.4` (Pro; утром в срезе было `3.31.15`), Devin Desktop `3.14.30833` (bundle `com.exafunction.windsurf`, Free).  
**Источники:** публичная документация Cursor/Devin + сверка с кодом TripleCode (`extensions/triplecode-mvp`, [product-plan.md](product-plan.md), [maturity-assessment.md](maturity-assessment.md)).  
**Evidence (вечер 25.11):** PNG Cursor+Devin в [docs/evidence/2026-11-25/](evidence/2026-11-25/) — IDE Agent / Settings Pro / Agents Window (+Changes); Devin Cascade / View changes / ACC. Индекс: [competitive-audit-evidence.md](competitive-audit-evidence.md).

Контрольный класс задач (один и тот же для сравнения): открыть TS/Node репозиторий → Ask → Plan→Execute → multi-file Agent → Stop → @-контекст → checks/tests → (где есть) Tab/Cmd-K / cloud handoff.

## Поверхности продуктов

| Поверхность | Что видит пользователь | Следствие для TripleCode | Этап |
| --- | --- | --- | --- |
| Cursor IDE Agent sidepane | Работа с файлами + агент; `Cmd+I` открывает Agent; инструменты (search, edit, terminal, browser, MCP) | Workbench остаётся primary. Agents → один composer. Фокус и возврат в редактор | MVP есть; tools/MCP — beta |
| Cursor Agents Window | Отдельное окно параллельных сессий, multi-workspace, cloud/local handoff, worktrees; `Open Agents Window` из палитры | Индекс сессий в панели Agents на MVP. Отдельное окно — после доказанной multi-task потребности | Full / experiment |
| Cursor Tab / inline | Ghost text у курсора, NES | Tab toggle + BYOK/local (S10) | Beta ✓ floor |
| Cursor Cmd-K / selection edit | Правка из выделения | Cmd-K preview/apply (S10) | Beta ✓ floor |
| Cursor Plan Mode | `Shift+Tab` цикл режимов; план редактируется; Build после confirm; Save to workspace | Shift+Tab + Plan edit + Build (V1/V2); save-to-workspace later | MVP→beta |
| Cursor @ / / | `@` файлы/папки/терминал/git/browser; `/` skills и Custom Modes | Inline `@` picker + states; `/` skills later | MVP→beta |
| Cursor Rules / MCP / context ring | Rules, MCP catalog, прозрачность контекста | rules.md + MCP stdio + permission card (S15) | Beta ✓ floor |
| Cursor Cloud Agents / worktrees | Параллельные облачные агенты, PR, изоляция | Worktree + Cloud UI stub + PR (S11) | Full floor |
| Devin Desktop Agent Command Center | Список local+cloud сессий, filter/sort/group, rename, queue edit, notifications | Session rail + kind toggle + PR card (V3) | Full floor |
| Devin Cloud | VM, browser, continue after laptop close, PR review in editor | UI awaiting-cloud; VM runtime open (R-E2) | Full |
| Devin handoff CLI→cloud | `/handoff` из локального в cloud | Нет | Full |

## Матрица сценариев

| ID | Сценарий | Конкурент (факт) | TripleCode сейчас | Обязательство | Критерий приёмки |
| --- | --- | --- | --- | --- | --- |
| A01 | Open folder / first project | Cursor: File→Open; Devin: Welcome/palette | Welcome + Open Folder | MVP | S01 |
| A02 | Import VS Code profile | Cursor: Settings→General→Account one-click + Profiles | Import preview + report + rollback | MVP | S02 |
| A03 | Ask (read-only) | Cursor Ask не пишет файлы | Ask есть; stub без AI heurистика | MVP | S03 |
| A04 | Plan → edit → Build | Cursor Plan + markdown edit + Build | Plan + Execute; edit confirmed version | MVP | S04 |
| A05 | Agent multi-file + review | Cursor tools+diff/checkpoints | Multi-file Review Keep/Drop | MVP | S05 |
| A06 | Stop / queue / late result | Cursor Stop; queue Enter / Cmd+Enter steer | Stop/timeout/late guard P0 | MVP | S06 |
| A07 | Checks / verify before accept | Cursor runs terminal tools; Devin CI/PR | Run checks + Check patch | MVP (wedge) | S07 |
| A08 | @ context + rules | Cursor `@` menu; rules always-on | Inline `@` + rules.md | MVP→beta | S08 ✓ |
| A09 | Account / usage | Cursor web billing + usage | PKCE login; cabinet/quotas incomplete | MVP gate | S09 |
| A10 | Tab + Cmd-K | Cursor native | Inline toggle + BYOK/local; Cmd-K preview/apply | Beta | S10 ✓ |
| A11 | Cloud / background / PR | Cursor Cloud + Devin Cloud | Worktree + Local/Background/Cloud UI + PR card; VM later | Full | S11 floor ✓ |
| A12 | Agents Window / parallel isolation | Cursor 3 Agents Window + worktrees | Session rail in sidepane; no separate window (ADR 0004) | Full | R-V3 ✓ · R-E* |
| A13 | Streaming tokens | Cursor streams | Streaming in Agents (S13) | Beta | S13 ✓ |
| A14 | Tool-calling / MCP | Cursor tools + MCP | READ/CHECK/FILE (S14) + stdio MCP + permission card (S15) | Beta | S14 ✓ · S15 ✓ |
| A15 | Debug mode | Cursor Debug mode | Collect diagnostics + redacted Output (S16); agent debug later | Beta | S16 ✓ |

## Выводы для роадмапа

1. **Wedge TripleCode** (verify-before-accept + Check patch) остаётся дифференциатором против Cursor, где модель чаще сама гоняет tools; UI проверки версии патча у нас должен быть заметнее конкурента.
2. **Ближайший UX-разрыв с Cursor IDE:** `/` skills, semantic index, native tool APIs, Agents Window shell — не базовый composer (V1–V3 закрыли mode/@/changes/session rail).
3. **Devin** — следующий разрыв = cloud VM continue (R-E2 runtime) и ACC filter/group; локальный handoff floor уже есть.
4. Каждая строка матрицы связана со сценарием `docs/scenarios/Sxx` или пунктом [roadmap.md](roadmap.md).

## Связанные артефакты

- [competitive-audit-evidence.md](competitive-audit-evidence.md) — протокол версий и повтор со скринами  
- [roadmap.md](roadmap.md) — backlog A–E  
- [scenarios/](scenarios/) — AC для разработки  
