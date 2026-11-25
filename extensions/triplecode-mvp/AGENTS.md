# AGENTS — extensions/triplecode-mvp

Читай корневой [AGENTS.md](../../AGENTS.md) и [docs/engineering.md](../../docs/engineering.md).

## Границы

| Слой | Путь | Ответственность |
| --- | --- | --- |
| Extension host | `extension.js`, `import-host.cjs`, `desktop-account.js`, `patch.js` | Команды, чаты, apply/undo, checks, import, account |
| Provider | `provider.js` | HTTP к Ollama/OpenRouter; промпты; parse multi-file |
| Inline | `inline.js` | InlineCompletion; default off |
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
- Изменения Review/apply/undo/check — обновляй `review-logic.cjs` и `npm test` (S05–S07).
- Изменения Ask/Plan/Execute — обновляй `agent-modes.cjs` и `npm test` (S03–S04).
- Изменения @/attachments/rules/inline picker — обновляй `context-rules.cjs`, `webview/agent.tsx`, `npm test` + `build:webview` (S08).
- Изменения Welcome/recent/first-launch defaults — обновляй `welcome-logic.cjs` и `npm test` (S01).
- Изменения import/preview/rollback/секреты — обновляй `import-logic.cjs` и `npm test` (S02).
