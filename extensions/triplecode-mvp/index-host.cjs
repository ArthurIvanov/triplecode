'use strict';

const path = require('node:path');
const { createFileIndex } = require('./context-index.cjs');

const INDEX_FILE_LIMIT = 30000;
const INDEX_SEARCH_LIMIT = 30;
const INDEX_EXCLUDE_GLOB = [
  '**/.git/**', '**/node_modules/**', '**/dist/**', '**/out/**', '**/build/**',
  '**/coverage/**', '**/.next/**', '**/.nuxt/**', '**/.turbo/**', '**/.cache/**',
  '**/.parcel-cache/**', '**/__pycache__/**', '**/.idea/**', '**/.vscode-test/**',
  '**/target/**', '**/vendor/**'
];

/**
 * Workspace file index for the @ context picker (S21 / R-β5).
 * Local disk only; rebuilt on folder changes, kept fresh via fs watcher.
 */
function registerContextIndex(vscode, context, { onStatus } = {}) {
  const index = createFileIndex({ root: () => workspaceRoot() });
  let state = 'cold';
  let buildToken = 0;
  let watcher;
  let rebuildTimer;

  function workspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  function emitStatus() {
    onStatus?.({ state, count: index.size() });
  }

  function ensureWatcher() {
    if (watcher) return;
    try {
      watcher = vscode.workspace.createFileSystemWatcher('**/*');
      watcher.onDidCreate(uri => { index.add(uri.fsPath); });
      watcher.onDidDelete(uri => { index.remove(uri.fsPath); });
      watcher.onDidRename(event => { index.rename(event.oldUri.fsPath, event.newUri.fsPath); });
      context.subscriptions.push(watcher);
    } catch { /* watcher unavailable — index still serves last snapshot */ }
  }

  async function rebuild() {
    const token = ++buildToken;
    state = 'indexing';
    emitStatus();
    index.clear();
    try {
      const files = await vscode.workspace.findFiles('**/*', INDEX_EXCLUDE_GLOB, INDEX_FILE_LIMIT);
      for (const file of files) index.add(file.fsPath);
    } catch { /* findFiles unavailable */ }
    if (token !== buildToken) return;
    state = 'ready';
    emitStatus();
    ensureWatcher();
  }

  function scheduleRebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => { void rebuild(); }, 250);
  }

  function search(query, { limit = INDEX_SEARCH_LIMIT } = {}) {
    const q = String(query || '').trim();
    const root = workspaceRoot();
    if (state !== 'ready') return { state, count: index.size(), hits: [] };
    const entries = q
      ? index.query(q, { limit })
      : index.all({ limit }).map(rel => ({ rel, score: 0 }));
    const hits = entries.map(hit => ({
      path: root ? path.join(root, ...hit.rel.split('/')) : hit.rel,
      rel: hit.rel,
      score: hit.score
    }));
    return { state, count: index.size(), hits };
  }

  function stats() {
    return { state, count: index.size() };
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(scheduleRebuild)
  );
  scheduleRebuild();

  return { search, stats, rebuild, dispose: () => clearTimeout(rebuildTimer) };
}

module.exports = { registerContextIndex, INDEX_EXCLUDE_GLOB, INDEX_FILE_LIMIT, INDEX_SEARCH_LIMIT };
