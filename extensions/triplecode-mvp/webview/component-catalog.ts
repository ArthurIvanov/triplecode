type Component = readonly [name: string, usage: string, entryPoint: string, figmaNode?: string];

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
      ['Window title bar', 'Window title and native macOS controls', '.part.titlebar'],
      ['Navigation buttons', 'Back and Forward in the title bar', 'TitleBar menu'],
      ['Layout toggle buttons', 'Primary Side Bar, Terminal and Secondary Side Bar', '.titlebar-right'],
      ['Agents button', 'Shows or hides the Agent panel', 'triplecode.focusAgent'],
      ['Settings button', 'Opens Workbench Settings', 'workbench.action.openSettings'],
      ['Activity Bar', 'Explorer, Search, Source Control and Extensions', '.part.activitybar'],
      ['Primary Side Bar', 'Dockable container for workspace views', '.part.sidebar'],
      ['Secondary Side Bar', 'Dockable container for Agent and other views', '.part.auxiliarybar'],
      ['Panel splitter and frame', 'Resizing and framing the Workbench parts', '.monaco-sash · .triplecode-gutter'],
      ['Panel tabs and toolbar', 'Terminal, Problems, Output and Debug Console', '.part.panel > .title'],
      ['Status bar', 'Workspace, branch, diagnostics and IDE status', '.part.statusbar']
    ]
  },
  {
    title: 'Editor and workspace views',
    implementation: 'Code OSS Workbench · extensions/triplecode-mvp/media/tab-surface.css',
    components: [
      ['Editor tab strip', 'File and tool tabs in the main editor', '.tabs-container', '116:2759'],
      ['Editor tab', 'Selection, close, unsaved marker and pin', '.triplecode-editor-tab', '165:7241'],
      ['File icon', 'Theme-supplied glyph before a file name in tabs and Explorer', '.monaco-icon-label'],
      ['Editor toolbar', 'Split editor and editor actions menu', '.editor-actions'],
      ['Editor group', 'Editor groups and empty editor area', '.editor-group-container'],
      ['Code editor', 'Source text, gutter, diagnostics, suggest widget and inline completion', '.monaco-editor'],
      ['Diff editor', 'Opens a proposed change for review', 'vscode.diff'],
      ['Breadcrumbs', 'File and symbol path when enabled', '.breadcrumbs-control'],
      ['Explorer tree', 'Workspace folders, files and nested rows', '.explorer-folders-view'],
      ['Outline tree', 'Symbols in the active file', 'outline'],
      ['Timeline list', 'File history', 'timeline'],
      ['Search view', 'Search and replace inputs, filters and result tree', 'workbench.view.search'],
      ['Source Control view', 'Repository changes, staging and commit controls', 'workbench.view.scm'],
      ['Extensions view', 'Extension search, list and details', 'workbench.view.extensions'],
      ['Integrated terminal', 'Terminal viewport and session controls', '.terminal-wrapper'],
      ['Problems view', 'Workspace diagnostics list and filters', 'workbench.panel.markers'],
      ['Settings editor', 'Settings search, categories and preference controls', 'workbench.action.openSettings']
    ]
  },
  {
    title: 'Welcome',
    implementation: 'extensions/triplecode-mvp/extension.js · media/workbench.js · media/workbench.css',
    components: [
      ['Welcome logo', 'Product mark on the start screen', '.welcome .logo'],
      ['Plan tag', 'Free badge', '.welcome .tag'],
      ['Text action', 'Settings and Import from VS Code', '.welcome .link'],
      ['Project action card', 'Open project, Clone repo and disabled SSH action', '.card-grid .card'],
      ['Recent projects list', 'Previously opened projects and the empty state', '#recent']
    ]
  },
  {
    title: 'Agent and review',
    implementation: 'extensions/triplecode-mvp/webview/agent.tsx · media/workbench.css',
    components: [
      ['Chat header', 'Chat strip, New chat and Agent actions', '.chat-header'],
      ['Chat tab', 'Select or close a chat', '.chat-tab'],
      ['Icon button', 'New chat, Agent actions and context controls', '.icon-button'],
      ['Conversation', 'Agent replies and user request', '.conversation · .agent-message'],
      ['Status message', 'Submission progress, errors and results', '#status'],
      ['Composer', 'Prompt field and send action', '.composer · #prompt · .send'],
      ['Mode picker', 'Agent, Ask and Plan', '.mode-picker · .mode-menu'],
      ['Model picker', 'Selected model and model selection entry', '.model-pill'],
      ['Target label', 'Active file or empty context hint', '#target'],
      ['Attachment chip', 'Attached files and selections with remove action', '.attachment-chip'],
      ['Review toolbar', 'File count, Run checks, Undo all, Keep all and Review', '#review .review-row'],
      ['Patch card', 'File path, change counters and line preview', '.patch-file · .patch-lines'],
      ['Check result row', 'Command outcome in review', '.check-row'],
      ['Plan summary', 'Task summary, Discard and Execute plan', '.plan-bar'],
      ['Pill action', 'Review and plan actions', '.pill-action · .review-btn']
    ]
  },
  {
    title: 'Profile import',
    implementation: 'extensions/triplecode-mvp/webview/import-preview.tsx · media/import-preview.css',
    components: [
      ['Source summary', 'Selected profile source', 'ImportPreview'],
      ['Import category', 'Settings, keybindings, snippets and extensions with counts', '.section · .count'],
      ['Checkbox', 'Select import categories', '.checkbox input'],
      ['Marketplace note', 'Availability of extensions in Open VSX', '.marketplace-note'],
      ['Primary button', 'Confirms import', '#import'],
      ['Secondary button', 'Import from file, rollback and cancel', '.actions .secondary']
    ]
  },
  {
    title: 'Design System',
    implementation: 'extensions/triplecode-mvp/webview/design-system.tsx · media/design-system.css',
    components: [
      ['Gallery navigation', 'Switches between the catalog and component previews', '.nav'],
      ['Component search', 'Filters the component catalog', '.catalog-toolbar'],
      ['Component inventory table', 'Component name, usage, source and Figma node', '.catalog-table']
    ]
  },
  {
    title: 'Shared Workbench controls',
    implementation: 'VS Code Extension API · extensions/triplecode-mvp/extension.js',
    components: [
      ['Command palette', 'Find and execute Workbench and TripleCode commands', 'workbench.action.showCommands'],
      ['Quick Pick', 'Models, context attachments, check history and Agent actions', 'vscode.window.showQuickPick'],
      ['Input box', 'Custom model and API key entry', 'vscode.window.showInputBox'],
      ['File and folder dialog', 'Open project and import from file', 'vscode.window.showOpenDialog'],
      ['Notification', 'Import result, rollback and agent feedback', 'vscode.window.showInformationMessage'],
      ['Context menu', 'Actions for editor tabs, views and files', 'Code OSS Workbench'],
      ['Tooltip and keybinding hint', 'Action labels, file paths and shortcuts', 'Code OSS Workbench']
    ]
  }
];
