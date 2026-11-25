# S11 — Cloud / background handoff (full)

| Field | Value |
| --- | --- |
| ID | S11 |
| Role | Архитектор + Инженер AI |
| Stage | full |
| Roadmap | R-E1–E3 |
| Audit | A11 |

## Preconditions

- Волна E; локальный runtime стабилен; учёт стоимости есть.
- Изолированная среда / worktree.

## Steps (target)

1. Создать задачу с env prep (repo, branch, install).
2. Уйти в background/cloud; закрыть IDE.
3. Вернуться — статус, логи, артефакты.
4. Доставить один PR; повторная доставка не дублирует PR.
5. Handoff коллеге с историей checks.

## Acceptance

- [ ] Сессия продолжается после закрытия IDE.
- [ ] Две задачи не делят одну рабочую копию.
- [ ] PR идемпотентен.
- [ ] Права на репозиторий проверены сервером.

## Notes

До волны E файл — AC-заглушка. Не реализовывать в MVP/beta без решения продакта.
