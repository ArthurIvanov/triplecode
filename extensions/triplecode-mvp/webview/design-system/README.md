# Компоненты дизайн-системы TripleCode

Здесь живут общие React-компоненты Webview. Базовый пример — [ActionButton](components/action-button/). Его контракт и связь с Figma описаны в [правилах дизайн-системы](../../../../design%20system%20rules/README.md).

```text
webview/
├── design-system.tsx                   # приложение галереи в IDE
├── component-catalog.ts                # каталог поверхностей и ссылки на Figma
└── design-system/
    ├── design-system-components.css   # вход CSS-сборки для галереи
    └── components/
        └── action-button/
            ├── index.ts                 # точка импорта компонента и публичных типов
            ├── action-button.tsx        # React-компонент и его типы
            ├── action-button.css        # стили компонента
            ├── action-button.preview.tsx # общий пример для галереи и Storybook
            ├── action-button.preview.css
            └── action-button.stories.tsx
```

## Как добавлять компонент

1. Создай папку `components/<имя-в-kebab-case>/`. Экспортируй компонент и тип его пропсов из `index.ts`. Храни небольшие типы рядом с реализацией.
2. Положи CSS компонента рядом с TSX. Общие токены Webview определены в [media/tokens.css](../../media/tokens.css). Стили отдельных экранов и привязки команд остаются у потребителей. Для нативных поверхностей используй механизмы Code OSS и [правила Workbench](../../../../design%20system%20rules/README.md#проектные-источники).
3. Для примера в IDE добавь импорт в [галерею](../design-system.tsx) и подключи CSS через [точку входа стилей](design-system-components.css). В Webview, который использует компонент вне галереи, подключи его стили через точку входа этой поверхности. Сборка esbuild помещает CSS галереи в `media/design-system/design-system-components.css`.
4. Если пример нужен в Storybook, добавь `<имя>.stories.tsx` в ту же папку и импортируй нужные стили. Storybook обнаруживает истории из `components/` автоматически. Для сложной матрицы переиспользуй `*.preview.tsx` между галереей и Storybook. SVG из Figma, загружаемые по URI, храни в `media/figma-assets/<имя>/`, откуда их читают обе среды.
5. Привяжи узел Figma в каталоге или предпросмотре. Проверь сборку и открой пример в потребляющей поверхности.

Из корня репозитория:

```sh
npm --prefix extensions/triplecode-mvp run build:webview
npm --prefix extensions/triplecode-mvp run storybook
```

## Что взяли из других систем

- **Atlassian** показывает API, примеры использования и рекомендации на странице компонента. В TripleCode эту роль выполняют секция галереи, Storybook и ссылка на Figma. [Atlassian Button](https://atlassian.design/server/components/buttons/)
- **Chakra UI** описывает размеры, варианты и значения по умолчанию отдельно от разметки в recipes. В TripleCode варианты читаются по типам пропсов и соседнему CSS. [Chakra Recipes](https://chakra-ui.com/docs/theming/recipes)
- **Ant Design** хранит реализацию, стили, примеры и тесты рядом в каталоге компонента. Для TripleCode используем тот же принцип совместного размещения, добавляя файлы по мере необходимости. [Ant Design Button](https://github.com/ant-design/ant-design/tree/master/components/button)
