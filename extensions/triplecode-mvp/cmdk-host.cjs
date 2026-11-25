'use strict';

const { randomUUID } = require('node:crypto');
const {
  cmdkMessages, parseCmdkRewrite, applySelectionEdit, selectionTooLarge
} = require('./cmdk-logic.cjs');

/**
 * Register Cmd-K selection edit. Does not write the buffer until Apply.
 * `chatFn(messages, signal)` must return model text; injectable for tests via logic only.
 */
function registerCmdK(vscode, context, {
  chatFn,
  contentMap,
  scheme = 'triplecode-cmdk'
} = {}) {
  if (typeof chatFn !== 'function') throw new Error('cmdk chatFn is required');
  if (!contentMap) throw new Error('cmdk contentMap is required');

  let pending;

  const provider = {
    provideTextDocumentContent(uri) {
      return contentMap.get(uri.toString()) ?? '';
    }
  };

  async function clearPending(closeTabs = true) {
    const current = pending;
    pending = undefined;
    if (!current) return;
    if (closeTabs) {
      const originals = new Set([current.original.toString()]);
      const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
        tab.input instanceof vscode.TabInputTextDiff && originals.has(tab.input.original.toString()));
      if (tabs.length) await vscode.window.tabGroups.close(tabs, true).catch(() => {});
    }
    contentMap.delete(current.original.toString());
    contentMap.delete(current.modified.toString());
  }

  async function editSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.scheme !== 'file') {
      await vscode.window.showInformationMessage('Open a file and select code for Cmd-K edit.');
      return;
    }
    if (editor.selection.isEmpty) {
      await vscode.window.showInformationMessage('Select code first, then press Cmd-K.');
      return;
    }
    if (pending) {
      await vscode.window.showInformationMessage('Apply or discard the current Cmd-K preview first.');
      return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const selected = document.getText(selection);
    if (!selected.trim()) {
      await vscode.window.showInformationMessage('Selection is empty.');
      return;
    }
    if (selectionTooLarge(selected)) {
      await vscode.window.showWarningMessage('Selection is too large for Cmd-K. Narrow the range.');
      return;
    }

    const instruction = await vscode.window.showInputBox({
      title: 'TripleCode Cmd-K',
      prompt: 'How should the selection change?',
      placeHolder: 'Extract function, add types, rewrite…',
      ignoreFocusOut: true
    });
    if (!instruction || !instruction.trim()) return;

    const start = document.offsetAt(selection.start);
    const end = document.offsetAt(selection.end);
    const full = document.getText();
    const before = full.slice(Math.max(0, start - 2000), start);
    const after = full.slice(end, end + 2000);
    const fileName = document.fileName.split('/').pop() || 'file';
    const messages = cmdkMessages({
      fileName,
      languageId: document.languageId,
      selection: selected,
      instruction: instruction.trim(),
      before,
      after
    });

    let reply;
    try {
      reply = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Cmd-K: waiting for model…', cancellable: true },
        async (_progress, token) => {
          const controller = new AbortController();
          token.onCancellationRequested(() => controller.abort());
          return chatFn(messages, controller.signal);
        }
      );
    } catch (error) {
      if (error?.name === 'AbortError') return;
      await vscode.window.showErrorMessage(`Cmd-K failed: ${error.message}`);
      return;
    }

    const parsed = parseCmdkRewrite(reply);
    if (!parsed) {
      await vscode.window.showWarningMessage('Cmd-K could not parse the model reply.');
      return;
    }
    if (parsed.noChange) {
      await vscode.window.showInformationMessage(parsed.reason || 'No change proposed.');
      return;
    }
    if (parsed.content === selected) {
      await vscode.window.showInformationMessage('Model returned the same selection.');
      return;
    }

    const id = randomUUID();
    const baseName = fileName.replace(/[^\w.-]+/g, '_') || 'selection';
    const original = vscode.Uri.from({ scheme, path: `/${id}/original/${baseName}` });
    const modified = vscode.Uri.from({ scheme, path: `/${id}/proposed/${baseName}` });
    const afterFull = applySelectionEdit(full, start, end, parsed.content);
    contentMap.set(original.toString(), full);
    contentMap.set(modified.toString(), afterFull);
    pending = {
      document, selection, replacement: parsed.content,
      original, modified, version: document.version
    };

    await vscode.commands.executeCommand(
      'vscode.diff',
      original,
      modified,
      `Cmd-K · ${fileName} (preview)`
    );

    const choice = await vscode.window.showInformationMessage(
      'Apply Cmd-K edit to the file?',
      { modal: false },
      'Apply',
      'Discard'
    );
    if (choice !== 'Apply') {
      await clearPending(true);
      return;
    }
    if (document.isClosed || document.version !== pending.version) {
      await clearPending(true);
      await vscode.window.showWarningMessage('Document changed since preview. Cmd-K edit was not applied.');
      return;
    }
    const ok = await editor.edit(editBuilder => {
      editBuilder.replace(selection, parsed.content);
    });
    await clearPending(true);
    if (!ok) await vscode.window.showErrorMessage('The editor could not apply the Cmd-K edit.');
  }

  async function discardCmdk() {
    await clearPending(true);
  }

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(scheme, provider),
    vscode.commands.registerCommand('triplecode.editSelection', editSelection),
    vscode.commands.registerCommand('triplecode.discardCmdk', discardCmdk)
  );

  return { editSelection, discardCmdk, clearPending };
}

module.exports = { registerCmdK };
