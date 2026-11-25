# Аудит: хронология / Markdown / Diff в Agents (Cursor · Devin → TripleCode)

**Срез:** 25.11.2026 · Scenario S12  
**Роль:** продуктовый исследователь + дизайнер  
**Источники:** Cursor docs (Agent, Agents Window, release notes 3.27–3.31), Devin Desktop changelog / Review / Session Insights. Live screenshots в этой сессии не снимались (Computer Use); версии на машине аудита — см. [competitive-audit-cursor-devin.md](competitive-audit-cursor-devin.md).

## Как решают конкуренты

| Тема | Cursor | Devin | Вывод для TripleCode S12 |
| --- | --- | --- | --- |
| Хронология хода | Chat turn + tool/edit steps; checkpoints на запросах; accessible «latest reply» | Session timeline / Session Insights; Agent Window = web session UI | **Turn block** Request → Steps → Answer → Changes; live steps на активном ходе |
| Markdown | Полноценный MD в чате (code, Mermaid preview) | Web-grade session markdown | **Безопасный subset** (headings, lists, code, links https); без Mermaid в MVP |
| Diff в чате | Summary block + click/Cmd-click → editor inline/side diff; Agents Window — dedicated diffs view | Changes tab per-file diffs + «Since last seen»; Review groups related edits | **Unified hunk preview** в панели + **Monaco `vscode.diff` SoT** (как ide-design «штатный diff») |
| Review actions | Keep/Undo на inline; diffs view commit/PR | Multi-diff, Viewed files, Guide vs tree | Keep/Drop/Check уже есть; S12 не тащит PR/commit UI |

## UX-принципы, которые переносим

1. **Сначала смысл хода, потом детали** — steps свёрнуты в истории, раскрыты на live run.
2. **Preview ≠ editor** — в чате достаточно +/- контекста; полный LSP/diff — в Monaco.
3. **Клик по файлу = углубиться** — открыть Review/diff, не прятать патч только в счётчике `+N -M`.
4. **Markdown без HTML** — ответы читаемы; XSS из модели недопустим.

## Не переносим сейчас

- Cursor checkpoints / restore timeline (отдельный ADR).
- Devin PR Review Guide / Bug Catcher.
- Token streaming (R-C1) и настоящий tool loop (R-C2).

## Связь

S12 · [roadmap.md](roadmap.md) · [ide-design.md](ide-design.md)
