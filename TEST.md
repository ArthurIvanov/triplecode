# Проверки TripleCode

## CI (GitHub Actions)

| Workflow | Когда | Что |
| --- | --- | --- |
| `ci.yml` | PR / push | webview `build:webview` (tsc), layout pin, manifest schema |
| `build-macos.yml` | dispatch / release | `scripts/build-macos.sh` |
| `build-windows.yml` | dispatch / release | `scripts/build-windows.sh` |
| `build-linux.yml` | dispatch / release | `scripts/build-linux.sh` |
| `release.yml` | tag `v*` | 3 ОС + `release-manifest.json` |

## Локально

```bash
npm --prefix extensions/triplecode-mvp ci
npm --prefix extensions/triplecode-mvp run build:webview
npm --prefix extensions/triplecode-mvp test   # S05–S07 review-logic smoke
bash scripts/check-layout-pin.sh
bash scripts/build-macos.sh          # Apple Silicon
bash scripts/run-macos-qa.sh
bash scripts/verify-release-manifest.sh path/to/release-manifest.json
```

## Scenario smoke (ручной / ui-check)

См. [docs/scenarios/README.md](docs/scenarios/README.md). **S03–S07** закрыты автотестами `agent-modes` + `review-logic` (25.11.2026).

| Env (если harness доступен) | Сценарий |
| --- | --- |
| `TRIPLECODE_AGENT_PLAN=1` | S04 |
| `TRIPLECODE_AGENT_STOP=1` | S06 |
| `TRIPLECODE_AGENT_NETWORK=1` | S06 late |
| `TRIPLECODE_CHECK_SCOPE=1` | S07 |
| `TRIPLECODE_AGENT_KEYBOARD=1` | focus/keyboard P0 |

## Пробелы

Автотестов extension host пока нет — волна B ([roadmap.md](docs/roadmap.md) R-B3/B4).
