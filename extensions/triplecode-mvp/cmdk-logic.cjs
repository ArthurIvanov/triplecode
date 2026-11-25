'use strict';

const MAX_SELECTION_CHARS = 24000;
const MAX_RESULT_CHARS = 48000;

function cmdkMessages({ fileName, languageId, selection, instruction, before = '', after = '' }) {
  const contextBefore = String(before || '').slice(-2000);
  const contextAfter = String(after || '').slice(0, 2000);
  return [
    {
      role: 'system',
      content:
        'You edit a selected code region inside an IDE. Reply with ONLY the replacement for the selection ' +
        'inside one code fence. Keep surrounding code unchanged. No explanation.'
    },
    {
      role: 'user',
      content:
        `File: ${fileName} (${languageId})\n` +
        (contextBefore ? `Before selection:\n\`\`\`\n${contextBefore}\n\`\`\`\n` : '') +
        `Selected code:\n\`\`\`\n${selection}\n\`\`\`\n` +
        (contextAfter ? `After selection:\n\`\`\`\n${contextAfter}\n\`\`\`\n` : '') +
        `Instruction: ${instruction}\n\n` +
        'Reply with the COMPLETE replacement for the selection inside one code fence.'
    }
  ];
}

function parseCmdkRewrite(reply, { maxChars = MAX_RESULT_CHARS } = {}) {
  if (!reply) return null;
  const trimmed = String(reply).trim();
  if (/^NO\s*CHANGE\b/i.test(trimmed)) return { noChange: true, reason: trimmed.slice(0, 300) };
  const fence = /```[\w-]*\s*\r?\n([\s\S]*?)```/i.exec(trimmed);
  let text = fence ? fence[1] : trimmed;
  text = text.replace(/\s+$/, '');
  if (!text.trim() || text.length > maxChars) return null;
  return { content: text };
}

function applySelectionEdit(fullText, selectionStart, selectionEnd, replacement) {
  const start = Math.max(0, Math.min(selectionStart, fullText.length));
  const end = Math.max(start, Math.min(selectionEnd, fullText.length));
  return `${fullText.slice(0, start)}${replacement}${fullText.slice(end)}`;
}

function selectionTooLarge(selection, limit = MAX_SELECTION_CHARS) {
  return String(selection || '').length > limit;
}

module.exports = {
  MAX_SELECTION_CHARS,
  MAX_RESULT_CHARS,
  cmdkMessages,
  parseCmdkRewrite,
  applySelectionEdit,
  selectionTooLarge
};
