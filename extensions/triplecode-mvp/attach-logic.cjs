'use strict';

const { isSensitivePath, canAttachFile, ATTACHMENT_LIMIT } = require('./context-rules.cjs');

/**
 * Build attach picker rows from host-provided snapshots (no vscode dependency).
 */
function buildAttachCandidates({
  root = '',
  activeFile = null,
  selection = null,
  workspaceFiles = [],
  sensitive = isSensitivePath
} = {}) {
  const items = [];
  if (activeFile?.path && !sensitive(activeFile.path)) {
    items.push({
      id: 'active-file',
      label: 'Active file',
      description: activeFile.name || activeFile.path.split(/[\\/]/).pop(),
      kind: 'file',
      path: activeFile.path,
      attachment: { kind: 'file', path: activeFile.path }
    });
  }
  if (selection?.text) {
    items.push({
      id: 'selection',
      label: 'Current selection',
      description: selection.description || selection.label || 'selection',
      kind: 'selection',
      attachment: {
        kind: 'selection',
        label: selection.label || 'selection',
        text: String(selection.text).slice(0, 4000)
      }
    });
  }
  for (const filePath of workspaceFiles) {
    if (!filePath || sensitive(filePath)) continue;
    const rel = root && filePath.startsWith(root) ? filePath.slice(root.length + 1) : filePath;
    items.push({
      id: `file:${filePath}`,
      label: rel,
      description: filePath,
      kind: 'file',
      path: filePath,
      attachment: { kind: 'file', path: filePath }
    });
  }
  return items;
}

/**
 * Decide whether an attachment can be appended; returns next list or a reject reason.
 */
function appendAttachment(existing, attachment, {
  limit = ATTACHMENT_LIMIT,
  gateFile = canAttachFile
} = {}) {
  const list = Array.isArray(existing) ? existing.slice() : [];
  if (attachment?.kind === 'file') {
    const gate = gateFile(attachment.path, list);
    if (!gate.ok) return { ok: false, reason: gate.reason, attachments: list };
  } else if (list.length >= limit) {
    return { ok: false, reason: 'limit', attachments: list };
  } else if (list.some(item =>
    item.kind === attachment.kind && item.text === attachment.text)) {
    return { ok: false, reason: 'duplicate', attachments: list };
  }
  list.push(attachment);
  return { ok: true, attachments: list };
}

module.exports = {
  buildAttachCandidates,
  appendAttachment
};
