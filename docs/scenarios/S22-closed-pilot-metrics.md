# S22 — Closed pilot protocol + metrics (Stage 1 exit)

| Field | Value |
| --- | --- |
| ID | S22 |
| Role | Продакт + Аналитик (+ web/AI instrumentation) |
| Stage | MVP exit → beta gate |
| Roadmap | **R-β6** |
| Spec | [public-beta-handoff-3-5-6-7.md](../specs/public-beta-handoff-3-5-6-7.md) §6 |
| Depends | S09 usage floor ✓ |
| Status | Tooling ready 25.11.2026 — field results pending |

## Goal

Measure Stage 1 exit from [product-plan.md](../product-plan.md): ≥80% complete import + first AI task unaided; median ≤15 min — **or** document tooling-ready + No-Go.

## Steps

1. Publish pilot protocol under `docs/pilot/` (N, tasks, version capture).  
2. Instrument/tag usage events for pilot steps without code/prompts/paths.  
3. Run field or mark tooling-ready AC.  
4. Write Go/No-Go memo with denominators.

## Acceptance

- [x] Protocol + run-card template committed. (`docs/pilot/README.md`, `run-card.md`, `memo.md`)
- [x] Event schema documented (no PII/code). (`docs/pilot/events.md` + `triplecode-web` contracts README; `pilot_events` table + `pilotSummary`)
- [ ] Field results **or** explicit No-Go. (6–8 участников не проведены — tooling ready)
- [ ] product-plan / roadmap Stage 1 exit dated. (после field results)

## Negative

- No raw prompts, file paths, or source in telemetry.  
- No claiming ≥80% without participant data.

## Links

[accounts.md](../accounts.md) · [pilot-qa.md](../pilot-qa.md) · handoff §6 · web usage API
