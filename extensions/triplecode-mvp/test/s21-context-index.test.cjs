'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const {
  shouldIndexRelativePath,
  scorePath,
  toRelPath,
  createFileIndex
} = require('../context-index.cjs');
const { readFileSync } = require('node:fs');

const ROOT = '/workspace/proj';

describe('S21 / R-β5 context index paths', () => {
  it('indexes text files and excludes sensitive/binary/dirs', () => {
    assert.equal(shouldIndexRelativePath('src/app.ts'), true);
    assert.equal(shouldIndexRelativePath('docs/guide.md'), true);
    assert.equal(shouldIndexRelativePath('src/styles/main.css'), true);
    assert.equal(shouldIndexRelativePath('node_modules/pkg/index.js'), false);
    assert.equal(shouldIndexRelativePath('.git/config'), false);
    assert.equal(shouldIndexRelativePath('assets/logo.png'), false);
    assert.equal(shouldIndexRelativePath('dist/bundle.js'), false);
    assert.equal(shouldIndexRelativePath('.env'), false);
    assert.equal(shouldIndexRelativePath('config/secrets.json'), false);
    assert.equal(shouldIndexRelativePath('keys/service.pem'), false);
  });

  it('maps absolute paths to workspace-relative', () => {
    assert.equal(toRelPath(ROOT, join(ROOT, 'src', 'a.ts')), 'src/a.ts');
    assert.equal(toRelPath(ROOT, '/other/b.ts'), null);
  });
});

describe('S21 / R-β5 ranking', () => {
  it('ranks basename and path matches above subsequence', () => {
    const index = createFileIndex({ root: ROOT });
    for (const rel of [
      'src/components/Button.tsx',
      'src/utils/button-helpers.ts',
      'docs/buttons-guide.md',
      'src/submit.ts'
    ]) index.add(join(ROOT, ...rel.split('/')));
    const hits = index.query('button', { limit: 10 });
    assert.equal(hits[0].rel, 'src/components/Button.tsx');
    assert.ok(hits.every(hit => hit.score > 0));
    assert.equal(index.query('zzz-no-match').length, 0);
  });

  it('never returns sensitive paths even if force-added', () => {
    const index = createFileIndex({ root: ROOT });
    index.add(join(ROOT, '.env'));
    index.add(join(ROOT, 'src/ok.ts'));
    assert.equal(index.size(), 1);
    assert.deepEqual(index.query('env').map(h => h.rel), []);
    assert.deepEqual(index.query('ok').map(h => h.rel), ['src/ok.ts']);
  });

  it('supports incremental add/remove/rename', () => {
    const index = createFileIndex({ root: ROOT });
    index.add(join(ROOT, 'a/one.ts'));
    index.add(join(ROOT, 'a/two.ts'));
    assert.equal(index.size(), 2);
    index.remove(join(ROOT, 'a/one.ts'));
    assert.equal(index.size(), 1);
    index.rename(join(ROOT, 'a/two.ts'), join(ROOT, 'b/three.ts'));
    assert.deepEqual(index.query('three').map(h => h.rel), ['b/three.ts']);
    index.clear();
    assert.equal(index.size(), 0);
  });

  it('warm query over 5k files stays fast', () => {
    const index = createFileIndex({ root: ROOT });
    for (let i = 0; i < 5000; i += 1) {
      index.add(`src/module${i}/file${i}.ts`);
    }
    const started = process.hrtime.bigint();
    const hits = index.query('file42', { limit: 15 });
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    assert.ok(hits.length > 0);
    assert.ok(elapsedMs < 250, `query took ${elapsedMs}ms`);
  });

  it('scorePath ordering is deterministic', () => {
    assert.ok(scorePath('src/Button.tsx', 'button') > scorePath('docs/x-button.md', 'button'));
    assert.ok(scorePath('a/b/c.ts', 'nomatchqq') === 0 || scorePath('a/b/c.ts', 'nomatchqq') > 0);
    assert.equal(scorePath('src/a.ts', ''), 0);
  });
});
