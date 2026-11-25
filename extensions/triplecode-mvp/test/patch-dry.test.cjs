'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { proposePatch, commentEdit, supportsComments } = require('../patch');

describe('R-B1 patch dry-check', () => {
  it('commentEdit inserts without deleting source bytes', () => {
    const before = 'const x = 1;\n';
    const edit = commentEdit(before, 'javascript', '\n', 'hello');
    assert.equal(edit.deleteLength, 0);
    assert.equal(edit.offset, 0);
    assert.match(edit.insertion, /\/\/ hello/);
    const after = before.slice(0, edit.offset) + edit.insertion + before.slice(edit.offset + edit.deleteLength);
    assert.ok(after.includes('const x = 1;'));
    assert.ok(after.startsWith('// hello'));
  });

  it('proposePatch dry-runs the preview phrase and rejects unknown requests', () => {
    const edit = proposePatch('fn()\n', 'typescript', 'Add a comment: dry run', '\n');
    assert.equal(edit.deleteLength, 0);
    assert.match(edit.insertion, /dry run/);
    assert.throws(() => proposePatch('fn()\n', 'typescript', 'refactor everything', '\n'));
  });

  it('supportsComments gates unsupported languages', () => {
    assert.equal(supportsComments('javascript'), true);
    assert.equal(supportsComments('plaintext'), false);
    assert.throws(() => commentEdit('x', 'plaintext', '\n', 'nope'));
  });
});
