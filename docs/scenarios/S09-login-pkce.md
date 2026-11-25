# S09 — Login PKCE → возврат в IDE

| Field | Value |
| --- | --- |
| ID | S09 |
| Role | Инженер AI + web |
| Stage | MVP |
| Roadmap | R-A1 |
| Audit | A09 |

## Preconditions

- Сеть; `https://triplecode.ru` desktop start доступен.
- Сборка с URL scheme `triplecode://`.

## Steps

1. Команда «Войти в TripleCode».
2. Браузер: email / код при необходимости.
3. Callback в IDE через `triplecode://…/auth/callback`.
4. Увидеть профиль в IDE; usage event после Ask/Agent при логине.
5. Выход — сессия отозвана.

## Expected

- PKCE S256; токены в SecretStorage.
- Без кабинета квот AI может работать BYOK/local; пилот с квотами — после web cabinet.

## Negative

- Отмена в браузере — IDE в гостевом режиме без ошибки-петли.
- Просроченный grant — понятное сообщение, повторный start.

## Acceptance

- [x] PKCE login + SecretStorage + status guest/waiting/signed-in (IDE).
- [x] Usage events из IDE → `/api/usage/event`; кабинет `/account/usage`.
- [x] Кабинет `/account/plan` — Pilot · BYOK + soft quota (не блокирует IDE).
- [ ] Hosted checkout / жёсткий биллинг — blocker для платного пилота (не S09 floor).
- [ ] Live E2E login re-run на QA build (ручной; уже было 23.11).

## Code paths

- `extensions/triplecode-mvp/desktop-account.js`, `account-logic.cjs`  
- `triplecode-web` `apps/api/usage-events.mjs`, `/account/plan`, `/account/usage`  
- contracts: `packages/contracts/README.md`

## Links

[accounts.md](../accounts.md) · [contracts-sync.md](../contracts-sync.md) · sibling `triplecode-web/packages/contracts`
