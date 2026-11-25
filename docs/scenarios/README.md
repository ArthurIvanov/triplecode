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

Индекс роадмапа: [../roadmap.md](../roadmap.md).
