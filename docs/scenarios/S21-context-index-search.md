# S21 — Workspace context index + `@` search

| Field | Value |
| --- | --- |
| ID | S21 |
| Role | Инженер AI (+ Архитектор trust) |
| Stage | beta (public gate) |
| Roadmap | **R-β5** (+ UI **R-V6**) |
| Spec | [public-beta-handoff-3-5-6-7.md](../specs/public-beta-handoff-3-5-6-7.md) §5 |
| Depends | S08 picker ✓ |
| Status | Implemented 25.11.2026 — unit-tested; live QA pending |

## Preconditions

- Workspace with many files (≥2k preferred for perf claim).  
- Agents composer focused.

## Steps

1. Open folder → index builds (status Indexing → Ready).  
2. Type `@` + query → ranked results <150ms p95 when warm.  
3. Confirm secret-like paths absent.  
4. Keyboard select / Esc; chips still work (S08).

## Acceptance

- [x] Local file index + incremental updates. (`context-index.cjs` + `index-host.cjs`: findFiles build, FileSystemWatcher create/delete/rename, folder-change rebuild)
- [ ] Warm `@` query latency logged in QA. (unit: 5k files ≈9ms; p95 на ≥2k workspace — в live QA)
- [x] Sensitive path exclude unchanged. (`isSensitivePath` в `shouldIndexRelativePath` + defense в `buildAttachCandidates`)
- [x] Unit tests for rank/exclude/update. (`test/s21-context-index.test.cjs`, 83/83 total)
- [x] Optional Phase B symbols = follow-up ID if deferred. (отложено — нужен отдельный Scenario)

## Code paths

- New `context-index.cjs` (proposed)  
- `context-rules.cjs`, attach host, `webview/agent.tsx`  
- `test/s21-context-index.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

## Links

[S08](S08-context-at-and-rules.md) · handoff §5 · [competitive-visual-parity.md](../competitive-visual-parity.md)
