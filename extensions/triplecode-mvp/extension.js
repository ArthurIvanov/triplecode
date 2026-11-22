'use strict';

const vscode = require('vscode');
const { randomUUID } = require('node:crypto');
const { readFile, access, readdir } = require('node:fs/promises');
const { join } = require('node:path');
const { homedir } = require('node:os');
const { proposePatch } = require('./patch');

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
  let chats = [{ id: nextChatId, draft: '' }];
  let currentChat = chats[0];
  let welcome;

  const candidate = editor => editor?.document.uri.scheme === 'file' &&
    vscode.workspace.getWorkspaceFolder(editor.document.uri);

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
            await propose(message.request);
            break;
          case 'review':
            if (pending) await showDiff(pending);
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
            await clearPatch('Changes discarded.');
            break;
        }
      } catch (error) {
        agent?.postMessage({ type: 'error', text: error.message });
      }
    });
  }

  async function propose(request) {
    if (pending) throw new Error('Apply or discard the current patch first.');
    if (!activeDocument || activeDocument.isClosed) throw new Error('Open a source file first.');
    if (typeof request !== 'string' || request.length > 500) throw new Error('Enter a request of up to 500 characters.');

    const document = activeDocument;
    const before = document.getText();
    const edit = proposePatch(before, document.languageId, request, document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n');
    const id = randomUUID();
    const original = vscode.Uri.from({ scheme: 'triplecode-review', path: `/${id}/original/${document.uri.path.split('/').pop()}` });
    const modified = original.with({ path: original.path.replace('/original/', '/proposed/') });
    patches.set(original.toString(), before);
    patches.set(modified.toString(), before.slice(0, edit.offset) + edit.insertion + before.slice(edit.offset));
    currentChat.draft = request;
    pending = { document, before, edit, original, modified, request, column: vscode.window.activeTextEditor?.viewColumn };
    agent?.postMessage({ type: 'pending', patch: describePatch(pending) });
  }

  function describePatch(patch) {
    if (!patch) return null;
    return {
      name: fileName(patch.document),
      request: patch.request,
      lines: patch.edit.insertion.replace(/\r/g, '').trimEnd().split('\n'),
      start: patch.document.positionAt(patch.edit.offset).line + 1
    };
  }

  async function showDiff(patch) {
    await vscode.commands.executeCommand('vscode.diff', patch.original, patch.modified,
      `Review changes · ${fileName(patch.document)}`, { preview: false, viewColumn: patch.column ?? vscode.ViewColumn.One });
  }

  async function apply() {
    const patch = pending;
    if (!patch) return;
    const document = await vscode.workspace.openTextDocument(patch.document.uri);
    if (pending !== patch) return;
    if (document.getText() !== patch.before) {
      throw new Error('The file changed after review. Discard this patch and try again.');
    }
    const position = document.positionAt(patch.edit.offset);
    const workspaceEdit = new vscode.WorkspaceEdit();
    workspaceEdit.insert(document.uri, position, patch.edit.insertion);
    if (!await vscode.workspace.applyEdit(workspaceEdit)) throw new Error('The editor could not apply the patch.');
    await clearPatch('Changes applied in the editor. Save the file when ready.');
    await vscode.window.showTextDocument(document, { viewColumn: patch.column ?? vscode.ViewColumn.One });
  }

  async function clearPatch(text) {
    const patch = pending;
    pending = undefined;
    currentChat.draft = '';
    agent?.postMessage({ type: 'complete', text });
    if (!patch) return;
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
      tab.input instanceof vscode.TabInputTextDiff &&
      tab.input.original.toString() === patch.original.toString());
    try {
      if (tabs.length) await vscode.window.tabGroups.close(tabs, true);
    } finally {
      patches.delete(patch.original.toString());
      patches.delete(patch.modified.toString());
    }
  }

  async function newChat() {
    if (pending) {
      await vscode.window.showInformationMessage('Apply or discard the current patch first.');
      return;
    }
    currentChat = { id: ++nextChatId, draft: '' };
    chats = [currentChat, ...chats];
    await showAgent();
    agent?.postMessage({ type: 'chats', ...chatState(), focusPrompt: true });
  }

  function chatState() {
    return { chats: chats.map(chat => chat.id), selected: currentChat.id, draft: currentChat.draft };
  }

  function updateChats(id, close) {
    if (pending) return;
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    if (close) {
      chats = chats.filter(item => item !== chat);
      if (!chats.length) chats = [{ id: ++nextChatId, draft: '' }];
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
    vscode.commands.registerCommand('triplecode.importFromVSCode', showImportPreview),
    vscode.commands.registerCommand('triplecode.rollbackImport', () => rollbackImport(context)),
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
  const data = JSON.stringify(initial).replaceAll('<', '\\u003c');
  const welcome = `<main class="welcome">
    <img class="logo" src="${uri('imgLogo1.png')}" alt="TripleCode">
    <div class="welcome-meta"><span>Free</span><button data-action="settings" class="link">Settings</button></div>
    <div class="project-actions">
      <button data-action="open"><img src="${uri('imgFolder.svg')}" alt="">Open project</button>
      <button data-action="clone"><img src="${uri('imgFolderGit2.svg')}" alt="">Clone repo</button>
      <button data-action="import"><img src="${uri('imgFolderGit2.svg')}" alt="">Import from VS Code</button>
      <button disabled><img src="${uri('imgSquareTerminal.svg')}" alt="">Connect via SSH</button>
    </div>
    <div id="recent"></div>
  </main>`;
  const agent = `<main class="agent">
    <header class="chat-header">
      <div id="chats" role="group" aria-label="Chats"></div>
      <button type="button" class="icon-button" data-action="new-chat" aria-label="New chat"><img src="${uri('imgPlus1.svg')}" alt=""></button>
      <button type="button" class="icon-button" data-action="chat-actions" aria-label="Agent actions"><img src="${uri('imgEllipsis.svg')}" alt=""></button>
    </header>
    <section id="conversation" class="conversation" hidden aria-label="Proposed change">
      <p id="task" class="task"></p>
      <div class="patch">
        <div class="patch-file"><span id="change"></span><span id="additions"></span></div>
        <pre id="patch-lines"></pre>
      </div>
    </section>
    <p id="status" role="status" hidden></p>
    <form id="request">
      <div id="review" class="review-actions" hidden>
        <span id="file-count">1 file</span>
        <button type="button" data-action="discard">Discard</button>
        <button type="button" data-action="apply">Apply</button>
        <button type="button" data-action="review" class="review-diff">Review</button>
      </div>
      <label class="sr-only" for="prompt">Agent task</label>
      <textarea id="prompt" maxlength="500" aria-describedby="target" placeholder="Add a comment: Describe this module" required></textarea>
      <footer>
        <span>Agent</span><span title="Deterministic patch preview">Model</span>
        <span id="target" class="muted"></span>
        <button type="button" class="icon-button attachment" disabled aria-label="Attach context" title="Context attachments are unavailable"><img src="${uri('imgPaperclip.svg')}" alt=""></button>
        <button aria-label="Send" title="Send" type="submit" class="send"><img src="${uri('imgPlay.svg')}" alt=""></button>
      </footer>
    </form>
  </main>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src ${webview.cspSource}">
<link rel="stylesheet" href="${uri('workbench.css')}"><title>TripleCode</title></head>
<body data-screen="${screen}">${screen === 'welcome' ? welcome : agent}
<script type="application/json" id="initial">${data}</script>
<script src="${uri('workbench.js')}" defer></script></body></html>`;
}

module.exports = { activate };
