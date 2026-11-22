# Матрица расширений для пилота TripleCode MVP

Основной сегмент пилота — разработчики небольших команд с существующим TypeScript/Node.js-репозиторием и привычками VS Code. Эта матрица определяет расширения для проверки совместимости и миграции.

## Критерии выбора

1. **Совместимость с Code — OSS 1.143.1** — upstream-версия базового VSCodium
2. **Доступность через Open VSX** — альтернатива VS Code Marketplace для форка
3. **Лицензия** — предпочтительны MIT/Apache 2.0 или коммерчески допустимые
4. **Отсутствие зависимости от Microsoft/Copilot** — сервисы входа и телеметрии
5. **Релевантность для TypeScript/Node.js** — целевой стек пилота

## Матрица приоритетов

| Расширение | Publisher | Категория | Installs* | Open VSX | Лицензия | Критичность для пилота | Зависимости |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **ESLint** | Microsoft | Linters | 53.7M | ✓ | MIT | Высокая | eslint в проекте |
| **Prettier** | Prettier | Formatters | 72.8M | ✓ | MIT | Высокая | prettier в проекте |
| **Error Lens** | Alexander | Other | ~15M | ✓ | MIT | Средняя | - |
| **TypeScript Importer** | steoates | Other | 4M | ✓ | MIT | Средняя | - |
| **Node.js Modules Intellisense** | Christian Kohler | Other | 10M | ✓ | MIT | Средняя | - |
| **REST Client** | Huachao Mao | Other | 14M | ✓ | MIT | Низкая | - |
| **GitLens** | GitKraken | Git SCM | ~25M | ✓ | GPLv3 | Низкая | Может быть тяжеловат |
| **JavaScript (ES6) code snippets** | Charalampos Karypidis | Snippets | 16M | ✓ | MIT | Низкая | - |
| **npm Intellisense** | Christian Kohler | Other | 16M | ✓ | MIT | Низкая | - |
| **SonarLint** | SonarSource | Linters | ~8M | ✓ | LGPL v3 | Низкая | Требует SonarCloud |

\* Данные по установкам приблизительные на ноябрь 2026.

## План проверки для пилота

### Этап 1: Критичные расширения (высокая приоритетность)

**ESLint** (ms-vscode.vscode-typescript-eslint)
- Открыть проект с ESLint конфигурацией
- Проверить, что ошибки отображаются в редакторе
- Проверить Quick Fix для автоисправления
- Проверить интеграцию с TypeScript для type-aware linting

**Prettier** (esbenp.prettier-vscode)
- Открыть проект с Prettier конфигурацией
- Проверить форматирование на сохранение
- Проверить форматирование по команде
- Проверить интеграцию с ESLint (eslint-config-prettier)

### Этап 2: Полезные расширения (средняя приоритетность)

**Error Lens** (usernamehw.errorlens)
- Открыть файл с ошибками TypeScript
- Проверить отображение ошибок inline
- Проверить настройку severity

**TypeScript Importer** (steoates.auto-import)
- Открыть TypeScript файл с импортами
- Проверить автоматическое добавление импортов
- Проверить сортировку импортов

**Node.js Modules Intellisense** (wingrunr21.vscode-nodejs-module-intellisense)
- Открыть Node.js проект
- Проверить автодополнение модулей в import
- Проверить автодополнение require()

### Этап 3: Дополнительные расширения (низкая приоритетность)

**REST Client** (humao.rest-client)
- Создать .http файл
- Отправить запрос и проверить ответ
- Проверить переменные окружения

**JavaScript (ES6) code snippets** (xabikos.JavaScriptSnippets)
- Проверить сниппеты для JS/TS
- Проверить таб-комплит

## Исключённые расширения

| Расширение | Причина исключения |
| --- | --- |
| Copilot / GitHub Copilot | Зависит от Microsoft/Copilot, противоречит позиционированию TripleCode |
| Cursor AI | Специфично для Cursor, не применимо к форку |
| Live Server | Не критично для TypeScript/Node.js разработки |
| Docker | Полезно, но не критично для первого сегмента |
| AWS Toolkit / Azure Tools | Облачные сервисы, выходят за рамки MVP |

## Источники расширений

1. **Open VSX Registry** — https://open-vsx.org/
2. **VS Code Marketplace** — https://marketplace.visualstudio.com/
3. **PluginStats** — https://www.pluginstats.com/

## Заметки по миграции

- Профиль VS Code экспортируется через встроенный механизм Profiles
- При импорте показывается предпросмотр настроек, клавиш, сниппетов, тем и расширений
- Расширения разрешаются по ID с проверкой версии, зависимостей, платформы и лицензии
- Учетные данные и секреты перепривязываются пользователем вручную
- SSH и облачные интеграции отображаются как недоступные действия в MVP

## Следующие шаги

1. Для каждого расширения из этапа 1 проверить:
   - Наличие в Open VSX
   - Совместимость с Code — OSS 1.143.1
   - Лицензию и условия использования
2. Создать тестовый репозиторий с конфигурациями ESLint и Prettier
3. Провести импорт профиля с этими расширениями и проверить активацию
4. Зафиксировать результаты в задачи или PR
