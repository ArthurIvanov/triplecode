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

module.exports = {
  applyEdit,
  selectFiles,
  classifyUndo,
  isStale,
  checkScopeLabel,
  isActiveRun,
  remainingAfterApply
};
