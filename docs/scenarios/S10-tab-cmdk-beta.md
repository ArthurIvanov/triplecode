# S10 — Tab autocomplete + Cmd-K (beta)

| Field | Value |
| --- | --- |
| ID | S10 |
| Role | Инженер AI |
| Stage | beta |
| Roadmap | R-C5 |
| Audit | A10 |
| Status | Closed 25.11.2026 (BYOK/local inline + Cmd-K preview/apply) |

## Preconditions

- Inline: `TripleCode: Toggle Inline Completions` или `triplecode.ai.inlineEnabled`.
- Completion model: local Ollama (`triplecode.ai.inlineModel`) **или** BYOK OpenAI-compatible (`inlineProvider=openai` + `Set Inline API Key`).
- Cmd-K: выделение в редакторе; `triplecode.ai.cmdkEnabled` (default on).

## Steps

1. Включить inline → ghost text; при открытом IntelliSense с selected item — inline молчит.
2. Accept (Tab) / Escape — штатный VS Code Inline Suggest; status bar показывает latency при медленном ответе.
3. Выделить код → **Cmd+K** (или Cmd+Shift+K) → instruction → diff preview → **Apply** / **Discard**.
4. Discard / смена документа — файл на диске не меняется до Apply.

## Expected

- Tab ghost не перебивает выбранный suggest item.
- Cmd-K пишет буфер только после Apply; stale version → warning, no apply.
- Блокер «своя completion-модель» снят через BYOK / local Ollama endpoint.

## Negative

- Inline off → нет запросов к модели.
- Пустое выделение на Cmd+K → подсказка выбрать код.
- Stop/cancel progress Cmd-K → без preview.

## Acceptance

- [x] Tab не ломает IntelliSense (`shouldYieldToSuggest`).
- [x] Latency при медленном провайдере — status bar.
- [x] Cmd-K не пишет диск без подтверждения (preview → Apply).
- [x] BYOK completion endpoint (`inlineProvider=openai` + SecretStorage) + local Ollama.

## Code paths

- `inline.js`, `inline-logic.cjs`
- `cmdk-host.cjs`, `cmdk-logic.cjs`
- `package.json` commands/keybindings
- `test/s10-inline-cmdk.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

## Links

- [roadmap.md](../roadmap.md) R-C5 · [ide-design.md](../ide-design.md) Cmd-K / inline
