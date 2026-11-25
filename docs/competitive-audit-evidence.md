# Evidence log — Cursor / Devin audit

**Date:** 2026-11-25  
**Host:** macOS 27.3 (26C5035r)

## Version probes (filesystem)

| App | Path | CFBundleShortVersionString | Bundle ID |
| --- | --- | --- | --- |
| Cursor | `/Applications/Cursor.app` | `3.31.15` | `com.todesktop.230313mzl4w4u92` |
| Devin | `/Applications/Devin.app` | `3.14.30833` | `com.exafunction.windsurf` |

Commands used:

```bash
/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' /Applications/Cursor.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' /Applications/Devin.app/Contents/Info.plist
```

## Process probe

During the audit session both apps were running (Computer Use `computer_apps` list): Cursor pid active, Devin pid present. Interactive screenshots of Cursor were refused (policy: Computer Use cannot control Cursor itself). Devin screenshots were blocked by conversation Computer Use policy. **No PNG evidence attached.**

## Doc sources fetched same day

- https://cursor.com/docs/agent/overview  
- https://cursor.com/docs/agent/agents-window  
- https://cursor.com/docs/agent/plan-mode  
- https://cursor.com/docs/agent/prompting  
- https://cursor.com/docs/configuration/migrations/vscode  
- https://docs.devin.ai/get-started/devin-intro  
- https://docs.devin.ai/desktop/agent-command-center  
- https://docs.devin.ai/desktop/devin  

## Follow-up for full visual evidence

1. Enable **Accessibility + Screen Recording** for Cursor Computer Use (required to capture Devin/other apps; Cursor itself may still be blocked).  
2. Manually capture Cursor: Agent panel modes, `@` menu, Plan Build, Stop, Agents Window, Tab, Cmd-K.  
3. Manually capture Devin: Agent Command Center, cloud session, queue, PR handoff.  
4. Store PNGs under `docs/evidence/2026-11-25/` and link from [competitive-visual-parity.md](competitive-visual-parity.md) + audit matrix.  
5. Record Cursor/Devin account tier used (Pro/Teams/etc.) when capturing.

**25.11 evening:** Wave E session bar shipped; visual parity plan opened as roadmap **Wave V** / S19.
