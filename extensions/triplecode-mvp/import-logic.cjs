'use strict';

const SENSITIVE_KEY =
  /(?:^|[._-])(token|secret|password|passwd|credential|apikey|api[-_]?key|auth|session|cookie|private[-_]?key)(?:[._-]|$)/i;
const SKIPPED_PREFIXES = ['settingsSync.'];
const CORE_PREFIXES = new Set([
  'workbench', 'editor', 'terminal', 'git', 'files', 'search', 'scm', 'debug',
  'typescript', 'javascript', 'emmet', 'markdown', 'extensions', 'security',
  'telemetry', 'update', 'window', 'chat', 'problems', 'testing', 'remote',
  'task', 'launch', 'breadcrumbs', 'diffEditor', 'inlineChat', 'notebook',
  'accessibility', 'merge-conflict', 'scmProvider', 'timeline', 'todo', 'views',
  'welcome', 'settings', 'snippets', 'npm', 'jest', 'eslint', 'prettier',
  'tailwindcss', 'css', 'html', 'json', 'yaml', 'xml', 'php', 'python', 'java',
  'go', 'rust', 'csharp', 'ruby', 'shellscript', 'vue', 'react', 'svelte',
  'astro', 'graphql', 'prisma', 'liveShare', 'voice', 'notebook'
]);

function isSensitiveSetting(key) {
  return SKIPPED_PREFIXES.some(prefix => key.startsWith(prefix)) || SENSITIVE_KEY.test(key);
}

/**
 * Split settings into apply / skip(secret) / thirdParty buckets before writing.
 */
function classifySettings(settings) {
  const apply = [];
  const skipped = [];
  const thirdParty = [];
  if (!settings || typeof settings !== 'object') {
    return { apply, skipped, thirdParty };
  }
  for (const [key, value] of Object.entries(settings)) {
    if (isSensitiveSetting(key)) {
      skipped.push(key);
      continue;
    }
    if (!CORE_PREFIXES.has(key.split('.')[0])) thirdParty.push(key);
    apply.push({ key, value });
  }
  return { apply, skipped, thirdParty };
}

function emptyImportReport() {
  return {
    settingsApplied: 0,
    settingsSkipped: [],
    thirdParty: [],
    keybindings: 0,
    snippets: 0,
    extensionsInstalled: 0,
    extensionsFailed: []
  };
}

function importReportMessage(report) {
  const lines = [
    `Import completed: ${report.settingsApplied} settings, ${report.keybindings > 0 ? `${report.keybindings} keybindings` : report.keybindings === -1 ? 'keybindings skipped (existing file has comments)' : 'no keybindings'}, ${report.snippets} snippets, ${report.extensionsInstalled} extensions.`
  ];
  if (report.settingsSkipped.length) {
    lines.push(`Skipped ${report.settingsSkipped.length} sensitive setting${report.settingsSkipped.length === 1 ? '' : 's'}: ${report.settingsSkipped.slice(0, 5).join(', ')}${report.settingsSkipped.length > 5 ? '…' : ''}`);
  }
  if (report.thirdParty.length) {
    lines.push(`Third-party settings applied: ${report.thirdParty.length} (${report.thirdParty.slice(0, 5).join(', ')}${report.thirdParty.length > 5 ? '…' : ''})`);
  }
  if (report.extensionsFailed.length) {
    lines.push(`Failed to install: ${report.extensionsFailed.slice(0, 5).join(', ')}`);
  }
  lines.push('Restart to apply all changes.');
  return lines.join('\n');
}

function hasRollbackMaterial({ settingsBackup, fileBackup, importedExtensions }) {
  return Boolean(
    settingsBackup ||
    fileBackup ||
    (Array.isArray(importedExtensions) && importedExtensions.length)
  );
}

/** Preview counts for the import webview (no secrets leaked as values). */
function previewCounts({ settings, keybindings, snippets, extensions }) {
  return {
    settings: settings ? Object.keys(settings).length : 0,
    keybindings: Array.isArray(keybindings) ? keybindings.length : 0,
    snippets: snippets ? Object.keys(snippets).length : 0,
    extensions: extensions ? extensions.length : 0
  };
}

module.exports = {
  SENSITIVE_KEY,
  CORE_PREFIXES,
  isSensitiveSetting,
  classifySettings,
  emptyImportReport,
  importReportMessage,
  hasRollbackMaterial,
  previewCounts
};
