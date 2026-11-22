'use strict';

const vscode = require('vscode');
const { randomUUID } = require('node:crypto');
const { readFile, access, readdir } = require('node:fs/promises');
const { join } = require('node:path');
const { homedir } = require('node:os');
const { exec } = require('node:child_process');
const { commentEdit, supportsComments } = require('./patch');

// VS Code paths on macOS
const VS_CODE_PATHS = [
  '/Applications/Visual Studio Code.app',
  join(homedir(), 'Applications/Visual Studio Code.app')
];

const VS_CODE_USER_PATH = join(homedir(), 'Library/Application Support/Code/User');

async function findVSCodeInstallation() {
  for (const path of VS_CODE_PATHS) {
    try {
      await access(path);
      return path;
    } catch {
      continue;
    }
  }
  return null;
}

async function readVSCodeSettings() {
  try {
    const settingsPath = join(VS_CODE_USER_PATH, 'settings.json');
    const content = await readFile(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function readVSCodeKeybindings() {
  try {
    const keybindingsPath = join(VS_CODE_USER_PATH, 'keybindings.json');
    const content = await readFile(keybindingsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function readVSCodeSnippets() {
  try {
    const snippetsPath = join(VS_CODE_USER_PATH, 'snippets');
    const entries = await readdir(snippetsPath, { withFileTypes: true });
    const snippets = {};
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        const content = await readFile(join(snippetsPath, entry.name), 'utf-8');
        snippets[entry.name] = JSON.parse(content);
      }
    }
    return snippets;
  } catch {
    return null;
  }
}

async function readVSCodeExtensions() {
  try {
    const extensionsPath = join(homedir(), '.vscode/extensions');
    const entries = await readdir(extensionsPath, { withFileTypes: true });
    const extensions = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const match = entry.name.match(/^([^.]+)\.([^.]+)-/);
        if (match) {
          extensions.push({
            id: `${match[1]}.${match[2]}`,
            path: entry.name
          });
        }
      }
    }
    return extensions;
  } catch {
    return null;
  }
}

async function showImportPreview() {
  const vsCodePath = await findVSCodeInstallation();
  if (!vsCodePath) {
    const action = await vscode.window.showWarningMessage(
      'Visual Studio Code not found on this machine.',
      'Import from File',
      'Cancel'
    );
    if (action === 'Import from File') {
      await vscode.commands.executeCommand('workbench.action.profiles.import');
    }
    return;
  }

  const [settings, keybindings, snippets, extensions] = await Promise.all([
    readVSCodeSettings(),
    readVSCodeKeybindings(),
    readVSCodeSnippets(),
    readVSCodeExtensions()
  ]);

  const previewPanel = vscode.window.createWebviewPanel(
    'triplecodeImportPreview',
    'Import from VS Code',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  const previewData = {
    vsCodePath,
    settings: settings ? Object.keys(settings).length : 0,
    keybindings: keybindings ? keybindings.length : 0,
    snippets: snippets ? Object.keys(snippets).length : 0,
    extensions: extensions ? extensions.length : 0,
    extensionIds: extensions ? extensions.map(e => e.id) : [],
    hasBackup: context.globalState.get('triplecode.importBackup') !== undefined
  };

  previewPanel.webview.html = getImportPreviewHtml(previewData, previewPanel.webview);

  previewPanel.webview.onDidReceiveMessage(async message => {
    if (message.type === 'import') {
      await performImport(message.selectedCategories, { settings, keybindings, snippets, extensions }, context);
      previewPanel.dispose();
    } else if (message.type === 'rollback') {
      await rollbackImport(context);
      previewPanel.dispose();
    } else if (message.type === 'cancel') {
      previewPanel.dispose();
    }
  });
}

function getImportPreviewHtml(data, webview) {
  const extensionIdsJson = JSON.stringify(data.extensionIds);
  const rollbackButton = data.hasBackup ? '<button class="secondary" id="rollback">Rollback Last Import</button>' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Import from VS Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    h1 { margin-top: 0; }
    .section { margin: 20px 0; padding: 15px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; }
    .section h2 { margin-top: 0; font-size: 16px; }
    .count { font-size: 24px; font-weight: bold; color: var(--vscode-textLink-foreground); }
    .checkbox { margin: 8px 0; }
    .checkbox label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .actions { margin-top: 20px; display: flex; gap: 10px; }
    button { padding: 8px 16px; cursor: pointer; border: none; border-radius: 4px; }
    .primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
    .warning { color: var(--vscode-errorForeground); font-size: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Import from VS Code</h1>
  <p>Found VS Code at: <code>${data.vsCodePath}</code></p>

  <div class="section">
    <h2>Settings</h2>
    <div class="count">${data.settings} items</div>
    <div class="checkbox">
      <label><input type="checkbox" id="settings" checked> Import settings</label>
    </div>
  </div>

  <div class="section">
    <h2>Keyboard Shortcuts</h2>
    <div class="count">${data.keybindings} items</div>
    <div class="checkbox">
      <label><input type="checkbox" id="keybindings" checked> Import keyboard shortcuts</label>
    </div>
  </div>

  <div class="section">
    <h2>User Snippets</h2>
    <div class="count">${data.snippets} files</div>
    <div class="checkbox">
      <label><input type="checkbox" id="snippets" checked> Import snippets</label>
    </div>
  </div>

  <div class="section">
    <h2>Extensions</h2>
    <div class="count">${data.extensions} extensions</div>
    <div class="checkbox">
      <label><input type="checkbox" id="extensions" checked> Import extensions (from Open VSX)</label>
    </div>
    <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">
      Note: Not all extensions may be available in Open VSX. You may need to install some manually.
    </p>
  </div>

  <div class="actions">
    <button class="primary" id="import">Import</button>
    ${rollbackButton}
    <button class="secondary" id="cancel">Cancel</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const extensionIds = ${extensionIdsJson};

    document.getElementById('import').addEventListener('click', () => {
      const selectedCategories = {
        settings: document.getElementById('settings').checked,
        keybindings: document.getElementById('keybindings').checked,
        snippets: document.getElementById('snippets').checked,
        extensions: document.getElementById('extensions').checked
      };
      vscode.postMessage({ type: 'import', selectedCategories });
    });

    document.getElementById('cancel').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    ${data.hasBackup ? `
    document.getElementById('rollback').addEventListener('click', () => {
      vscode.postMessage({ type: 'rollback' });
    });
    ` : ''}
  </script>
</body>
</html>`;
}

async function showDesignSystem(context) {
  const panel = vscode.window.createWebviewPanel(
    'triplecodeDesignSystem',
    'TripleCode Design System',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  panel.webview.html = getDesignSystemHtml(panel.webview, context);
}

function getDesignSystemHtml(webview, context) {
  const uri = name => webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', name));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TripleCode Design System</title>
  <link rel="stylesheet" href="${uri('workbench.css')}">
  <link rel="stylesheet" href="${uri('figma-design.css')}">
  <style>
    body { padding: 40px; max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 30px; }
    .nav { display: flex; gap: 10px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--vscode-panel-border); }
    .nav button { padding: 8px 16px; }
    .nav button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .section { margin-bottom: 60px; }
    .section h2 { margin-bottom: 20px; }
    .component-preview { padding: 20px; border: 1px solid var(--vscode-panel-border); border-radius: 8px; background: var(--vscode-sideBar-background); }
    .component-row { display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; }
    .component-item { min-width: 200px; }
    .component-item h3 { font-size: 12px; margin: 10px 0 5px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>TripleCode Design System</h1>
  
  <nav class="nav">
    <button class="active" data-component="figma-welcome">Figma Welcome</button>
    <button data-component="welcome">Legacy Welcome</button>
    <button data-component="agent">Agent Panel</button>
    <button data-component="buttons">Buttons</button>
    <button data-component="forms">Forms</button>
    <button data-component="tabs">Tabs</button>
  </nav>

  <div id="components">
    <div class="section" data-section="figma-welcome">
      <h2>Figma Welcome Screen (Synced)</h2>
      <div class="component-preview" style="padding: 0; overflow: hidden;">
        <div class="top-bar">
          <div class="top-bar-left">
            <div class="window-buttons">
              <img src="${uri('figma-assets/imgWindowButtons.svg')}" alt="Window controls">
            </div>
            <div style="display: flex; gap: var(--triplecode-gap-dependent); align-items: center;">
              <button class="action-button">
                <img src="${uri('figma-assets/imgChevronLeft.svg')}" alt="Back">
              </button>
              <button class="action-button">
                <img src="${uri('figma-assets/imgChevronRight.svg')}" alt="Forward">
              </button>
            </div>
          </div>
          <div class="top-bar-center">
            <button class="action-button" style="padding: 0 var(--triplecode-padding-s);">
              <span class="action-button-text">TripleCode</span>
            </button>
          </div>
          <div class="top-bar-right">
            <!-- Sidebar icons placeholder -->
          </div>
        </div>
        <div class="welcome-content" style="height: 600px;">
          <div class="welcome-container">
            <img class="welcome-logo" src="${uri('imgLogo1.png')}" alt="TripleCode">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span class="tag"><span class="tag-text">Free</span></span>
              <a href="#" class="link">Settings</a>
            </div>
            <div class="card-grid">
              <button class="card">
                <div class="card-content">
                  <img class="card-icon" src="${uri('figma-assets/imgFolder.svg')}" alt="Folder">
                  <span class="card-text">Open project</span>
                </div>
              </button>
              <button class="card">
                <div class="card-content">
                  <img class="card-icon" src="${uri('figma-assets/imgFolderGit2.svg')}" alt="Folder Git">
                  <span class="card-text">Clone repo</span>
                </div>
              </button>
              <button class="card" style="grid-column: 1 / -1;">
                <div class="card-content">
                  <img class="card-icon" src="${uri('figma-assets/imgSquareTerminal.svg')}" alt="Terminal">
                  <span class="card-text">Connect via SSH</span>
                </div>
              </button>
            </div>
            <div class="stack">
              <div class="stack-center">
                <p>Projects you open will appear here.</p>
              </div>
            </div>
          </div>
        </div>
        <div class="bottom-bar">
          <div class="bottom-bar-left">
            <button class="icon-button">
              <img src="${uri('figma-assets/imgChevronsRightLeftAngle.svg')}" alt="Layout">
            </button>
            <button class="button">
              <img src="${uri('figma-assets/imgGitBranch.svg')}" alt="Git">
              <span class="button-text">Local workspace</span>
            </button>
          </div>
          <div class="bottom-bar-right">
            <span class="status-text">TripleCode IDE</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section" data-section="welcome" style="display: none;">
      <h2>Welcome Screen (Legacy)</h2>
      <div class="component-preview">
        <main class="welcome" style="width: 362px; margin: 0;">
          <img class="logo" src="${uri('imgLogo1.png')}" alt="TripleCode">
          <div class="welcome-meta"><span>Free</span><button class="link">Settings</button></div>
          <div class="project-actions">
            <button><img src="${uri('imgFolder.svg')}" alt="">Open project</button>
            <button><img src="${uri('imgFolderGit2.svg')}" alt="">Clone repo</button>
            <button><img src="${uri('imgFolderGit2.svg')}" alt="">Import from VS Code</button>
            <button disabled><img src="${uri('imgSquareTerminal.svg')}" alt="">Connect via SSH</button>
          </div>
        </main>
      </div>
    </div>

    <div class="section" data-section="agent" style="display: none;">
      <h2>Agent Panel</h2>
      <div class="component-preview" style="height: 400px;">
        <main class="agent">
          <header class="chat-header">
            <div id="chats" style="display: flex; gap: 4px;">
              <div class="chat-tab" style="border-color: var(--vscode-editorGroup-border); background: var(--vscode-sideBar-background); color: var(--vscode-foreground);">
                <button style="padding: 0 2px; border: 0; background: transparent; color: inherit;">Chat 1</button>
                <button style="padding: 0 2px; border: 0; background: transparent; color: inherit;">×</button>
              </div>
            </div>
            <button class="icon-button"><img src="${uri('imgPlus1.svg')}" style="width: 16px; height: 16px;" alt=""></button>
            <button class="icon-button"><img src="${uri('imgEllipsis.svg')}" style="width: 16px; height: 16px;" alt=""></button>
          </header>
          <section class="conversation" style="flex: 1; overflow: auto;">
            <p class="agent-message">Add a comment: MVP preview</p>
          </section>
          <form class="composer">
            <div class="composer-header">
              <div class="review-row">
                <button type="button" class="files-toggle" aria-expanded="true">
                  <img src="${uri('figma-assets/imgChevronRight.svg')}" alt="">
                  <span>1 file</span>
                </button>
                <div class="review-actions">
                  <button type="button" class="pill-action">Run checks</button>
                  <button type="button" class="pill-action">Undo all</button>
                  <button type="button" class="pill-action">Keep all</button>
                  <button type="button" class="review-btn">Review</button>
                </div>
              </div>
            </div>
            <textarea placeholder="Press / for skills, @ for context" disabled style="min-height: 30px;"></textarea>
            <footer class="chat-actions">
              <button type="button" class="pill mode" aria-pressed="false">Ask</button>
              <button type="button" class="pill mode" aria-pressed="false">Plan</button>
              <button type="button" class="pill mode" aria-pressed="true">Agent</button>
              <span class="pill">Model</span>
              <span id="target" class="muted">src/index.ts</span>
              <span class="context-icon"><img src="${uri('figma-assets/imgShape.svg')}" alt=""></span>
              <button type="button" class="icon-button attachment" disabled><img src="${uri('imgPaperclip.svg')}" alt=""></button>
              <button type="button" class="send" disabled><img src="${uri('imgPlay.svg')}" alt=""></button>
            </footer>
          </form>
        </main>
      </div>
    </div>

    <div class="section" data-section="buttons" style="display: none;">
      <h2>Buttons</h2>
      <div class="component-preview">
        <div class="component-row">
          <div class="component-item">
            <button>Default</button>
            <h3>Default</h3>
          </div>
          <div class="component-item">
            <button class="primary">Primary</button>
            <h3>Primary</h3>
          </div>
          <div class="component-item">
            <button class="secondary">Secondary</button>
            <h3>Secondary</h3>
          </div>
          <div class="component-item">
            <button disabled>Disabled</button>
            <h3>Disabled</h3>
          </div>
        </div>
        <div class="component-row" style="margin-top: 20px;">
          <div class="component-item">
            <button class="link">Link button</button>
            <h3>Link</h3>
          </div>
          <div class="component-item">
            <button class="icon-button"><img src="${uri('imgCog.svg')}" style="width: 16px; height: 16px;" alt=""></button>
            <h3>Icon button</h3>
          </div>
        </div>
      </div>
    </div>

    <div class="section" data-section="forms" style="display: none;">
      <h2>Forms</h2>
      <div class="component-preview">
        <div class="component-row">
          <div class="component-item" style="width: 100%;">
            <label style="display: block; margin-bottom: 8px;">Text input</label>
            <input type="text" style="width: 100%; padding: 8px; border: 1px solid var(--vscode-input-border); border-radius: 4px; background: var(--vscode-input-background); color: var(--vscode-input-foreground);" placeholder="Enter text...">
          </div>
        </div>
        <div class="component-row" style="margin-top: 20px;">
          <div class="component-item">
            <label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" checked>
              <span>Checkbox option</span>
            </label>
          </div>
        </div>
        <div class="component-row" style="margin-top: 20px;">
          <div class="component-item">
            <textarea style="width: 300px; min-height: 80px; padding: 8px; border: 1px solid var(--vscode-input-border); border-radius: 4px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); resize: vertical;" placeholder="Textarea..."></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="section" data-section="tabs" style="display: none;">
      <h2>Tabs</h2>
      <div class="component-preview">
        <div class="component-row">
          <div class="component-item" style="width: 100%;">
            <h3>Default Tabs</h3>
            <div class="tabs-container">
              <button class="tab active">
                <span>index.ts</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
              <button class="tab">
                <span>app.tsx</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
              <button class="tab">
                <span>styles.css</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
            </div>
          </div>
        </div>
        <div class="component-row" style="margin-top: 30px;">
          <div class="component-item" style="width: 100%;">
            <h3>Tabs with Icons</h3>
            <div class="tabs-container">
              <button class="tab active">
                <img src="${uri('imgFiles.svg')}" style="width: 14px; height: 14px;" alt="">
                <span>Explorer</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
              <button class="tab">
                <img src="${uri('imgSearch.svg')}" style="width: 14px; height: 14px;" alt="">
                <span>Search</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
              <button class="tab">
                <img src="${uri('imgGitBranch.svg')}" style="width: 14px; height: 14px;" alt="">
                <span>Git</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
            </div>
          </div>
        </div>
        <div class="component-row" style="margin-top: 30px;">
          <div class="component-item" style="width: 100%;">
            <h3>Single Tab</h3>
            <div class="tabs-container">
              <button class="tab active">
                <span>README.md</span>
                <button class="tab-close" onclick="event.stopPropagation()">×</button>
              </button>
            </div>
          </div>
        </div>
        <div class="component-row" style="margin-top: 30px;">
          <div class="component-item" style="width: 100%;">
            <h3>Many Tabs (scrollable)</h3>
            <div class="tabs-container" style="overflow-x: auto;">
              <button class="tab active"><span>index.ts</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>app.tsx</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>styles.css</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>utils.ts</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>config.json</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>package.json</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>README.md</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
              <button class="tab"><span>CHANGELOG.md</span><button class="tab-close" onclick="event.stopPropagation()">×</button></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const navButtons = document.querySelectorAll('.nav button');
    const sections = document.querySelectorAll('.section');

    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        const component = button.dataset.component;
        sections.forEach(section => {
          section.style.display = section.dataset.section === component ? 'block' : 'none';
        });
      });
    });
  </script>
</body>
</html>`;
}

async function performImport(selectedCategories, data, context) {
  const { settings, keybindings, snippets, extensions } = data;

  // Save current settings for rollback
  const previousSettings = {};
  if (selectedCategories.settings && settings) {
    const config = vscode.workspace.getConfiguration();
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('workbench.') || key.startsWith('editor.')) {
        previousSettings[key] = config.get(key);
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
    }
    await context.globalState.update('triplecode.importBackup', previousSettings);
    await context.globalState.update('triplecode.importTimestamp', Date.now());
  }

  // Track installed extensions for rollback
  const installedExtensions = [];
  if (selectedCategories.extensions && extensions) {
    for (const ext of extensions) {
      try {
        await vscode.commands.executeCommand('workbench.extensions.install', ext.id);
        installedExtensions.push(ext.id);
      } catch (error) {
        console.error(`Failed to install extension ${ext.id}:`, error);
      }
    }
    await context.globalState.update('triplecode.importedExtensions', installedExtensions);
  }

  vscode.window.showInformationMessage(
    'Import completed. Restart to apply all changes.',
    'Restart',
    'Rollback'
  ).then(selection => {
    if (selection === 'Restart') {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    } else if (selection === 'Rollback') {
      vscode.commands.executeCommand('triplecode.rollbackImport');
    }
  });
}

async function rollbackImport(context) {
  const previousSettings = context.globalState.get('triplecode.importBackup');
  const importedExtensions = context.globalState.get('triplecode.importedExtensions', []);

  if (!previousSettings && importedExtensions.length === 0) {
    vscode.window.showInformationMessage('No import to rollback.');
    return;
  }

  // Rollback settings
  if (previousSettings) {
    const config = vscode.workspace.getConfiguration();
    for (const [key, value] of Object.entries(previousSettings)) {
      if (value === undefined) {
        await config.update(key, undefined, vscode.ConfigurationTarget.Global);
      } else {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
    }
  }

  // Uninstall imported extensions
  for (const extId of importedExtensions) {
    try {
      await vscode.commands.executeCommand('workbench.extensions.uninstall', extId);
    } catch (error) {
      console.error(`Failed to uninstall extension ${extId}:`, error);
    }
  }

  // Clear backup
  await context.globalState.update('triplecode.importBackup', undefined);
  await context.globalState.update('triplecode.importTimestamp', undefined);
  await context.globalState.update('triplecode.importedExtensions', undefined);

  vscode.window.showInformationMessage(
    'Rollback completed. Restart to apply changes.',
    'Restart'
  ).then(selection => {
    if (selection === 'Restart') {
      vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
  });
}

function activate(context) {
  const patches = new Map();
  let activeDocument;
  let pending;
  let applying = false;
  let agent;
  let agentView;
  let nextChatId = 1;
  let chats = [{ id: nextChatId, draft: '', mode: 'agent', replies: [] }];
  let currentChat = chats[0];
  let welcome;

  function candidate(editor) {
    return editor?.document.uri.scheme === 'file' &&
      vscode.workspace.getWorkspaceFolder(editor.document.uri);
  }

  function candidateDocuments() {
    return vscode.workspace.textDocuments.filter(document =>
      document.uri.scheme === 'file' && !document.isClosed &&
      vscode.workspace.getWorkspaceFolder(document.uri));
  }

  function updateTarget(editor) {
    if (candidate(editor)) {
      activeDocument = editor.document;
      agent?.postMessage({ type: 'target', name: fileName(activeDocument) });
    }
  }

  function fileName(document) {
    return document ? vscode.workspace.asRelativePath(document.uri) : '';
  }

  function setup(webview, screen, initial) {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
    };
    webview.html = render(webview, context.extensionUri, screen, initial);
  }

  function showWelcome() {
    if (welcome) {
      welcome.reveal();
      return;
    }
    welcome = vscode.window.createWebviewPanel('triplecodeWelcome', 'Welcome', vscode.ViewColumn.One);
    const recent = context.globalState.get('recentFolders', []);
    setup(welcome.webview, 'welcome', { recent });
    welcome.onDidDispose(() => { welcome = undefined; });
    welcome.webview.onDidReceiveMessage(async message => {
      try {
        const options = { canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Open project' };
        if (message.type === 'open') {
          const selected = await vscode.window.showOpenDialog(options);
          if (selected) await openFolder(selected[0]);
        } else if (message.type === 'recent' && Number.isInteger(message.index) && recent[message.index]) {
          await openFolder(vscode.Uri.file(recent[message.index]));
        } else if (message.type === 'clone') {
          await vscode.commands.executeCommand('git.clone');
        } else if (message.type === 'import') {
          await vscode.commands.executeCommand('triplecode.importFromVSCode');
        } else if (message.type === 'settings') {
          await vscode.commands.executeCommand('workbench.action.openSettings');
        }
      } catch (error) {
        vscode.window.showErrorMessage(error.message);
      }
    });
  }

  async function openFolder(uri) {
    await vscode.workspace.fs.stat(uri);
    const recent = context.globalState.get('recentFolders', []);
    await context.globalState.update('recentFolders', [uri.fsPath, ...recent.filter(path => path !== uri.fsPath)].slice(0, 8));
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceReuseWindow: true });
  }

  async function showAgent() {
    if (!vscode.workspace.workspaceFolders?.length) return;
    updateTarget(vscode.window.activeTextEditor);
    await vscode.commands.executeCommand('triplecode.agentView.focus');
  }

  function resolveAgent(view) {
    agent = view.webview;
    agentView = view;
    const reportVisibility = () => vscode.commands.executeCommand('setContext', 'triplecode.agentVisible', view.visible);
    const visibility = view.onDidChangeVisibility(reportVisibility);
    void reportVisibility();
    setup(agent, 'agent', { target: fileName(activeDocument), pending: describePatch(pending), ...chatState() });
    view.onDidDispose(() => {
      visibility.dispose();
      if (agent === view.webview) {
        agent = undefined;
        agentView = undefined;
        void vscode.commands.executeCommand('setContext', 'triplecode.agentVisible', false);
      }
    });
    agent.onDidReceiveMessage(async message => {
      if (applying) return;
      try {
        switch (message.type) {
          case 'draft':
            if (message.id === currentChat.id && typeof message.value === 'string') {
              currentChat.draft = message.value.slice(0, 500);
            }
            break;
          case 'mode':
            if (message.id === currentChat.id && ['ask', 'plan', 'agent'].includes(message.mode)) {
              currentChat.mode = message.mode;
            }
            break;
          case 'new-chat':
            await newChat();
            break;
          case 'select-chat':
          case 'close-chat':
            updateChats(message.id, message.type === 'close-chat');
            break;
          case 'chat-actions':
            await showChatActions();
            break;
          case 'propose':
            if (message.id !== currentChat.id) throw new Error('The selected chat changed. Try again.');
            await propose(message.request, message.mode ?? currentChat.mode);
            break;
          case 'review':
            if (pending) await showDiff(pending);
            break;
          case 'check':
            await runCheck();
            break;
          case 'apply':
            applying = true;
            try {
              await apply();
            } finally {
              applying = false;
            }
            break;
          case 'discard':
            if (pending) recordHistory('discard', `${pending.request} — ${pending.files.length} file${pending.files.length === 1 ? '' : 's'}`);
            await clearPatch('Changes discarded.');
            break;
        }
      } catch (error) {
        agent?.postMessage({ type: 'error', text: error.message });
      }
    });
  }

  function recordHistory(kind, summary, detail = '') {
    const history = context.globalState.get('triplecode.history', []);
    history.unshift({ ts: Date.now(), kind, summary, detail });
    void context.globalState.update('triplecode.history', history.slice(0, 50));
  }

  function pushReply(text) {
    currentChat.replies.push(text);
    agent?.postMessage({ type: 'chats', ...chatState() });
  }

  function answerAsk(document, request) {
    if (!document || document.isClosed) return 'Open a source file to ask about it.';
    const text = document.getText();
    const lines = text.split(/\r?\n/);
    if (/how many lines|line count/i.test(request)) {
      return `${fileName(document)} has ${lines.length} lines.`;
    }
    if (/function|symbol|export|class/i.test(request)) {
      const names = [...text.matchAll(/(?:function|class)\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)]
        .map(match => match[1] || match[2]).filter(Boolean).slice(0, 12);
      return names.length
        ? `Top-level names in ${fileName(document)}: ${names.join(', ')}.`
        : `No top-level functions found in ${fileName(document)} (${lines.length} lines).`;
    }
    return `Ask mode answers questions about ${fileName(document)} (${document.languageId}, ${lines.length} lines). ` +
      'Try “how many lines” or “functions”. Agent mode applies changes: “add a comment: text” or “comment all: text”.';
  }

  function planRequest(request) {
    const all = /^comment all:/i.test(request.trim());
    const documents = all ? candidateDocuments().filter(doc => supportsComments(doc.languageId)).slice(0, 12)
      : activeDocument && supportsComments(activeDocument.languageId) ? [activeDocument] : [];
    if (!documents.length) return 'Open a source file that supports // comments first.';
    const steps = documents.map((document, index) =>
      `${index + 1}. Insert a comment at the top of ${fileName(document)}.`);
    return [`Plan for “${request}”:`, ...steps, 'Switch to Agent mode and resend the request to apply it.'].join('\n');
  }

  async function propose(request, mode = 'agent') {
    if (pending) throw new Error('Apply or discard the current patch first.');
    if (typeof request !== 'string' || !request.trim() || request.length > 500) {
      throw new Error('Enter a request of up to 500 characters.');
    }
    const trimmed = request.trim();
    if (mode === 'ask') {
      pushReply(answerAsk(activeDocument, trimmed));
      return;
    }
    if (mode === 'plan') {
      pushReply(planRequest(trimmed));
      return;
    }

    const all = /^comment all:\s*(.+)$/i.exec(trimmed);
    const single = /^add a comment:\s*(.+)$/i.exec(trimmed);
    let documents;
    let body;
    if (all) {
      documents = candidateDocuments().filter(document => supportsComments(document.languageId)).slice(0, 12);
      body = all[1];
      if (!documents.length) throw new Error('No open source files support // comments.');
    } else if (single) {
      if (!activeDocument || activeDocument.isClosed) throw new Error('Open a source file first.');
      if (!supportsComments(activeDocument.languageId)) throw new Error('Open a source file that supports // comments.');
      documents = [activeDocument];
      body = single[1];
    } else {
      throw new Error('Try “add a comment: text” for one file or “comment all: text” for every open source file.');
    }

    const id = randomUUID();
    const files = documents.map((document, index) => {
      const before = document.getText();
      const edit = commentEdit(before, document.languageId,
        document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n', body);
      const base = vscode.Uri.from({ scheme: 'triplecode-review', path: `/${id}/${index}/${document.uri.path.split('/').pop()}` });
      const original = base.with({ path: base.path.replace(`/${id}/`, `/${id}/original/`) });
      const modified = original.with({ path: original.path.replace('/original/', '/proposed/') });
      patches.set(original.toString(), before);
      patches.set(modified.toString(), before.slice(0, edit.offset) + edit.insertion + before.slice(edit.offset));
      return { document, before, edit, original, modified, column: vscode.window.activeTextEditor?.viewColumn };
    });
    currentChat.draft = request;
    pending = { request: trimmed, files, checks: [] };
    recordHistory('propose', `${trimmed} — ${files.length} file${files.length === 1 ? '' : 's'}`);
    agent?.postMessage({ type: 'pending', patch: describePatch(pending) });
  }

  function describePatch(patch) {
    if (!patch) return null;
    return {
      request: patch.request,
      checks: patch.checks,
      files: patch.files.map(file => ({
        name: fileName(file.document),
        lines: file.edit.insertion.replace(/\r/g, '').trimEnd().split('\n'),
        start: file.document.positionAt(file.edit.offset).line + 1
      }))
    };
  }

  async function showDiff(patch) {
    for (const file of patch.files) {
      await vscode.commands.executeCommand('vscode.diff', file.original, file.modified,
        `Review changes · ${fileName(file.document)}`, { preview: false, viewColumn: file.column ?? vscode.ViewColumn.One });
    }
  }

  async function apply() {
    const patch = pending;
    if (!patch) return;
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const file of patch.files) {
      const document = await vscode.workspace.openTextDocument(file.document.uri);
      if (document.getText() !== file.before) {
        throw new Error(`${fileName(file.document)} changed after review. Discard this patch and try again.`);
      }
      workspaceEdit.insert(file.document.uri, document.positionAt(file.edit.offset), file.edit.insertion);
    }
    if (pending !== patch) return;
    if (!await vscode.workspace.applyEdit(workspaceEdit)) throw new Error('The editor could not apply the patch.');
    recordHistory('apply', `${patch.request} — ${patch.files.length} file${patch.files.length === 1 ? '' : 's'}`);
    await clearPatch('Changes applied in the editor. Save the files when ready.');
    const first = patch.files[0];
    const document = await vscode.workspace.openTextDocument(first.document.uri);
    await vscode.window.showTextDocument(document, { viewColumn: first.column ?? vscode.ViewColumn.One });
  }

  async function runCheck() {
    const patch = pending;
    if (!patch) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) throw new Error('Open a project folder first.');
    const command = vscode.workspace.getConfiguration('triplecode').get('checkCommand', 'npm test');
    const { stdout, stderr, code } = await new Promise((resolve, reject) => {
      exec(command, { cwd: folder.uri.fsPath, timeout: 60000, maxBuffer: 512 * 1024 }, (error, out, err) => {
        if (error && typeof error.code !== 'number') return reject(error);
        resolve({ stdout: out, stderr: err, code: error ? error.code : 0 });
      });
    });
    const output = `${stdout}\n${stderr}`.trim();
    const tail = output.split('\n').slice(-8).join('\n');
    const entry = { command, code, output: tail };
    patch.checks.push(entry);
    recordHistory('check', `${command} — exit ${entry.code}`, tail.split('\n')[0] ?? '');
    agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
  }

  async function clearPatch(text) {
    const patch = pending;
    pending = undefined;
    currentChat.draft = '';
    agent?.postMessage({ type: 'complete', text });
    if (!patch) return;
    const originals = new Set(patch.files.map(file => file.original.toString()));
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
      tab.input instanceof vscode.TabInputTextDiff && originals.has(tab.input.original.toString()));
    try {
      if (tabs.length) await vscode.window.tabGroups.close(tabs, true);
    } finally {
      for (const file of patch.files) {
        patches.delete(file.original.toString());
        patches.delete(file.modified.toString());
      }
    }
  }

  async function newChat() {
    if (pending) {
      await vscode.window.showInformationMessage('Apply or discard the current patch first.');
      return;
    }
    currentChat = { id: ++nextChatId, draft: '', mode: 'agent', replies: [] };
    chats = [currentChat, ...chats];
    await showAgent();
    agent?.postMessage({ type: 'chats', ...chatState(), focusPrompt: true });
  }

  function chatState() {
    return {
      chats: chats.map(chat => ({ id: chat.id, mode: chat.mode, replies: chat.replies })),
      selected: currentChat.id,
      draft: currentChat.draft
    };
  }

  async function showCheckHistory() {
    const history = context.globalState.get('triplecode.history', []);
    if (!history.length) {
      await vscode.window.showInformationMessage('No agent checks recorded yet.');
      return;
    }
    const items = history.map((entry, index) => ({
      label: `${entry.kind === 'check' ? '$(check)' : entry.kind === 'apply' ? '$(check)' : entry.kind === 'discard' ? '$(trash)' : '$(edit)'} ${entry.summary}`,
      detail: new Date(entry.ts).toLocaleString(),
      description: entry.detail || undefined,
      index
    }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Agent check history' });
    if (picked) {
      const entry = history[picked.index];
      await vscode.window.showInformationMessage(`${entry.summary}\n${entry.detail || ''}\n${new Date(entry.ts).toLocaleString()}`);
    }
  }

  function updateChats(id, close) {
    if (pending) return;
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    if (close) {
      chats = chats.filter(item => item !== chat);
      if (!chats.length) chats = [{ id: ++nextChatId, draft: '', mode: 'agent', replies: [] }];
      if (currentChat === chat) currentChat = chats[0];
    } else {
      currentChat = chat;
    }
    agent?.postMessage({ type: 'chats', ...chatState() });
  }

  async function showChatActions() {
    const actions = [
      { label: 'Open View…', command: 'workbench.action.openView' },
      { label: 'Hide Agent Panel', command: 'workbench.action.closeAuxiliaryBar' }
    ];
    const action = await vscode.window.showQuickPick(actions, { placeHolder: 'Agent actions' });
    if (action) await vscode.commands.executeCommand(action.command);
  }

  const localWorkspace = vscode.window.createStatusBarItem('triplecode.local-workspace', vscode.StatusBarAlignment.Left, 100);
  localWorkspace.name = 'TripleCode workspace';
  localWorkspace.text = '$(git-branch) Local workspace';
  if (!vscode.workspace.workspaceFolders?.length) localWorkspace.show();

  const brand = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -1000);
  brand.text = 'TripleCode IDE';
  brand.show();
  context.subscriptions.push(
    brand,
    localWorkspace,
    vscode.workspace.registerTextDocumentContentProvider('triplecode-review', {
      provideTextDocumentContent: uri => patches.get(uri.toString()) ?? ''
    }),
    vscode.window.onDidChangeActiveTextEditor(updateTarget),
    vscode.workspace.onDidGrantWorkspaceTrust(prepareWorkspace),
    vscode.commands.registerCommand('triplecode.welcome', showWelcome),
    vscode.commands.registerCommand('triplecode.agent', showAgent),
    vscode.commands.registerCommand('triplecode.focusAgent', () => agentView?.visible
      ? vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar')
      : showAgent()),
    vscode.commands.registerCommand('triplecode.newChat', newChat),
    vscode.commands.registerCommand('triplecode.checkHistory', showCheckHistory),
    vscode.commands.registerCommand('triplecode.importFromVSCode', showImportPreview),
    vscode.commands.registerCommand('triplecode.rollbackImport', () => rollbackImport(context)),
    vscode.commands.registerCommand('triplecode.designSystem', () => showDesignSystem(context)),
    vscode.window.registerWebviewViewProvider('triplecode.agentView', { resolveWebviewView: resolveAgent }, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );
  updateTarget(vscode.window.activeTextEditor);
  if (!vscode.workspace.workspaceFolders?.length) showWelcome();
  else prepareWorkspace();

  function prepareWorkspace() {
    const folders = vscode.workspace.workspaceFolders;
    if (vscode.workspace.isTrusted && folders?.length && folders.every(folder => folder.uri.scheme === 'file')) {
      void initializeWorkspace().catch(error => console.error('TripleCode layout:', error));
    }
  }

  async function initializeWorkspace() {
    if (context.workspaceState.get('triplecode.layoutInitialized')) return;
    await vscode.commands.executeCommand('workbench.action.alignPanelCenter');
    const terminal = vscode.window.terminals[0] ?? vscode.window.createTerminal();
    terminal.show(true);
    await context.workspaceState.update('triplecode.layoutInitialized', true);
  }
}

function render(webview, base, screen, initial) {
  const uri = name => webview.asWebviewUri(vscode.Uri.joinPath(base, 'media', name));
  const welcome = `<main class="welcome">
    <img class="logo" src="${uri('imgLogo1.png')}" alt="TripleCode">
    <div class="welcome-meta"><span class="tag">Free</span><button data-action="settings" class="link">Settings</button></div>
    <div class="card-grid">
      <button class="card" data-action="open"><img src="${uri('imgFolder.svg')}" alt=""><span>Open project</span></button>
      <button class="card" data-action="clone"><img src="${uri('imgFolderGit2.svg')}" alt=""><span>Clone repo</span></button>
      <button class="card" data-action="ssh" disabled><img src="${uri('imgSquareTerminal.svg')}" alt=""><span>Connect via SSH</span></button>
    </div>
    <div id="recent"></div>
    <button data-action="import" class="link import-link">Import from VS Code</button>
  </main>`;
  const agent = `<main class="agent">
    <header class="chat-header">
      <div id="chats" role="group" aria-label="Chats"></div>
      <button type="button" class="icon-button" data-action="new-chat" aria-label="New chat"><img src="${uri('imgPlus1.svg')}" alt=""></button>
      <button type="button" class="icon-button" data-action="chat-actions" aria-label="Agent actions"><img src="${uri('imgEllipsis.svg')}" alt=""></button>
    </header>
    <section id="conversation" class="conversation" hidden aria-label="Agent output">
      <div id="messages"></div>
      <div id="patch" class="patch" hidden>
        <div id="patch-files"></div>
      </div>
    </section>
    <p id="status" role="status" hidden></p>
    <form id="request" class="composer">
      <div id="review" class="composer-header" hidden>
        <div class="review-row">
          <button type="button" class="files-toggle" data-action="toggle-files" aria-expanded="true">
            <img src="${uri('figma-assets/imgChevronRight.svg')}" alt="">
            <span id="file-count">1 file</span>
          </button>
          <div class="review-actions">
            <button type="button" data-action="check" class="pill-action">Run checks</button>
            <button type="button" data-action="discard" class="pill-action">Undo all</button>
            <button type="button" data-action="apply" class="pill-action">Keep all</button>
            <button type="button" data-action="review" class="review-btn">Review</button>
          </div>
        </div>
        <div id="checks" class="checks"></div>
      </div>
      <label class="sr-only" for="prompt">Agent task</label>
      <textarea id="prompt" maxlength="500" aria-describedby="target" placeholder="Press / for skills, @ for context" required></textarea>
      <footer class="chat-actions">
        <button type="button" class="pill mode" data-mode="ask" aria-pressed="false">Ask</button>
        <button type="button" class="pill mode" data-mode="plan" aria-pressed="false">Plan</button>
        <button type="button" class="pill mode" data-mode="agent" aria-pressed="true">Agent</button>
        <span class="pill">Model</span>
        <span id="target" class="muted"></span>
        <span class="context-icon"><img src="${uri('figma-assets/imgShape.svg')}" alt=""></span>
        <button type="button" class="icon-button attachment" disabled aria-label="Attach context" title="Context attachments are unavailable"><img src="${uri('imgPaperclip.svg')}" alt=""></button>
        <button aria-label="Send" title="Send" type="submit" class="send"><img src="${uri('imgPlay.svg')}" alt=""></button>
      </footer>
    </form>
  </main>`;
  const payload = screen === 'agent' ? { ...initial, assets: { x: uri('figma-assets/imgX.svg') } } : initial;
  const data = JSON.stringify(payload).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src ${webview.cspSource}">
<link rel="stylesheet" href="${uri('tokens.css')}"><link rel="stylesheet" href="${uri('workbench.css')}"><title>TripleCode</title></head>
<body data-screen="${screen}">${screen === 'welcome' ? welcome : agent}
<script type="application/json" id="initial">${data}</script>
<script src="${uri('workbench.js')}" defer></script></body></html>`;
}

module.exports = { activate };
