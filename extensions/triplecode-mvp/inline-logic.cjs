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

function latencyStatusLabel(elapsedMs, { slowMs = 2500 } = {}) {
  if (elapsedMs >= slowMs) return 'Inline slow…';
  return 'Inline…';
}

/**
 * Smart default (S20): auto-enable only while the user never set
 * triplecode.ai.inlineEnabled explicitly and a backend probe succeeded.
 */
function inlineUserConfigured(inspect) {
  if (!inspect) return false;
  return inspect.globalValue !== undefined
    || inspect.workspaceValue !== undefined
    || inspect.workspaceFolderValue !== undefined;
}

function planInlineAutoEnable({ autoEnable = true, userSet = false, probeOk = false } = {}) {
  if (!autoEnable || userSet) return 'respect';
  return probeOk ? 'enable' : 'setup';
}

/**
 * Terminal-outcome tracker for inline ghost text. Only resolved outcomes are
 * emitted (accepted / rejected / error) so usage events stay a meaningful
 * denominator without logging completion text or flooding per keystroke.
 */
function createInlineTracker({ emit, now = () => Date.now() } = {}) {
  let open = null;
  let nextId = 1;
  function close(outcome, id) {
    if (!open || (id !== undefined && open.id !== id)) return;
    const { startedAt } = open;
    open = null;
    if (outcome) emit?.({ feature: 'inline', outcome, durationMs: Math.max(0, now() - startedAt) });
  }
  return {
    /** A new provider request begins; an unresolved shown previous one counts as rejected. */
    begin(startedAt = now()) {
      if (open?.shown) close('rejected');
      open = { id: nextId++, startedAt, shown: false };
      return open.id;
    },
    /** A ghost item was actually shown to the user. */
    ghostShown(id) { if (open && open.id === id) open.shown = true; },
    accept(id) { close('accepted', id); },
    dismiss(id) { if (open && open.id === id) { if (open.shown) close('rejected', id); else open = null; } },
    fail(id) { close('error', id); },
    empty(id) { if (!id || (open && open.id === id)) open = null; }
  };
}

module.exports = {
  MAX_SUGGESTION_CHARS,
  LATENCY_STATUS_MS,
  shouldYieldToSuggest,
  parseSuggestion,
  completionMessages,
  latencyStatusLabel,
  inlineUserConfigured,
  planInlineAutoEnable,
  createInlineTracker
};
