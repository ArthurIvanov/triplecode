# S16 — Debug / diagnostics collect

| Field | Value |
| --- | --- |
| ID | S16 |
| Role | Инженер AI + Security |
| Stage | beta |
| Roadmap | R-C6 |
| Audit | A15 |
| Status | Closed 25.11.2026 (collect/redact/copy; Cursor-class agent debug later) |

## Preconditions

- TripleCode extension активен.

## Steps

1. Command Palette → **TripleCode: Collect Diagnostics**.
2. Открывается Output `TripleCode` с отчётом.
3. **Copy report** → буфер; опционально **Save…** в файл.
4. В отчёте: версия, OS, provider settings **без** API keys, MCP server names, recent ring-buffer logs.

## Expected

- Секреты/tokens/Authorization/Bearer/apiKey отредактированы (`***`).
- Промпты и содержимое файлов не включаются.
- Команда доступна без аккаунта.

## Negative

- Строка с `sk-` / `Bearer` → redacted.
- Save cancel → без ошибки.

## Acceptance

- [x] `debug-logic.cjs` redact + report builder.
- [x] OutputChannel + Collect / Copy / Save.
- [x] `npm test` S16.

## Code paths

- `debug-logic.cjs`, `debug-host.cjs`, `extension.js`
- `test/s16-debug.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```

## Links

- [roadmap.md](../roadmap.md) R-C6 · competitive A15
