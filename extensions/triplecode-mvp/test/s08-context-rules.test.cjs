'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isSensitivePath, filterSafeRelativePaths, canAttachFile, rulesSuffix, hasRulesBadge, ATTACHMENT_LIMIT,
  parseAtQuery, stripAtQuery, filterAttachCandidates, shouldRemoveLastChipOnBackspace
} = require('../context-rules.cjs');

describe('S08 context + rules', () => {
  it('excludes env/secret-like paths from auto-context', () => {
    assert.equal(isSensitivePath('.env'), true);
    assert.equal(isSensitivePath('config/.env.local'), true);
    assert.equal(isSensitivePath('certs/server.pem'), true);
    assert.equal(isSensitivePath('id_rsa'), true);
    assert.equal(isSensitivePath('src/secrets/store.ts'), true);
    assert.equal(isSensitivePath('src/app.ts'), false);
    assert.deepEqual(
      filterSafeRelativePaths(['src/a.ts', '.env', 'ok.js', 'foo.credential.json']),
      ['src/a.ts', 'ok.js']
    );
  });

  it('blocks attaching sensitive files and enforces chip limit', () => {
    assert.equal(canAttachFile('.env').ok, false);
    assert.equal(canAttachFile('.env').reason, 'sensitive');
    assert.equal(canAttachFile('src/a.ts').ok, true);
    const full = Array.from({ length: ATTACHMENT_LIMIT }, (_, i) => ({ kind: 'file', path: `f${i}.ts` }));
    assert.equal(canAttachFile('extra.ts', full).reason, 'limit');
    assert.equal(canAttachFile('f0.ts', full).reason, 'duplicate');
  });

  it('rules badge and prompt suffix', () => {
    assert.equal(hasRulesBadge(''), false);
    assert.equal(hasRulesBadge('  '), false);
    assert.equal(hasRulesBadge('Prefer small diffs'), true);
    assert.match(rulesSuffix('Prefer small diffs'), /\.triplecode\/rules\.md/);
    assert.equal(rulesSuffix(''), '');
  });

  it('parses and strips inline @query mentions', () => {
    assert.equal(parseAtQuery('hello', 5), null);
    assert.deepEqual(parseAtQuery('@', 1), { start: 0, query: '', end: 1 });
    assert.deepEqual(parseAtQuery('see @src/a', 10), { start: 4, query: 'src/a', end: 10 });
    assert.equal(parseAtQuery('email@x.com', 11), null);
    assert.equal(stripAtQuery('fix @src/a more', { start: 4, query: 'src/a', end: 10 }), 'fix  more');
  });

  it('filters attach candidates and drops secrets', () => {
    const items = [
      { label: 'Active file', description: 'app.ts', kind: 'file', path: 'src/app.ts' },
      { label: '.env', description: '.env', kind: 'file', path: '.env' },
      { label: 'Current selection', description: 'lines 1–3', kind: 'selection' }
    ];
    assert.deepEqual(
      filterAttachCandidates(items, 'app').map(i => i.label),
      ['Active file']
    );
    assert.deepEqual(
      filterAttachCandidates(items, '').map(i => i.label),
      ['Active file', 'Current selection']
    );
  });

  it('Backspace on empty draft removes last chip', () => {
    assert.equal(shouldRemoveLastChipOnBackspace('', 0, 2), true);
    assert.equal(shouldRemoveLastChipOnBackspace('x', 0, 2), false);
    assert.equal(shouldRemoveLastChipOnBackspace('x', 1, 2), false);
    assert.equal(shouldRemoveLastChipOnBackspace('', 0, 0), false);
  });
});
