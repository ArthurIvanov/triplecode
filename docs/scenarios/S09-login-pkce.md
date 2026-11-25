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

- [ ] E2E login (уже было 23.11) остаётся зелёным.
- [ ] Cabinet/quotas documented as remaining blocker for external pilot.

## Code paths

- `extensions/triplecode-mvp/desktop-account.js`  
- `triplecode-web` contracts desktop auth  

## Links

[accounts.md](../accounts.md) · contracts in sibling `triplecode-web/packages/contracts`
