'use strict';

const vscode = require('vscode');
const { readFile, access, readdir, writeFile, mkdir, unlink } = require('node:fs/promises');
const { join, dirname } = require('node:path');
const { homedir } = require('node:os');
const {
  classifySettings, emptyImportReport, importReportMessage,
  hasRollbackMaterial, previewCounts
} = require('./import-logic.cjs');

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
    return JSON.parse(await readFile(join(VS_CODE_USER_PATH, 'settings.json'), 'utf-8'));
  } catch {
    return null;
  }
}

async function readVSCodeKeybindings() {
  try {
    return JSON.parse(await readFile(join(VS_CODE_USER_PATH, 'keybindings.json'), 'utf-8'));
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
        snippets[entry.name] = JSON.parse(await readFile(join(snippetsPath, entry.name), 'utf-8'));
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
          extensions.push({ id: `${match[1]}.${match[2]}`, path: entry.name });
        }
      }
    }
    return extensions;
  } catch {
    return null;
  }
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

async function performImport(selectedCategories, data, context) {
  const { settings, keybindings, snippets, extensions } = data;
  const report = emptyImportReport();

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

  const userDir = userDataDir(context);
  if (userDir) {
    const fileBackup = {};
    if (selectedCategories.keybindings && Array.isArray(keybindings) && keybindings.length) {
      const target = join(userDir.fsPath, 'keybindings.json');
      const existing = await readUserFile(userDir, 'keybindings.json');
      if (existing !== null) {
        try {
          const parsed = JSON.parse(existing);
          fileBackup.keybindings = existing;
          await writeFile(target, JSON.stringify([...parsed, ...keybindings], null, '\t'), 'utf-8');
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
          fileBackup.snippets[fileName] = await readUserFile(vscode.Uri.file(snippetsDir), fileName);
          await writeFile(target, JSON.stringify(snippets[name], null, '\t'), 'utf-8');
        }
        report.snippets = names.length;
      }
    }
    if (Object.keys(fileBackup).length) {
      await context.globalState.update('triplecode.importFileBackup', fileBackup);
    }
  }

  if (selectedCategories.extensions && extensions) {
    const installedExtensions = [];
    for (const ext of extensions) {
      try {
        await vscode.commands.executeCommand('workbench.extensions.install', ext.id);
        installedExtensions.push(ext.id);
        report.extensionsInstalled += 1;
      } catch {
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

  if (!hasRollbackMaterial({ settingsBackup: previousSettings, fileBackup, importedExtensions })) {
    vscode.window.showInformationMessage('No import to rollback.');
    return;
  }

  if (previousSettings) {
    const config = vscode.workspace.getConfiguration();
    for (const [key, value] of Object.entries(previousSettings)) {
      await config.update(key, value === undefined ? undefined : value, vscode.ConfigurationTarget.Global);
    }
  }

  for (const extId of importedExtensions) {
    try {
      await vscode.commands.executeCommand('workbench.extensions.uninstall', extId);
    } catch (error) {
      console.error(`Failed to uninstall extension ${extId}:`, error);
    }
  }

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
          if (content === null) await unlink(target).catch(() => {});
          else await writeFile(target, content, 'utf-8').catch(() => {});
        }
      }
    }
    await context.globalState.update('triplecode.importFileBackup', undefined);
  }

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

function presentImportPreview(data, context, hooks = {}) {
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
      try { await hooks.onImportComplete?.(report); } catch { /* pilot hook must not break import */ }
      vscode.window.showInformationMessage(importReportMessage(report), 'Restart', 'Rollback').then(selection => {
        if (selection === 'Restart') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        } else if (selection === 'Rollback') {
          vscode.commands.executeCommand('triplecode.rollbackImport');
        }
      });
    } else if (message.type === 'import-file') {
      previewPanel.dispose();
      await showFileImport(context, hooks);
    } else if (message.type === 'rollback') {
      await rollbackImport(context);
      previewPanel.dispose();
    } else if (message.type === 'cancel') {
      previewPanel.dispose();
    }
  });
}

async function showImportPreview(context, hooks = {}) {
  const vsCodePath = await findVSCodeInstallation();
  if (!vsCodePath) {
    const action = await vscode.window.showWarningMessage(
      'Visual Studio Code not found on this machine.',
      'Import from File',
      'Cancel'
    );
    if (action === 'Import from File') await showFileImport(context, hooks);
    return;
  }

  const [settings, keybindings, snippets, extensions] = await Promise.all([
    readVSCodeSettings(),
    readVSCodeKeybindings(),
    readVSCodeSnippets(),
    readVSCodeExtensions()
  ]);

  presentImportPreview({ source: vsCodePath, settings, keybindings, snippets, extensions }, context, hooks);
}

async function showFileImport(context, hooks = {}) {
  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { JSON: ['json'] },
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
  presentImportPreview({ source: selected[0].fsPath, settings, keybindings, snippets, extensions: null }, context, hooks);
}

module.exports = {
  showImportPreview,
  showFileImport,
  rollbackImport,
  findVSCodeInstallation,
  VS_CODE_USER_PATH
};
