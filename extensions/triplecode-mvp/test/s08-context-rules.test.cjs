'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isSensitivePath, filterSafeRelativePaths, canAttachFile, rulesSuffix, hasRulesBadge, ATTACHMENT_LIMIT
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
});
