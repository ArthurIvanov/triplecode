# Релизы TripleCode

См. [ADR 0005](adr/0005-auto-update.md) и [repositories.md](repositories.md).

## Каналы

| Channel | Назначение |
| --- | --- |
| `preview` | Внутренние / пилотные сборки |
| `stable` | Публичный указатель после приёмки |

## Как вырезать релиз

1. Убедись, что `ci.yml` зелёный на merge-commit.
2. P0 сценарии S03–S07 пройдены на macOS (или зафиксирован блокер).
3. Обнови `scripts/upstream.env` только вместе с проверкой layout pin.
4. Tag: `git tag v0.1.0 && git push origin v0.1.0`.
5. Workflow `release.yml` соберёт darwin/win32/linux, посчитает sha512, приложит `release-manifest.json`.
6. Проверка: `bash scripts/verify-release-manifest.sh release-manifest.json`.

## Promote / rollback

- **Promote preview→stable:** переиздать манифест с `"channel":"stable"` на тот же version или опубликовать pointer-файл на update host.
- **Rollback:** указать предыдущий `version` в манифесте канала; клиенты с `updateUrl` подтянут прошлые URL/checksums.
- Пока `TRIPLECODE_UPDATE_URL` пуст — обновление ручное (скачивание с GitHub Releases).

## Подпись

| ОС | Secret (опционально Stage 1) | Поведение без secret |
| --- | --- | --- |
| macOS | `APPLE_DEVELOPER_ID` / notary creds | ad-hoc / unsigned artifact note |
| Windows | `WINDOWS_CERT_PFX` | unsigned zip |
| Linux | — | tar.gz as-is |

Не блокируй Stage 1 CI отсутствием сертификатов; блокируй публичную бету (волна D).

## Связь с web

Страница загрузок в `triplecode-web` читает `release-manifest.json` (см. contracts). IDE CI публикует манифест; web не пересобирает desktop.
