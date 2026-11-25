'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, readFile, rm, cp } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

const {
  applyEdit, selectFiles, classifyUndo, isStale, checkScopeLabel,
  isActiveRun, remainingAfterApply
} = require('../review-logic.cjs');

describe('S05 review apply/drop/undo', () => {
  it('selectFiles keeps one index and remainingAfterApply drops applied', () => {
    const files = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const targets = selectFiles(files, [1]);
    assert.equal(targets.length, 1);
    assert.equal(targets[0].id, 'b');
    const left = remainingAfterApply(files, new Set(targets));
    assert.deepEqual(left.map(f => f.id), ['a', 'c']);
  });

  it('isStale blocks keep when buffer drifted', () => {
    assert.equal(isStale('hello', 'hello'), false);
    assert.equal(isStale('hello', 'hello!'), true);
  });

  it('classifyUndo restores only untouched after-state files', () => {
    const batch = [
      { uri: 'a.ts', before: 'A0', after: 'A1' },
      { uri: 'b.ts', before: 'B0', after: 'B1' }
    ];
    const disk = { 'a.ts': 'A1', 'b.ts': 'B1-manual' };
    const { restorable, conflicted } = classifyUndo(batch, uri => disk[uri]);
    assert.equal(restorable.length, 1);
    assert.equal(restorable[0].uri, 'a.ts');
    assert.equal(conflicted.length, 1);
    assert.equal(conflicted[0].uri, 'b.ts');
  });

  it('applyEdit inserts without rewriting untouched bytes', () => {
    const before = 'line1\nline2\n';
    const after = applyEdit(before, { offset: 6, deleteLength: 0, insertion: '// kept\n' });
    assert.equal(after, 'line1\n// kept\nline2\n');
  });
});

describe('S06 late-response guard', () => {
  it('isActiveRun rejects foreign runs', () => {
    const runA = { id: 1 };
    const runB = { id: 2 };
    assert.equal(isActiveRun(runA, runA), true);
    assert.equal(isActiveRun(runA, runB), false);
    assert.equal(isActiveRun(undefined, runA), false);
  });
});

describe('S07 check scope labels and isolated patch', () => {
  it('labels working-tree vs proposed-patch', () => {
    assert.match(checkScopeLabel('working-tree'), /working tree/i);
    assert.match(checkScopeLabel('proposed-patch'), /isolated copy/i);
  });

  it('check patch fails on isolated copy while source tree stays green', async () => {
    const root = await mkdtemp(join(tmpdir(), 'tc-s07-'));
    const scratchParent = await mkdtemp(join(tmpdir(), 'tc-s07-scratch-'));
    try {
      await writeFile(join(root, 'a.js'), 'module.exports = 1;\n');
      await writeFile(join(root, 'b.js'), 'module.exports = 2;\n');
      // Plain assert script — avoid nested `node --test` (runner skips recursive runs).
      await writeFile(join(root, 'check.cjs'), [
        "'use strict';",
        "const assert = require('node:assert/strict');",
        "const { readFileSync } = require('node:fs');",
        "assert.equal(readFileSync('a.js', 'utf8').trim(), 'module.exports = 1;');",
        "console.log('ok');",
        ''
      ].join('\n'));

      const green = await execFileAsync(process.execPath, ['check.cjs'], { cwd: root });
      assert.match(green.stdout, /ok/);

      const beforeA = await readFile(join(root, 'a.js'), 'utf8');
      const edit = { offset: 0, deleteLength: beforeA.length, insertion: 'module.exports = 99;\n' };
      const scratch = join(scratchParent, 'copy');
      await cp(root, scratch, { recursive: true });
      await writeFile(join(scratch, 'a.js'), applyEdit(beforeA, edit));
      assert.equal(await readFile(join(scratch, 'a.js'), 'utf8'), 'module.exports = 99;\n');

      await assert.rejects(() => execFileAsync(process.execPath, ['check.cjs'], { cwd: scratch }));
      assert.equal(await readFile(join(root, 'a.js'), 'utf8'), beforeA);
      const stillGreen = await execFileAsync(process.execPath, ['check.cjs'], { cwd: root });
      assert.match(stillGreen.stdout, /ok/);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(scratchParent, { recursive: true, force: true });
    }
  });
});
