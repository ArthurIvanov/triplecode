# Матрица свойств компонентов — Tripleform UI

> Справочник Tripleform UI. Для работы в TripleCode действуют [правила проекта](README.md).

Итоговая матрица свойств Tripleform UI, согласованная в ходе последовательного пересмотра каждого атрибута. Все позиции окончательно утверждены и составляют единый стандарт API компонентов дизайн-системы.

---

## Универсальные свойства (все компоненты)


| Свойство           | Тип                      | По умолчанию | Описание                                                                                                     |
| ------------------ | ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `className`        | `string`                 | —            | CSS-класс                                                                                                    |
| `style`            | `React.CSSProperties`    | —            | Инлайн-стили                                                                                                 |
| `id`               | `string`                 | —            | Идентификатор DOM-элемента                                                                                   |
| `data-*`           | `Record<string, string>` | —            | Произвольные data-атрибуты                                                                                   |
| `aria-*`           | `React.AriaAttributes`   | —            | ARIA-атрибуты доступности                                                                                    |
| `aria-label`       | `string`                 | —            | Метка для скринридера. **Обязателен** для иконочных кнопок и элементов без видимого текста                   |
| `aria-labelledby`  | `string`                 | —            | ID элемента, содержащего метку. Используется когда видимая метка существует отдельно от компонента           |
| `aria-describedby` | `string`                 | —            | ID элемента с описанием / сообщением ошибки. Используется совместно с `validationMessage`, `hint`, `Tooltip` |
| `role`             | `string`                 | —            | Переопределение ARIA-роли                                                                                    |
| `tabIndex`         | `number`                 | —            | Порядок фокуса. Допустимы только `0` и `-1`                                                                  |
| `ref`              | `React.Ref<HTMLElement>` | —            | Реф на корневой DOM-элемент                                                                                  |
| `as`               | `React.ElementType`      | —            | Полиморфная замена корневого тега                                                                            |
| `asChild`          | `boolean`                | `false`      | Передать пропсы дочернему элементу (Slot-паттерн)                                                            |
| `hidden`           | `boolean`                | `false`      | Скрыть компонент (включая скринридеры)                                                                       |
| `children`         | `ReactNode`              | —            | Дочернее содержимое                                                                                          |
| `title`            | `string`                 | —            | Заголовок / title-атрибут                                                                                    |


---



## Содержимое и метки


| Свойство      | Тип                                              | По умолчанию | Область применения                                                                                                                                                                                                  |
| ------------- | ------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`        | `ReactNode`                                      | —            | Button, Badge, Tag, MenuItem, Tooltip, Toast, Alert, Card (заголовок), Modal (заголовок), ListItem. Chip v1 использует `children`, не `text`.                                                                         |
| `label`       | `string`                                         | —            | Input, Select, Textarea, Checkbox, Radio, Switch                                                                                                                                                                    |
| `description` | `string`                                         | —            | Card, Modal, Alert, ListItem, Input                                                                                                                                                                                 |
|               |                                                  |              |                                                                                                                                                                                                                     |
| `placeholder` | `string`                                         | —            | Input, Select, Textarea                                                                                                                                                                                             |
| `titleSize`   | `'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'`        | `'h3'`       | Card, Modal, Alert, Toast                                                                                                                                                                                           |
| `count`       | `number`                                         | —            | Badge, Tag, Chip, Tab. Числовой счётчик; отображается как `99+` при превышении порога                                                                                                                               |
| `color`       | `'primary' | 'secondary' | 'muted' | 'disabled'` | `'primary'`  | Text, Heading, Caption. Цветовая роль текста; маппится на fg-токены (`--fg-main`, `--fg-secondary` и т.д.). Проп `appearance` для этой оси не используется — он зарезервирован для интерактивных компонентов |


---



## Внешний вид

Согласование Badge `1683:10717`: appearance принимает neutral, info, rose, primary,
success, accent, warning, danger; default neutral. Figma lead → primary,
critical → danger, без переименования bg-lead/bg-critical токенов. Rose добавлен
в AppearanceAll; остальные компоненты не включают его автоматически.
После обновления MCP не возвращает ось size: единственный размер не требует
публичного size. Контраст явно отложен пользователем до правки палитры;
фон neutral внутри Chip пользователь проверяет отдельно. Сам Badge пока не переносится.


| Свойство     | Тип                                                                                                  | По умолчанию | Область применения                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appearance` | `'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'accent' | 'neutral' | 'info' | 'rose'`         | `'primary'`  | Button, Badge, Tag, Link, MenuItem, Indicator. Chip v1 без appearance (только grey calm).                                                                           |
| `variant`    | `'filled' | 'outlined' | 'ghost' | 'subtle' | 'text' | 'onLight' | 'onDark' | 'inverted' | 'static'` | `'filled'`   | Button, Badge, Tag, Input, Select, Card, Toast, Alert, Link, MenuItem. Chip v1 без variant.                                                                         |
| `size`       | `'extraSmall' | 'small' | 'base' | 'large' | 'extraLarge' | 'flex'`                                           | `'base'`     | Button, Badge, Tag, Chip, Input, Select, Textarea, Card, Modal, Toast, Alert, ListItem, Checkbox, Radio, Switch, Icon, Stack, Flex, Grid, Box, Container, Indicator |
| `border`     | `boolean`                                                                                            | `true`       | Card, Input, Select, Textarea, Alert, Modal, Box, Indicator                                                                                                         |


> `size`**:** значение `'base'` — якорная точка всего UI. Значение `'medium'` исключено во избежание неоднозначности.

---



## Размеры и ширина


| Свойство    | Тип                  | По умолчанию | Область применения                                                                                              |
| ----------- | -------------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `fullWidth` | `boolean`            | `false`      | Button, Input, Select, Textarea, Card, Toast, Alert, Modal, Stack, Flex, Grid, Box, Container                   |
| `width`     | `string` (CSS width) | —            | Button, Input, Select, Textarea, Card, Toast, Alert, Modal, Stack, Flex, Grid, Box, Container, Badge, Tag, Chip |
| `minWidth`  | `string` (CSS width) | —            | Modal, Popover, Tooltip, Dropdown, Card                                                                         |
| `maxWidth`  | `string` (CSS width) | —            | Modal, Popover, Tooltip, Dropdown, Card                                                                         |


---



## Состояния


| Свойство        | Тип       | По умолчанию | Область применения                                                                                                                                                                                               |
| --------------- | --------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`      | `boolean` | `false`      | Button, Input, Select, Textarea, Checkbox, Radio, Switch, Chip, ListItem, MenuItem, Tabs                                                                                                                         |
| `loading`       | `boolean` | `false`      | Button, Card, ListItem                                                                                                                                                                                           |
| `skeleton`      | `boolean` | `false`      | Card, ListItem, Avatar, Button. Состояние-заглушка при первичной загрузке данных. Отличается от `loading`: `loading` = процесс выполняется (спиннер), `skeleton` = данные ещё не получены (placeholder-анимация) |
| `readOnly`      | `boolean` | `false`      | Input, Select, Textarea                                                                                                                                                                                          |
| `required`      | `boolean` | `false`      | Input, Select, Textarea, Checkbox, Radio                                                                                                                                                                         |
| `autoFocus`     | `boolean` | `false`      | Input, Select, Textarea, Modal. Допустим только в модальных окнах и на страницах с единственным основным действием                                                                                               |
| `expanded`      | `boolean` | `false`      | Accordion, Disclosure, TreeItem, Panel                                                                                                                                                                           |
| `open`          | `boolean` | —            | Modal, Popover, Dropdown, Accordion, Tooltip. Controlled-режим: внешнее управление видимостью                                                                                                                    |
| `defaultOpen`   | `boolean` | `false`      | Modal, Popover, Dropdown, Accordion, Tooltip. Uncontrolled-режим: начальное состояние                                                                                                                            |
| `selected`      | `boolean` | `false`      | ListItem, Tab, Chip, SelectOption                                                                                                                                                                                |
| `indeterminate` | `boolean` | `false`      | Checkbox, TreeItem                                                                                                                                                                                               |
| `interactive`   | `boolean` | `true`       | Card, ListItem, Box                                                                                                                                                                                              |
| `draggable`     | `boolean` | `false`      | ListItem, Card, Box, Chip                                                                                                                                                                                        |
| `closable`      | `boolean` | `false`      | Modal, Alert, Toast, Tag, Chip                                                                                                                                                                                   |


> `open` **/** `defaultOpen`**:** пара для controlled / uncontrolled паттерна. При наличии `open` компонент переходит в controlled-режим и требует `onClose` / `onOpen` для обновления состояния.

---



## Слоты содержимого


| Свойство | Тип                       | По умолчанию | Область применения                                                                                                                             |
| -------- | ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `start`  | `ReactNode | ReactNode[]` | —            | Button, Input, Select, Chip. Принимает имя иконки из пакета `icons` (string) или кастомный `<Icon>`-компонент когда нужной иконки нет в списке |
| `end`    | `ReactNode | ReactNode[]` | —            | Button, Input, Select, Chip. Аналогично `iconBefore`                                                                                           |
|          |                           |              |                                                                                                                                                |
|          |                           |              |                                                                                                                                                |
|          |                           |              |                                                                                                                                                |
|          |                           |              |                                                                                                                                                |
| `more`   | `ReactNode`               | —            | Button, Menu, Dropdown                                                                                                                         |


> **Правило слотов:**

---



## Колбэки событий


| Свойство    | Тип                              | По умолчанию | Область применения                                                                                                        |
| ----------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `onClick`   | `(event: MouseEvent) => void`    | —            | Button, Badge, Tag, Chip, Link, MenuItem, ListItem, Card, Modal, Toast, Alert                                             |
| `onChange`  | `(event: ChangeEvent) => void`   | —            | Input, Select, Textarea, Checkbox, Radio                                                                                  |
| `onOpen`    | `() => void`                     | —            | Modal, Popover, Dropdown, Accordion, Tooltip. Вызывается при открытии; необходим в controlled-режиме                      |
| `onClose`   | `() => void`                     | —            | Modal, Popover, Dropdown, Accordion, Tooltip, Toast, Alert. Вызывается при закрытии; необходим для возврата фокуса (a11y) |
| `onKeyDown` | `(event: KeyboardEvent) => void` | —            | Button, Input, ListItem, MenuItem. Клавиатурные события: Enter, Space, Escape, стрелки                                    |
| `onKeyUp`   | `(event: KeyboardEvent) => void` | —            | Button, Input, ListItem, MenuItem                                                                                         |


> `onClose` **обязателен** для всех компонентов с фокус-ловушкой (Modal, Popover, Dropdown) — без него невозможно реализовать корректный возврат фокуса на триггер согласно a11y-правилам (раздел 5).

---



## Позиционирование и ориентация


| Свойство      | Тип                                                                                                                                                                                       | По умолчанию      | Область применения                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| `orientation` | `'horizontal' | 'vertical'`                                                                                                                                                               | `'horizontal'` (`Stack`: `'vertical'`) | ButtonGroup, Menu, Tabs, Divider, Stack, Flex |
| `placement`   | `'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'left-top' | 'left-center' | 'left-bottom' | 'right-top' | 'right-center' | 'right-bottom'` | `'bottom-center'` | Tooltip, Popover, Dropdown, Toast             |


---



## Валидация и статусы


| Свойство            | Тип                                                    | По умолчанию | Область применения                           |
| ------------------- | ------------------------------------------------------ | ------------ | -------------------------------------------- |
| `validationStatus`  | `'default' | 'success' | 'error' | 'warning' | 'info'` | `'default'`  | Input, Select, Textarea, Checkbox, Radio     |
| `validationMessage` | `string`                                               | —            | Input, Select, Textarea, Checkbox, Radio     |
| `status`            | `'info' | 'success' | 'warning' | 'error'`             | `'info'`     | Toast, Alert, InlineNotification, AlertModal |


> **Важно:** проп `error` удалён и не используется. Вместо него — `validationStatus="error"` + `validationMessage`.

---



## Данные полей формы


| Свойство                 | Тип                          | По умолчанию | Область применения                       |
| ------------------------ | ---------------------------- | ------------ | ---------------------------------------- |
| `name`                   | `string`                     | —            | Input, Select, Textarea, Checkbox, Radio |
| `value` / `defaultValue` | `string | string[] | number` | —            | Input, Select, Textarea, Checkbox, Radio |


---



## Отступы


| Свойство        | Тип                                                                                                              | По умолчанию | Область применения                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `paddings`      | `boolean`                                                                                                        | `false`      | Stack, Flex, Grid, Box, Container, Card, Alert, Modal, Popover, Toast |
| `paddingTop`    | `boolean`                                                                                                        | `false`      | Stack, Flex, Grid, Box, Container, Card, Alert, Modal, Popover, Toast |
| `paddingRight`  | `boolean`                                                                                                        | `false`      | Stack, Flex, Grid, Box, Container, Card, Alert, Modal, Popover, Toast |
| `paddingBottom` | `boolean`                                                                                                        | `false`      | Stack, Flex, Grid, Box, Container, Card, Alert, Modal, Popover, Toast |
| `paddingLeft`   | `boolean`                                                                                                        | `false`      | Stack, Flex, Grid, Box, Container, Card, Alert, Modal, Popover, Toast |
| `paddingSize`   | `'none' | '2extraSmall' | 'extraSmall' | 'small' | 'condensed' | 'default' | 'relaxed' | 'large' | 'extraLarge'` | `'default'`  | Stack, Flex, Grid, Box, Container, Card, Alert, Modal, Popover, Toast |


---



## Зазоры и адаптивность


| Свойство     | Тип                                                                              | По умолчанию | Область применения                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gap`        | `SemanticGapAll (Grid, Stack); исторические GapAll (прочие планируемые layout)` | — (`Stack`: `'related'`) | Stack, Flex, Grid                                                                                                                                                     |
| `rowGap`     | `SemanticGapAll (Grid); исторический GapCondensedAll (прочие)`                                  | —            | Flex, Grid                                                                                                                                                     |
| `columnGap`  | `SemanticGapAll (Grid); исторический GapCondensedAll (прочие)`                                  | —            | Flex, Grid                                                                                                                                                     |
| `wrap`       | `boolean`                                                                        | `false`      | ButtonGroup, Stack, Flex, Tag (список). Разрешает перенос дочерних элементов на новую строку (`flex-wrap: wrap`). Критично для ButtonGroup с 5+ кнопками на мобильных |
| `breakpoint` | `'xs' | 'sm' | 'md' | 'lg' | 'xl'`                                               | —            | Stack, Flex, Grid, Box, Container                                                                                                                                     |


> `gap` **/** `rowGap` **/** `columnGap`**:** принимают только именованные значения, маппирующиеся на семантические токены (`--gap-*`). Произвольные строки (`string`) исключены — хардкод px-значений нарушает архитектуру токенов.


## ActionButton — согласованный макет 37351:135404

Первый реализуемый компонент после пересмотра каталога. Локальная ось
`ActionButtonAppearance = "default" | "inverted"` описывает контраст на
поверхности и является исключением из семантического `AppearanceAll`.
`variant` сужается до `filled | ghost`, `size` — до `small | base | large`.
Содержимое: `text: ReactNode`, `start: ReactNode`. Состояния hover, active и
focus задаются браузером, disabled — нативным атрибутом. Публичного state нет.
Иконочная кнопка без text требует aria-label или aria-labelledby.

## Divider — согласованный макет 1091:87129

Локальная ось `DividerAppearance`: `main | secondary | inverted | onLightStatic`.
Orientation сужается из OrientationAll: horizontal | vertical. По умолчанию
secondary/horizontal. Толщина задаётся общим семантическим border-width-thin.
Длина — от контейнера или style; отдельные width/fullWidth/decorative пропсы
не вводятся. Декоративное использование — через aria-hidden.

## Tooltip — согласованный макет 1063:4773

placement использует все 12 PlacementAll, суженные через Extract. Figma top,
bottom, left, right нормализуются в *-center; bottomLeft/rightTop и остальные
camelCase — в bottom-left/right-top. По умолчанию top-center. Текст — ReactNode,
children — один фокусируемый ReactElement с DOM-ref. Видимость: open/defaultOpen,
onOpen/onClose. В публичном API нет state и отдельного декоративного варианта.
Корневой forwardRef указывает на всплывающую поверхность; children сохраняет ref.


## Link — согласованный макет 33385:116965

children: ReactNode; start/end: ReactNode без содержимого по умолчанию.
_start/_end — только Figma. size: base | large через Extract<SizeAll>;
base 14/20, large 16/24, SVG в слотах 16/20 соответственно.
Нативные anchor props и ref; asChild требует один элемент с передачей props/ref
в anchor. disabled удаляет href, блокирует активацию, tabIndex=-1.
Состояния visited/hover/active/focus задаёт браузер; state/visited не в API.
Согласованные дополнительные свойства: underline none | hover | always (локальный
тип LinkUnderline), truncate boolean, asChild boolean. appearance/variant/as нет.
tooltipText включает готовый Tooltip; tooltipPlacement — все 12 положений,
по умолчанию top-center. children и start/end не должны содержать вложенных
интерактивных элементов; иконочная ссылка требует доступного имени.


## Label — согласованный макет 35062:156048

children: ReactNode — основная подпись; end: ReactNode — отдельный соседний слот.
text/appearance/color/_end и сгенерированные переключатели не входят в API.
Единый цвет fg-tertiary, disabled переопределяет подпись и звёздочку через fg-disabled.
required показывает декоративную звёздочку fg-critical-loud-enabled. required и
 disabled также задаются на поле; Label не управляет состоянием связанного DOM.
По аннотации Figma disabled+required используется только для checkbox/radio.
Нативный label/htmlFor, forwardRef<HTMLLabelElement>, HTML-атрибуты относятся к label;
end располагается вне него, чтобы интерактивная подсказка не активировала поле.
Согласованные улучшения: перенос длинной подписи, RTL, прозрачный end вместо
непривязанного bg-white; слот минимум20×20 и gap4 через существующие токены.
Отдельные dark-значения Figma не предоставлены; используется тема core.


### Badge — реализованный API

text: ReactNode (default "1"), count?:number с приоритетом над text;0 сохраняется,
больше99 →99+, отрицательные значения →0, дробные округляются вниз, NaN/Infinity
не отображаются. Единственный размер без публичного size; variant отсутствует.
Корень span, native HTML-атрибуты и ref<HTMLSpanElement>. Никакого автоматического
role=status/aria-live/tabIndex. Neutral bg-greyTransparent-calm-enabled;
danger fg-mainOnDark. Контраст отложен до изменения палитры по решению пользователя.

## Chip — согласованный макет 45700:262558

children: ReactNode (метка; пропа text нет). start: ReactNode. count?: number —
через Badge neutral, нормализация как у Badge; Figma-boolean count не в API.
size: base | large через Extract<SizeAll>; default base. disabled, selected
(визуал bg-grey-calm-active; aria-pressed если selected или есть onClick).
closable default false; close — ActionButton + XIcon; closeLabel?: string;
onClose только сигналит, chip не размонтируется. appearance/variant в v1 нет.
Корень span + forwardRef; при onClick — внутренняя нативная button с aria-pressed,
Enter/Space. Кнопка удаления — её сосед, не потомок. tabIndex и доступное имя
интерактивного Chip относятся к основной кнопке. Без onClick selected только data-selected. Focus ring на pill через
:focus-within. Disabled приглушает Badge (--fg-disabled).


## Alert — согласованный макет 94791:274233

status: Extract<StatusAll, info | success | warning | error>, default info.
children/end: ReactNode. closable=false по явному решению пользователя;
closeLabel="Закрыть уведомление", onClose только запрашивает удаление у владельца.
Divider только при непустом end и closable. HTML-атрибуты/ref относятся к div.
Нет appearance/variant/size/titleSize и авто role=alert; role=status/alert передаёт
приложение по срочности динамического объявления. Таймер/Escape не добавляются.
Фоны/fg/br статусов имеют light/dark пары; оригинальные SVG используются как маски,
цвет берётся из fg-токенов. Link/Divider/ActionButton — готовые проектные компоненты.

## HelpMessage — согласовано 2026-10-15

Figma `38476:139818`: `validationStatus` — Extract из ValidationStatusAll:
default | error | warning | success, default=default. `children?: ReactNode`;
нативные атрибуты div и ref<HTMLDivElement>. Длинный текст переносится,
неразрывные фрагменты не расширяют контейнер. Нет текста-заглушки, фиксированной
ширины, padding, рамки или автоматического role/live-region. Пустые scalar children
не рендерятся, 0 сохраняется. Связь id/aria-describedby и aria-invalid задаёт
владелец поля. Используются fg-tertiary и fg-critical/warning/success-loud-enabled
с существующими dark-парами; палитра не изменяется.

## TextField / ControlFrame / Field — согласовано 2026-10-15

TextField Figma 39947:148276: validationStatus default|error|success (default
 default), clearable=true, clearLabel, onClear, start/end ReactNode, label,
description, validationMessage; нативные input props/ref. Нет публичного state,
placeholder boolean или _-переключателей. Success с пустым значением разрешён.
Высота32 включая внутренний штрих1, строка20, padding-sm6/padding-l12, sm6;
focus blue200 шириной2, success сохраняет свою рамку при фокусе.
ControlFrame — общая оболочка; Field — Label/HelpMessage и ID-связи.
Controlled/uncontrolled, reset формы, IME, RTL и нативная клавиатура сохраняются.
Очистка уведомляет onChange/onClear и фокусирует input, скрыта при disabled/readOnly.
Валидацией и моментом объявления управляет приложение. Без дополнительных size,
variant или warning/info для TextField, которых нет в макете.

## Spinner — согласовано 2026-10-16

Figma 35811:140698: size extraSmall8|small16|base24|large48|extraLarge96,
default extraLarge. medium переименован в base. description?:ReactNode заменяет
дизайнерский boolean и текстовый payload; нет заглушки в API. variant="default"|"inverted" (default="default")
переключает bg-grey-loud-enabled→bg-grey-calm-enabled и fg-tertiary→fg-inverted;
значения автоматически определяются темой без ручной коррекции dark.
Boolean inverted удалён; используется variant из суженного VariantAll.
Нативный span/ref, доступное имя, decorative=false; role=status для standalone,
aria-hidden для декоративного режима. aria-busy на области задаёт владелец.
Согласованы общие indicator-size-* (8/16/24/48/96), motion-duration-continuous1s
и motion-easing-linear. Вращается только дуга; reduced motion останавливает её.

## Indicator — 2026-10-16

appearance primary|neutral|info|rose|critical|warning|success, default primary.
Пользователь явно заменил danger на critical для Indicator. AppearanceAll
расширен critical; существующие компоненты сохраняют собственные Extract-типы.
Figma lead нормализован в primary. Warning использует bg-warning-loud-enabled
по указанию пользователя; повторная сверка Figma подтвердила
bg/warning/loud/enabled=#F7C105, расхождение закрыто.
Круг8 (indicator-size-extraSmall), border=true: внешний штрих2
(border-width-medium), layout8, визуальный размер12. Радиусfull.
Нативный span/ref, label или aria-label/labelledby; без имени декоративный.
Без автоматических live-region/фокуса, публичного size, счётчика или анимации.

## Checkbox — 2026-10-16

Figma 37611:135822: checked/defaultChecked, indeterminate (правильное написание),
validationStatus default|error (default default), readOnly/disabled/required,
label/description/validationMessage ReactNode, native input props/ref/onChange.
Визуальный state и boolean text/description из дизайна не экспортируются.
Label fg-tertiary и HelpMessage из проекта, focus blue200. CheckboxCheckIcon и
CheckboxMinusIcon — оригинальные Mark-пути из Figma в icons/currentColor.
14px и первый отступ3px временно разрешены пользователем как помеченный хардкод.
Нативная активация очищает mixed, DOM indeterminate не меняет checked/value формы.
ReadOnly блокирует активацию, но сохраняет фокус/отправку; disabled нативный.

## Button — 2026-10-16

Figma36803:133405 после синхронизации: appearance primary|accent|secondary|
tertiary|danger, default primary. dangerOutlined удалён пользователем, оставшийся
danger — filled; новой оси variant нет. Tertiary добавлен в AppearanceAll, другие
компоненты не расширяются автоматически. size small|base|large|extraLarge,
default base; heights24/32/40/48, minwidth64/80, padding8/12/16/16,
radius4/6/6/6, icons16/20/20/24. children/start/end ReactNode, native button props/ref,
fullWidth, loading=false, disabled=false, type=button. Boolean _-слоты локальны.
Loading сохраняет размеры/имя/фокус, aria-busy/aria-disabled, блокирует повторную
активацию. Настоящий disabled нативный. Проектный декоративный Spinner16.

## Popover — 2026-10-16

Figma36797:138428: placement — 12 PlacementAll с нормализацией camelCase;
default bottom-center. trigger:один ReactElement с DOM-ref, children:ReactNode
или render({close}). open/defaultOpen=false + onOpen/onClose. Non-modal dialog,
initialFocus, Escape/outside dismissal, возврат фокуса, nested FloatingTree,
flip/shift/size/arrow/autoUpdate. Ref/атрибуты панели; обработчики/ref триггера
сохраняются, preventDefault отменяет внутреннюю активацию.
Padding-xl16, sm6, shadow-overlay совпадают с Figma light/overlay. Числовые размеры
240–560, maxheight320, minheight56, arrow22×8/SVG22×9, inset12 согласованы
пользователем. На тесном viewport minwidth/minheight уступают доступной области.

## Dropdown / DropdownList / DropdownItem — согласовано 2026-10-17

Figma page53702:197338, List37733:141087, Item37479:139042. Dropdown: trigger
ReactElement с DOM props/ref, items readonly DropdownEntry[] с рекурсивным items
без фиксированной глубины. activation click|contextMenu (click), placement
bottom-left, open/defaultOpen=false/onOpenChange/onOpen/onClose, dir inherited.
Panel native attrs/ref. onSelect(id,event) и entry.onSelect(event): preventDefault
отменяет закрытие; checkbox остаётся открыт, radio/action закрывает дерево.
Entry text/description/start/end/children ReactNode; textValue для поиска по
сложному text; disabled/selected/multipleChoice=false, selectionMode checkbox|radio.
Item type text|headline|divider|loading|withChildren default text. _-флаги и :state
из Figma не экспортируются. Structural rows не menuitem и не фокусируются.
DropdownList и DropdownItem — пользовательские визуальные элементы макета;
технические дерево/portal/позиционирование только внутри Dropdown.
Core shadow-overlay сохранён по явному решению пользователя. Остаточные старые
цвета/description в Figma нормализованы к Core без изменения палитры. Нет
публичных технических компонентов. Сложные интерактивные формы — Popover, не menu.

## Select (согласовано)

- `options: readonly SelectOption[]`: unique nonempty `value: string`, `label: string`, `disabled?`, `description?: ReactNode`, `start?: ReactNode`.
- `value/defaultValue`, `onValueChange(value)`, `open/defaultOpen`, `onOpenChange(open)`; empty string clears selection.
- `withSearch`, `clearable=true`, `clearLabel`, `onClear`, `disabled`, `readOnly`, `required`, `loading`, `loadingText`, `emptyContent`.
- `placeholder: string`, `start/label/description/validationMessage: ReactNode`, `validationStatus: default | error | success`.
- Native attributes/ref target the button or search input; `name/form/autoComplete` integrate the native form control. `className/style` target the field wrapper.
- Figma `_start` is design-only; `:state` and placeholder visibility are not public props. Transparent disabled/readonly borders; Core popup shadow retained.

## Tag — согласование цветовой оси и неинтерактивных состояний

AppearanceAll расширен значениями grey, red, orange, yellow, violet, teal, green, azure, blue. Tag использует Extract<AppearanceAll, "neutral" | "grey" | "red" | "orange" | "yellow" | "violet" | "rose" | "teal" | "green" | "azure" | "blue">. Это цветовые варианты; не заменять их автоматически семантическими ролями. Другие компоненты сохраняют свои узкие типы и не получают новые значения автоматически.

Tag: size base/small, variant filled/outlined. Disabled и readOnly имеют единый нейтральный вид для всех appearance/variant; в Figma только neutral filled показан для экономии. Disabled: bg-disabled/fg-disabled; readOnly: bg-disabled/fg-tertiary. В обоих случаях действия и удаление заблокированы. Контраст палитры дорабатывается отдельно. Сам компонент остаётся в предварительной сборке до явного разрешения переноса.

Tag перенесён: children/start ReactNode, size base|small, variant filled|outlined,
appearance — согласованный цветовой Extract. disabled/readOnly boolean;
href/target/rel для ссылки, onClick для действия, closable/closeLabel/onClose
для удаления. State и _start не публичные. Native attrs/ref на корневом span.
Gapclosest подтверждён в актуальной spacing-коллекции.

### Toast — согласован и перенесён

Figma 41264:176484. status: Extract<StatusAll, info | success | warning | error>,
default info; children/end: ReactNode. _end — только дизайн. Close всегда виден,
closeLabel/onClose, open/defaultOpen/onOpenChange, native attrs/ref.
ToastProvider: children, placement (шесть top/bottom × left/center/right), limit=3,
paused=false, label. useToast: add/update/dismiss/clear/promise; ToastOptions:
children/status/end/duration/urgent/announcement/closeLabel. Очередь FIFO,
таймеры info/success5000ms, warning/error0; ожидание не расходует таймер.
Внутренний TimedToast и контекст не экспортируются. Размер Toast520×44 на одну
строку, close16×16, иконка14, согласованный числовой padding1. Общая тень
shadow-overlay-notifications; контраст палитры отложен по согласованию.

### TopNavigation — согласован и перенесён

Figma150290:247854. start/center/end?:ReactNode; native header attrs/ref,
children исключён. _start/_center/_end только Figma. Без size/variant/appearance.
Сетка из трёх равных областей, независимое переполнение, центр относительно
панели, логическое выравнивание RTL. start: vertical/gap-dependent; center/end:
gap-related. Числовые min-height56 и нижняя insetграница1 согласованы пользователем.
Padding-l/xl12/16, bg-neutral-section-calm, br-grey-calm-enabled. Увеличение
высоты по контенту допускается; автоматический mobilecollapse не добавлен.

### SideMenu — согласован и перенесён

Figma 128306:193697 / Item 128306:193453 / Heading 172695:33070 / Divider 128306:193687.
SideMenu: view="inline"|"floating" (default inline), header/footer/children: ReactNode,
native nav attrs/ref. Header/footer фиксированы, body прокручивается. Ширина образца
280px, высота от приложения; radius-ml, shadow-overlay-modal, bg-neutral-section-calm,
inline border br-accent-calm-enabled. Технические List/Depth/focus helpers не экспортируются.

SideMenuItem: label/description/start/end/notification: ReactNode; href создаёт anchor,
без href — button. Native attrs/ref основного действия; className/style строки.
selected/disabled=false, expanded/defaultExpanded=false/onExpandedChange;
children определяют collapsible, глубину и отступ. Число уровней не ограничено двумя.
Нет публичных _start/_end/_notification, state, level, nested, collapsible.
selected использует bg-grey-calm-enabled и fg-main; hover/active перекрывают фон,
disabled использует bg-neutral-section-calm и fg-disabled.

Collapsible=true: enabled/disabled показывают start; hover/active заменяют start
стрелкой в той же ячейке и показывают end. Collapsible=false: start всегда виден,
collapse не рендерится, end показывается в hover/active. Focus основного действия
сохраняет enabled. Tab непосредственно к отдельному действию делает это действие
видимым; открытый popup удерживает trigger через actionsVisible. Disabled-слоты inert.
Notification не скрывается. Label ellipsis, description переносится. Нативные
ссылки сохраняют href/target/rel и Ctrl/Cmd+click; disabled удаляет href/Tab.

SideMenuGroup: text (как Figma), end, children, expanded/defaultExpanded/onExpandedChange,
actionsVisible; native button attrs/ref, className/style строки Heading. H2 содержит
кнопку раскрытия, end в hover; при активации основного Heading скрывается, как в Figma.
SideMenuDivider: готовый horizontal Divider с padding-sm/m и native separator attrs/ref.
↑/↓/Home/End — видимые primary items; логические ←/→ — раскрытие/родитель с RTL.
Скрытые children сохраняют состояние; при внешнем закрытии фокус возвращается на primary.

### Accordion — согласован и перенесён

Figma47099:316312. title/start/end/actions/childrenReactNode; titleSize
Extract<TitleSizeAll,h4|h5|h6>, default h6; headingLevel2…6 default3 независимо
от размера. bordertrue, disabledfalse, open/defaultOpenfalse/onOpenChange,
onOpen/onClose; keepMountedtrue, regionfalse, native divattrs/ref.
Expanded и :state не дублируют публичныйAPI; _start/_end/_actions только дизайн.
Actions — соседний контроль, владелец отвечает за его disabled.
AccordionGroup multiplefalse, value/defaultValue readonlystring[], onValueChange,
disabled; item value — уникальный стабильныйID. Group управляет open своихitems.
Внутреннийконтекст не экспортируется. NativeEnter/Space/Tab без обязательного
rovingfocus. Анимация/hiddenUntilFound не вводились. Title переносится, ширина
адаптивна; 88pxbody — только размер макетного placeholder. Disabled не закрывает
уже раскрытый контент. Контрастпалитры отложен по согласованию.

### IconButton — согласован и перенесён

Figma172639:22556,120вариантов. iconReactNode required; aria-label или aria-labelledby
required. appearance/size переиспользуют сужения Button(primary/accent/secondary/
tertiary/danger; small/base/large/extraLarge). Defaults primary/base/loadingfalse.
Loading/disabled,nativebuttonattrs/ref; безchildren/start/end/fullWidth.
_iconдизайн-only, :stateCSS. Square24/32/40/48,icon16/20/20/24,padding4/6/10/12,
radius4/6/6/6,spinner16центр. СемантическиетокеныCore;неткомпонентныхтокенов.
ОсноваButton,Spinnerунаследован; loadingсохраняетфокус/имя,блокируетповторныйsubmit.
aria-pressed доступен нативно, без встроенногоtoggle. ActionButton не заменяется.

### Drawer — согласован и перенесён

Figma172599:23446. Композиция Drawer.Header/Title/Description/Body/Footer/Close.
SizeAll расширен flex; DrawerSize Extract<SizeAll,small|base|flex>, default small.
Small480/base640 ограничены calc(100vw - padding-xl16), flex всегда viewport−16.
view inline|floating (default inline), floating radius ml12, высота всех100dvh.
Header padding2xl24, body/footer paddingxl16; header/footer flex-none,
body flex1 min-height0 с внутренней прокруткой. Shadow overlay-drawer.
open/defaultOpenfalse/onOpenChange/onOpen/onClose, modaltrue; optional trigger
как интерактивный ReactElement с ref. Native div attrs/ref; Title/Description
автоматически связываются с dialog; без Title нужен aria-label/aria-labelledby.
Close нативная кнопка, closeLabel, preventDefault и disabled уважаются.
Все _ только Figma, header/footer управляются наличием композиционных частей.
Technical context/scroll/layer не экспортируются. Theme tokens сохраняются в portal.
Escape/outside dismiss закрывают верхний слой, focus trap/returnFocus, lockScroll
для modal. Physical right соответствует согласованному отступу слева16.
Числовые widths480/640 и close16/glyph14/padding1 соответствуют макету.

Drawer.Header start/endReactNode, Drawer.Title trailingReactNode; раскладка
внутри компонента. Drawer.Footer start/endReactNode, children по умолчанию
образуют start-группу. Обе группы flex-wrap с gap-related8; end прижат вправо.
Технические обёртки/inline layout для базовой композиции не требуются.

### Panel / PanelGroup — согласованы и перенесены

Figma Panel140826:287426, PanelGroup170081:204917, PanelHeader140826:287405.
Композиция Panel.Header/Title/Close/Body/Footer, start/end root, Header end,
Footer start/endReactNode. TitleSize Extract<h4|h5|h6>, headingLevel2…6.
Panel positionleft|right|bottom не определяет ось Group. Group orientation
Extract<OrientationAll,horizontal|vertical>; default horizontal. Процентные
layout/defaultLayout,onLayoutChange/onResizeStart/onResizeEnd, minSize10/maxSize100,
resizabletrue/disabledfalse,collapsiblefalse (0 collapsed), storageKey opt-in.
Escape rollback, keyboard1%/Shift10%,Home/End,doubleclickreset,Entercollapse/restore,
RTL,uniqueid,dynamicnormalization. onClose уведомляет, продукт владеет удалением.
Нативныеattrs/ref, aria-controls/value/min/max/orientation уseparator.
Старыеcomponentcolors не переносить. ОбщиеCorepaddingxl16,gaprelated8,H4/H5/H6,
Close16/glyph14/padding1 по согласованному макету. Grip40×3 удалён пользователем:
никакого видимого маркера, только интерактивная граница сfocus/hover.
Тень только у внешней родительскойPanelGroup; дочерниеPanel и вложенныеGroup
безelevation. ОтдельныйPanel сохраняетoverlaydrawer. Technicalhelpers неexport.


### Modal

- `size`: `Extract<SizeAll, "base" | "large">`; `status`: сужение `StatusAll`
  до `info | warning | error | success`. Info не показывает статусную иконку.
- `open/defaultOpen/onOpenChange`, lifecycle `onOpen/onClose`;
  `closeOnEscape/closeOnOutsidePress`, `initialFocusRef/finalFocusRef`, `trigger`.
- Композиция: Header, Title, Description, Body, Footer, Close. Footer `start/end`
  принимают ReactNode; children используется вместо отсутствующего start.
- Header Figma отображается через Title children. Наличие Close определяет
  closable; локальные _-переключатели и технические Portal/Backdrop не экспортируются.
- Нативные dialog attrs/ref, ARIA-связи Title/Description и внутренний контейнер
  порталов для вложенных плавающих компонентов. Все части поддерживают attrs/ref.


### TextArea

- `validationStatus`: `Extract<ValidationStatusAll, "default" | "error" | "success">`.
- `resize`: локальный union `vertical | none`; `autoResize`, `minRows/maxRows`;
  нативный `rows` задаёт начальную высоту. База 96 px сохраняется при валидации.
- `label/description/validationMessage`: ReactNode. `counter`: ReactNode или функция
  `{ length, maxLength }`; undefined включает вычисление при maxLength, null скрывает.
- Нативные textarea attrs/ref и controlled/uncontrolled. `_`-флаги, scrollbar boolean,
  placeholder boolean и :state из Figma не экспортируются. Технические Field/ControlFrame
  остаются внутри DS. Width принадлежит доступной области, сообщения растут снаружи поля.

### SectionMessage

- status: error | warning | success | info (StatusAll), default error.
- title/children/actions: ReactNode; _title/_actions остаются локальными Figma.
- closable=false, onClose, closeLabel; удаление контролирует владелец.
- expandable=false, expanded/defaultExpanded=true/onExpandedChange.
- collapsedText: string, default «Раскройте чтобы узнать больше», только без title в свёрнутом состоянии.
- expandLabel/collapseLabel; нативные атрибуты и ref div.
- body/actions скрываются вместе; title остаётся. Actions wrap с gap/related.
- Нет дополнительных appearance/size/disabled/readonly.

### Radio / RadioGroup

- Radio validationStatus: Extract<ValidationStatusAll, default|error>.
- RadioGroup orientation: OrientationAll (vertical по умолчанию).
- Radio label/description: ReactNode; checked/defaultChecked/onChange только вне группы.
- RadioGroup children — композиция Radio; name/value/defaultValue/onValueChange, disabled/readOnly/required.
- RadioGroup label/description/validationMessage: ReactNode; нативные fieldset-атрибуты/ref.
- Radio ref/className/style — input; без label требуется aria-label/aria-labelledby.
- _label/_description — только дизайн. :state не публичный prop.
- Disabled/readOnly выше error по визуальному приоритету. ReadOnly участвует в форме, disabled нет.
- Геометрия 14/8 px, смещение 3 px и padding 18 px согласованы, круглая точка full.

### Tabs / TabItem / TabMoreItem

- Tabs contentGap: SemanticGapAll, default grouped (16px), без padding внутри Panel.
- Tabs activationMode automatic|manual; value/defaultValue/onValueChange — string.
- Tabs.List: композиция прямых TabItem/Fragments, start/end, padding, onAdd, addLabel, moreText/moreLabel.
- TabItem: text ReactNode, textValue, start/infoIcon (неинтерактивные), counter с 0/99+, indicator, disabled, closable/onClose/closeLabel.
- selected вычисляется группой; standalone selected только для отдельного дизайн-примера.
- TabMoreItem — button меню, не role=tab. Add и Close — отдельные button.
- Tabs.Panel: value, keepMounted=true; нативные div атрибуты/ref.
- Gap6 в TabItem согласован как числовой, высота32=24+6+2.


### MultiSelect

value/defaultValue: readonly string[]; onValueChange(values: string[]).
options: readonly MultiSelectOption[] ({value, label, disabled?, description?}).
validationStatus через Extract<ValidationStatusAll, "default" | "error" | "success">.
withSearch=false, clearable=true, disabled/readOnly/required=false.
placeholder — строка, пустота определяется массивом; публичного state и
boolean placeholder/description нет. Слоты Tag вычисляются из options/value.
Field, ControlFrame и portal helpers — технические, не добавлять в публичные exports.


### Общая политика disabled

У всех disabled-элементов ДС cursor: not-allowed, включая вложенные визуальные
части. Hover/active не изменяют их цвет, фон, границу или состояние.
readOnly — отдельное состояние, правило not-allowed на него не распространяется.
В disabled-строке Table все ячейки, включая drag handle и Checkbox, используют
неактивный фон и блокируют выбор/перестановку/редактирование.

### Table

Composition: Table.Head/Body/Row + TableCell/Header/Editable/EditableText/CheckCell/FilterButton. Controlled widths, selection and order; first/last freeze; resizing enabled by default. Disabled rows are inert, share disabled backgrounds in every cell and cannot be dragged or crossed. Generic editors use actual Select/MultiSelect, not local replicas. Row drag is disabled while external sorting/filtering is active. Internal contexts are not public exports.

## InputNumber — 2026-10-24

Figma39947:148539. value/defaultValue number|null; onValueChange(number|null), onChange native; min/max, numeric step=1; disabled/readOnly/required, validationStatus default|error|success; label/description/validationMessage ReactNode. Native attrs/ref. incrementLabel/decrementLabel. No state, placeholder boolean, appearance/size/variant.32px including inset border; text padding-sm6, horizontal padding-l12, independent steppers16x32. Focus preserves status; hover uses shared semantic state.

## InputPassword — согласовано 2026-10-25

Figma39947:148357. value/defaultValue:string, native onChange/ref; showPassword/defaultShowPassword/onShowPasswordChange with default false. label/description/validationMessage ReactNode; default|error|success. disabled/readOnly/required and native form attrs. showPasswordLabel/hidePasswordLabel localize actions. autoComplete current-password by default, new-password supported. No public state/body/start/end or boolean description/placeholder. Uses TextField+ActionButton, sm6, height32 including inset stroke; focus preserves status. Readonly may toggle visibility, disabled hides toggle. Fragment Mono from common semantic family; font loading remains app-owned.


### InputPassword — визуальная сверка 2026-11-01

API сохранён. Внутренний переключатель16×16: ActionButton base с padding-xs/2; readOnly использует fg-tertiary в покое, hover/active/focus сохраняются. Никаких дополнительных служебных пропсов, классов или обёрток у потребителя.

## Card — согласовано 07.11.2026

Figma 103640:454028. `variant=outlined|filled` (default outlined),
`paddingSize=small|default|large` → 8/16/24 px (default large).
`selected` — controlled visual state, independent of variant; when explicitly supplied
on an interactive card, the main button receives aria-pressed. No public state prop.
`interactive=false` by default (Card-specific override of the generic table).
When interactive=true, `actionProps` is required: native button attributes, handlers,
ref and a required aria-label or aria-labelledby. Button defaults to type=button.
`draggable=false` by default; true requires `dragHandleProps` with a required accessible
name and native button attributes/handlers/ref. Card does not set HTML draggable on
its container or implement sorting. The consumer supplies pointer/keyboard movement,
alternative actions, cancel/commit behavior and announcements.

Root/native attributes and forwarded ref target the div. Main action, content and
handle are independent siblings; native controls inside children remain independent.
Static cards add no focus stop or role. Primary action is a button; navigation remains
an explicit Link in children. Internal content wrapper is not public.

Existing semantic tokens only: padding-m/xl/2xl, gap-grouped, radius m, neutral/grey/lead
surface and border tokens. Inset stroke preserves 64/48/32 heights for a 16px slot.
Example width432 is not imposed on the component. Original SVG14 is local; visual
handle16 remains at x=-16/y6, while approved hit target24 extends to x=-20/y2.
No invented Header/Footer, loading/skeleton or custom disabled API; native disabled
is available on individual action/handle props. Theme follows existing Core tokens;
dark Figma mode was not returned and is not claimed as verified parity.


## Grid / Grid.Item / Container — согласовано 08.11.2026

Пользователь утвердил API, пороги и новые семантические токены после исследования четырёх продуктов и изолированного прототипа. Для этих компонентов контракт ниже приоритетнее общих исторических строк padding/breakpoint. Общие boolean padding/paddings и breakpoint в них не вводятся.

- Responsive<T>: T либо {base:T,xs?:T,sm?:T,md?:T,lg?:T,xl?:T}; пороги 480/640/768/1024/1280 px, mobile-first. Источник чисел — packages/core/src/breakpoints.json; CSS генерируется из него.
- Container: maxWidth адаптивный CSS max-width (число px), default none; gutter адаптивный PaddingSizeAll, default default16; align=start/center/end, default center; query=false. Только логические боковые отступы, border-box ширина. Gutters 0/2/4/8/12/16/24/32/48. Без навязанных vertical padding, flex или clipping.
- Grid: columns адаптивный positive integer, default1; либо templateColumns адаптивный CSS template; либо minItemWidth + autoRepeat=auto-fit/auto-fill, default auto-fit. Режимы взаимоисключающие. Автоматический минимум ограничивается шириной родителя.
- gap/rowGap/columnGap: Responsive<SemanticGapAll>; none/closest/dependent/related/compact/grouped/subSection/section/separated. gap default grouped, остальные наследуют gap. Семантические алиасы compact12/padding3xl32/padding4xl48 добавлены в Core; compact12 сохраняется и в relaxed density, padding в ней не меняется. Старые типы GapAll/GapCondensedAll не переименованы ради совместимости.
- responsiveTo=viewport/container, default viewport; templateRows/autoRows адаптивные CSS templates. alignItems=start/center/end/stretch/baseline; justifyItems=start/center/end/stretch, default stretch.
- Grid.Item: адаптивные columnSpan=positive integer/full, rowSpan=positive integer, default1; columnStart/rowStart=positive integer/auto. full=1/-1, явный columnStart переопределяет начало. Режим адаптивности берётся у непосредственного Grid.
- as/ref/native attributes для всех трёх сущностей; порядок чтения DOM, без role=grid, order/dense, измерений JS, сортировки или календарной логики.

Продуктовые значения 64/80 px и нестандартные пороги сохраняются в CSS приложения. Новый макет Figma не предоставлялся; основание реализации — утверждённый API и продуктовые сценарии, визуальный паритет с Figma не заявляется.


## Stack — согласовано 08.11.2026

Технический layout-примитив без макета Figma. Контракт ниже приоритетнее общих исторических строк padding/breakpoint для Stack. Общие boolean padding/paddings и breakpoint не вводятся. Divider/separator не входят в v1.

- Responsive<T> как у Grid/Container; пороги 480/640/768/1024/1280 px, mobile-first.
- orientation: Responsive<horizontal|vertical>, default vertical → flex-direction row/column.
- gap: Responsive<SemanticGapAll>, default related. Произвольные px запрещены.
- alignItems: Responsive<start|center|end|stretch|baseline>, default stretch.
- justifyContent: Responsive<start|center|end|space-between|space-around|space-evenly>, default start.
- wrap/fullWidth/inline: boolean, default false. wrap→flex-wrap, fullWidth→width 100%, inline→inline-flex.
- as/ref/native attributes; порядок чтения DOM; без ARIA-ролей и измерений JS.
- Экспорт: root `@tripleform/react` и subpath `@tripleform/react/layout`.


## Switch — согласованный контракт 09.11.2026

Figma45041:259268. input type=checkbox role=switch, forwardRef<HTMLInputElement>.
checked/defaultChecked/onChange — нативные; по умолчанию выключен. Нет onCheckedChange,
indeterminate, state, size, variant, appearance или служебных Figma `_`-props.
label/description/validationMessage: ReactNode. labelPosition: start|end, default end.
validationStatus: Extract<ValidationStatusAll, default|error>, default default.
loading=false, loadingText="Сохранение настройки". readOnly/disabled/required и native attrs.
ref/className/style/aria/data относятся input. label и сообщения размещаются в текстовой колонке с любой стороны.
loading блокирует изменение, сохраняет Tab/фокус/значение формы; disabled исключает их;
readOnly сохраняет фокус/форму без изменений. Приоритет disabled → loading → readOnly.
Enter/Space переключают, Enter не отправляет форму; пользовательский preventDefault учитывается.
32×20 track,16 knob,inset2; hit32×24. Новые общие semantic aliases:
control-track-width-base32/control-track-height-base20. Spinner использует mask исходного16px glyph
и fg-main в обеих темах (исправлено также в шести loading-вариантах Figma).

## Heading и typography config

Heading: as=h1…h6(default h2); titleSize=Responsive<TitleSizeAll>(default h3);
color=ColorAll(default primary); align=start/center/end(default start);
truncate=false; children обязательный ReactNode; ref HTMLHeadingElement.
Нет asChild/appearance/variant/size/автовычисления уровня. Native ARIA/data/style/id
доступны. TitleSize сохраняет словарь h1…h6; responsive объект требует base.

Provider typography=TypographyConfig: локальные fontFamily(heading/text/component/mono),
headings(h1…h6),text(xsmall/small/medium/large), responsive с уникальными minWidth.
Поля ролей fontSize,lineHeight,fontWeight,letterSpacing,fontStyle. Генератор Core
общий для SSR Provider и CSS export; старый tokens сохраняет legacy global semantics.
Числовая primitive-шкала rem доступна конфигурации как spacers; компоненты читают
семантические токены. Typography config не создаёт компонентный уровень токенов.

## Text

as=span/p/div(default span); size=Responsive<Extract<SizeAll,extraSmall|small|base|large>>
(default base); color=ColorAll(default primary); weight=TextWeightAll(regular/medium/semibold),
default не задан: наследуется роль typography config, базово400. align=start/center/end
(default start); truncate=false либо maxLines=положительное целое число. Два режима
обрезки взаимоисключающие. children обязательный ReactNode с phrasing content.
Ref и native props определяются as; className/style/ARIA/data/id/lang/dir передаются корню.
Нет asChild/appearance/variant/href/произвольного size. Новая семантика weight не меняет
strong/em; глобальный словарь TextWeightAll объявлен в types/text-weight.ts.

## SegmentedControl — согласовано 12.11.2026

- options: readonly SegmentedControlOption[] (value, label, start, end, disabled, aria-label).
- size: Extract<SizeAll, "base" | "small">; base32/small24 через control-height-*.
- value/defaultValue/onValueChange: string; одиночный выбор без toggle-off.
- fullWidth, disabled, readOnly, name, form, required; нативные атрибуты fieldset.
- ref: HTMLFieldSetElement. Именованная radiogroup, нативные radio; Tab/Space,
  стрелки с loop и RTL, Home/End. reset поддержан, readOnly остаётся в FormData.
- Декоративные slots без вложенных действий; icon-only требует имени опции.
- Новых токенов/значений глобальных типов нет. Последний divider и границы рядом
  с selected скрыты, чтобы не выступать за скругления (согласованный preview).
