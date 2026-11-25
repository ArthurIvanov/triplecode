# Дизайн TripleCode IDE

Первый дизайн-проход покрывает путь от запуска до принятия проверенного AI-изменения. Проектируем рабочее окно редактора с привычной клавиатурной навигацией и собственной визуальной системой. Сайт и веб-кабинет отложены. Для desktop-входа проектируем переход в браузер и возврат в IDE.

## Экраны и состояния

| Этап | Что рисуем | Обязательные состояния | Компоненты |
| --- | --- | --- | --- |
| Прототип | Основное окно IDE | Explorer слева, редактор по центру, AI справа, терминал снизу. Узкое окно, перетаскивание разделителей, свёрнутые панели | Заголовок, боковые панели, вкладки, разделитель, status bar |
| MVP | Первый запуск и открытие проекта | Пустое окно, недавние проекты, открытый проект, запрос доверия | Список проектов, кнопки, диалог, уведомление |
| MVP | Импорт из VS Code | Кнопка в настройках, локальный профиль найден или отсутствует, прогресс, частичный успех и откат | Действие «Импортировать из VS Code», компактная сводка, переход к деталям и штатный импорт файла профиля |
| MVP | Повседневная IDE | Редактирование, несохранённый файл, поиск, Git diff, диагностика и терминал. Для дерева и редактора показать фокус, выделение и клавиатурную навигацию | Штатные Explorer, Quick Pick, вкладки, Monaco, терминал и Git-представления |
| MVP | Вход в TripleCode из IDE | Гостевой режим, ожидание браузера, возврат, отмена, истёкшая сессия | Пункт аккаунта, диалог входа, уведомление |
| MVP | Панель AI и история | Пустой чат, Ask/Plan/Agent, поток ответа, ожидание разрешения, остановка, ошибка и перезапуск | Список сессий, composer, выбор режима и модели, ссылки на контекст, карточки действий и разрешений. **S12:** turn chronology (Request → Steps → Answer), Markdown subset в ответах |
| MVP | Ревью AI-правки | Список файлов и diff, результаты проверок, принятие, отмена, конфликт с пользовательской правкой | Штатный Monaco diff + **S12** unified +/- preview в панели Agents |
| MVP | Настройки темы | Выбор и предпросмотр темы, системный режим, импортированная тема недоступна | Штатный выбор темы и настройки, уведомление с переходом к подбору темы |
| Бета | Inline-автодополнение | Подсказка у курсора, совместное отображение с IntelliSense, выключение по языку | Штатный ghost text, индикатор AI, меню настройки |
| Бета | `@` picker в composer | Пустой поиск, результаты файлов/папок, клавиатура, удаление чипа | Popover над composer; не Quick Pick-only |
| Бета | Streaming + tool timeline | Частичный ответ, running tool step, ошибка tool, stop | Timeline DS + streaming cursor в сообщении |
| Бета | Cmd-K selection edit | Preview, apply, discard, конфликт IntelliSense | Peek/overlay на Monaco |
| Бета | MCP permissions | Connect, deny, list servers | Диалог разрешений |
| Полный релиз | Фоновые и облачные сессии | Очередь, выполняется, ждёт пользователя, завершена, возобновление и открытие PR | Session bar (Local/Background/Cloud) + Worktree/PR; ACC rail — волна V |
| Полный релиз | Update dialog | Available, downloading, ready to restart, rollback | About / notification — ADR 0005 |
| Бета→full | Visual parity Cursor/Devin | Mode/@/timeline/session rail близки конкурентам для миграции | См. [competitive-visual-parity.md](competitive-visual-parity.md) · S19 |

Обязательные состояния Agents panel (MVP→beta): `empty`, `drafting`, `loading`/`streaming`, `error`, `stopped`, `review`, `conflict`. Что кастомное TripleCode vs upstream — см. [roadmap.md](roadmap.md) визуальные блоки волн A/C.

Для прототипа сначала пройти три экрана из раздела ниже в одном сквозном сценарии. Подготовить исходный macOS-вариант и проблемный узкий размер. Для беты проверить системные кнопки окна и клавиши на Windows и Linux. Формы, диалоги, меню и списки показать с клавиатурным фокусом, ошибками и выключенными действиями. Состояния diff и разрешений различать текстом или значком вместе с цветом.

## Первые три экрана

| Порядок | Экран | Первый работающий сценарий |
| --- | --- | --- |
| 1 | Welcome | Открыть локальную папку без регистрации. Для повторного запуска показать недавние проекты |
| 2 | Рабочее окно IDE | Увидеть дерево проекта, открыть файл в штатном редакторе, открыть AI-панель. Для прототипа достаточно одного локального проекта |
| 3 | Ревью AI-правки в рабочем окне | Получить один патч, увидеть затронутый файл и diff, применить или отклонить правку. До подключения модели используем фиксированный тестовый патч |

Поиск, расширения, клонирование и импорт добавляем после проверки этого сквозного сценария. Импорт из локальной установки остаётся в Settings, импорт файла — в Profiles.

## Импорт после первого запуска

Cursor документирует локальный импорт одной кнопкой в Settings → General → Account. Экспорт профиля и выбор файла — отдельный ручной способ для переноса между устройствами или выбора конкретного профиля. [Миграция из VS Code в Cursor](https://cursor.com/docs/configuration/migrations/vscode)

В TripleCode действие «Импортировать из VS Code» доступно в настройках без входа в аккаунт. Первый запуск ведёт напрямую к открытию проекта. При нескольких профилях показываем компактный выбор. После импорта показываем, что перенеслось, какие расширения или темы оказались недоступны и как отменить применение. Отдельный предпросмотр нужен при конфликтах или выборе категорий. Если VS Code не найден, предлагаем штатный импорт файла через Profiles. Существующие макеты выбора файла и предпросмотра описывают этот ручной путь.

## Что реализовать

- **Переиспользуемые элементы Code — OSS.** Monaco, стандартный и diff-редакторы, вкладки, Explorer/tree, Quick Pick, ввод, кнопки, меню, уведомления, терминал и настройки. Дизайнер отмечает, где достаточно смены темы, а где меняются поведение или геометрия. Перестановку частей оболочки сверяем с техническим прототипом.
- **Компоненты TripleCode.** Предпросмотр и отчёт импорта, состояние собственного аккаунта, список AI-сессий, поле задания с контекстом, карточки плана и инструментов, подтверждение действий, сводка проверок и управления AI-правками. Собирать их из штатных элементов там, где совпадает поведение.

## Как устроены темы

**VS Code.** Цветовая тема определяет цвета Workbench через `colors`, синтаксис TextMate через `tokenColors` и подсветку символов через `semanticTokenColors`. Пользовательские переопределения приходят через `workbench.colorCustomizations`, `editor.tokenColorCustomizations` и `editor.semanticTokenColorCustomizations`. Иконки файлов и иконки интерфейса имеют отдельные типы тем. [Theming](https://code.visualstudio.com/api/extension-capabilities/theming) · [Color Theme](https://code.visualstudio.com/api/extension-guides/color-theme) · [Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)

**Cursor.** Классическое окно поддерживает привычные темы VS Code. В апреле 2026 поддержка Cursor описывала отдельный движок тем для Agents Window. Более поздние release notes подтверждают, что подсветка кода в diff, карточках PR и плане учитывает тему редактора. Это подтверждение подсветки кода, а полный контракт цветов оболочки Agents Window публично не описан. [Ответ поддержки Cursor](https://forum.cursor.com/t/cursor3-how-to-change-colors-other-themes/157659/2) · [Cursor Release Notes](https://prod.cursor.com/docs/release-notes)

## Стартовая карта токенов

В дизайн-файле хранить палитру, семантические роли и привязки компонентов. Для цвета указывать режим, назначение, штатный ID Code — OSS или ID TripleCode и fallback. Имена upstream сверить с выбранным SHA перед реализацией.

| Группа | Первые привязки и примеры |
| --- | --- |
| Поверхности оболочки | `titleBar.activeBackground`, `activityBar.background`, `sideBar.background`, `panel.background`, `statusBar.background`, `editor.background` |
| Текст и границы | `foreground`, `descriptionForeground`, `disabledForeground`, `focusBorder`, `contrastBorder`, `panel.border`, `textLink.foreground` |
| Взаимодействие | `button.background`, `button.hoverBackground`, `input.background`, `list.hoverBackground`, `list.activeSelectionBackground`, `tab.activeBackground`, `sash.hoverBorder` |
| Редактор, поиск и подсказки | `editor.foreground`, `editorCursor.foreground`, `editor.selectionBackground`, `editor.findMatchBackground`, `editorGhostText.foreground`, `editorSuggestWidget.background` |
| Diff, диагностика и терминал | `diffEditor.insertedTextBackground`, `diffEditor.removedTextBackground`, `editorError.foreground`, `editorWarning.foreground`, `terminal.background`, `terminal.foreground`, палитра `terminal.ansi*` |
| Синтаксис | TextMate scopes для комментариев, строк, чисел и ключевых слов. Семантические типы и модификаторы для типов, функций, параметров и readonly-символов |
| Собственные цвета AI | Предварительно `triplecode.chat.composerBackground` → `input.background`, `triplecode.chat.userMessageBackground` → `editorWidget.background`. Заводить отдельный ID, когда нужен независимый пользовательский override |
| Типографика и геометрия | Семейство UI и моноширинный шрифт, размеры и высота строк, шаг отступов, высоты табов и контролов, радиусы, минимальные размеры панелей и область захвата разделителей. Связывать с настройками и компонентами отдельно от цветовой темы |
| Иконки | Отдельные наборы для файловых типов и продуктовых действий, плюс состояния активности, фокуса и выключения |

Для первого прохода подготовить Dark и Light. Проверить High Contrast Dark и High Contrast Light на фокусе, выделении, разделителях, diff, диагностике и inline-подсказках. В реализации сохранить стандартные IDs и пользовательские переопределения. Для новых цветов использовать реестр цветов Workbench с fallback на штатные семантические роли. Если появится отдельное агентское окно, проверить передачу той же схемы цветов и переключение темы без перезапуска. [Реестр цветов Workbench](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/common/theme.ts)

Результат для передачи в разработку — макеты и состояния из таблицы, список компонентов с пометками о переиспользовании и карта токенов с привязкой к upstream. Значения цветов, точные размеры и итоговая композиция утверждаются по макетам и проверяются в работающей IDE.

## Кнопки и темы

Штатный Workbench Button выбирает Primary или Secondary через `options.secondary`. Идентификаторы одинаковы во всех режимах. Значения разрешаются из установленной темы и пользовательских переопределений. Третичный инвертированный вариант TripleCode меняет местами фон и текст Secondary. [Реализация Button](https://github.com/microsoft/vscode/blob/main/src/vs/base/browser/ui/button/button.ts) · [Реестр цветов](https://github.com/microsoft/vscode/blob/main/src/vs/platform/theme/common/colors/inputColors.ts)

| Вид | Фон Default | Текст Default | Hover |
| --- | --- | --- | --- |
| Primary | `button.background` | `button.foreground` | Фон `button.hoverBackground` |
| Secondary | `button.secondaryBackground` | `button.secondaryForeground` | Фон `button.secondaryHoverBackground` |
| Tertiary (TripleCode) | `button.secondaryForeground` | `button.secondaryBackground` | Текст `button.secondaryHoverBackground`, фон без изменения |

Active в макете использует цвета Hover и непрозрачность 87%. Для штатных кнопок в реализации обводки берём из `button.border` и `button.secondaryBorder`, фокус из `focusBorder`. У инверсии запасной цвет текста при отсутствующем или прозрачном фоне Secondary — непрозрачная поверхность контейнера. Если контраст пары недостаточен, использовать проверенную пару цветов текущего высококонтрастного режима. High Contrast проверяем отдельно в работающей IDE.

Дефолты реестра Code — OSS для Dark / Light / HC Dark / HC Light: фон Primary `#0E639C` / `#007ACC` / чёрный / `#0F4A85`; текст Primary белый. Фон Secondary использует `list.hoverBackground` в Dark и Light, отсутствует в HC Dark, белый в HC Light. В обоих HC-режимах Secondary Hover не задаёт отдельную заливку. Тема может переопределить любой из этих цветов. [Исходники реестра](https://github.com/microsoft/vscode/blob/main/src/vs/platform/theme/common/colors/inputColors.ts)

Cursor публично документирует кнопку прямого импорта и ручной импорт через Profiles. Его документация позволяет сверить взаимодействие, а внутренние идентификаторы и реализация всех вариантов кнопок не раскрыты. [Cursor Migration](https://cursor.com/docs/configuration/migrations/vscode)

[Первый запуск](https://www.figma.com/design/H0WMYGGclEWe3lbjUabY3h/Triplecode-app?node-id=123-1969) · [Настройки](https://www.figma.com/design/H0WMYGGclEWe3lbjUabY3h/Triplecode-app?node-id=139-2433) · [Состояния кнопок](https://www.figma.com/design/H0WMYGGclEWe3lbjUabY3h/Triplecode-app?node-id=133-2013)
