# Evidence log — Cursor / Devin audit

**Date:** 2026-11-25  
**Host:** macOS 27.3 (26C5035r)

## Version probes (filesystem)

| App | Path | CFBundleShortVersionString | Bundle ID |
| --- | --- | --- | --- |
| Cursor | `/Applications/Cursor.app` | `3.31.15` → Pro session also showed newer UI evening | `com.todesktop.230313mzl4w4u92` |
| Devin | `/Applications/Devin.app` | `3.14.30833` | `com.exafunction.windsurf` |

## Screenshot pack (manual)

Folder: [docs/evidence/2026-11-25/](evidence/2026-11-25/) — **18 PNGs** + [README index](evidence/2026-11-25/README.md).

Computer Use in agent chat could not capture (classifier / TCC). User captured via local tooling; pack reviewed in-session for Wave V / S19.

### Coverage

| Competitor | Covered | Optional missing |
| --- | --- | --- |
| Cursor | IDE agent, Agents Window, Changes, Ask, Plan flow, Settings Pro, empty CTA | `@` menu open, Cmd-K peek |
| Devin | ACC home/session, Cascade IDE, View changes, quick open, command palette | Cloud session (needs cloud account) |
| TripleCode | — | Empty Agents + Review + session bar (for side-by-side) |

## Doc sources fetched same day

- https://cursor.com/docs/agent/overview  
- https://cursor.com/docs/agent/agents-window  
- https://cursor.com/docs/agent/plan-mode  
- https://docs.devin.ai/desktop/agent-command-center  
- https://docs.devin.ai/desktop/devin  

## Analysis SoT

Findings → [competitive-visual-parity.md](competitive-visual-parity.md) (section *Findings from evidence pack*).
