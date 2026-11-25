# S05 — Agent multi-file → per-file Keep/Drop

| Field | Value |
| --- | --- |
| ID | S05 |
| Role | Инженер AI |
| Stage | MVP |
| Roadmap | R-A2 |
| Audit | A05 |

## Preconditions

- Agent mode + AI provider.
- Workspace с ≥2 связанными файлами.

## Steps

1. Поручить правку, затрагивающую несколько файлов.
2. Открыть Review со списком файлов.
3. Keep один файл, Drop другой.
4. При необходимости Undo last AI apply после Keep.

## Expected

- Частичное применение сохраняет остальные файлы в proposal.
- Stale-проверка при ручной правке после proposal.
- Undo пропускает файлы с последующими ручными правками и показывает конфликт.

## Negative

- Путь вне workspace — отвергнут.
- Late response после Stop не применяет файлы (см. S06).

## Acceptance

- [ ] Per-file Keep/Drop работает.
- [ ] Undo last AI apply с конфликтом документирован.
- [ ] Ручная QA pending закрыта в pilot-qa.

## Code paths

- `extension.js` apply/undo  
- `provider.js` multiFileMessages  

## Verify

Ручной прогон на контрольном проекте из [pilot-qa.md](../pilot-qa.md).
