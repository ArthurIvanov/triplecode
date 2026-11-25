# S20 — Tab / inline default-on (public beta)

| Field | Value |
| --- | --- |
| ID | S20 |
| Role | Инженер AI + QA |
| Stage | beta (public gate) |
| Roadmap | **R-β3** |
| Spec | [public-beta-handoff-3-5-6-7.md](../specs/public-beta-handoff-3-5-6-7.md) §3 |
| Depends | S10 (infra ✓) |
| Status | Implemented 25.11.2026 — unit-tested; live QA pending |

## Preconditions

- QA build; Ollama with `triplecode.ai.inlineModel` **или** inline BYOK key.  
- IntelliSense / suggest widget available in a TS/JS file.

## Steps

1. Fresh profile: open TS file — без ручного Toggle ghost text появляется, если backend probe OK.  
2. Open suggest widget, select item — inline yields (no competing ghost).  
3. Accept / Escape; slow model → latency visible.  
4. No backend → no error spam; setup path понятен.

## Acceptance

- [x] Smart default-on when probe OK; otherwise safe off. (`planInlineAutoEnable` + `maybeAutoEnable` in `inline.js`; explicit user setting always wins; `triplecode.ai.inlineAutoEnable` opt-out)
- [x] S10 IntelliSense yield regresses green. (`s10-inline-cmdk.test.cjs` + `s20-inline-default.test.cjs`, 82/82)
- [x] Usage/debug: accept/dismiss without logging completion text. (`createInlineTracker` → `feature=inline`, outcomes accepted/rejected/error + `duration_ms`; debug log redacted)
- [ ] QA note in pilot-qa or evidence. (manual macOS run pending — см. handoff §3 Verify)

## Code paths

- `inline.js`, `inline-logic.cjs`, `package.json` defaults  
- Welcome / empty Agents CTA  
- `test/s10-inline-cmdk.test.cjs` (+ s20 if new helpers)

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```

## Links

[product-plan.md](../product-plan.md) · [S10](S10-tab-cmdk-beta.md) · handoff §3
