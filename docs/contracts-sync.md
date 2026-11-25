# Синхронизация контрактов IDE ↔ triplecode-web

Канон API и desktop auth: репозиторий **`triplecode-web`** → `packages/contracts/README.md` (рядом: `../triplecode-web`).

## Что синхронизировать

| Контракт | IDE потребитель | Web |
| --- | --- | --- |
| Desktop PKCE start/exchange/refresh/logout | `extensions/triplecode-mvp/desktop-account.js` | `apps/api` + contracts README |
| Usage event `POST /api/usage/event` | `desktop-account.js` / extension | API usage_events |
| Release manifest | сборки / updateUrl | `apps/web` downloads page |

## Процесс

1. Меняешь API — сначала обратно совместимое изменение в `triplecode-web/packages/contracts`.
2. Обновляешь IDE клиент в том же продуктовом эпике (отдельный PR в `triplecode`).
3. В обоих PR ссылка на задачу и версию контракта (дата или semver в contracts README).
4. Не коммить секреты; base URL по умолчанию `https://triplecode.ru`.

## Локальная заготовка типов в IDE

Файл [extensions/triplecode-mvp/contracts-stub.d.ts](../extensions/triplecode-mvp/contracts-stub.d.ts) дублирует формы JSON для редакторских подсказок. При расхождении побеждает `triplecode-web/packages/contracts`.
