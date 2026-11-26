'use strict';

const {
  createIndex, indexAdd, indexRemove, indexClear, queryIndex,
  DEFAULT_INDEX_LIMIT, DEFAULT_QUERY_LIMIT
} = require('./context-index.cjs');
const { buildAttachCandidates } = require('./attach-logic.cjs');

const INDEX_EXCLUDE = [
  '**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**',
  '**/build/**', '**/.next/**', '**/coverage/**', '**/media/**',
  '**/*.min.js', '**/*.map', '**/*.png', '**/*.jpg', '**/*.jpeg',
  '**/*.gif', '**/*.ico', '**/*.icns', '**/*.woff', '**/*.woff2',
  '**/*.ttf', '**/*.eot', '**/*.mp4', '**/*.zip', '**/*.tar.gz'
];

/**
 * Host for the local workspace file index (S21 / R-β5).
 * Builds once per workspace folder, then keeps it fresh via file events.
 */
function createContextIndexHost(vscode, {
  onStatus = () => {},
  limit = DEFAULT_INDEX_LIMIT,
  queryLimit = DEFAULT_QUERY_LIMIT,
  findFilesImpl = null
} = {}) {
  let index = createIndex();
  let watcher = null;
  let building = null;
  let root = '';
  let disposed = false;

  function status() {
    return { state: index.ready ? 'ready' : 'indexing', count: index.count, root };
  }

  function emitStatus() {
    try { onStatus(status()); } catch { /* status is best-effort */ }
  }

  async function build() {
    if (disposed) return;
    const folder = vscode.workspace.workspaceFolders?.[0];
    root = folder?.uri.fsPath || '';
    indexClear(index);
    index = createIndex();
    emitStatus();
    if (!root) {
      index.ready = true;
      emitStatus();
      return;
    }
    try {
      const findFiles = findFilesImpl || vscode.workspace.findFiles.bind(vscode.workspace);
      const files = await findFiles('**/*', INDEX_EXCLUDE, limit);
      if (disposed) return;
      for (const file of files) indexAdd(index, file.fsPath);
      index.ready = true;
    } catch (error) {
      index.ready = true;
      emitStatus();
      throw error;
    }
    emitStatus();
  }

  function ensureWatcher() {
    if (watcher || disposed || !root) return;
    try {
      const pattern = new vscode.RelativePattern(root, '**/*');
      watcher = vscode.workspace.createFileSystemWatcher(pattern);
      watcher.onDidCreate(uri => {
        if (indexAdd(index, uri.fsPath)) emitStatus();
      });
      watcher.onDidDelete(uri => {
        if (indexRemove(index, uri.fsPath)) emitStatus();
      });
    } catch { /* watchers unavailable — index still serves stale-safe reads */ }
  }

  async function start() {
    disposed = false;
    building = build().then(() => { ensureWatcher(); }).catch(error => {
      onStatus({ state: 'error', count: 0, root, message: error.message });
    });
    return building;
  }

  function stop() {
    disposed = true;
    if (watcher) {
      watcher.dispose();
      watcher = null;
    }
    indexClear(index);
  }

  function query(queryText = '') {
    return queryIndex(index, queryText, { root, limit: queryLimit });
  }

  /** Ranked attach-picker items: active file + selection first, then index hits. */
  function candidates({ activeFile = null, selection = null } = {}) {
    const ranked = query('').slice(0, queryLimit).map(hit => hit.path);
    return buildAttachCandidates({ root, activeFile, selection, workspaceFiles: ranked });
  }

  function candidatesForQuery(queryText, { activeFile = null, selection = null } = {}) {
    const hits = query(queryText);
    const workspaceFiles = hits.map(hit => hit.path);
    const items = buildAttachCandidates({ root, activeFile, selection, workspaceFiles });
    // buildAttachCandidates emits files in given order; ranked hits already sorted.
    return items;
  }

  return { start, stop, query, candidates, candidatesForQuery, status, isReady: () => index.ready };
}

module.exports = { createContextIndexHost, INDEX_EXCLUDE };
