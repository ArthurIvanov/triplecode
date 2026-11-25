# Cursor и Devin — предметный аудит сценариев и интерфейса

**Срез:** 25 ноября 2026 года.  
**Роль:** продуктовый исследователь.  
**Машина аудита:** macOS 27.3 (Build 26C5035r), Apple Silicon.  
**Установленные приложения (Info.plist):** Cursor `3.31.15`, Devin Desktop `3.14.30833` (bundle `com.exafunction.windsurf`). Оба процесса были запущены во время среза.  
**Источники:** публичная документация Cursor/Devin + сверка с кодом TripleCode (`extensions/triplecode-mvp`, [product-plan.md](product-plan.md), [maturity-assessment.md](maturity-assessment.md)).  
**Ограничение сессии:** интерактивные скриншоты через Computer Use в этой сессии заблокированы политикой; визуальные кадры UI не приложены. Версии и наличие приложений подтверждены на диске. Повтор со скринами — [competitive-audit-evidence.md](competitive-audit-evidence.md).

Контрольный класс задач (один и тот же для сравнения): открыть TS/Node репозиторий → Ask → Plan→Execute → multi-file Agent → Stop → @-контекст → checks/tests → (где есть) Tab/Cmd-K / cloud handoff.

## Поверхности продуктов

| Поверхность | Что видит пользователь | Следствие для TripleCode | Этап |
| --- | --- | --- | --- |
| Cursor IDE Agent sidepane | Работа с файлами + агент; `Cmd+I` открывает Agent; инструменты (search, edit, terminal, browser, MCP) | Workbench остаётся primary. Agents → один composer. Фокус и возврат в редактор | MVP есть; tools/MCP — beta |
| Cursor Agents Window | Отдельное окно параллельных сессий, multi-workspace, cloud/local handoff, worktrees; `Open Agents Window` из палитры | Индекс сессий в панели Agents на MVP. Отдельное окно — после доказанной multi-task потребности | Full / experiment |
| Cursor Tab / inline | Ghost text у курсора, NES | Infra в `inline.js`, выключено до своей модели | Beta |
| Cursor Cmd-K / selection edit | Правка из выделения | Нет в TripleCode | Beta |
| Cursor Plan Mode | `Shift+Tab` цикл режимов; план редактируется; Build после confirm; Save to workspace | Plan + Execute есть; edit MD / save to workspace — дотянуть | MVP→beta |
| Cursor @ / / | `@` файлы/папки/терминал/git/browser; `/` skills и Custom Modes | Сейчас Quick Pick + чипы; placeholder обещает `@` без inline-меню | MVP gap → beta polish |
| Cursor Rules / MCP / context ring | Rules, MCP catalog, прозрачность контекста | `.triplecode/rules.md` + provider pill; MCP нет | Beta |
| Cursor Cloud Agents / worktrees | Параллельные облачные агенты, PR, изоляция | Нет | Full |
| Devin Desktop Agent Command Center | Список local+cloud сессий, filter/sort/group, rename, queue edit, notifications | Список чатов есть; ACC-паритет — full | Full |
| Devin Cloud | VM, browser, continue after laptop close, PR review in editor | Нет | Full (волна E) |
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
| A08 | @ context + rules | Cursor `@` menu; rules always-on | Chips + rules.md; no `@` menu | MVP→beta | S08 |
| A09 | Account / usage | Cursor web billing + usage | PKCE login; cabinet/quotas incomplete | MVP gate | S09 |
| A10 | Tab + Cmd-K | Cursor native | Inline off; Cmd-K missing | Beta | S10 |
| A11 | Cloud / background / PR | Cursor Cloud + Devin Cloud | Missing | Full | S11 |
| A12 | Agents Window / parallel isolation | Cursor 3 Agents Window + worktrees | Multi-chat local only | Full | roadmap R-E* |
| A13 | Streaming tokens | Cursor streams | `stream: false` | Beta | roadmap R-C1 |
| A14 | Tool-calling / MCP | Cursor tools + MCP | Text FILE/READ protocol | Beta | roadmap R-C2 |
| A15 | Debug mode | Cursor Debug mode | Not in MVP | Beta | roadmap R-C6 |

## Выводы для роадмапа

1. **Wedge TripleCode** (verify-before-accept + Check patch) остаётся дифференциатором против Cursor, где модель чаще сама гоняет tools; UI проверки версии патча у нас должен быть заметнее конкурента.
2. **Ближайший UX-разрыв с Cursor IDE:** `@`/`/` в composer, streaming, tool loop, Cmd-K, Tab — не Agents Window.
3. **Devin** сравнивать по жизненному циклу облачной задачи, не по локальному composer; до волны E не обещать паритет.
4. Каждая строка матрицы связана со сценарием `docs/scenarios/Sxx` или пунктом [roadmap.md](roadmap.md).

## Связанные артефакты

- [competitive-audit-evidence.md](competitive-audit-evidence.md) — протокол версий и повтор со скринами  
- [roadmap.md](roadmap.md) — backlog A–E  
- [scenarios/](scenarios/) — AC для разработки  
