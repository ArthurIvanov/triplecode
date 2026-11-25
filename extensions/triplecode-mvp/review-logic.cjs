'use strict';

/** Apply a single text edit to a before-string. */
function applyEdit(before, edit) {
  const deleteLength = edit.deleteLength || 0;
  return before.slice(0, edit.offset) + edit.insertion + before.slice(edit.offset + deleteLength);
}

/** Select files by indices; empty/undefined indices → all files. */
function selectFiles(files, indices) {
  if (!indices) return files.slice();
  return indices.map(index => files[index]).filter(Boolean);
}

/**
 * Partition an applied batch into restorable vs conflicted files.
 * @param {{ uri: string, before: string, after: string }[]} files
 * @param {(uri: string) => string} readText
 */
function classifyUndo(files, readText) {
  const restorable = [];
  const conflicted = [];
  for (const file of files) {
    if (readText(file.uri) === file.after) restorable.push(file);
    else conflicted.push(file);
  }
  return { restorable, conflicted };
}

/** Stale if current document text differs from snapshot at review time. */
function isStale(before, current) {
  return before !== current;
}

function checkScopeLabel(target) {
  if (target === 'working-tree') return 'Current working tree';
  if (target === 'proposed-patch') return 'Proposed patch · isolated copy';
  return String(target || '');
}

/**
 * Late-response guard: only the active run may finish/mutate.
 * @returns {boolean} true if this run still owns the turn
 */
function isActiveRun(activeRun, run) {
  return activeRun === run;
}

/**
 * After partial keep, remaining proposal files.
 */
function remainingAfterApply(files, appliedSet) {
  return files.filter(file => !appliedSet.has(file));
}

function lineIndexAt(text, offset) {
  if (offset <= 0) return 0;
  return text.slice(0, Math.min(offset, text.length)).split('\n').length - 1;
}

/**
 * Build a small unified hunk preview for chat (ctx / del / add).
 * Full review stays in Monaco; this is the in-panel summary.
 */
function describeEditHunk(before, edit, contextLines = 3) {
  const source = typeof before === 'string' ? before : '';
  const offset = Math.max(0, Number(edit?.offset) || 0);
  const deleteLength = Math.max(0, Number(edit?.deleteLength) || 0);
  const insertion = typeof edit?.insertion === 'string' ? edit.insertion.replace(/\r/g, '') : '';
  const lines = source.split('\n');
  const startLine = lineIndexAt(source, offset);
  const endOffset = offset + deleteLength;
  const endLine = deleteLength === 0
    ? startLine
    : lineIndexAt(source, Math.max(offset, endOffset - (endOffset > offset ? 1 : 0)));
  const ctxFrom = Math.max(0, startLine - contextLines);
  const ctxTo = Math.min(lines.length - 1, endLine + contextLines);

  const hunk = [];
  for (let i = ctxFrom; i < startLine; i += 1) {
    hunk.push({ type: 'ctx', text: lines[i], line: i + 1 });
  }

  const deleted = source.slice(offset, offset + deleteLength);
  const delLines = deleteLength
    ? (deleted.endsWith('\n') ? deleted.slice(0, -1) : deleted).split('\n')
    : [];
  for (let i = 0; i < delLines.length; i += 1) {
    hunk.push({ type: 'del', text: delLines[i], line: startLine + i + 1 });
  }

  const addLines = insertion === ''
    ? []
    : (insertion.endsWith('\n') ? insertion.slice(0, -1) : insertion).split('\n');
  for (const text of addLines) {
    hunk.push({ type: 'add', text });
  }

  for (let i = endLine + 1; i <= ctxTo; i += 1) {
    hunk.push({ type: 'ctx', text: lines[i], line: i + 1 });
  }

  return {
    startLine: startLine + 1,
    hunk,
    added: addLines.length,
    removed: delLines.length
  };
}

module.exports = {
  applyEdit,
  selectFiles,
  classifyUndo,
  isStale,
  checkScopeLabel,
  isActiveRun,
  remainingAfterApply,
  describeEditHunk,
  lineIndexAt
};
