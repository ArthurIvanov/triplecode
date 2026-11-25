'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const {
  isSensitiveSetting,
  classifySettings,
  emptyImportReport,
  importReportMessage,
  hasRollbackMaterial,
  previewCounts
} = require('../import-logic.cjs');

describe('S02 profile import', () => {
  it('skips secrets, tokens, sessions and settingsSync keys', () => {
    assert.equal(isSensitiveSetting('openai.apiKey'), true);
    assert.equal(isSensitiveSetting('github.token'), true);
    assert.equal(isSensitiveSetting('auth.session'), true);
    assert.equal(isSensitiveSetting('settingsSync.key'), true);
    assert.equal(isSensitiveSetting('editor.fontSize'), false);
  });

  it('classifySettings never puts secrets into apply bucket', () => {
    const { apply, skipped, thirdParty } = classifySettings({
      'editor.fontSize': 14,
      'openai.apiKey': 'sk-secret',
      'myExt.foo': true,
      'settingsSync.enable': true
    });
    assert.equal(apply.length, 2);
    assert.deepEqual(apply.map(a => a.key).sort(), ['editor.fontSize', 'myExt.foo']);
    assert.ok(skipped.includes('openai.apiKey'));
    assert.ok(skipped.includes('settingsSync.enable'));
    assert.ok(thirdParty.includes('myExt.foo'));
    assert.ok(!apply.some(a => a.key === 'openai.apiKey'));
  });

  it('report message surfaces skipped secrets and failed extensions (not silent)', () => {
    const report = emptyImportReport();
    report.settingsApplied = 3;
    report.settingsSkipped = ['a.token', 'b.secret'];
    report.thirdParty = ['ext.x'];
    report.keybindings = 2;
    report.snippets = 1;
    report.extensionsInstalled = 1;
    report.extensionsFailed = ['publisher.missing'];
    const msg = importReportMessage(report);
    assert.match(msg, /3 settings/);
    assert.match(msg, /Skipped 2 sensitive/);
    assert.match(msg, /Failed to install: publisher\.missing/);
    assert.match(msg, /Restart/);
  });

  it('rollback material detection covers settings, files, and extensions', () => {
    assert.equal(hasRollbackMaterial({ settingsBackup: { a: 1 }, fileBackup: null, importedExtensions: [] }), true);
    assert.equal(hasRollbackMaterial({ settingsBackup: null, fileBackup: { keybindings: null }, importedExtensions: [] }), true);
    assert.equal(hasRollbackMaterial({ settingsBackup: null, fileBackup: null, importedExtensions: ['a.b'] }), true);
    assert.equal(hasRollbackMaterial({ settingsBackup: null, fileBackup: null, importedExtensions: [] }), false);
  });

  it('preview payload is counts-only (no setting values)', () => {
    const counts = previewCounts({
      settings: { a: 1, b: 2 },
      keybindings: [{}, {}],
      snippets: { 'js.json': {} },
      extensions: [{ id: 'x' }]
    });
    assert.deepEqual(counts, { settings: 2, keybindings: 2, snippets: 1, extensions: 1 });
  });

  it('commands and import preview webview are wired', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const commandIds = pkg.contributes.commands.map(c => c.command);
    assert.ok(commandIds.includes('triplecode.importFromVSCode'));
    assert.ok(commandIds.includes('triplecode.importFromFile'));
    assert.ok(commandIds.includes('triplecode.rollbackImport'));
    assert.ok(existsSync(join(__dirname, '..', 'media', 'import-preview.js')));
    assert.ok(existsSync(join(__dirname, '..', 'webview', 'import-preview.tsx')));
  });
});
