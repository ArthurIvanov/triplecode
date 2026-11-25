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

module.exports = {
  CONTEXT_EXCLUDE,
  ATTACHMENT_LIMIT,
  RULES_LIMIT,
  isSensitivePath,
  filterSafeRelativePaths,
  canAttachFile,
  rulesSuffix,
  hasRulesBadge
};
