# 0005. Auto-update через HTTPS манифест релизов

**Статус** — принято для Stage 1–2 каркаса, 25 ноября 2026 года.

## Контекст

Дистрибутив собирается из pinned VSCodium + product layers. Нужен канал обновлений без Microsoft update URL, с откатом и multi-OS артефактами.

## Рассмотренные варианты

| Вариант | Плюсы | Минусы |
| --- | --- | --- |
| Оставить update отключённым | Просто | Ручная раздача на пилоте |
| GitHub Releases + `release-manifest.json` | Прозрачно, checksums в git/CI | Нужен стабильный HTTPS URL |
| Отдельный объектный storage | CDN, ACL | Инфра раньше продукта |

## Решение

1. Каналы: `stable` и `preview`.
2. CI по tag `v*` публикует артефакты трёх ОС и пишет `release-manifest.json` (version, channel, os, arch, url, sha512, publishedAt).
3. В `product.json` при сборке выставляется `updateUrl` на HTTPS endpoint, отдающий манифест (GitHub raw/release asset или позже CDN). Пока endpoint не готов — ключ можно оставлять пустым / documentation-only; скрипты сборки готовят поле.
4. Откат = перепись указателя канала на предыдущий version в манифесте после `verify-release-manifest.sh`.
5. Notarization / Authenticode: secrets в CI; если secret отсутствует — артефакт публикуется unsigned с пометкой в release notes (Stage 1).

## Последствия

- Пилот может раздавать сборки через GitHub Releases до CDN.
- Клиенты без `updateUrl` обновляются вручную.
- Пересмотр при переходе на source fork (тот же манифест-контракт).

## Условия пересмотра

- Смена схемы update Code-OSS.
- Требование enterprise private update feed.
