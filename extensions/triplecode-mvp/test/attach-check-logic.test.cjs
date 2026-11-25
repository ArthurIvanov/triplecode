'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, readFile, rm } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { buildAttachCandidates, appendAttachment } = require('../attach-logic.cjs');
const { checkResultEntry, runIsolatedPatchCheck, execCheck } = require('../check-logic.cjs');
const { applyEdit } = require('../review-logic.cjs');

describe('R-B4 attach-logic', () => {
  it('builds candidates and skips secrets', () => {
    const items = buildAttachCandidates({
      root: '/proj',
      activeFile: { path: '/proj/src/app.ts', name: 'app.ts' },
      selection: { text: 'const x = 1', label: 'selection · app.ts', description: 'app.ts · lines 1–1' },
      workspaceFiles: ['/proj/src/app.ts', '/proj/.env', '/proj/src/util.ts']
    });
    assert.equal(items.some(i => i.id === 'active-file'), true);
    assert.equal(items.some(i => i.id === 'selection'), true);
    assert.equal(items.some(i => i.path === '/proj/.env'), false);
    assert.equal(items.some(i => i.label === 'src/util.ts'), true);
  });

  it('appendAttachment enforces gates', () => {
    const first = appendAttachment([], { kind: 'file', path: 'a.ts' });
    assert.equal(first.ok, true);
    const dup = appendAttachment(first.attachments, { kind: 'file', path: 'a.ts' });
    assert.equal(dup.reason, 'duplicate');
    const secret = appendAttachment([], { kind: 'file', path: '.env' });
    assert.equal(secret.reason, 'sensitive');
  });
});

describe('R-B4 check-logic', () => {
  it('checkResultEntry trims output and tags target', () => {
    const entry = checkResultEntry('npm test', { stdout: 'a\nb\nc', stderr: '', code: 1 }, 'working-tree');
    assert.equal(entry.code, 1);
    assert.equal(entry.target, 'working-tree');
    assert.equal(entry.summaryLine, 'a');
  });

  it('runIsolatedPatchCheck fails on copy while source stays green', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tc-rb4-'));
    try {
      await writeFile(join(root, 'a.js'), 'module.exports = 1;\n');
      await writeFile(join(root, 'check.cjs'), [
        "'use strict';",
        "const assert = require('node:assert/strict');",
        "const { readFileSync } = require('node:fs');",
        "assert.equal(readFileSync('a.js', 'utf8').trim(), 'module.exports = 1;');",
        "console.log('ok');",
        ''
      ].join('\n'));

      const green = await execCheck(`${process.execPath} check.cjs`, root);
      assert.equal(green.code, 0);

      const before = await readFile(join(root, 'a.js'), 'utf8');
      const { result } = await runIsolatedPatchCheck({
        root,
        command: `${process.execPath} check.cjs`,
        files: [{
          path: join(root, 'a.js'),
          before,
          edit: { offset: 0, deleteLength: before.length, insertion: 'module.exports = 99;\n' }
        }],
        applyEditImpl: applyEdit
      });
      assert.notEqual(result.code, 0);
      assert.equal(await readFile(join(root, 'a.js'), 'utf8'), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
