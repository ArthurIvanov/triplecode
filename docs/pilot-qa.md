# Pilot QA log — контрольный проект `~/Desktop/test`

Прогон на TripleCode.app (Code-OSS 1.143.1 arm64), macOS. Дата: 2026-11-22.

## Стенд

- TypeScript-проект: `index.ts`, `utils.ts`, `tsconfig.json`, `package.json` (eslint 9 + prettier 3 + typescript-eslint + typescript)
- ESLint flat config (`eslint.config.mjs`), `.prettierrc.json`, `.vscode/launch.json`, `.vscode/tasks.json`
- git-репозиторий (main), `test.http` для REST Client

## Результаты

| Сценарий | Статус | Детали |
| --- | --- | --- |
| Git-интеграция | ✅ | Репозиторий открылся, GitLens выполняет blame/log/commit-graph без ошибок; встроенный `vscode.git` активирован |
| Task build (`npx tsc`) | ✅ | Конфиг `.vscode/tasks.json` создан; `tsc` ловит реальные ошибки (найдена битая ссылка `formatUserName` после AI-правок — исправлено) |
| Debug launch | ⚠️ | `launch.json` готов (`preLaunchTask: build` → `dist/index.js`); запуск через F5 не проверен в GUI |
| Run checks (`npm test`) | ✅ | `node --check index.ts` — настроено для кнопки Run checks в Agent-панели |
| Lint/format/test pipeline | ✅ | `npx eslint .`, `npx prettier`, `npm test` — все зелёные после настройки ignore `dist/` и node-globals |
| Agent multi-file правки | ⚠️ | Ранее подтверждено; замечен кейс: AI-рефактор переименовал/убрал функцию, которую использовал `index.ts` — diff review должен был это показать (ручная проверка) |
| Расширения (10 шт.) | ✅/⚠️ | См. `extensions-pilot-matrix.md`: 9/10 закрыты, SonarLint на ручной проверке |

## Найденные проблемы

1. **AI-правки могут ломать cross-file консистентность** — модель переписала `utils.ts` без `formatUserName`, а `index.ts` его использовал. Review-diff это покрывает, но стоит проверить сценарий «Run checks после apply» — теперь `npm test` ловит часть таких ошибок.
2. **ESLint-расширение падает при изменении node_modules во время работы** — транзиентно, лечится перезапуском окна; не баг TripleCode.
3. **SonarLint (Open VSX)** — LSP `ResponseErrorException` на `hasJoinedIdeLabs`; вероятно несовместимая сборка.

## Не проверено (ручной QA)

- F5 debug в GUI, Run Task из Command Palette, format-on-save, REST Client запросы, сниппеты таб-комплита, Error Lens отображение, импорт профиля VS Code end-to-end.
