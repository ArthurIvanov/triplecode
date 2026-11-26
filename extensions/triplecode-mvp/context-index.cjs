'use strict';

const { isSensitivePath } = require('./context-rules.cjs');

const DEFAULT_INDEX_LIMIT = 20000;
const DEFAULT_QUERY_LIMIT = 60;

function createIndex() {
  return { files: new Map(), ready: false, count: 0 };
}

function indexAdd(index, absolutePath) {
  if (!index || typeof absolutePath !== 'string' || !absolutePath) return false;
  if (isSensitivePath(absolutePath)) return false;
  if (index.files.has(absolutePath)) return false;
  index.files.set(absolutePath, { path: absolutePath });
  index.count = index.files.size;
  return true;
}

function indexRemove(index, absolutePath) {
  if (!index || typeof absolutePath !== 'string') return false;
  const removed = index.files.delete(absolutePath);
  index.count = index.files.size;
  return removed;
}

function indexClear(index) {
  if (!index) return;
  index.files.clear();
  index.count = 0;
  index.ready = false;
}

function indexPaths(index) {
  return index?.files ? [...index.files.keys()] : [];
}

function splitSegments(path) {
  return String(path || '').toLowerCase().split(/[\\/]+/).filter(Boolean);
}

/**
 * Rank index paths against a query. Higher score = better match.
 * Scoring prefers basename hits, then path-segment hits, then raw substring.
 */
function scorePath(path, query, root = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return 1;
  const rel = root && path.startsWith(root) ? path.slice(root.length + 1) : path;
  const segments = splitSegments(rel);
  const base = segments[segments.length - 1] || '';
  const full = rel.toLowerCase();
  if (base === q) return 1000;
  if (base.startsWith(q)) return 800 - segments.length;
  if (segments.some(seg => seg === q)) return 600 - segments.length;
  if (segments.some(seg => seg.startsWith(q))) return 400 - segments.length;
  const baseIdx = base.indexOf(q);
  if (baseIdx >= 0) return 300 - baseIdx - segments.length * 0.1;
  const segIdx = segments.findIndex(seg => seg.includes(q));
  if (segIdx >= 0) return 200 - segIdx - segments.length * 0.1;
  const fullIdx = full.indexOf(q);
  if (fullIdx < 0) return 0;
  return 100 - fullIdx * 0.01 - segments.length * 0.1;
}

/**
 * @returns {Array<{path:string, score:number, rel:string}>} sorted best-first.
 */
function queryIndex(index, query, {
  root = '',
  limit = DEFAULT_QUERY_LIMIT,
  sensitive = isSensitivePath,
  boost = null
} = {}) {
  const files = index?.files;
  if (!files || !files.size) return [];
  const q = String(query || '').trim().toLowerCase();
  const out = [];
  for (const path of files.keys()) {
    if (sensitive(path)) continue;
    let score = scorePath(path, q, root);
    if (boost && boost.has(path)) score += 120;
    if (!q || score > 0) {
      const rel = root && path.startsWith(root) ? path.slice(root.length + 1) : path;
      out.push({ path, score, rel });
    }
  }
  out.sort((a, b) => b.score - a.score || a.rel.length - b.rel.length || a.rel.localeCompare(b.rel));
  return out.slice(0, limit);
}

module.exports = {
  DEFAULT_INDEX_LIMIT,
  DEFAULT_QUERY_LIMIT,
  createIndex,
  indexAdd,
  indexRemove,
  indexClear,
  indexPaths,
  scorePath,
  queryIndex
};
