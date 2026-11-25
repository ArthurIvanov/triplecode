# Пользовательские сценарии TripleCode

Каждый файл `Sxx-*.md` — контракт для разработки и QA.  
**Правило:** PR с продуктовой фичей указывает `Scenario: Sxx` в описании и закрывает AC или явно дробит их на follow-up с новым ID.

Шаблон полей внутри файла: ID, Role, Stage, Preconditions, Steps, Expected, Negative, Acceptance, Code paths, Verify commands, Links.

| ID | Title | Stage | Wave |
| --- | --- | --- | --- |
| [S01](S01-first-launch-open-folder.md) | First launch → Open Folder | MVP | A |
| [S02](S02-profile-import.md) | Import VS Code profile | MVP | A |
| [S03](S03-ask-no-writes.md) | Ask without file writes | MVP | A |
| [S04](S04-plan-execute-review.md) | Plan → Execute → Review | MVP | A |
| [S05](S05-agent-multifile-keep-drop.md) | Agent multi-file Keep/Drop | MVP | A |
| [S06](S06-stop-timeout-late.md) | Stop / timeout / late response | MVP | A |
| [S07](S07-run-checks-vs-check-patch.md) | Run checks vs Check patch | MVP | A |
| [S08](S08-context-at-and-rules.md) | @ context + rules | MVP→beta | A/C |
| [S09](S09-login-pkce.md) | Login PKCE → IDE | MVP | A |
| [S10](S10-tab-cmdk-beta.md) | Tab + Cmd-K | beta | C |
| [S11](S11-cloud-handoff-full.md) | Cloud/background handoff | full | E |
| [S12](S12-agent-conversation-md-diff.md) | Chronology + Markdown + diff preview | MVP polish | A/C |
| [S13](S13-streaming-tokens.md) | Streaming tokens in Agents | beta | C |
| [S14](S14-tool-calling-loop.md) | Tool-calling loop read/edit/check | beta | C |
| [S15](S15-mcp-host-permissions.md) | MCP host + permissions | beta | C |
| [S16](S16-debug-diagnostics.md) | Debug / diagnostics collect | beta | C |
| [S17](S17-packaging-three-os.md) | Packaging macOS/Win/Linux | MVP→beta | B |
| [S18](S18-signing-update-wave-d.md) | Signing + update check | beta | D |
| [S19](S19-visual-parity-cursor-devin.md) | Visual/UX parity Cursor+Devin | beta→full | V |

Индекс роадмапа: [../roadmap.md](../roadmap.md) · [competitive-visual-parity.md](../competitive-visual-parity.md).
