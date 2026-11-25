# S07 — Run checks vs Check patch labeling

| Field | Value |
| --- | --- |
| ID | S07 |
| Role | Инженер AI / QA |
| Stage | MVP |
| Roadmap | R-A3 |
| Audit | A07 |
| QA | **Closed 25.11.2026** — isolated-copy smoke + UI scope labels in agent.tsx |

## Preconditions

- `triplecode.checkCommand` (default `npm test`) работает на контрольном проекте.
- Есть proposal, который заведомо ломает тест.

## Steps

1. Run checks на чистом дереве — exit 0, label = working tree.
2. Создать proposal, ломающий тест.
3. Check patch — exit ≠0 на копии с патчем; исходное дерево не изменено.
4. Убедиться, что зелёный Run checks не маркирует непроверенный proposal как verified.

## Acceptance

- [x] Области проверки явно подписаны в Review (`working-tree` / `proposed-patch` → UI copy).
- [x] Временная копия удаляется после Check patch (`rm` in `runPatchCheck` finally).
- [x] Smoke: патч валит check на копии, исходное дерево остаётся зелёным.

## Code paths

- `extension.js` `runCheck`, `runPatchCheck`, `recordCheck`  
- `webview/agent.tsx` check-scope copy  
- `review-logic.cjs` `checkScopeLabel`, `applyEdit`  
- `test/s05-s07-smoke.test.cjs`

## Verify

```bash
npm --prefix extensions/triplecode-mvp test
```
