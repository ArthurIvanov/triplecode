'use strict';

const MAX_SUGGESTION_CHARS = 3000;
const LATENCY_STATUS_MS = 800;

/**
 * Yield to IntelliSense when the suggest widget has a selected completion
 * (InlineCompletionContext.selectedCompletionInfo).
 */
function shouldYieldToSuggest(context) {
  return Boolean(context && context.selectedCompletionInfo);
}

function parseSuggestion(reply, afterText, { maxChars = MAX_SUGGESTION_CHARS } = {}) {
  if (!reply) return null;
  let text = String(reply).trim();
  const fence = /^```[\w-]*\n?([\s\S]*?)```\s*$/.exec(text);
  if (fence) text = fence[1];
  if (!text || text.includes('<CURSOR>') || text.length > maxChars) return null;
  text = text.replace(/[ \t]+$/gm, '').replace(/\s+$/, '');
  if (!text.trim()) return null;
  const after = String(afterText || '');
  if (after.startsWith(text)) return null;
  return text;
}

function completionMessages(fileName, languageId, before, after) {
  return [
    {
      role: 'system',
      content: 'You are a code completion engine inside an IDE. Continue the code exactly at the <CURSOR> marker. ' +
        'Output ONLY the raw code to insert at the cursor: no markdown fences, no explanation, no repetition of code that already exists.'
    },
    {
      role: 'user',
      content: `File: ${fileName} (${languageId})\n\n` +
        `${before}<CURSOR>${after}\n\nCode to insert at <CURSOR>:`
    }
  ];
}

function resolveInlineEnabled(setting, { auto = false } = {}) {
  if (setting === true || setting === false) return setting;
  return Boolean(auto);
}

function latencyStatusLabel(elapsedMs, { slowMs = 2500 } = {}) {
  if (elapsedMs >= slowMs) return 'Inline slow…';
  return 'Inline…';
}

module.exports = {
  MAX_SUGGESTION_CHARS,
  LATENCY_STATUS_MS,
  shouldYieldToSuggest,
  parseSuggestion,
  completionMessages,
  resolveInlineEnabled,
  latencyStatusLabel
};
