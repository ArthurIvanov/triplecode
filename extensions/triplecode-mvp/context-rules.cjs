'use strict';

const CONTEXT_EXCLUDE =
  /(^|[\\/])(\.env($|\.)|[^\\/]*\.(pem|key|p12|pfx)$|[^\\/]*(secret|credential)[^\\/]*|id_rsa)/i;

const ATTACHMENT_LIMIT = 5;
const RULES_LIMIT = 4000;

function isSensitivePath(path) {
  return typeof path === 'string' && CONTEXT_EXCLUDE.test(path);
}

function filterSafeRelativePaths(paths) {
  return (paths || []).filter(path => !isSensitivePath(path));
}

function canAttachFile(path, existing = []) {
  if (isSensitivePath(path)) return { ok: false, reason: 'sensitive' };
  if (existing.some(item => item.kind === 'file' && item.path === path)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (existing.length >= ATTACHMENT_LIMIT) return { ok: false, reason: 'limit' };
  return { ok: true };
}

function rulesSuffix(rulesText) {
  const text = typeof rulesText === 'string' ? rulesText.trim().slice(0, RULES_LIMIT) : '';
  if (!text) return '';
  return `\n\nRepository rules (.triplecode/rules.md):\n${text}`;
}

function hasRulesBadge(rulesText) {
  return Boolean(typeof rulesText === 'string' && rulesText.trim());
}

/**
 * Detect an active `@query` mention ending at the cursor (word-boundary @).
 * Returns null when the cursor is not inside a mention.
 */
function parseAtQuery(text, cursor) {
  if (typeof text !== 'string' || !Number.isInteger(cursor) || cursor < 0 || cursor > text.length) {
    return null;
  }
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|[\s])@([^\s@]*)$/);
  if (!match) return null;
  const start = before.lastIndexOf('@');
  return { start, query: match[1], end: cursor };
}

/** Remove the active `@query` span from draft after a pick. */
function stripAtQuery(text, mention) {
  if (!mention || typeof text !== 'string') return text;
  return `${text.slice(0, mention.start)}${text.slice(mention.end)}`;
}

/**
 * Filter attach candidates by label/description substring (case-insensitive).
 * Sensitive paths are dropped even if present in the source list.
 */
function filterAttachCandidates(candidates, query, limit = 12) {
  const needle = String(query || '').toLowerCase();
  const list = Array.isArray(candidates) ? candidates : [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item.label !== 'string') continue;
    if (item.kind === 'file' && isSensitivePath(item.path || item.description || '')) continue;
    const hay = `${item.label} ${item.description || ''}`.toLowerCase();
    if (needle && !hay.includes(needle)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/** Backspace at start of empty/caret-leading draft removes the last chip. */
function shouldRemoveLastChipOnBackspace(draft, cursor, attachmentCount) {
  if (!attachmentCount || cursor !== 0) return false;
  return draft === '' || draft.length === 0;
}

module.exports = {
  CONTEXT_EXCLUDE,
  ATTACHMENT_LIMIT,
  RULES_LIMIT,
  isSensitivePath,
  filterSafeRelativePaths,
  canAttachFile,
  rulesSuffix,
  hasRulesBadge,
  parseAtQuery,
  stripAtQuery,
  filterAttachCandidates,
  shouldRemoveLastChipOnBackspace
};
