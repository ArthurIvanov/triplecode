# S21 — Workspace context index + `@` search

| Field | Value |
| --- | --- |
| ID | S21 |
| Role | Инженер AI (+ Архитектор trust) |
| Stage | beta (public gate) |
| Roadmap | **R-β5** (+ UI **R-V6**) |
| Spec | [public-beta-handoff-3-5-6-7.md](../specs/public-beta-handoff-3-5-6-7.md) §5 |
| Depends | S08 picker ✓ |
| Status | Spec opened 25.11.2026 |

## Preconditions

- Workspace with many files (≥2k preferred for perf claim).  
- Agents composer focused.

## Steps

1. Open folder → index builds (status Indexing → Ready).  
2. Type `@` + query → ranked results <150ms p95 when warm.  
3. Confirm secret-like paths absent.  
4. Keyboard select / Esc; chips still work (S08).

## Acceptance

- [ ] Local file index + incremental updates.  
- [ ] Warm `@` query latency logged in QA.  
- [ ] Sensitive path exclude unchanged.  
- [ ] Unit tests for rank/exclude/update.  
- [ ] Optional Phase B symbols = follow-up ID if deferred.

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
