# S22 — Closed pilot protocol + metrics (Stage 1 exit)

| Field | Value |
| --- | --- |
| ID | S22 |
| Role | Продакт + Аналитик (+ web/AI instrumentation) |
| Stage | MVP exit → beta gate |
| Roadmap | **R-β6** |
| Spec | [public-beta-handoff-3-5-6-7.md](../specs/public-beta-handoff-3-5-6-7.md) §6 |
| Depends | S09 usage floor ✓ |
| Status | Spec opened 25.11.2026 |

## Goal

Measure Stage 1 exit from [product-plan.md](../product-plan.md): ≥80% complete import + first AI task unaided; median ≤15 min — **or** document tooling-ready + No-Go.

## Steps

1. Publish pilot protocol under `docs/pilot/` (N, tasks, version capture).  
2. Instrument/tag usage events for pilot steps without code/prompts/paths.  
3. Run field or mark tooling-ready AC.  
4. Write Go/No-Go memo with denominators.

## Acceptance

- [ ] Protocol + run-card template committed.  
- [ ] Event schema documented (no PII/code).  
- [ ] Field results **or** explicit No-Go.  
- [ ] product-plan / roadmap Stage 1 exit dated.

## Negative

- No raw prompts, file paths, or source in telemetry.  
- No claiming ≥80% without participant data.

## Links

[accounts.md](../accounts.md) · [pilot-qa.md](../pilot-qa.md) · handoff §6 · web usage API
