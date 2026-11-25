# S15 — MCP host + permissions

| Field | Value |
| --- | --- |
| ID | S15 |
| Role | Инженер AI + Security |
| Stage | beta |
| Roadmap | R-C3 |
| Status | Closed 25.11.2026 (stdio MCP + permission card; resources/prompts later) |

## Preconditions

- Agent mode.
- Workspace с `.triplecode/mcp.json` (stdio servers) или пустой конфиг.
- `triplecode.mcp.enabled` = true.

## Steps

1. Сконфигурировать stdio MCP server в `.triplecode/mcp.json`.
2. В Agent попросить действие, требующее MCP tool (`MCP: server/tool` + JSON args).
3. Увидеть карточку разрешения: Allow once / Always / Deny.
4. Allow once → tool call выполняется; шаг timeline `MCP …`; результат в tool loop.
5. Deny → модель получает отказ, без вызова процесса.
6. Always → повторный вызов того же `server/tool` без карточки.

## Expected

- Подключение lazy (на первый вызов сервера).
- Ask/Plan не вызывают MCP.
- Секреты/env из конфига не логируются.
- Stop во время ожидания permission — abort без вызова.

## Negative

- Нет конфига / disabled — модель не видит MCP catalog; `MCP:` → ошибка tool result.
- Неизвестный server/tool — TOOL RESULT с ошибкой.
- Путь/команда вне allowlist конфига — не стартуем произвольный бинарь без записи в mcp.json.

## Acceptance

- [x] `mcp-logic.cjs`: config parse, permission decide/apply, MCP turn parse, result format.
- [x] `mcp-host.cjs`: stdio JSON-RPC initialize / tools/list / tools/call (testable transport).
- [x] Webview permission card + host await.
- [x] Wired into Agent tool-loop (S14); `npm test` S15.

## Code paths

- `mcp-logic.cjs`, `mcp-host.cjs`, `tool-loop.cjs`, `extension.js`, `webview/agent.tsx`
- `test/s15-mcp.test.cjs`
- `.triplecode/mcp.json` (user workspace)

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

## Links

- [roadmap.md](../roadmap.md) R-C3  
- S14 tool-loop · ide-design MCP permissions
