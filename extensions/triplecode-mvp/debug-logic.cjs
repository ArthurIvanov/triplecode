'use strict';

const MAX_LOG_LINES = 80;
const MAX_LOG_LINE_CHARS = 500;

function redactSecrets(text) {
  let out = String(text ?? '');
  out = out.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    '[REDACTED PRIVATE KEY]');
  out = out.replace(/\bBearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer ***');
  out = out.replace(/\bsk-[A-Za-z0-9]{10,}/g, 'sk-***');
  out = out.replace(/\bOR_[A-Za-z0-9_]{10,}/g, 'OR_***');
  out = out.replace(
    /\b(api[_-]?key|token|secret|password|authorization)\b\s*[:=]\s*["']?[^\s"',}]+/gi,
    (_, label) => `${label}=***`
  );
  return out;
}

function createLogRing({ limit = MAX_LOG_LINES } = {}) {
  const lines = [];
  function append(level, message) {
    const ts = new Date().toISOString();
    const body = redactSecrets(String(message ?? '')).slice(0, MAX_LOG_LINE_CHARS);
    lines.push(`${ts} [${level}] ${body}`);
    while (lines.length > limit) lines.shift();
  }
  function snapshot() {
    return lines.slice();
  }
  function clear() {
    lines.length = 0;
  }
  return { append, snapshot, clear };
}

/**
 * Pure report builder. Host supplies already-safe snapshot fields.
 */
function buildDiagnosticsReport(snapshot) {
  const s = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const lines = [
    '# TripleCode diagnostics',
    `Generated: ${s.generatedAt || new Date().toISOString()}`,
    '',
    '## Runtime',
    `- Extension: ${s.extensionVersion || 'unknown'}`,
    `- VS Code: ${s.vscodeVersion || 'unknown'}`,
    `- Electron/Node: ${s.nodeVersion || 'unknown'}`,
    `- OS: ${s.platform || 'unknown'} ${s.arch || ''}`.trim(),
    `- App name: ${s.appName || 'unknown'}`,
    '',
    '## Workspace',
    `- Folders: ${s.folderCount ?? 0}`,
    `- Trusted: ${s.trusted === true ? 'yes' : s.trusted === false ? 'no' : 'unknown'}`,
    `- Remote: ${s.remoteName || 'none'}`,
    '',
    '## AI settings (no secrets)',
    `- Provider: ${s.aiProvider || 'unknown'}`,
    `- Ollama endpoint: ${redactSecrets(s.aiEndpoint || '—')}`,
    `- Ollama model: ${s.aiModel || '—'}`,
    `- OpenRouter endpoint: ${redactSecrets(s.openrouterEndpoint || '—')}`,
    `- OpenRouter model: ${s.openrouterModel || '—'}`,
    `- Inline enabled: ${s.inlineEnabled ? 'yes' : 'no'}`,
    `- Inline provider: ${s.inlineProvider || '—'}`,
    `- Inline model: ${s.inlineModel || '—'}`,
    `- Cmd-K enabled: ${s.cmdkEnabled === false ? 'no' : 'yes'}`,
    `- Check command: ${s.checkCommand || '—'}`,
    `- OpenRouter key present: ${s.hasOpenRouterKey ? 'yes' : 'no'}`,
    `- Inline key present: ${s.hasInlineKey ? 'yes' : 'no'}`,
    '',
    '## MCP',
    `- Enabled: ${s.mcpEnabled === false ? 'no' : 'yes'}`,
    `- Servers: ${(s.mcpServers || []).length ? (s.mcpServers || []).join(', ') : '(none)'}`,
    '',
    '## Session',
    `- Chats: ${s.chatCount ?? 0}`,
    `- Active run: ${s.activeRun ? 'yes' : 'no'}`,
    `- Pending review: ${s.pendingReview ? 'yes' : 'no'}`,
    `- MCP permission grants stored: ${s.mcpPermissionCount ?? 0}`,
    '',
    '## Recent extension log (redacted)',
    ...(s.logLines && s.logLines.length ? s.logLines.map(line => redactSecrets(line)) : ['(empty)']),
    '',
    '## Notes',
    '- Report excludes prompts, file contents, and secret values.',
    '- Attach this file when filing a TripleCode bug.'
  ];
  return lines.join('\n');
}

module.exports = {
  MAX_LOG_LINES,
  MAX_LOG_LINE_CHARS,
  redactSecrets,
  createLogRing,
  buildDiagnosticsReport
};
