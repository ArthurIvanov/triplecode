'use strict';

const path = require('node:path');
const { isSensitivePath } = require('./context-rules.cjs');

const INDEX_EXCLUDE_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'out', 'build', 'coverage',
  '.next', '.nuxt', '.turbo', '.cache', '.parcel-cache', 'vendor',
  '__pycache__', '.idea', '.vscode-test', 'target'
]);

const INDEX_BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'icns', 'bmp', 'tiff', 'tif',
  'pdf', 'zip', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'tar', 'dmg', 'iso',
  'exe', 'dll', 'dylib', 'so', 'o', 'a', 'bin', 'dat', 'class', 'jar',
  'pyc', 'pyo', 'wasm', 'mp3', 'wav', 'ogg', 'flac', 'mp4', 'mov', 'avi',
  'mkv', 'webm', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'sqlite', 'sqlite3',
  'db', 'node', 'DS_Store'
]);

function toRelPath(root, absolutePath) {
  if (!root) return String(absolutePath || '').replace(/\\/g, '/');
  const rel = path.relative(root, absolutePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

/** Whether a workspace-relative path belongs in the @ context index. */
function shouldIndexRelativePath(relPath, { sensitive = isSensitivePath } = {}) {
  if (!relPath || typeof relPath !== 'string') return false;
  const normalized = relPath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (!segments.length) return false;
  if (segments.some(segment => INDEX_EXCLUDE_DIRS.has(segment))) return false;
  const base = segments[segments.length - 1];
  const dot = base.lastIndexOf('.');
  if (dot > 0 && INDEX_BINARY_EXT.has(base.slice(dot + 1).toLowerCase())) return false;
  if (sensitive(normalized) || sensitive(base)) return false;
  return true;
}

/**
 * Rank a workspace-relative path against an @ query. Higher is better.
 * Deterministic: ties resolve to shorter path, then alphabetical.
 */
function scorePath(relPath, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return 0;
  const rel = String(relPath || '').replace(/\\/g, '/').toLowerCase();
  const base = rel.split('/').pop() || rel;
  const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
  if (rel === q) return 1000;
  if (base === q) return 950;
  if (stem === q) return 900;
  if (base.startsWith(q)) return 800;
  if (rel.split('/').some(segment => segment.startsWith(q))) return 700;
  if (base.includes(q)) return 600;
  if (rel.includes(q)) return 500;
  // Subsequence fallback: all query chars appear in order.
  let qi = 0;
  for (let i = 0; i < rel.length && qi < q.length; i += 1) {
    if (rel[i] === q[qi]) qi += 1;
  }
  return qi === q.length ? 200 : 0;
}

function compareHits(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (a.rel.length !== b.rel.length) return a.rel.length - b.rel.length;
  return a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0;
}

/**
 * In-memory workspace file index. Paths are stored workspace-relative (posix).
 * add/remove accept either absolute (with root) or already-relative paths.
 */
function createFileIndex({ root = '', sensitive = isSensitivePath } = {}) {
  const files = new Map(); // rel -> true

  function add(candidate) {
    const raw = String(candidate || '');
    if (!raw) return false;
    const rel = path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw)
      ? toRelPath(root, raw)
      : raw.replace(/\\/g, '/');
    if (!rel || !shouldIndexRelativePath(rel, { sensitive })) return false;
    files.set(rel, true);
    return true;
  }

  function remove(candidate) {
    const raw = String(candidate || '');
    const rel = path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw)
      ? toRelPath(root, raw)
      : raw.replace(/\\/g, '/');
    if (rel) files.delete(rel);
    return Boolean(rel);
  }

  function rename(oldPath, newPath) {
    remove(oldPath);
    return add(newPath);
  }

  function clear() {
    files.clear();
  }

  function query(q, { limit = 15 } = {}) {
    const hits = [];
    for (const rel of files.keys()) {
      const score = scorePath(rel, q);
      if (score > 0) hits.push({ rel, score });
    }
    hits.sort(compareHits);
    return hits.slice(0, Math.max(1, limit));
  }

  /** All indexed paths, alphabetical — used for the empty @ query. */
  function all({ limit = Infinity } = {}) {
    const rels = [...files.keys()].sort();
    return Number.isFinite(limit) ? rels.slice(0, limit) : rels;
  }

  return {
    add,
    remove,
    rename,
    clear,
    query,
    all,
    size: () => files.size,
    has: rel => files.has(String(rel).replace(/\\/g, '/'))
  };
}

module.exports = {
  INDEX_EXCLUDE_DIRS,
  INDEX_BINARY_EXT,
  toRelPath,
  shouldIndexRelativePath,
  scorePath,
  createFileIndex
};
