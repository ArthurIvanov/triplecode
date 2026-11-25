# S07 — Run checks vs Check patch labeling

| Field | Value |
| --- | --- |
| ID | S07 |
| Role | Инженер AI / QA |
| Stage | MVP |
| Roadmap | R-A3 |
| Audit | A07 |

## Preconditions

- `triplecode.checkCommand` (default `npm test`) работает на контрольном проекте.
- Есть proposal, который заведомо ломает тест.

## Steps

1. Run checks на чистом дереве — exit 0, label = working tree.
2. Создать proposal, ломающий тест.
3. Check patch — exit ≠0 на копии с патчем; исходное дерево не изменено.
4. Убедиться, что зелёный Run checks не маркирует непроверенный proposal как verified.

## Acceptance

- [ ] Области проверки явно подписаны в Review и истории.
- [ ] Временная копия удаляется после Check patch.

## Code paths

- `extension.js` `runCheck`, `runPatchCheck`  

## Verify

`TRIPLECODE_CHECK_SCOPE=1` ui-check или ручной прогон.
