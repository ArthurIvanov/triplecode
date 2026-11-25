# AGENTS — extensions/triplecode-mvp

Читай корневой [AGENTS.md](../../AGENTS.md) и [docs/engineering.md](../../docs/engineering.md).

## Границы

| Слой | Путь | Ответственность |
| --- | --- | --- |
| Extension host | `extension.js`, `import-host.cjs`, `attach-logic.cjs`, `check-logic.cjs`, `desktop-account.js`, `patch.js` | Команды, чаты, apply/undo, checks, import, account |
| Provider | `provider.js` | HTTP к Ollama/OpenRouter; промпты; parse multi-file |
| Inline | `inline.js`, `inline-logic.cjs` | InlineCompletion; default off; toggle + latency status |
| Cmd-K | `cmdk-host.cjs`, `cmdk-logic.cjs` | Selection edit preview → Apply/Discard |
| Webview UI | `webview/**` | React Agents UI, design-system gallery |
| Media bundles | `media/*` | esbuild output — не править вручную; `npm run build:webview` |

## Запреты

- Не патчить `workbench.desktop.main.js` / Electron из задач extension — это `scripts/desktop/` + ADR 0002.
- Не включать Microsoft Marketplace / Copilot chat.
- Не писать на диск из Ask.
- Не коммитить API keys; ключи только SecretStorage.
- Не обещать `@`/`/` в placeholder, если UX не реализован (см. S08).

## Как работать

1. Укажи `Scenario: Sxx`.
2. Host — пока CommonJS; новые модули предпочтительно выносить из монолита `extension.js`.
3. Webview: `webview/tsconfig.json` strict; после правок `npm run build:webview`.
4. Проверка: сценарий вручную в QA app (`bash scripts/run-macos-qa.sh`) + tsc webview.

## DoD

- AC сценария закрыты или явно отложены со ссылкой.
- Ask не пишет файлы; Stop не применяет late result.
- Пути правок только внутри workspace.
- Изменения Review/apply/undo/check — обновляй `review-logic.cjs` / `check-logic.cjs` и `npm test` (S05–S07).
- Изменения attach candidates — обновляй `attach-logic.cjs` и `npm test`.
- Изменения chronology / Markdown / diff preview — `markdown-logic.cjs`, `review-logic.describeEditHunk`, `webview/agent.tsx` + `npm test` / `build:webview` (S12).
- Изменения streaming — `stream-logic.cjs`, `provider.js` chatStream/chatCompletionsStream, `npm test` (S13).
- Изменения tool-loop (READ/CHECK/FILE раунды) — `tool-loop.cjs`, `provider.multiFileMessages`, `aiSpecs` в `extension.js`, `npm test` (S14).
- Изменения MCP — `mcp-logic.cjs`, `mcp-host.cjs`, permission card в `webview/agent.tsx`, `npm test` (S15).
- Изменения Tab/Cmd-K — `inline-logic.cjs`, `inline.js`, `cmdk-logic.cjs`, `cmdk-host.cjs`, `npm test` (S10).
- Изменения diagnostics — `debug-logic.cjs`, `debug-host.cjs`, `npm test` (S16); не включать промпты/секреты в отчёт.
- Изменения update/signing — `update-logic.cjs`, `update-host.cjs`, `scripts/sign-artifact.sh`, `npm test` (S18); fork threshold — `check-fork-threshold.sh` + ADR 0006.
- Изменения session/worktree/PR handoff — `session-logic.cjs`, `session-host.cjs`, session-bar UI, `npm test` (S11).
- Визуальный паритет Cursor/Devin — [docs/competitive-visual-parity.md](../../docs/competitive-visual-parity.md) + S19; не клонировать бренд.
- Изменения Ask/Plan/Execute — обновляй `agent-modes.cjs` и `npm test` (S03–S04).
- Изменения @/attachments/rules/inline picker — обновляй `context-rules.cjs`, `webview/agent.tsx`, `npm test` + `build:webview` (S08).
- Изменения Welcome/recent/first-launch defaults — обновляй `welcome-logic.cjs` и `npm test` (S01).
- Изменения import/preview/rollback/секреты — обновляй `import-logic.cjs` и `npm test` (S02).
