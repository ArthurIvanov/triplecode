'use strict';

const vscode = require('vscode');
const { randomUUID } = require('node:crypto');
const { readFile, access, readdir } = require('node:fs/promises');
const { join } = require('node:path');
const { homedir, tmpdir } = require('node:os');
const { exec } = require('node:child_process');
const { readFileSync, existsSync } = require('node:fs');
const { writeFile, mkdir, unlink, mkdtemp, cp, symlink, rm } = require('node:fs/promises');
const { dirname, normalize, isAbsolute, relative, sep } = require('node:path');
const { commentEdit, supportsComments } = require('./patch');
const { registerDesktopAccount } = require('./desktop-account');
const {
  applyEdit, selectFiles, classifyUndo, isStale, isActiveRun, remainingAfterApply
} = require('./review-logic');
const {
  allowRequestLength, buildExecuteRequest, sanitizePlanEdit
} = require('./agent-modes');
const {
  ATTACHMENT_LIMIT, RULES_LIMIT,
  isSensitivePath, canAttachFile, rulesSuffix, hasRulesBadge
} = require('./context-rules');
const {
  shouldShowWelcome, updateRecentFolders, filterExistingRecent
} = require('./welcome-logic');
const {
  classifySettings, emptyImportReport, importReportMessage,
  hasRollbackMaterial, previewCounts
} = require('./import-logic');

let getSessionAccessToken = () => Promise.resolve(null);
const { registerInlineAI } = require('./inline');
const provider = require('./provider');

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

async function showImportPreview(context) {
  const vsCodePath = await findVSCodeInstallation();
  if (!vsCodePath) {
    const action = await vscode.window.showWarningMessage(
      'Visual Studio Code not found on this machine.',
      'Import from File',
      'Cancel'
    );
    if (action === 'Import from File') {
      await showFileImport(context);
    }
    return;
  }

  const [settings, keybindings, snippets, extensions] = await Promise.all([
    readVSCodeSettings(),
    readVSCodeKeybindings(),
    readVSCodeSnippets(),
    readVSCodeExtensions()
  ]);

  presentImportPreview({ source: vsCodePath, settings, keybindings, snippets, extensions }, context);
}

async function showFileImport(context) {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { 'JSON': ['json'] },
    openLabel: 'Import settings file'
  });
  if (!selected?.length) return;
  let settings;
  try {
    settings = JSON.parse(await readFile(selected[0].fsPath, 'utf-8'));
  } catch {
    vscode.window.showErrorMessage('Could not parse the selected file as JSON.');
    return;
  }
  const dir = dirname(selected[0].fsPath);
  let keybindings = null;
  let snippets = null;
  if (/[\\/]User$/.test(dir)) {
    try {
      keybindings = JSON.parse(await readFile(join(dir, 'keybindings.json'), 'utf-8'));
    } catch { /* no sibling keybindings */ }
    try {
      snippets = {};
      for (const entry of await readdir(join(dir, 'snippets'), { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          snippets[entry.name] = JSON.parse(await readFile(join(dir, 'snippets', entry.name), 'utf-8'));
        }
      }
    } catch { /* no sibling snippets */ }
  }
  presentImportPreview({ source: selected[0].fsPath, settings, keybindings, snippets, extensions: null }, context);
}

function presentImportPreview(data, context) {
  const { settings, keybindings, snippets, extensions } = data;

  const media = vscode.Uri.joinPath(context.extensionUri, 'media');
  const previewPanel = vscode.window.createWebviewPanel(
    'triplecodeImportPreview',
    'Import Profile',
    vscode.ViewColumn.One,
    { enableScripts: true, localResourceRoots: [media] }
  );

  const previewData = {
    source: data.source,
    ...previewCounts({ settings, keybindings, snippets, extensions }),
    hasBackup: hasRollbackMaterial({
      settingsBackup: context.globalState.get('triplecode.importBackup'),
      fileBackup: context.globalState.get('triplecode.importFileBackup'),
      importedExtensions: context.globalState.get('triplecode.importedExtensions', [])
    })
  };

  previewPanel.webview.html = getImportPreviewHtml(previewData, previewPanel.webview, media);

  previewPanel.webview.onDidReceiveMessage(async message => {
    if (message.type === 'import') {
      const report = await performImport(message.selectedCategories, { settings, keybindings, snippets, extensions }, context);
      previewPanel.dispose();
      vscode.window.showInformationMessage(importReportMessage(report), 'Restart', 'Rollback').then(selection => {
        if (selection === 'Restart') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        } else if (selection === 'Rollback') {
          vscode.commands.executeCommand('triplecode.rollbackImport');
        }
      });
    } else if (message.type === 'import-file') {
      previewPanel.dispose();
      await showFileImport(context);
    } else if (message.type === 'rollback') {
      await rollbackImport(context);
      previewPanel.dispose();
    } else if (message.type === 'cancel') {
      previewPanel.dispose();
    }
  });
}

function getImportPreviewHtml(data, webview, media) {
  const uri = name => webview.asWebviewUri(vscode.Uri.joinPath(media, name));
  const initial = JSON.stringify(data).replaceAll('<', '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src ${webview.cspSource}">
  <title>Import from VS Code</title>
  <link rel="stylesheet" href="${uri('import-preview.css')}">
</head>
<body>
  <div id="import-preview-root"></div>
  <script type="application/json" id="initial">${initial}</script>
  <script src="${uri('import-preview.js')}" defer></script>
</body>
</html>`;
}

function showDesignSystem(context) {
  const media = vscode.Uri.joinPath(context.extensionUri, 'media');
  const panel = vscode.window.createWebviewPanel(
    'triplecodeDesignSystem',
    'TripleCode Design System',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [media] }
  );

  const { webview } = panel;
  const uri = name => webview.asWebviewUri(vscode.Uri.joinPath(media, name));
  const initial = JSON.stringify(webview.asWebviewUri(media).toString()).replaceAll('<', '\\u003c');
  webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src ${webview.cspSource}">
  <title>TripleCode Design System</title>
  <link rel="stylesheet" href="${uri('workbench.css')}">
  <link rel="stylesheet" href="${uri('figma-design.css')}">
  <link rel="stylesheet" href="${uri('design-system.css')}">
  <link rel="stylesheet" href="${uri('design-system/design-system-components.css')}">
</head>
<body>
  <div id="design-system-root"></div>
  <script type="application/json" id="initial">${initial}</script>
  <script src="${uri('design-system.js')}" defer></script>
</body>
</html>`;
}

function userDataDir(context) {
  let dir = context.globalStorageUri.fsPath;
  for (let index = 0; index < 4; index += 1) {
    if (/[\\/]User$/.test(dir)) return vscode.Uri.file(dir);
    dir = dirname(dir);
  }
  return null;
}

async function readUserFile(dir, name) {
  try {
    return await readFile(join(dir.fsPath, name), 'utf-8');
  } catch {
    return null;
  }
}

async function performImport(selectedCategories, data, context) {
  const { settings, keybindings, snippets, extensions } = data;
  const report = emptyImportReport();

  // Save current settings for rollback; never write secrets/sessions
  if (selectedCategories.settings && settings) {
    const config = vscode.workspace.getConfiguration();
    const previousSettings = {};
    const { apply, skipped, thirdParty } = classifySettings(settings);
    report.settingsSkipped = skipped;
    report.thirdParty = thirdParty;
    for (const { key, value } of apply) {
      previousSettings[key] = config.get(key);
      await config.update(key, value, vscode.ConfigurationTarget.Global);
      report.settingsApplied += 1;
    }
    await context.globalState.update('triplecode.importBackup', previousSettings);
    await context.globalState.update('triplecode.importTimestamp', Date.now());
  }

  // Apply keybindings and snippets into the TripleCode user data directory
  const userDir = userDataDir(context);
  if (userDir) {
    const fileBackup = {};
    if (selectedCategories.keybindings && Array.isArray(keybindings) && keybindings.length) {
      const target = join(userDir.fsPath, 'keybindings.json');
      const existing = await readUserFile(userDir, 'keybindings.json');
      if (existing !== null) {
        try {
          const parsed = JSON.parse(existing);
          const merged = [...parsed, ...keybindings];
          fileBackup.keybindings = existing;
          await writeFile(target, JSON.stringify(merged, null, '\t'), 'utf-8');
          report.keybindings = keybindings.length;
        } catch {
          report.keybindings = -1;
        }
      } else {
        fileBackup.keybindings = null;
        await writeFile(target, JSON.stringify(keybindings, null, '\t'), 'utf-8');
        report.keybindings = keybindings.length;
      }
    }
    if (selectedCategories.snippets && snippets) {
      const names = Object.keys(snippets);
      if (names.length) {
        const snippetsDir = join(userDir.fsPath, 'snippets');
        await mkdir(snippetsDir, { recursive: true });
        fileBackup.snippets = {};
        for (const name of names) {
          const fileName = name.endsWith('.json') ? name : `${name}.json`;
          const target = join(snippetsDir, fileName);
          const existing = await readUserFile(vscode.Uri.file(snippetsDir), fileName);
          fileBackup.snippets[fileName] = existing;
          await writeFile(target, JSON.stringify(snippets[name], null, '\t'), 'utf-8');
        }
        report.snippets = names.length;
      }
    }
    if (Object.keys(fileBackup).length) {
      await context.globalState.update('triplecode.importFileBackup', fileBackup);
    }
  }

  // Track installed extensions for rollback
  if (selectedCategories.extensions && extensions) {
    const installedExtensions = [];
    for (const ext of extensions) {
      try {
        await vscode.commands.executeCommand('workbench.extensions.install', ext.id);
        installedExtensions.push(ext.id);
        report.extensionsInstalled += 1;
      } catch (error) {
        report.extensionsFailed.push(ext.id);
      }
    }
    await context.globalState.update('triplecode.importedExtensions', installedExtensions);
  }

  await context.globalState.update('triplecode.lastImportReport', { ...report, ts: Date.now() });
  return report;
}

async function rollbackImport(context) {
  const previousSettings = context.globalState.get('triplecode.importBackup');
  const importedExtensions = context.globalState.get('triplecode.importedExtensions', []);
  const fileBackup = context.globalState.get('triplecode.importFileBackup');

  if (!hasRollbackMaterial({
    settingsBackup: previousSettings,
    fileBackup,
    importedExtensions
  })) {
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

  // Restore keybindings and snippets
  if (fileBackup) {
    const userDir = userDataDir(context);
    if (userDir) {
      if ('keybindings' in fileBackup) {
        const target = join(userDir.fsPath, 'keybindings.json');
        if (fileBackup.keybindings === null) {
          await unlink(target).catch(() => {});
        } else if (typeof fileBackup.keybindings === 'string') {
          await writeFile(target, fileBackup.keybindings, 'utf-8').catch(() => {});
        }
      }
      if (fileBackup.snippets) {
        const snippetsDir = join(userDir.fsPath, 'snippets');
        for (const [name, content] of Object.entries(fileBackup.snippets)) {
          const target = join(snippetsDir, name);
          if (content === null) {
            await unlink(target).catch(() => {});
          } else {
            await writeFile(target, content, 'utf-8').catch(() => {});
          }
        }
      }
    }
    await context.globalState.update('triplecode.importFileBackup', undefined);
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
  registerInlineAI(context);
  const account = registerDesktopAccount(context);
  if (account?.sessionAccessToken) getSessionAccessToken = account.sessionAccessToken;
  const patches = new Map();
  let activeDocument;
  let pending;
  let applying = false;
  const appliedOps = [];
  let activeRun;
  let agent;
  let agentView;
  let agentReady = false;
  const pendingTimelineSteps = [];
  let focusComposerOnReady = false;
  let nextChatId = 1;
  let chats = [{ id: nextChatId, draft: '', mode: 'agent', replies: [] }];
  let currentChat = chats[0];
  let welcome;

  function persistChats() {
    void context.workspaceState.update('triplecode.chats', {
      nextId: nextChatId,
      current: currentChat.id,
      chats: chats.map(chat => ({
        id: chat.id, draft: chat.draft, mode: chat.mode, replies: chat.replies.slice(-50),
        name: chat.name || '',
        queue: (chat.queue || []).slice(0, 3).map(item => ({ request: String(item.request || '').slice(0, 500), mode: item.mode })),
        plan: chat.plan || null,
        attachments: (chat.attachments || []).slice(0, ATTACHMENT_LIMIT).map(attachment =>
          attachment.kind === 'selection'
            ? { kind: 'selection', label: String(attachment.label || 'selection').slice(0, 120), text: String(attachment.text || '').slice(0, 4000) }
            : { kind: 'file', path: String(attachment.path || '') })
      }))
    });
  }

  function restoreChats() {
    const saved = context.workspaceState.get('triplecode.chats');
    if (!Array.isArray(saved?.chats) || !saved.chats.length) return;
    chats = saved.chats
      .filter(chat => Number.isInteger(chat?.id))
      .map(chat => ({
        id: chat.id,
        name: typeof chat.name === 'string' ? chat.name.slice(0, 80) : '',
        draft: typeof chat.draft === 'string' ? chat.draft.slice(0, 500) : '',
        mode: ['ask', 'plan', 'agent'].includes(chat.mode) ? chat.mode : 'agent',
        replies: Array.isArray(chat.replies) ? chat.replies.flatMap(reply => {
          if (typeof reply === 'string') return [reply];
          if (reply && reply.type === 'request' && typeof reply.text === 'string') {
            return [{ type: 'request', text: reply.text.slice(0, 2000) }];
          }
          if (reply && reply.type === 'timeline' && Array.isArray(reply.steps)) {
            const steps = reply.steps
              .filter(step => step && typeof step.title === 'string')
              .map(step => ({
                ...step,
                title: step.title.slice(0, 200),
                description: typeof step.description === 'string' ? step.description.slice(0, 2000) : undefined
              }));
            return steps.length ? [{ type: 'timeline', steps }] : [];
          }
          return [];
        }).slice(-50) : [],
        plan: chat.plan && typeof chat.plan.task === 'string' && typeof chat.plan.plan === 'string'
          ? { id: typeof chat.plan.id === 'string' ? chat.plan.id : randomUUID(), task: chat.plan.task, plan: chat.plan.plan }
          : null,
        attachments: Array.isArray(chat.attachments)
          ? chat.attachments.filter(a => a && (a.kind === 'file' ? typeof a.path === 'string' && !isSensitivePath(a.path) : a.kind === 'selection' && typeof a.text === 'string')).slice(0, ATTACHMENT_LIMIT)
          : [],
        queue: Array.isArray(chat.queue)
          ? chat.queue.filter(item => item && typeof item.request === 'string' && item.request.trim())
            .map(item => ({ request: item.request.slice(0, 500), mode: ['ask', 'plan', 'agent'].includes(item.mode) ? item.mode : 'agent' })).slice(0, 3)
          : []
      }));
    if (!chats.length) return;
    nextChatId = Math.max(nextChatId, saved.nextId || 0, ...chats.map(chat => chat.id));
    currentChat = chats.find(chat => chat.id === saved.current) || chats[0];
  }
  restoreChats();

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
    const stored = context.globalState.get('recentFolders', []);
    const recent = filterExistingRecent(stored, existsSync);
    if (recent.length !== stored.length) {
      void context.globalState.update('recentFolders', recent);
    }
    setup(welcome.webview, 'welcome', { recent });
    welcome.onDidDispose(() => { welcome = undefined; });
    welcome.webview.onDidReceiveMessage(async message => {
      try {
        const options = { canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: 'Open project' };
        if (message.type === 'open') {
          const selected = await vscode.window.showOpenDialog(options);
          // Cancel → stay on Welcome, no error toast.
          if (selected?.[0]) await openFolder(selected[0]);
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
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      throw new Error(`Folder not found: ${uri.fsPath}`);
    }
    const recent = context.globalState.get('recentFolders', []);
    await context.globalState.update('recentFolders', updateRecentFolders(recent, uri.fsPath));
    await vscode.commands.executeCommand('vscode.openFolder', uri, { forceReuseWindow: true });
  }

  async function showAgent() {
    if (!vscode.workspace.workspaceFolders?.length) return;
    updateTarget(vscode.window.activeTextEditor);
    await vscode.commands.executeCommand('triplecode.agentView.focus');
    focusAgentComposer();
  }

  function focusAgentComposer() {
    focusComposerOnReady = !agentReady;
    if (agentReady) void agent?.postMessage({ type: 'focus-composer' });
  }

  async function toggleAgent() {
    if (!agentView?.visible) return showAgent();
    focusComposerOnReady = false;
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }

  function resolveAgent(view) {
    agent = view.webview;
    agentView = view;
    agentReady = false;
    const reportVisibility = () => vscode.commands.executeCommand('setContext', 'triplecode.agentVisible', view.visible);
    const visibility = view.onDidChangeVisibility(reportVisibility);
    void reportVisibility();
    setup(agent, 'agent', { target: fileName(activeDocument), pending: describePatch(pending), ...chatState() });
    view.onDidDispose(() => {
      visibility.dispose();
      if (agent === view.webview) {
        agent = undefined;
        agentView = undefined;
        agentReady = false;
        void vscode.commands.executeCommand('setContext', 'triplecode.agentVisible', false);
      }
    });
    agent.onDidReceiveMessage(async message => {
      if (applying) return;
      try {
        switch (message.type) {
          case 'close-agent':
            if (view.visible) await toggleAgent();
            break;
          case 'ready':
            agentReady = true;
            if (pendingTimelineSteps.length) {
              for (const step of pendingTimelineSteps) {
                agent?.postMessage(step);
              }
              pendingTimelineSteps.length = 0;
            }
            void refreshModelChoices().then(() => {
              if (agentReady) agent?.postMessage({ type: 'chats', ...chatState() });
            });
            if (focusComposerOnReady && view.visible) focusAgentComposer();
            break;
          case 'draft':
            if (message.id === currentChat.id && typeof message.value === 'string') {
              currentChat.draft = message.value.slice(0, 500);
              persistChats();
            }
            break;
          case 'mode':
            if (message.id === currentChat.id && ['ask', 'plan', 'agent'].includes(message.mode)) {
              currentChat.mode = message.mode;
              persistChats();
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
          case 'stop':
            if (activeRun?.chat.id === message.id) stopRun('Stopped. Draft kept.');
            break;
          case 'clear-queue':
            if (message.id === currentChat.id && currentChat.queue?.length) {
              currentChat.queue = [];
              persistChats();
              agent?.postMessage({ type: 'chats', ...chatState() });
            }
            break;
          case 'execute-plan': {
            const plan = currentChat.plan;
            if (!plan || message.id !== currentChat.id || message.planId !== plan.id || activeRun || pending) break;
            await propose(buildExecuteRequest(plan), 'agent', { approvedPlan: true });
            break;
          }
          case 'update-plan':
            if (message.id === currentChat.id && currentChat.plan?.id === message.planId && !activeRun && !pending) {
              currentChat.plan = sanitizePlanEdit(currentChat.plan, message.plan);
              persistChats();
              agent?.postMessage({ type: 'chats', ...chatState() });
            }
            break;
          case 'discard-plan':
            if (message.id === currentChat.id && currentChat.plan?.id === message.planId && !activeRun) {
              currentChat.plan = null;
              persistChats();
              agent?.postMessage({ type: 'chats', ...chatState() });
            }
            break;
          case 'select-model':
            await selectModel();
            await refreshModelChoices();
            agent?.postMessage({ type: 'chats', ...chatState() });
            break;
          case 'refresh-models':
            await refreshModelChoices();
            agent?.postMessage({ type: 'chats', ...chatState() });
            break;
          case 'model':
            if (message.value === '__custom__') {
              await selectModel();
            } else {
              await applyModelChoice(message.value);
            }
            await refreshModelChoices();
            agent?.postMessage({ type: 'chats', ...chatState() });
            break;
          case 'attach-menu':
            if (message.id !== currentChat.id) break;
            await showAttachMenu();
            if (message.id === currentChat.id && view.visible) {
              agent?.postMessage({ type: 'chats', ...chatState(), focusPrompt: true });
            }
            break;
          case 'detach-context':
            if (!activeRun && currentChat.attachments && Number.isInteger(message.index)) {
              currentChat.attachments.splice(message.index, 1);
              persistChats();
              agent?.postMessage({ type: 'chats', ...chatState() });
            }
            break;
          case 'attach-file':
            if (!activeRun && !pending && message.id === currentChat.id && typeof message.path === 'string' && message.path.trim()) {
              pushAttachment({ kind: 'file', path: message.path.trim() });
            }
            break;
          case 'review':
            if (pending) await showDiff(pending);
            break;
          case 'check':
            await runCheck();
            break;
          case 'check-patch':
            await runPatchCheck();
            break;
          case 'apply-file':
          case 'discard-file': {
            const patch = pending;
            if (!patch || patch.checking || !Number.isInteger(message.index)) break;
            applying = true;
            try {
              if (message.type === 'apply-file') await apply([message.index]);
              else await discardFile(message.index);
            } finally {
              applying = false;
            }
            break;
          }
          case 'apply':
            applying = true;
            try {
              await apply();
            } finally {
              applying = false;
            }
            break;
          case 'discard':
            if (pending?.checking) throw new Error('Wait for the current working tree check to finish.');
            if (pending) {
              reportUsage({ feature: 'agent', provider: null, model: null, durationMs: 0, outcome: 'rejected' });
              recordHistory('discard', `${pending.request} — ${pending.files.length} file${pending.files.length === 1 ? '' : 's'}`);
              recordActionStep(currentChat, 'edit', 'Discard patch',
                `Dropped ${pending.files.length} file${pending.files.length === 1 ? '' : 's'}`);
            }
            await clearPatch('Changes discarded.');
            break;
        }
      } catch (error) {
        agent?.postMessage({ type: 'error', text: error.message });
      }
    });
  }

  let aiProbe;
  async function aiSetting(key, fallback) {
    return vscode.workspace.getConfiguration('triplecode').get(key, fallback);
  }
  async function openRouterKey() {
    return context.secrets.get('triplecode.openrouterKey') || '';
  }

  async function aiAvailable() {
    const mode = await aiSetting('ai.provider', 'auto');
    if (mode === 'stub') return false;
    if (mode === 'openrouter') {
      if (!(await openRouterKey())) {
        throw new Error('No API key configured. Run “TripleCode: Set API Key” first.');
      }
      return true;
    }
    if (mode === 'ollama') return true;
    if (!aiProbe) {
      aiProbe = provider.probe(await aiSetting('ai.endpoint', 'http://localhost:11434')).catch(() => false);
    }
    return aiProbe;
  }
  function reportUsage({ feature, provider: providerName, model, durationMs, outcome }) {
    getSessionAccessToken().then(token => {
      if (!token) {
        console.warn('[TripleCode usage] no access token, skipping report');
        return;
      }
      fetch('https://triplecode.ru/api/usage/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ feature, provider: providerName, model, duration_ms: durationMs, outcome }),
        signal: AbortSignal.timeout(5000)
      }).catch(error => console.warn('[TripleCode usage] report failed', error.message));
    }).catch(error => console.warn('[TripleCode usage] session lookup failed', error.message));
  }

  async function aiChat(messages, signal, options = {}) {
    const started = Date.now();
    const mode = await aiSetting('ai.provider', 'auto');
    const feature = options.feature || 'other';
    const report = (providerName, model, outcome) => reportUsage({
      feature, provider: providerName, model,
      durationMs: Date.now() - started, outcome
    });
    const addStep = (type, title, description) => {
      if (options.run) addTimelineStep(options.run, type, title, description);
    };
    try {
      if (mode === 'openrouter') {
        const model = await aiSetting('ai.openrouterModel', 'openai/gpt-4o-mini');
        addStep('tool', 'OpenRouter request', `Model: ${model}, Messages: ${messages.length}`);
        const reply = await provider.chatCompletions({
          baseUrl: await aiSetting('ai.openrouterEndpoint', 'https://openrouter.ai/api/v1'),
          apiKey: await openRouterKey(),
          model,
          messages,
          signal,
          maxTokens: options.numPredict || 4096
        });
        report('openrouter', model, 'ok');
        addStep('message', 'OpenRouter response', `Received ${reply.length} chars`);
        return reply;
      }
      const model = await aiSetting('ai.model', 'qwen2.5-coder:7b');
      addStep('tool', 'Ollama request', `Model: ${model}, Messages: ${messages.length}`);
      const reply = await provider.chat({
        endpoint: await aiSetting('ai.endpoint', 'http://localhost:11434'),
        model,
        messages,
        signal,
        numPredict: options.numPredict,
        numCtx: options.numCtx
      });
      report('ollama', model, 'ok');
      addStep('message', 'Ollama response', `Received ${reply.length} chars`);
      return reply;
    } catch (error) {
      report(mode === 'openrouter' ? 'openrouter' : 'ollama', null, signal?.aborted ? 'stopped' : 'error');
      throw error;
    }
  }
  function isContextExcluded(document) {
    return isSensitivePath(document.uri.fsPath);
  }

  const projectTreeExclude = '**/{node_modules,.git,dist,build,out,coverage,.next,.turbo,.venv,vendor}/**';

  async function projectTree(root, limit = 600) {
    if (!root) return '';
    try {
      const files = await vscode.workspace.findFiles('**/*', projectTreeExclude, limit);
      return files
        .map(uri => vscode.workspace.asRelativePath(uri))
        .filter(rel => !isSensitivePath(rel))
        .join('\n');
    } catch {
      return '';
    }
  }

  function repoRules() {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return '';
    try {
      return readFileSync(join(root, '.triplecode', 'rules.md'), 'utf-8').trim().slice(0, RULES_LIMIT);
    } catch {
      return '';
    }
  }

  function aiContextDocuments() {
    const documents = [];
    const seen = new Set();
    const push = document => {
      if (document && !document.isClosed && document.uri.scheme === 'file' &&
          vscode.workspace.getWorkspaceFolder(document.uri) && !seen.has(document.uri.toString()) &&
          !isContextExcluded(document)) {
        seen.add(document.uri.toString());
        documents.push(document);
      }
    };
    push(vscode.window.activeTextEditor?.document);
    for (const document of candidateDocuments()) push(document);
    return documents.slice(0, 4);
  }

  async function openModelFile(rawPath, root) {
    let fsPath = rawPath.trim().replace(/^['"]+|['"]+$/g, '');
    if (!isAbsolute(fsPath)) {
      if (!root) throw new Error('No workspace folder is open for relative model paths.');
      fsPath = join(root, fsPath);
    }
    const normalized = normalize(fsPath);
    if (root) {
      const rel = relative(root, normalized);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`The model tried to edit a file outside the workspace: ${rawPath}`);
      }
    }
    try {
      return await vscode.workspace.openTextDocument(vscode.Uri.file(normalized));
    } catch {
      throw new Error(`The model referenced a file that does not exist: ${rawPath}`);
    }
  }

  function aiParseError(reply) {
    const preview = reply.length > 300 ? `${reply.slice(0, 300)}…` : reply;
    return new Error(`The model response could not be parsed. Try rephrasing the request.\n\nModel said:\n${preview}`);
  }

  function attachmentSuffix(attachments) {
    if (!attachments.length) return '';
    const parts = attachments.map(attachment => attachment.kind === 'selection'
      ? `- selection from ${attachment.label}:\n\`\`\`\n${attachment.text}\n\`\`\``
      : `- file: ${attachment.path}`);
    return `\n\nAttached context:\n${parts.join('\n')}`;
  }

  async function aiSpecs(request, extraDocuments, run) {
    const documents = [];
    const seenDocs = new Set();
    for (const document of [...extraDocuments, ...run.documents]) {
      if (document && !document.isClosed && !seenDocs.has(document.uri.toString())) {
        seenDocs.add(document.uri.toString());
        documents.push(document);
      }
    }
    documents.splice(6);
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!documents.length && !root) throw new Error('Open a source file first.');
    const tree = await projectTree(root);
    if (tree) addTimelineStep(run, 'tool', 'Project map', `Indexed ${tree.split('\n').length} project files`);
    const options = { numPredict: 8192, numCtx: 32768, feature: 'agent', run };
    const maxContextDocs = 12;
    const extraDocs = [];
    const knownUris = new Set(documents.map(document => document.uri.toString()));

    let contextDocs = documents;
    const ask = async () => {
      postProgress(run, 'Waiting for model…');
      const text = await aiChat(provider.multiFileMessages(contextDocs, request, tree), run.signal, options);
      run.signal.throwIfAborted();
      const result = provider.parseMultiRewrite(text);
      if (!result) throw aiParseError(text);
      return result;
    };

    let parsed = await ask();
    if (parsed.answer) return { reply: parsed.answer };

    for (let round = 0; round < 3 && !parsed.noChange; round++) {
      const wanted = [...parsed.files.map(entry => entry.path), ...(parsed.reads || [])];
      if (!wanted.length) break;
      const missing = [];
      const requested = new Set();
      for (const path of wanted.slice(0, 16)) {
        run.signal.throwIfAborted();
        try {
          const document = await openModelFile(path, root);
          if (!knownUris.has(document.uri.toString()) && !requested.has(document.uri.toString())) {
            requested.add(document.uri.toString());
            missing.push(document);
          }
        } catch { /* invalid paths are rejected again on the final pass */ }
      }
      if (!missing.length) break;
      for (const document of missing) {
        extraDocs.push(document);
        knownUris.add(document.uri.toString());
      }
      contextDocs = [...documents, ...extraDocs].slice(0, maxContextDocs);
      postProgress(run, 'Expanding context…');
      addTimelineStep(run, 'tool', 'Expand context', `Round ${round + 1}: adding ${missing.length} file${missing.length === 1 ? '' : 's'} to context`);
      parsed = await ask();
      if (parsed.answer) return { reply: parsed.answer };
    }
    run.signal.throwIfAborted();
    const contextUris = new Set(contextDocs.map(document => document.uri.toString()));

    if (parsed.noChange) {
      return { reply: `The model did not propose a change.${parsed.reason ? ` ${parsed.reason}` : ''}` };
    }

    const specs = [];
    const seenPaths = new Set();
    const failedPaths = [];
    let dropped = 0;
    for (const entry of parsed.files.slice(0, 8)) {
      run.signal.throwIfAborted();
      let document;
      try {
        document = await openModelFile(entry.path, root);
        addTimelineStep(run, 'edit', 'Process file', `Computing diff for ${entry.path}`);
      } catch (error) {
        failedPaths.push(`${entry.path} — ${error.message}`);
        continue;
      }
      if (seenPaths.has(document.uri.toString())) continue;
      if (!contextUris.has(document.uri.toString())) {
        dropped++;
        continue;
      }
      seenPaths.add(document.uri.toString());
      const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
      const edit = provider.diffEdit(document.getText(), entry.content, eol);
      if (edit) specs.push({ document, edit });
    }
    if (!specs.length && failedPaths.length) {
      throw new Error(`The model referenced files that could not be opened:\n${failedPaths.join('\n')}`);
    }
    if (dropped) {
      addTimelineStep(run, 'message', 'Skipped files', `${dropped} proposed file${dropped === 1 ? '' : 's'} exceeded the context limit and ${dropped === 1 ? 'was' : 'were'} not included in the patch`);
    }
    return specs.length ? { specs } : { reply: 'The model did not propose a change.' };
  }

  async function aiOrFallback(signal, primary, fallback) {
    try {
      return await primary();
    } catch (error) {
      signal.throwIfAborted();
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw error;
      return fallback();
    }
  }

  function recordHistory(kind, summary, detail = '', checkTarget) {
    const history = context.globalState.get('triplecode.history', []);
    history.unshift({ ts: Date.now(), kind, summary, detail, checkTarget });
    void context.globalState.update('triplecode.history', history.slice(0, 50));
  }

  function checkHistoryScope(entry) {
    if (entry.kind !== 'check') return '';
    if (entry.checkTarget === 'working-tree') return 'Current working tree · Proposed patch not tested';
    if (entry.checkTarget === 'proposed-patch') return 'Proposed patch in isolated copy';
    return 'Check target not recorded';
  }

  function postProgress(run, text) {
    run.signal.throwIfAborted();
    run.progress = { chat: run.chat.id, text, startedAt: run.startedAt };
    agent?.postMessage({ type: 'progress', ...run.progress });
  }

  function addTimelineStep(run, type, title, description) {
    const step = { type, title, description, timestamp: Date.now(), status: 'completed' };
    // Store in chat for persistence
    if (!run.chat.timelineSteps) run.chat.timelineSteps = [];
    run.chat.timelineSteps.push(step);
    if (agent && agentReady) {
      console.log(`[TripleCode timeline] Sending step: ${title}`);
      agent.postMessage({
        type: 'timeline-step',
        chat: run.chat.id,
        item: step
      });
    } else {
      console.log(`[TripleCode timeline] Buffering step: ${title} (agent=${!!agent}, ready=${agentReady})`);
      pendingTimelineSteps.push({ chat: run.chat.id, item: step });
    }
  }

  function recordActionStep(chat, type, title, description) {
    const step = { type, title, description, timestamp: Date.now(), status: 'completed' };
    const last = [...chat.replies].reverse().find(item => item && typeof item === 'object' && item.type === 'timeline');
    if (last) last.steps.push(step);
    else chat.replies.push({ type: 'timeline', steps: [step] });
    persistChats();
    if (currentChat === chat) agent?.postMessage({ type: 'chats', ...chatState() });
  }

  function drainQueue(chat) {
    const item = chat.queue?.shift();
    if (!item) return;
    persistChats();
    propose(item.request, item.mode, { queued: true })
      .catch(error => agent?.postMessage({ type: 'error', text: error.message }));
  }

  function finishRun(run, status = '') {
    if (!isActiveRun(activeRun, run)) return;
    clearTimeout(run.timeout);
    activeRun = undefined;
    run.chat.status = status;
    if (run.chat.timelineSteps?.length) {
      run.chat.replies.push({ type: 'timeline', steps: run.chat.timelineSteps });
      run.chat.timelineSteps = [];
    }
    persistChats();
    if (currentChat === run.chat) agent?.postMessage({ type: 'chats', ...chatState() });
    if (!pending && run.chat === currentChat) drainQueue(run.chat);
  }

  function stopRun(status) {
    const run = activeRun;
    if (!run) return;
    run.controller.abort();
    finishRun(run, status);
  }

  function completeChatTurn(chat, reply, plan = null, keepComposer = false) {
    if (!keepComposer) {
      chat.draft = '';
      chat.attachments = [];
    }
    chat.plan = plan;
    // Persist timeline steps as part of chat history
    if (chat.timelineSteps && chat.timelineSteps.length) {
      chat.replies.push({ type: 'timeline', steps: chat.timelineSteps });
      chat.timelineSteps = [];
    }
    if (reply) chat.replies.push(reply);
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

  function planRequest(request, document) {
    const all = /^comment all:/i.test(request.trim());
    const documents = all ? candidateDocuments().filter(doc => supportsComments(doc.languageId)).slice(0, 12)
      : document && supportsComments(document.languageId) ? [document] : [];
    if (!documents.length) return 'Open a source file that supports // comments first.';
    const steps = documents.map((document, index) =>
      `${index + 1}. Insert a comment at the top of ${fileName(document)}.`);
    return [`Plan for “${request}”:`, ...steps, 'Switch to Agent mode and resend the request to apply it.'].join('\n');
  }

  async function propose(request, mode = 'agent', { approvedPlan = false, queued = false } = {}) {
    if (pending) throw new Error('Apply or discard the current patch first.');
    if (!allowRequestLength(request, { approvedPlan })) {
      throw new Error('Enter a request of up to 500 characters.');
    }
    const chat = currentChat;
    if (activeRun) {
      const queue = chat.queue || (chat.queue = []);
      if (queue.length >= 3) throw new Error('Queue is full (3). Wait for the current run or stop it.');
      queue.push({ request: request.trim(), mode });
      chat.draft = '';
      persistChats();
      agent?.postMessage({ type: 'chats', ...chatState() });
      return;
    }
    if (!approvedPlan && !queued) chat.draft = request;
    chat.status = '';
    persistChats();
    const controller = new AbortController();
    const run = {
      chat, controller, signal: controller.signal, startedAt: Date.now(),
      document: activeDocument, documents: aiContextDocuments(), approvedPlan
    };
    activeRun = run;
    const timeoutMs = vscode.workspace.getConfiguration('triplecode').get('ai.timeoutMs', 300000);
    run.timeout = setTimeout(() => {
      if (activeRun === run) stopRun('Agent timed out. Draft kept.');
    }, timeoutMs);
    try {
      await proposeInRun(request.trim(), mode, run);
      finishRun(run);
    } catch (error) {
      if (!run.signal.aborted) finishRun(run, error.message);
    }
  }

  async function proposeInRun(trimmed, mode, run) {
    const { chat, document, signal } = run;
    const attachments = run.approvedPlan ? [] : chat.attachments || [];
    postProgress(run, 'Checking provider…');
    chat.replies.push({ type: 'request', text: trimmed });
    persistChats();
    agent?.postMessage({ type: 'chats', ...chatState() });
    addTimelineStep(run, 'step', 'Checking provider', 'Verifying AI provider availability');
    const useAi = await aiAvailable();
    signal.throwIfAborted();
    if (run.approvedPlan && !useAi) throw new Error('The approved plan requires an AI provider. Check the connection and retry.');
    const rules = repoRules();
    const withRules = rulesSuffix(rules);
    const aiRequest = trimmed + attachmentSuffix(attachments) + withRules;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (mode === 'ask') {
      const tree = useAi ? await projectTree(root) : '';
      if (tree) addTimelineStep(run, 'tool', 'Project map', `Indexed ${tree.split('\n').length} project files`);
      const fallback = () => answerAsk(document, trimmed);
      const reply = useAi
        ? await aiOrFallback(signal, () => {
          postProgress(run, 'Waiting for model…');
          addTimelineStep(run, 'tool', 'Ask request', 'Sending ask-mode request to AI');
          return aiChat(provider.askMessages(document, aiRequest, tree), signal, { feature: 'ask', run });
        }, fallback)
        : fallback();
      signal.throwIfAborted();
      addTimelineStep(run, 'message', 'Ask response', 'Received response from AI');
      completeChatTurn(chat, reply, chat.plan);
      return;
    }
    if (mode === 'plan') {
      if (!useAi) {
        completeChatTurn(chat, planRequest(trimmed, document), chat.plan);
        return;
      }
      postProgress(run, 'Waiting for model…');
      const tree = await projectTree(root);
      if (tree) addTimelineStep(run, 'tool', 'Project map', `Indexed ${tree.split('\n').length} project files`);
      addTimelineStep(run, 'tool', 'Plan request', 'Sending plan-mode request to AI');
      const plan = await aiChat(provider.planMessages(document, aiRequest, tree), signal, { feature: 'plan', run });
      signal.throwIfAborted();
      addTimelineStep(run, 'message', 'Plan response', 'Received plan from AI');
      completeChatTurn(chat, plan, { id: randomUUID(), task: trimmed, plan });
      return;
    }

    const id = randomUUID();
    let specs;
    if (useAi) {
      const extraDocuments = [];
      for (const attachment of attachments.filter(a => a.kind === 'file')) {
        signal.throwIfAborted();
        try {
          extraDocuments.push(await openModelFile(attachment.path, root));
          addTimelineStep(run, 'tool', 'Open file', `Reading ${attachment.path}`);
        } catch { /* skip attachments that are not accessible files */ }
      }
      const selectionSuffix = attachments.filter(a => a.kind === 'selection')
        .map(a => `\`\`\`\n${a.text}\n\`\`\``).join('\n');
      const agentRequest = trimmed + (selectionSuffix ? `\n\nAttached selection:\n${selectionSuffix}` : '') + withRules;
      signal.throwIfAborted();
      if (/^(analy[sz]e|explain|describe|summari[sz]e|review|what|how|why|list|show|overview|architecture|audit|inspect|examine|walk)\b/i.test(trimmed)) {
        const tree = await projectTree(root);
        if (tree) addTimelineStep(run, 'tool', 'Project map', `Indexed ${tree.split('\n').length} project files`);
        postProgress(run, 'Waiting for model…');
        addTimelineStep(run, 'tool', 'Agent request', 'Sending analysis request to AI');
        const reply = await aiChat(provider.askMessages(document, agentRequest, tree), signal, { feature: 'agent', run });
        signal.throwIfAborted();
        completeChatTurn(chat, reply, null, run.approvedPlan);
        return;
      }
      addTimelineStep(run, 'tool', 'Agent request', 'Sending agent-mode request to AI');
      const result = await aiSpecs(agentRequest, extraDocuments, run);
      signal.throwIfAborted();
      if (result.reply) {
        completeChatTurn(chat, result.reply, null, run.approvedPlan);
        return;
      }
      specs = result.specs;
    } else {
      const all = /^comment all:\s*(.+)$/i.exec(trimmed);
      const single = /^add a comment:\s*(.+)$/i.exec(trimmed);
      let documents;
      let body;
      if (all) {
        documents = candidateDocuments().filter(document => supportsComments(document.languageId)).slice(0, 12);
        body = all[1];
        if (!documents.length) throw new Error('No open source files support // comments.');
      } else if (single) {
        if (!document || document.isClosed) throw new Error('Open a source file first.');
        if (!supportsComments(document.languageId)) throw new Error('Open a source file that supports // comments.');
        documents = [document];
        body = single[1];
      } else {
        throw new Error('Try “add a comment: text” for one file or “comment all: text” for every open source file.');
      }
      specs = documents.map(document => {
        const before = document.getText();
        return {
          document,
          edit: commentEdit(before, document.languageId,
            document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n', body)
        };
      });
    }

    postProgress(run, 'Building review…');
    addTimelineStep(run, 'step', 'Building review', `Processing ${specs.length} file${specs.length === 1 ? '' : 's'}`);
    const files = specs.map((spec, index) => {
      const document = spec.document;
      const before = document.getText();
      const base = vscode.Uri.from({ scheme: 'triplecode-review', path: `/${id}/${index}/${document.uri.path.split('/').pop()}` });
      const original = base.with({ path: base.path.replace(`/${id}/`, `/${id}/original/`) });
      const modified = original.with({ path: original.path.replace('/original/', '/proposed/') });
      patches.set(original.toString(), before);
      patches.set(modified.toString(), applyEdit(before, spec.edit));
      return { document, before, edit: spec.edit, original, modified, column: vscode.window.activeTextEditor?.viewColumn };
    });
    pending = { request: trimmed, files, checks: [] };
    recordHistory('propose', `${trimmed} — ${files.length} file${files.length === 1 ? '' : 's'}`);
    addTimelineStep(run, 'message', 'Review ready', `Patch with ${files.length} file${files.length === 1 ? '' : 's'} ready for review`);
    completeChatTurn(chat, undefined, null, run.approvedPlan);
    agent?.postMessage({ type: 'pending', patch: describePatch(pending) });
  }

  function describePatch(patch) {
    if (!patch) return null;
    return {
      request: patch.request,
      checks: patch.checks,
      checking: Boolean(patch.checking),
      files: patch.files.map(file => {
        const removed = file.edit.deleteLength
          ? file.before.slice(file.edit.offset, file.edit.offset + file.edit.deleteLength).replace(/\n$/, '').split('\n').length
          : 0;
        const lines = file.edit.insertion.replace(/\r/g, '').trimEnd().split('\n');
        return {
          name: fileName(file.document),
          lines: lines.length > 300 ? [...lines.slice(0, 300), '…'] : lines,
          removed,
          start: file.document.positionAt(file.edit.offset).line + 1
        };
      })
    };
  }

  async function showDiff(patch) {
    for (const file of patch.files) {
      await vscode.commands.executeCommand('vscode.diff', file.original, file.modified,
        `Review changes · ${fileName(file.document)}`, { preview: false, viewColumn: file.column ?? vscode.ViewColumn.One });
    }
  }

  async function apply(indices) {
    const patch = pending;
    if (!patch) return;
    if (patch.checking) throw new Error('Wait for the current working tree check to finish.');
    const targets = selectFiles(patch.files, indices);
    if (!targets.length) return;
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const file of targets) {
      const document = await vscode.workspace.openTextDocument(file.document.uri);
      if (isStale(file.before, document.getText())) {
        throw new Error(`${fileName(file.document)} changed after review. Discard that file from the patch and try again.`);
      }
      const start = document.positionAt(file.edit.offset);
      const end = document.positionAt(file.edit.offset + (file.edit.deleteLength || 0));
      workspaceEdit.replace(file.document.uri, new vscode.Range(start, end), file.edit.insertion);
    }
    if (pending !== patch) return;
    if (!await vscode.workspace.applyEdit(workspaceEdit)) throw new Error('The editor could not apply the patch.');
    recordActionStep(currentChat, 'edit', 'Apply patch', `Applied ${targets.length} file${targets.length === 1 ? '' : 's'}`);
    reportUsage({ feature: 'agent', provider: null, model: null, durationMs: 0, outcome: 'accepted' });
    appliedOps.push({
      request: patch.request,
      files: targets.map(file => ({
        uri: file.document.uri,
        before: file.before,
        after: applyEdit(file.before, file.edit)
      }))
    });
    if (appliedOps.length > 10) appliedOps.shift();
    const total = patch.files.length;
    const applied = new Set(targets);
    recordHistory('apply', `${patch.request} — ${targets.length} of ${total} file${total === 1 ? '' : 's'} applied`);
    patch.files = remainingAfterApply(patch.files, applied);
    for (const file of targets) {
      patches.delete(file.original.toString());
      patches.delete(file.modified.toString());
      const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
        tab.input instanceof vscode.TabInputTextDiff && tab.input.original.toString() === file.original.toString());
      if (tabs.length) await vscode.window.tabGroups.close(tabs, true);
    }
    if (!patch.files.length) {
      await clearPatch('Changes applied in the editor. Save the files when ready.');
    } else {
      agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
    }
    const first = targets[0];
    const document = await vscode.workspace.openTextDocument(first.document.uri);
    await vscode.window.showTextDocument(document, { viewColumn: first.column ?? vscode.ViewColumn.One });
  }

  async function discardFile(index) {
    const patch = pending;
    if (!patch || !patch.files[index]) return;
    const [file] = patch.files.splice(index, 1);
    recordActionStep(currentChat, 'edit', 'Discard file', `Dropped ${fileName(file.document)}`);
    reportUsage({ feature: 'agent', provider: null, model: null, durationMs: 0, outcome: 'rejected' });
    recordHistory('discard', `${patch.request} — dropped ${fileName(file.document)} from patch`);
    patches.delete(file.original.toString());
    patches.delete(file.modified.toString());
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
      tab.input instanceof vscode.TabInputTextDiff && tab.input.original.toString() === file.original.toString());
    try {
      if (tabs.length) await vscode.window.tabGroups.close(tabs, true);
    } finally {
      if (!patch.files.length) {
        await clearPatch('Patch discarded.');
      } else {
        agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
      }
    }
  }

  function execCheck(command, cwd) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd, timeout: 60000, maxBuffer: 512 * 1024 }, (error, out, err) => {
        if (error && typeof error.code !== 'number') return reject(error);
        resolve({ stdout: out, stderr: err, code: error ? error.code : 0 });
      });
    });
  }

  function recordCheck(patch, command, result, target) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    const tail = output.split('\n').slice(-8).join('\n');
    patch.checks.push({ command, code: result.code, output: tail, target });
    recordHistory('check', `${command} — exit ${result.code}`, tail.split('\n')[0] ?? '', target);
  }

  async function undoLastApply() {
    const batch = appliedOps.pop();
    if (!batch) {
      await vscode.window.showInformationMessage('No AI-applied changes to undo.');
      return;
    }
    const texts = new Map();
    for (const file of batch.files) {
      const document = await vscode.workspace.openTextDocument(file.uri);
      texts.set(file.uri.toString(), document.getText());
    }
    const { restorable, conflicted } = classifyUndo(
      batch.files.map(file => ({ ...file, uri: file.uri.toString() })),
      uri => texts.get(uri)
    );
    const workspaceEdit = new vscode.WorkspaceEdit();
    for (const file of restorable) {
      const document = await vscode.workspace.openTextDocument(batch.files.find(item => item.uri.toString() === file.uri).uri);
      const end = document.positionAt(document.getText().length);
      workspaceEdit.replace(document.uri, new vscode.Range(document.positionAt(0), end), file.before);
    }
    const restored = restorable.length;
    if (restored && !await vscode.workspace.applyEdit(workspaceEdit)) {
      appliedOps.push(batch);
      throw new Error('The editor could not undo the patch.');
    }
    if (conflicted.length) {
      const conflictedUris = new Set(conflicted.map(file => file.uri));
      appliedOps.push({
        request: batch.request,
        files: batch.files.filter(file => conflictedUris.has(file.uri.toString()))
      });
    }
    recordHistory('undo', `${batch.request} — restored ${restored} of ${batch.files.length} file${batch.files.length === 1 ? '' : 's'}`);
    recordActionStep(currentChat, 'edit', 'Undo last apply',
      `Restored ${restored} of ${batch.files.length} file${batch.files.length === 1 ? '' : 's'}`);
    if (conflicted.length) {
      const names = conflicted.map(file => file.uri.split('/').pop());
      await vscode.window.showWarningMessage(
        `Undo skipped ${conflicted.length} file${conflicted.length === 1 ? '' : 's'} changed since apply: ${names.join(', ')}`);
    } else {
      await vscode.window.showInformationMessage(`Undid AI changes in ${restored} file${restored === 1 ? '' : 's'}.`);
    }
  }

  async function runCheck() {
    const patch = pending;
    if (!patch || patch.checking) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) throw new Error('Open a project folder first.');
    const command = vscode.workspace.getConfiguration('triplecode').get('checkCommand', 'npm test');
    patch.checking = true;
    agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
    try {
      const result = await execCheck(command, folder.uri.fsPath);
      recordCheck(patch, command, result, 'working-tree');
      recordActionStep(currentChat, 'command', 'Run checks', `${command} — exit ${result.code}`);
    } finally {
      patch.checking = false;
      if (pending === patch) agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
    }
  }

  async function runPatchCheck() {
    const patch = pending;
    if (!patch || patch.checking) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) throw new Error('Open a project folder first.');
    const command = vscode.workspace.getConfiguration('triplecode').get('checkCommand', 'npm test');
    const root = folder.uri.fsPath;
    const scratch = await mkdtemp(join(tmpdir(), 'triplecode-patch-'));
    patch.checking = true;
    agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
    try {
      await cp(root, scratch, {
        recursive: true,
        filter: source => {
          const name = source.slice(root.length).split(sep)[1];
          return name !== 'node_modules' && name !== '.git';
        }
      });
      const modules = join(root, 'node_modules');
      try {
        await symlink(modules, join(scratch, 'node_modules'), 'dir');
      } catch { /* no dependencies to link */ }
      for (const file of patch.files) {
        const rel = relative(root, file.document.uri.fsPath);
        if (rel.startsWith('..') || isAbsolute(rel)) continue;
        const target = join(scratch, rel);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, applyEdit(file.before, file.edit), 'utf-8');
      }
      const result = await execCheck(command, scratch);
      recordCheck(patch, command, result, 'proposed-patch');
      recordActionStep(currentChat, 'command', 'Check patch', `${command} — exit ${result.code} (isolated copy)`);
    } finally {
      patch.checking = false;
      await rm(scratch, { recursive: true, force: true }).catch(() => {});
      if (pending === patch) agent?.postMessage({ type: 'pending', patch: describePatch(patch) });
    }
  }

  async function clearPatch(text) {
    const patch = pending;
    pending = undefined;
    persistChats();
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
    stopRun('Stopped when switching chats. Draft kept.');
    currentChat = { id: ++nextChatId, draft: '', mode: 'agent', replies: [] };
    chats = [currentChat, ...chats];
    persistChats();
    await showAgent();
    agent?.postMessage({ type: 'chats', ...chatState(), focusPrompt: true });
  }

  function currentModelLabel() {
    const config = vscode.workspace.getConfiguration('triplecode');
    const providerMode = config.get('ai.provider', 'auto');
    if (providerMode === 'openrouter') {
      return config.get('ai.openrouterModel', 'openai/gpt-4o-mini').split('/').pop();
    }
    if (providerMode === 'stub') return 'Stub';
    return config.get('ai.model', 'qwen2.5-coder:7b');
  }

  function currentModelValue() {
    const config = vscode.workspace.getConfiguration('triplecode');
    const providerMode = config.get('ai.provider', 'auto');
    if (providerMode === 'openrouter') return config.get('ai.openrouterModel', 'openai/gpt-4o-mini');
    if (providerMode === 'stub') return 'stub';
    return config.get('ai.model', 'qwen2.5-coder:7b');
  }

  let modelChoices = [];

  async function refreshModelChoices() {
    try {
      const mode = await aiSetting('ai.provider', 'auto');
      if (mode === 'openrouter') {
        modelChoices = [
          'openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-haiku',
          'google/gemini-2.0-flash-001', 'qwen/qwen-2.5-coder-32b-instruct',
          'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'
        ].map(value => ({ value, label: value.split('/').pop() }));
      } else if (mode === 'stub') {
        modelChoices = [];
      } else {
        const endpoint = await aiSetting('ai.endpoint', 'http://localhost:11434');
        const remote = await provider.listOllamaModels(endpoint);
        const models = remote.length ? remote : ['qwen2.5-coder:7b', 'qwen2.5-coder:3b', 'llama3.2:3b'];
        modelChoices = models.map(value => ({ value, label: value }));
      }
    } catch {
      modelChoices = [];
    }
  }

  async function applyModelChoice(value) {
    if (typeof value !== 'string' || !value.trim()) return;
    const mode = await aiSetting('ai.provider', 'auto');
    const config = vscode.workspace.getConfiguration('triplecode');
    if (mode === 'openrouter') {
      await config.update('ai.openrouterModel', value.trim(), vscode.ConfigurationTarget.Global);
    } else if (mode !== 'stub') {
      await config.update('ai.model', value.trim(), vscode.ConfigurationTarget.Global);
    }
  }

  function chatState() {
    return {
      chats: chats.map(chat => ({
        id: chat.id, mode: chat.mode, replies: chat.replies,
        name: chat.name || '', status: chat.status || '', queued: chat.queue?.length || 0,
        plan: chat.plan || null, attachments: chat.attachments || []
      })),
      selected: currentChat.id,
      draft: currentChat.draft,
      plan: currentChat.plan || null,
      attachments: currentChat.attachments || [],
      model: currentModelLabel(),
      modelValue: currentModelValue(),
      models: modelChoices,
      provider: (() => {
        const mode = vscode.workspace.getConfiguration('triplecode').get('ai.provider', 'auto');
        return { openrouter: 'OpenRouter', ollama: 'Ollama', stub: 'Stub' }[mode] || 'Auto';
      })(),
      rules: hasRulesBadge(repoRules()),
      progress: activeRun?.chat === currentChat ? activeRun.progress : null,
      status: currentChat.status || ''
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
      detail: [checkHistoryScope(entry), new Date(entry.ts).toLocaleString()].filter(Boolean).join(' · '),
      description: entry.detail || undefined,
      index
    }));
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Agent check history' });
    if (picked) {
      const entry = history[picked.index];
      await vscode.window.showInformationMessage(
        [entry.summary, checkHistoryScope(entry), entry.detail, new Date(entry.ts).toLocaleString()]
          .filter(Boolean).join('\n')
      );
    }
  }

  async function setApiKey() {
    const key = await vscode.window.showInputBox({
      prompt: 'OpenRouter API key (leave empty to remove the saved key)',
      password: true,
      ignoreFocusOut: true
    });
    if (key === undefined) return;
    if (key.trim()) {
      await context.secrets.store('triplecode.openrouterKey', key.trim());
      await vscode.window.showInformationMessage('OpenRouter API key saved.');
    } else {
      await context.secrets.delete('triplecode.openrouterKey');
      await vscode.window.showInformationMessage('OpenRouter API key removed.');
    }
  }

  async function setInlineApiKey() {
    const key = await vscode.window.showInputBox({
      prompt: 'Inline completion API key for the OpenAI-compatible endpoint (leave empty to remove)',
      password: true,
      ignoreFocusOut: true
    });
    if (key === undefined) return;
    if (key.trim()) {
      await context.secrets.store('triplecode.inlineApiKey', key.trim());
      await vscode.window.showInformationMessage('Inline API key saved.');
    } else {
      await context.secrets.delete('triplecode.inlineApiKey');
      await vscode.window.showInformationMessage('Inline API key removed.');
    }
  }

  async function selectModel() {
    const mode = await aiSetting('ai.provider', 'auto');
    const config = vscode.workspace.getConfiguration('triplecode');
    if (mode === 'openrouter') {
      const current = await aiSetting('ai.openrouterModel', 'openai/gpt-4o-mini');
      const presets = [
        'openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-haiku',
        'google/gemini-2.0-flash-001', 'qwen/qwen-2.5-coder-32b-instruct',
        'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'
      ];
      const picked = await vscode.window.showQuickPick(
        [...presets, '$(edit) Custom model id…'],
        { placeHolder: `OpenRouter model (current: ${current})` }
      );
      if (!picked) return;
      const model = picked.startsWith('$(')
        ? await vscode.window.showInputBox({ prompt: 'OpenRouter model id', value: current })
        : picked;
      if (model?.trim()) {
        await config.update('ai.openrouterModel', model.trim(), vscode.ConfigurationTarget.Global);
      }
      return;
    }
    const endpoint = await aiSetting('ai.endpoint', 'http://localhost:11434');
    const remote = await provider.listOllamaModels(endpoint);
    const models = remote.length ? remote : ['qwen2.5-coder:7b', 'qwen2.5-coder:3b', 'llama3.2:3b'];
    const current = await aiSetting('ai.model', 'qwen2.5-coder:7b');
    const picked = await vscode.window.showQuickPick(
      [...models, '$(edit) Custom model name…', '$(cloud) Switch to OpenRouter…'],
      { placeHolder: `Ollama model (current: ${current})` }
    );
    if (!picked) return;
    if (picked.startsWith('$(cloud)')) {
      await config.update('ai.provider', 'openrouter', vscode.ConfigurationTarget.Global);
      await vscode.window.showInformationMessage('Provider set to OpenRouter. Run “TripleCode: Set API Key” if needed, then “TripleCode: Select Model”.');
      return;
    }
    const model = picked.startsWith('$(')
      ? await vscode.window.showInputBox({ prompt: 'Ollama model name', value: current })
      : picked;
    if (model?.trim()) {
      await config.update('ai.model', model.trim(), vscode.ConfigurationTarget.Global);
    }
  }

  async function showAttachMenu() {
    if (activeRun) return;
    if (pending) {
      await vscode.window.showInformationMessage('Apply or discard the current patch first.');
      return;
    }
    const chat = currentChat;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const items = [];
    if (activeDocument && !activeDocument.isClosed && activeDocument.uri.scheme === 'file') {
      items.push({
        label: '$(file) Active file', description: fileName(activeDocument),
        attachment: { kind: 'file', path: activeDocument.uri.fsPath }
      });
    }
    const editor = vscode.window.activeTextEditor;
    if (editor && !editor.selection.isEmpty) {
      const text = editor.document.getText(editor.selection).slice(0, 4000);
      items.push({
        label: '$(selection) Current selection',
        description: `${fileName(editor.document)} · lines ${editor.selection.start.line + 1}–${editor.selection.end.line + 1}`,
        attachment: {
          kind: 'selection',
          label: `selection · ${fileName(editor.document)}`,
          text
        }
      });
    }
    try {
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx,mjs,cjs}',
        ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**'],
        50
      );
      for (const file of files) {
        if (isSensitivePath(file.fsPath)) continue;
        items.push({
          label: '$(file) ' + (root && file.fsPath.startsWith(root) ? file.fsPath.slice(root.length + 1) : file.fsPath),
          description: file.fsPath,
          attachment: { kind: 'file', path: file.fsPath }
        });
      }
    } catch { /* workspace search unavailable */ }
    if (currentChat !== chat || activeRun) return;
    if (!items.length) {
      await vscode.window.showInformationMessage('Nothing to attach — open a source file or workspace folder first.');
      return;
    }
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: `Attach context to the next request (${currentChat.attachments?.length || 0}/5)`
    });
    if (!picked?.attachment || currentChat !== chat || activeRun || pending) return;
    pushAttachment(picked.attachment);
  }

  function pushAttachment(attachment) {
    currentChat.attachments = currentChat.attachments || [];
    if (attachment.kind === 'file') {
      const gate = canAttachFile(attachment.path, currentChat.attachments);
      if (!gate.ok) {
        if (gate.reason === 'sensitive') {
          void vscode.window.showWarningMessage('That file looks sensitive and was not attached.');
        }
        return;
      }
    } else if (currentChat.attachments.length >= ATTACHMENT_LIMIT) {
      return;
    } else if (currentChat.attachments.some(existing =>
      existing.kind === attachment.kind && existing.text === attachment.text)) {
      return;
    }
    currentChat.attachments.push(attachment);
    persistChats();
    agent?.postMessage({ type: 'chats', ...chatState() });
  }

  function updateChats(id, close) {
    if (pending) return;
    const chat = chats.find(item => item.id === id);
    if (!chat) return;
    if (activeRun && (close ? activeRun.chat === chat : currentChat !== chat)) {
      stopRun('Stopped when switching chats. Draft kept.');
    }
    if (close) {
      chats = chats.filter(item => item !== chat);
      if (!chats.length) chats = [{ id: ++nextChatId, draft: '', mode: 'agent', replies: [] }];
      if (currentChat === chat) currentChat = chats[0];
    } else {
      currentChat = chat;
      if (!activeRun && !pending && chat.queue?.length) drainQueue(chat);
    }
    persistChats();
    agent?.postMessage({ type: 'chats', ...chatState() });
  }

  async function showChatActions() {
    const picked = await vscode.window.showQuickPick([
      { label: '$(edit) Rename current chat…', action: 'rename' },
      { label: '$(list-unordered) Switch to chat…', action: 'switch' },
      { label: '$(discard) Undo last AI apply', command: 'triplecode.undoLastApply' },
      { label: '$(window) Open View…', command: 'workbench.action.openView' },
      { label: '$(close) Hide Agent Panel', command: 'workbench.action.closeAuxiliaryBar' }
    ], { placeHolder: 'Agent actions' });
    if (!picked) return;
    if (picked.action === 'rename') {
      const name = await vscode.window.showInputBox({
        value: currentChat.name || '', prompt: 'Chat name', placeHolder: 'e.g. Fix login flow'
      });
      if (name !== undefined) {
        currentChat.name = name.trim().slice(0, 80);
        persistChats();
        agent?.postMessage({ type: 'chats', ...chatState() });
      }
    } else if (picked.action === 'switch') {
      const items = chats.map(chat => ({
        label: chat.name || `Chat ${chat.id}`,
        description: chat === currentChat ? 'current' : undefined,
        detail: chat.status || undefined,
        chat
      }));
      const target = await vscode.window.showQuickPick(items, { placeHolder: 'Switch to chat' });
      if (target) updateChats(target.chat.id, false);
    } else if (picked.command) {
      await vscode.commands.executeCommand(picked.command);
    }
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
    vscode.commands.registerCommand('triplecode.focusAgent', toggleAgent),
    vscode.commands.registerCommand('triplecode.newChat', newChat),
    vscode.commands.registerCommand('triplecode.checkHistory', showCheckHistory),
    vscode.commands.registerCommand('triplecode.undoLastApply', undoLastApply),
    vscode.commands.registerCommand('triplecode.importFromVSCode', () => showImportPreview(context)),
    vscode.commands.registerCommand('triplecode.importFromFile', () => showFileImport(context)),
    vscode.commands.registerCommand('triplecode.rollbackImport', () => rollbackImport(context)),
    vscode.commands.registerCommand('triplecode.designSystem', () => showDesignSystem(context)),
    vscode.commands.registerCommand('triplecode.setApiKey', setApiKey),
    vscode.commands.registerCommand('triplecode.setInlineApiKey', setInlineApiKey),
    vscode.commands.registerCommand('triplecode.selectModel', selectModel),
    vscode.window.registerWebviewViewProvider('triplecode.agentView', { resolveWebviewView: resolveAgent }, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );
  updateTarget(vscode.window.activeTextEditor);
  if (shouldShowWelcome(vscode.workspace.workspaceFolders?.length || 0)) showWelcome();
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
  const agent = '<div id="agent-root"></div>';
  const assets = {
    close: 'figma-assets/imgX.svg',
    plus: 'imgPlus1.svg',
    actions: 'imgEllipsis.svg',
    chevron: 'figma-assets/imgChevronRight.svg',
    context: 'figma-assets/imgShape.svg',
    attach: 'imgPaperclip.svg',
    send: 'imgPlay.svg',
    crown: 'figma-assets/chat/crown.svg',
    listTodo: 'figma-assets/chat/list-todo.svg',
    messageSquare: 'figma-assets/chat/message-square.svg',
    check: 'figma-assets/chat/check.svg',
    chevronDown: 'figma-assets/dropdown/chevron-down.svg'
  };
  const payload = screen === 'agent' ? {
    ...initial,
    assets: Object.fromEntries(Object.entries(assets).map(([key, name]) => [key, uri(name).toString()]))
  } : initial;
  const script = screen === 'agent' ? 'agent.js' : 'workbench.js';
  const data = JSON.stringify(payload).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src ${webview.cspSource}">
<link rel="stylesheet" href="${uri('tokens.css')}"><link rel="stylesheet" href="${uri('workbench.css')}">
${screen === 'agent' ? `<link rel="stylesheet" href="${uri('design-system/design-system-components.css')}">` : ''}<title>TripleCode</title></head>
<body data-screen="${screen}">${screen === 'welcome' ? welcome : agent}
<script type="application/json" id="initial">${data}</script>
<script src="${uri(script)}" defer></script></body></html>`;
}

module.exports = { activate };
