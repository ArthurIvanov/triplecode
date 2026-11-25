# Live QA — public beta matrix (S23 / R-β7)

- Date: 2026-11-25
- Build SHA: `7fcc90a082516250c76cda60a55866b69cb8cfbb` (`devin/s22-pilot-metrics`)
- App: `dist/TripleCode.app` built via `scripts/build-macos.sh` (post S22 merge, includes agent timeline/context/DnD work)
- Runner: macOS arm64, QA profile `.triplecode-dev/qa`, Ollama `qwen2.5-coder:7b` for AI rows, `stub` provider for UI rows

## Results

| ID | Scenario | Result | Evidence / notes |
| --- | --- | --- | --- |
| L1 | S09 login PKCE E2E | BLOCKED | Requires real TripleCode account + `triplecode://` scheme on a signed build; not automatable in QA profile. Manual step pending. |
| L2 | S02 import real VS Code profile | BLOCKED | Needs a real VS Code profile with settings/extensions; import logic covered by `import-logic.cjs` unit tests (npm test green). Manual import run pending. |
| L3 | S05–S07 Review Keep/Drop + Check patch + Undo | PASS (partial automation) | `timeline-check.cjs`: apply patch, discard patch, undo-all steps recorded and persisted across restart; `review-logic.cjs`/`check-logic.cjs` unit tests green (79/79). Per-file Keep/Drop exercised via unit tests. |
| L4 | S10/S20 Tab + Cmd-K + IntelliSense | NOT RUN | Requires interactive editor session with Ollama ghost-text latency measurement; deferred to manual pass. |
| L5 | S18 update check + rollback | PARTIAL | `check-packaging.sh` OK (pins, 3-OS manifest, fork threshold 24/30 → stay repackage). `verify-release-manifest.sh` requires a published manifest URL; no release channel configured → live update path BLOCKED on secrets/channel, documented. |
| L6 | S17 install smoke Win/Linux | BLOCKED | macOS-only host; `build-windows.sh`/`build-linux.sh` exist but no Win/Linux runners here. |
| L7 | S03 Ask no writes + S06 Stop | PASS (automation) | `agent-modes.cjs` unit tests green (Ask writes nothing, Stop keeps draft); timeline-check restart-persistence PASS. Live Stop/timeout covered by S06 unit + earlier manual evidence. |
| L8 | Agents empty CTA + session rail | PASS | Screenshot: `agents-empty-cta.png` (this dir). Agents window opens with empty chat, composer, mode/model pickers. |

## Commands run

```bash
npm --prefix extensions/triplecode-mvp test          # 79 pass / 0 fail
bash scripts/check-packaging.sh                     # OK (threshold 24/30)
bash scripts/build-macos.sh                         # dist/TripleCode.app built
node .triplecode-dev/ui-check/timeline-check.cjs     # PASS (6 assertions)
node .triplecode-dev/ui-check/dnd-check.cjs          # PASS (drop badge + remove)
# CDP screenshot → docs/evidence/2026-11-25/agents-empty-cta.png
```

## Follow-ups (not silent-close)

- L1/L2/L4/L6 need manual or cross-platform runs — tracked as open items for S23 closure.
- L5 blocked on update-channel secrets; either configure manifest endpoint or document as known gap before beta gate.
- `analyze-check.cjs` (local, gitignored) timed out on this branch — provider/UI flow changed under S14 tool-loop; needs rewrite before reuse, not a product FAIL.
