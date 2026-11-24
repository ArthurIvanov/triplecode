export const reactSupport = {
  react: { label: 'React', detail: 'Already rendered by React' },
  webview: { label: 'React-ready', detail: 'Can move to React in the existing webview' },
  hybrid: { label: 'React + host', detail: 'React can render the UI; keep the host commands or theme service' },
  workbench: { label: 'Workbench', detail: 'Keep the native component for full IDE behavior; React can render a preview' },
  system: { label: 'System + host', detail: 'The platform owns native window controls or dialogs; React can render a preview' }
} as const;

export type ComponentPreview = {
  kind: 'window' | 'toolbar' | 'pill' | 'tree' | 'panel' | 'split' | 'tabs' | 'status'
    | 'file' | 'code' | 'diff' | 'field' | 'logo' | 'link' | 'card' | 'menu' | 'primary';
  content: string;
  react: keyof typeof reactSupport;
};

type Component = readonly [name: string, usage: string, entryPoint: string, preview: ComponentPreview, figmaNode?: string];

export type ComponentGroup = {
  title: string;
  implementation: string;
  components: readonly Component[];
};

export const componentCatalog: readonly ComponentGroup[] = [
  {
    title: 'Workbench chrome',
    implementation: 'scripts/desktop/workbench.css · apply-workbench-layout.py',
    components: [
      ['Window title bar', 'Window title and native macOS controls', '.part.titlebar', { kind: 'window', content: '● ● ●|‹ ›|relay-api', react: 'system' }],
      ['Navigation buttons', 'Back and Forward in the title bar', 'TitleBar menu', { kind: 'toolbar', content: '‹|›', react: 'hybrid' }],
      ['Layout toggle buttons', 'Primary Side Bar, Terminal and Secondary Side Bar', '.titlebar-right', { kind: 'toolbar', content: '◧|▤|◨', react: 'hybrid' }],
      ['Agents button', 'Shows or hides the Agent panel', 'triplecode.focusAgent', { kind: 'pill', content: '☷ Agents', react: 'hybrid' }],
      ['Settings button', 'Opens Workbench Settings', 'workbench.action.openSettings', { kind: 'toolbar', content: '⚙', react: 'hybrid' }],
      ['Activity Bar', 'Explorer, Search, Source Control and Extensions', '.part.activitybar', { kind: 'toolbar', content: '▤|⌕|⑂|◇', react: 'workbench' }, '183:6531'],
      ['Primary Side Bar', 'Dockable container for workspace views', '.part.sidebar', { kind: 'tree', content: 'EXPLORER|⌄ src|　TS route.ts', react: 'workbench' }],
      ['Secondary Side Bar', 'Dockable container for Agent and other views', '.part.auxiliarybar', { kind: 'panel', content: 'Chat 1　＋|Ask anything…', react: 'workbench' }],
      ['Panel splitter and frame', 'Resizing and framing the Workbench parts', '.monaco-sash · .triplecode-gutter', { kind: 'split', content: 'Explorer|Editor', react: 'workbench' }],
      ['Panel tabs and toolbar', 'Terminal, Problems, Output and Debug Console', '.part.panel > .title', { kind: 'tabs', content: 'Terminal|Problems|Output', react: 'workbench' }],
      ['Status bar', 'Workspace, branch, diagnostics and IDE status', '.part.statusbar', { kind: 'status', content: '⑂ main|⊗ 0　⚠ 0', react: 'workbench' }]
    ]
  },
  {
    title: 'Editor and workspace views',
    implementation: 'Code OSS Workbench · extensions/triplecode-mvp/media/tab-surface.css',
    components: [
      ['Editor tab strip', 'File and tool tabs in the main editor', '.tabs-container', { kind: 'tabs', content: 'route.ts|server.ts|⋯', react: 'workbench' }, '116:2759'],
      ['Editor tab', 'Selection, close, unsaved marker and pin', '.triplecode-editor-tab', { kind: 'tabs', content: 'route.ts　×', react: 'workbench' }, '165:7241'],
      ['File icon', 'Theme-supplied glyph before a file name in tabs and Explorer', '.monaco-icon-label', { kind: 'file', content: 'TS|route.ts', react: 'hybrid' }],
      ['Editor toolbar', 'Split editor and editor actions menu', '.editor-actions', { kind: 'toolbar', content: '◫|⋯', react: 'hybrid' }],
      ['Editor group', 'Editor groups and empty editor area', '.editor-group-container', { kind: 'split', content: 'route.ts|Open File', react: 'workbench' }],
      ['Code editor', 'Source text, gutter, diagnostics, suggest widget and inline completion', '.monaco-editor', { kind: 'code', content: '1  const id = request.id;|2  return id;', react: 'workbench' }],
      ['Diff editor', 'Opens a proposed change for review', 'vscode.diff', { kind: 'diff', content: '− return data;|+ return { data };', react: 'workbench' }],
      ['Breadcrumbs', 'File and symbol path when enabled', '.breadcrumbs-control', { kind: 'status', content: 'src › route.ts › handler', react: 'workbench' }],
      ['Explorer tree', 'Workspace folders, files and nested rows', '.explorer-folders-view', { kind: 'tree', content: '⌄ src|　TS route.ts|　TS server.ts', react: 'workbench' }],
      ['Outline tree', 'Symbols in the active file', 'outline', { kind: 'tree', content: '⌄ route.ts|　ƒ handleRequest', react: 'workbench' }],
      ['Timeline list', 'File history', 'timeline', { kind: 'tree', content: 'TIMELINE|◷ File Saved|⑂ Initial commit', react: 'workbench' }],
      ['Search view', 'Search and replace inputs, filters and result tree', 'workbench.view.search', { kind: 'field', content: 'Search|Replace|⌄ route.ts', react: 'workbench' }],
      ['Source Control view', 'Repository changes, staging and commit controls', 'workbench.view.scm', { kind: 'tree', content: 'CHANGES|M　route.ts|+　Stage change', react: 'workbench' }],
      ['Extensions view', 'Extension search, list and details', 'workbench.view.extensions', { kind: 'tree', content: 'Search Extensions|▣ TypeScript|　Install', react: 'workbench' }],
      ['Integrated terminal', 'Terminal viewport and session controls', '.terminal-wrapper', { kind: 'code', content: 'TERMINAL|relay-api %', react: 'workbench' }],
      ['Problems view', 'Workspace diagnostics list and filters', 'workbench.panel.markers', { kind: 'tree', content: 'PROBLEMS|⚠ route.ts (1)', react: 'workbench' }],
      ['Settings editor', 'Settings search, categories and preference controls', 'workbench.action.openSettings', { kind: 'field', content: 'Search settings|☑ Editor: Minimap', react: 'workbench' }]
    ]
  },
  {
    title: 'Welcome',
    implementation: 'extensions/triplecode-mvp/extension.js · media/workbench.js · media/workbench.css',
    components: [
      ['Welcome logo', 'Product mark on the start screen', '.welcome .logo', { kind: 'logo', content: '', react: 'webview' }],
      ['Plan tag', 'Free badge', '.welcome .tag', { kind: 'pill', content: 'Free', react: 'webview' }],
      ['Text action', 'Settings and Import from VS Code', '.welcome .link', { kind: 'link', content: 'Import from VS Code', react: 'webview' }],
      ['Project action card', 'Open project, Clone repo and disabled SSH action', '.card-grid .card', { kind: 'card', content: 'Open project', react: 'webview' }],
      ['Recent projects list', 'Previously opened projects and the empty state', '#recent', { kind: 'tree', content: 'RECENT PROJECTS|relay-api|workspace/relay-api', react: 'webview' }]
    ]
  },
  {
    title: 'Agent and review',
    implementation: 'extensions/triplecode-mvp/webview/agent.tsx · media/workbench.css',
    components: [
      ['Chat header', 'Chat strip, New chat and Agent actions', '.chat-header', { kind: 'tabs', content: 'Chat 1|＋|⋯', react: 'react' }],
      ['Chat tab', 'Select or close a chat', '.chat-tab', { kind: 'tabs', content: 'Chat 1　×', react: 'react' }],
      ['Icon button', 'New chat, Agent actions and context controls', 'ActionButton · icon slot', { kind: 'toolbar', content: '＋|⋯', react: 'react' }],
      ['Conversation', 'Agent replies and user request', '.conversation · .agent-message', { kind: 'panel', content: 'Explain this file|It handles requests.', react: 'react' }],
      ['Status message', 'Submission progress, errors and results', '#status', { kind: 'status', content: 'Preparing changes…', react: 'react' }],
      ['Composer', 'Prompt field and send action', '.composer · #prompt · .send', { kind: 'field', content: 'Press / for skills, @ for context|Agent　Model　▷', react: 'react' }],
      ['Mode picker', 'Agent, Ask and Plan', '.mode-picker · .mode-menu', { kind: 'menu', content: '✓ Agent|　Ask|　Plan', react: 'react' }],
      ['Dropdown', 'Contextual action menu with arbitrary trigger', 'design-system/components/dropdown', { kind: 'menu', content: 'Dropdown button　⌄|✓ Item', react: 'react' }, '221:6886'],
      ['Model picker', 'Selected model and model selection entry', '.model-pill', { kind: 'pill', content: 'Model　⌄', react: 'react' }],
      ['Target label', 'Active file or empty context hint', '#target', { kind: 'status', content: 'src/route.ts', react: 'react' }],
      ['Attachment chip', 'Attached files and selections with remove action', '.attachment-chip', { kind: 'pill', content: 'route.ts　×', react: 'react' }],
      ['Review toolbar', 'File count, Run checks, Undo all, Keep all and Review', '#review .review-row', { kind: 'toolbar', content: '1 file|Undo all|Review', react: 'react' }],
      ['Patch card', 'File path, change counters and line preview', '.patch-file · .patch-lines', { kind: 'diff', content: 'route.ts　+1|+ return result;', react: 'react' }],
      ['Check result row', 'Command outcome in review', '.check-row', { kind: 'status', content: '✓ npm test — exit 0', react: 'react' }],
      ['Plan summary', 'Task summary, Discard and Execute plan', '.plan-bar', { kind: 'panel', content: 'Update request route|Discard　Execute plan', react: 'react' }],
      ['Pill action', 'Review and plan actions', 'ActionButton · full / filled', { kind: 'pill', content: 'Run checks', react: 'react' }]
    ]
  },
  {
    title: 'Profile import',
    implementation: 'extensions/triplecode-mvp/webview/import-preview.tsx · media/import-preview.css',
    components: [
      ['Source summary', 'Selected profile source', 'ImportPreview', { kind: 'status', content: 'Source: VS Code', react: 'react' }],
      ['Import category', 'Settings, keybindings, snippets and extensions with counts', '.section · .count', { kind: 'tree', content: 'Keyboard Shortcuts|8 items', react: 'react' }],
      ['Checkbox', 'Select import categories', '.checkbox input', { kind: 'status', content: '☑ Import settings', react: 'react' }],
      ['Marketplace note', 'Availability of extensions in Open VSX', '.marketplace-note', { kind: 'status', content: 'Some extensions may require manual installation.', react: 'react' }],
      ['Primary button', 'Confirms import', '#import', { kind: 'primary', content: 'Import', react: 'react' }],
      ['Secondary button', 'Import from file, rollback and cancel', '.actions .secondary', { kind: 'pill', content: 'Import from File…', react: 'react' }]
    ]
  },
  {
    title: 'Design System',
    implementation: 'extensions/triplecode-mvp/webview/design-system.tsx · media/design-system.css',
    components: [
      ['Gallery navigation', 'Switches between the catalog and component previews', '.nav', { kind: 'toolbar', content: 'Catalog|Buttons|Tabs', react: 'react' }],
      ['Component search', 'Filters the component catalog', '.catalog-toolbar', { kind: 'field', content: 'Search components', react: 'react' }],
      ['Component inventory table', 'Component name, usage, source and Figma node', '.catalog-table', { kind: 'tree', content: 'COMPONENT　 CODE|Editor tab　 .tab', react: 'react' }]
    ]
  },
  {
    title: 'Shared Workbench controls',
    implementation: 'VS Code Extension API · extensions/triplecode-mvp/extension.js',
    components: [
      ['Command palette', 'Find and execute Workbench and TripleCode commands', 'workbench.action.showCommands', { kind: 'field', content: '> Type a command|› TripleCode: Design System', react: 'workbench' }],
      ['Quick Pick', 'Models, context attachments, check history and Agent actions', 'vscode.window.showQuickPick', { kind: 'menu', content: 'Choose a model|✓ Current model', react: 'workbench' }],
      ['Input box', 'Custom model and API key entry', 'vscode.window.showInputBox', { kind: 'field', content: 'Enter API key|••••••••', react: 'workbench' }],
      ['File and folder dialog', 'Open project and import from file', 'vscode.window.showOpenDialog', { kind: 'panel', content: 'Open project|Cancel　Open', react: 'system' }],
      ['Notification', 'Import result, rollback and agent feedback', 'vscode.window.showInformationMessage', { kind: 'panel', content: 'Import completed|Restart　Rollback', react: 'workbench' }],
      ['Context menu', 'Actions for editor tabs, views and files', 'Code OSS Workbench', { kind: 'menu', content: 'Close Editor|Pin Editor', react: 'workbench' }],
      ['Tooltip and keybinding hint', 'Action labels, file paths and shortcuts', 'Code OSS Workbench', { kind: 'pill', content: 'Close Editor　⌘W', react: 'hybrid' }]
    ]
  }
];
