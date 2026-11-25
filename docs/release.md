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

## Подпись (R-D1)

`bash scripts/sign-artifact.sh macos|windows|linux …` вызывается из `build-*.sh`.

| ОС | Secret (опционально) | Поведение без secret |
| --- | --- | --- |
| macOS | `TRIPLECODE_SIGNING_IDENTITY` / `APPLE_DEVELOPER_ID`; notarization: `APPLE_ID` + `APPLE_TEAM_ID` + `APPLE_APP_SPECIFIC_PASSWORD` | ad-hoc (`codesign -`) |
| Windows | `WINDOWS_CERT_PFX` (path или base64) + `WINDOWS_CERT_PASSWORD` | unsigned zip + log note |
| Linux | — | tar.gz as-is |

Не блокируй CI отсутствием сертификатов. Публичную бету с магазинами/Gatekeeper — только с secrets.

## Обновления (R-D2)

- Сборка может выставить `product.updateUrl` через `TRIPLECODE_UPDATE_URL`.
- В IDE: `triplecode.update.manifestUrl` имеет приоритет; если пуст — берётся `product.updateUrl` из сборки. **Check for Updates** / **About** (см. S18).
- При настроенном URL выполняется silent auto-check при активации расширения, не чаще раза в 24 часа (`globalState triplecode.update.lastCheck`); уведомление показывается только при доступном/откатном обновлении.
- Откат канала = манифест с меньшим `version` после `verify-release-manifest.sh`.

## Связь с web

Страница загрузок в `triplecode-web` читает `release-manifest.json` (см. contracts). IDE CI публикует манифест; web не пересобирает desktop.
