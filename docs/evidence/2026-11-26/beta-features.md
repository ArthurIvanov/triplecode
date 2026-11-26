# Beta feature checks — S20 inline + S21 context index

- Date: 2026-11-26
- Branch: `devin/s22-pilot-metrics`
- Commits: `21d91a1` (S21 index), `0445bd0` + `b0df6c9` (S20 inline auto-on + usage events)
- App: `dist/TripleCode.app` via `scripts/build-macos.sh`; QA profiles mkdtemp, `stub` AI provider for UI rows, real Ollama (`qwen2.5-coder:3b`) for inline

## S21 / R-β5 — workspace context index + `@` search

| Check | Result | Evidence |
| --- | --- | --- |
| Index builds on activation, status footer shows count | PASS | CDP: `at-picker__status` = "3 files indexed" |
| `@` query returns ranked results | PASS | `@sto` → `src/store.ts` first hit (`at-mention-check.cjs`) |
| Incremental updates via FileSystemWatcher | UNIT | `s21-context-index.test.cjs` add/remove/clear cases |
| Sensitive paths excluded | UNIT + live | `.env*`/`*.pem` rejected by `indexAdd` and `queryIndex` |
| Warm query latency <150ms p95 | NOT MEASURED | Needs ≥2k-file workspace run; in-memory `Map` scan is O(n) per keystroke — flagged for perf pass |

## S20 / R-β3 — Tab / inline smart default-on

| Check | Result | Evidence |
| --- | --- | --- |
| Smart default-on when backend probe OK | PASS | Fresh profile, no toggle → status bar "Inline" (`inline-check.cjs`) |
| Safe off without backend | UNIT | `resolveInlineEnabled` tri-state tests (88/88 npm test) |
| Ghost text renders + Tab accepts | PASS | Ghost `"John"` on `greet(`, Tab → `greet("John")` in editor |
| IntelliSense yield | UNIT | `shouldYieldToSuggest(selectedCompletionInfo)` tests |
| Accept/dismiss usage events, no completion text | CODE | `inline.js` pendingAccept tracking → `reportUsage(feature=inline, outcome=accepted/dismissed)`; QA profile has no access token so POST skipped by design |
| Slow-model latency visible | CODE | Status bar spinner/`Inline slow…` after 800ms/2500ms thresholds |

## Commands run

```bash
npm --prefix extensions/triplecode-mvp test            # 88 pass / 0 fail
npm --prefix extensions/triplecode-mvp run build:webview
bash scripts/build-macos.sh
node .triplecode-dev/ui-check/at-mention-check.cjs     # PASS
env -u ELECTRON_RUN_AS_NODE node .triplecode-dev/ui-check/inline-check.cjs  # PASS
```

## Notes / follow-ups

- `ELECTRON_RUN_AS_NODE=1` in agent shells breaks app launch under CDP checks — run with `env -u`.
- Inline ghost latency depends on `triplecode.ai.inlineModel`; default `qwen2.5-coder:1.5b` must be pulled locally. Verified with `qwen2.5-coder:3b` (~1.8s per completion).
- S21 Phase B (symbol index) remains a follow-up ID per scenario.
