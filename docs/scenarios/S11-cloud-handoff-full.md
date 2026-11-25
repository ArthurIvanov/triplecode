# S11 — Cloud / background handoff (full)

| Field | Value |
| --- | --- |
| ID | S11 |
| Role | Архитектор + Инженер AI |
| Stage | full |
| Roadmap | R-E1–E3 |
| Audit | A11 |
| Status | Partial 25.11.2026 — worktree / Local·Background·Cloud UI / session rail / PR card; true cloud VM later |

## Preconditions

- Локальный git workspace.
- Волна E floor: session bar в Agents.

## Steps (local floor — done)

1. **Worktree** → `.triplecode/worktrees/…` + branch `triplecode/…` (изоляция копии).
2. **Background / Cloud** → kind toggle; Cloud ставит status `awaiting cloud` (VM runtime later).
3. **PR** → card + compare/create URL; повтор с тем же ключом reuse.
4. **Session rail** → переключение сессий/чатов с badge + status.

## Steps (cloud — remaining)

1. Уйти в cloud runtime; закрыть IDE.
2. Вернуться — статус/логи/артефакты с сервера.
3. Handoff коллеге с историей checks.

## Acceptance

- [x] Две задачи могут получить разные worktree (не делят одну копию по умолчанию).
- [x] PR handoff идемпотентен по `prKey`.
- [x] Session badge Local / Background / Cloud в UI.
- [ ] Сессия продолжается после закрытия IDE (нужен cloud — R-E2).
- [ ] Права на репозиторий проверены сервером (web).

## Code paths

- `session-logic.cjs`, `session-host.cjs`, `webview/agent.tsx` session-bar
- `test/s11-session.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
npm --prefix extensions/triplecode-mvp run build:webview
```

## Links

- [roadmap.md](../roadmap.md) R-E* · [competitive-visual-parity.md](../competitive-visual-parity.md)
