# Ревью экрана Workspace (MVP · 02)

**Node:** `157:14017` — MVP · 02 · Workspace
**Дата:** 22 ноября 2026
**Роль:** Продуктовый дизайнер + Инженер IDE

## Структура экрана

```
┌─────────────────────────────────────────────────────────┐
│ TopBar (32px)                                            │
│ WindowButtons | Back/Forward | Panel/Agents/Settings | Title│
├────┬────────────────────────────────────────────────────┤
│    │ mainContent                                        │
│ Act│ ┌──────────┬─────────────────────────────────────┐ │
│ Bar│ │ Explorer │ Editor + Terminal                   │ │
│    │ │ (280px)  │ (flexible)                          │ │
│    │ │          │                                     │ │
│    │ │ EXPLORER │ [Tabs]                              │ │
│    │ │ src      │ code...                             │ │
│    │ │ files... │                                     │ │
│    │ │          │ TERMINAL                            │ │
│    │ │ OUTLINE  │ $ prompt                            │ │
│    │ │ TIMELINE │                                     │ │
│    │ └──────────┴─────────────────────────────────────┘ │
├────┴────────────────────────────────────────────────────┤
│ BottomBar (32px)                                         │
│ Layout | Git | Errors | Warnings | ... | TripleCode IDE │
└─────────────────────────────────────────────────────────┘
```

## Анализ по компонентам

### 1. ActionBar (Activity Bar)

**Дизайн:**
- Ширина: 44px, кнопки 43px высотой
- Иконки: Files (active), Search, Git Branch, Box
- Active state: `bg-[var(--activitybar/activebackground,#303236)]`
- Border radius: 6px (`var(--sm)`)
- Gap между кнопками: 4px (`gap/related`)

**Сравнение с текущей реализацией:**
- Текущий `apply-workbench-layout.py` меняет `actionHeight` и `actionGap`
- `actionGap` изменён с 0 на 4px для floating panels
- `actionHeight` изменён для compact mode

**Оценка:** Дизайн соответствует текущим патчам. ActivityBarButton компонент в Figma точно описывает поведение.

**Рекомендация:** Текущая реализация достаточна. Можно добавить CSS для `border-radius: 6px` на `.action-item` (уже есть в workbench.css).

---

### 2. Editor and Terminal

**Дизайн:**

#### Editor Panel
- Фон: `var(--bg-neutral-section-calm, #1d1e20)`
- Border: `1px solid var(--br-grey-calm-enabled, #303236)`
- Border radius: `var(--m, 8px)` — **новое!** Скругление углов
- Padding: `22.551px` (нестандартное значение)
- Line numbers: `Inter:Regular`, 12px, `descriptionForeground`
- Code: `IBM Plex Mono:Regular`, 13px, `editor/foreground`

#### Tabs (agentHeader)
- Высота: 32px, border-bottom
- Активный tab: `bg-[#131416]`, скругление `4px 4px 0 0` (top only)
- Неактивные tabs: `bg-[#1d1e20]`, border, скругление `4px`
- File type badge: `TS` в `textLink/foreground` (#266cf7), bold 10px
- Close button: opacity 0 → visible on hover/active

#### Terminal
- Фон: `var(--terminal/background, #131416)`
- Высота: 194px
- Label: `TERMINAL` — `Inter:Bold`, 11px, `descriptionForeground`
- Prompt: `IBM Plex Mono:Regular`, 13px, `terminal/foreground`

**Сравнение с текущей реализацией:**
- Текущий Workbench использует стандартные стили VS Code
- `apply-workbench-layout.py` меняет размеры panel, но не скругления
- CSS патч добавляет `border-radius` для `.part.editor` и `.part.panel`

**Проблемы:**
1. **Border radius 8px** — в дизайне есть, в реализации частично (только для `.part.editor` и `.part.panel`)
2. **Padding 22.551px** — нестандартное значение, вероятно для центрирования кода
3. **Font IBM Plex Mono** — в реализации используется `editor.fontFamily` (обычно Consolas/Menlo)
4. **Terminal height 194px** — фиксированная, в реализации `workbench.panel.defaultLocation` управляет позицией, но не высотой

**Рекомендации:**
1. Добавить `border-radius: 8px` для `.part.editor` и `.part.panel` (уже частично есть)
2. Добавить `--triplecode-editor-padding: 22.551px` в tokens.css
3. Рассмотреть IBM Plex Mono для кода (но это требует загрузки шрифта)
4. Terminal height можно настроить через `workbench.panel.defaultSize` если нужно фиксированное значение

---

### 3. Chat (Agent Panel)

**Дизайн:** В данном экране chat panel не показан явно, но по структуре:
- Должен быть в Secondary Side Bar (справа)
- Или в Auxiliary Bar

**Из предыдущего анализа (Welcome screen):**
- Chat header: 31px высота, border-bottom
- Chat tabs: 24px высота, border-radius 4px
- Active tab: `bg-sideBar-background`, border
- Composer: margin 8px, border, border-radius 4px
- Textarea: min-height 67px
- Send button: 24x24px, `bg-button-secondaryForeground`

**Сравнение с текущей реализацией:**
- Текущий `workbench.js` реализует chat UI
- `workbench.css` содержит стили для `.chat-header`, `.chat-tab`, `.conversation`, `.review-actions`
- `apply-workbench-layout.py` устанавливает `titleHeight: 0` для `triplecode-agents`

**Проблемы:**
1. **Chat panel не виден в этом экране** — возможно, он скрыт или в другом месте
2. **Title height 0** — в патче есть, но в дизайне не показано

**Рекомендации:**
1. Уточнить у дизайнера, где должен быть chat panel в Workspace screen
2. Если chat panel справа — нужно добавить его в макет
3. Если chat panel скрыт — текущее поведение (toggle через Agents button) корректно

---

## Общие наблюдения

### Типографика
- **Font family:** Inter (уже в tokens.css)
- **Code font:** IBM Plex Mono (не в tokens.css)
- **Sizes:** 10/11/12/13/14px (в tokens.css есть 10/12/14, нет 11/13)

### Цвета
- Все цвета уже в tokens.css
- `activitybar/activebackground: #303236` — не в tokens.css
- `bg/grey_transparent/calm/enabled: rgba(16,17,20,0.94)` — backdrop blur для контейнера

### Spacing
- `gap/closest: 2px` — не в tokens.css
- `padding/ml: 10px` — не в tokens.css (есть 10px как spacing-xl)

## Приоритеты для реализации

| Приоритет | Компонент | Действие |
| --- | --- | --- |
| Высокий | ActivityBar | Добавить `border-radius: 6px` (уже есть) |
| Высокий | Editor border radius | Убедиться что `.part.editor` имеет `border-radius: 8px` |
| Средний | IBM Plex Mono | Рассмотреть для code font (требует загрузки) |
| Средний | Terminal height | Настроить через `workbench.panel.defaultSize` |
| Низкий | Chat panel placement | Уточнить у дизайнера |

## Следующие шаги

1. **Обновить tokens.css** — добавить недостающие значения (activitybar colors, gap/closest, padding/ml)
2. **Обновить figma-design.css** — добавить стили для Workspace screen
3. **Добавить Workspace в Design System** — для визуального сравнения
4. **Проверить IBM Plex Mono** — если нужен, добавить как web font или использовать fallback
