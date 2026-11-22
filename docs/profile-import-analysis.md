# Анализ импорта профилей для TripleCode MVP

**Роль:** Инженер IDE
**Дата:** 22 ноября 2026

## Требования по ide-design.md

- Действие «Импортировать из VS Code» в Settings без входа в аккаунт
- При нескольких профилях — компактный выбор
- Предпросмотр: настройки, клавиши, сниппеты, темы, расширения
- Откат импорта
- Если VS Code не найден — предложить штатный импорт файла через Profiles

## Штатные возможности VS Code (upstream)

### Profiles API
- Формат: `.code-profile` файл (JSON) или GitHub Gist
- Команды:
  - `Preferences: Open Profiles (UI)` — редактор профилей
  - `Profiles: Import Profile` — импорт из файла/URL
  - `Profiles: Export Profile` — экспорт профиля
- Содержимое профиля:
  - Settings
  - Keyboard Shortcuts
  - User Snippets
  - Tasks
  - Extensions
- Предпросмотр доступен через Profiles UI

### Пути к конфигурации (macOS)
- User settings: `~/Library/Application Support/Code/User/settings.json`
- Extensions: `~/.vscode/extensions`
- Extension state: `~/Library/Application Support/Code/User/globalStorage/state.vscdb`
- Profiles: `~/Library/Application Support/Code/User/profiles/`

## Подход Cursor

### One-click Import
- Находится в Settings > General > Account
- Кнопка "Import" под "VS Code Import"
- Импортирует: extensions, themes, settings, keybindings
- Читает локальную установку VS Code

### Manual Profile Migration
- Экспорт из VS Code через Profiles UI
- Импорт в Cursor через Profiles UI
- Поддержка GitHub Gist

### Ограничения
- Не все расширения доступны в Open VSX
- Возможны конфликты расширений
- Проблемы с импортом профилей с расширениями (workaround: импорт без расширений, затем ручная установка)

## Подход TripleCode для MVP

### Рекомендация: Использовать штатный Profiles API

**Обоснование:**
- Profiles API уже доступен в Code — OSS форке
- Предпросмотр и откат уже реализованы в upstream
- Минимальные изменения в коде

### Реализация

#### Шаг 1: Импорт из локальной установки VS Code

Команда `triplecode.importFromVSCode`:
1. Проверяет наличие локальной установки VS Code по путям:
   - `/Applications/Visual Studio Code.app`
   - `~/Applications/Visual Studio Code.app`
2. Если найдена:
   - Читает `settings.json`
   - Читает список расширений из `extensions/` и `state.vscdb`
   - Показывает предпросмотр в webview
3. Если не найдена:
   - Предлагает штатный импорт файла через `Profiles: Import Profile`

#### Шаг 2: Предпросмотр

Webview показывает:
- Settings (настройки)
- Keyboard Shortcuts (клавиши)
- User Snippets (сниппеты)
- Tasks (задачи)
- Extensions (расширения) с фильтром по совместимости

Пользователь может:
- Выбрать категории для импорта
- Исключить отдельные элементы
- Отменить импорт

#### Шаг 3: Применение

Создаёт новый профиль через ProfileService:
- Применяет выбранные настройки
- Устанавливает доступные расширения через Open VSX
- Сохраняет исходные файлы для отката

#### Шаг 4: Откат

Команда `triplecode.rollbackImport`:
- Удаляет созданный профиль
- Восстанавливает предыдущий активный профиль
- Удаляет установленные расширения

### Критерии приёмки для MVP

| Критерий | Как проверить |
| --- | --- |
| Импорт из локальной установки | Установить VS Code, настроить его, затем импортировать в TripleCode |
| Предпросмотр категорий | Проверить отображение настроек, клавиш, сниппетов, расширений |
| Выбор элементов | Исключить категорию или отдельный элемент, проверить результат |
| Откат | Откатить импорт, проверить восстановление предыдущего состояния |
| Отсутствие VS Code | Удалить VS Code, проверить предложение импорта файла |
| Профиль файла | Импортировать `.code-profile` файл через штатный механизм |

### Ограничения MVP

- Только один профиль для импорта (не несколько)
- Расширения только из Open VSX
- Нет облачного синка
- Нет проверки лицензий расширений

### Следующие шаги для MVP

1. Добавить команду `triplecode.importFromVSCode` в package.json
2. Реализовать чтение локальной конфигурации VS Code
3. Создать webview для предпросмотра
4. Интегрироваться с ProfileService для создания профиля
5. Добавить команду отката
6. Добавить кнопку импорта в Settings или Welcome экран

### Для беты

- Проверка лицензий расширений
- Поддержка нескольких профилей
- Облачный синк через TripleCode аккаунт
- Проверка совместимости расширений
- Кэширование метаданных расширений

## Источники

- [Profiles in Visual Studio Code](https://code.visualstudio.com/docs/configure/profiles)
- [Cursor VS Code Migration](https://cursor.com/docs/configuration/migrations/vscode)
- [VS Code Settings Storage](https://stackoverflow.com/questions/75606023/how-can-i-find-the-location-of-settings-files)
