# S23 — Live QA matrix for public beta

| Field | Value |
| --- | --- |
| ID | S23 |
| Role | QA + Релизы |
| Stage | beta gate |
| Roadmap | **R-β7** |
| Spec | [public-beta-handoff-3-5-6-7.md](../specs/public-beta-handoff-3-5-6-7.md) §7 |
| Status | Spec opened 25.11.2026 |

## Preconditions

- Build SHA recorded; QA user-data-dir.  
- For L1: network + `triplecode://` scheme.  
- For L6: Win and/or Linux artifact from S17.

## Matrix

See handoff §7 table L1–L8 (login, import, review, Tab, update, 3-OS smoke, Ask/Stop, UI evidence).

## Acceptance

- [ ] L1–L4, L7 PASS on one macOS SHA.  
- [ ] L5 update path verified or blocked with documented secret gap.  
- [ ] L6 smoke on Win **or** Linux (prefer both).  
- [ ] Log at `docs/evidence/YYYY-MM-DD/live-qa.md`.  
- [ ] FAIL → follow-up scenario/issue, not silent close.

## Verify

Manual + existing:

```bash
npm --prefix extensions/triplecode-mvp test
bash scripts/check-packaging.sh   # if present
```

## Links

[S09](S09-login-pkce.md) · [S02](S02-profile-import.md) · [S17](S17-packaging-three-os.md) · [S18](S18-signing-update-wave-d.md) · [pilot-qa.md](../pilot-qa.md) · handoff §7
