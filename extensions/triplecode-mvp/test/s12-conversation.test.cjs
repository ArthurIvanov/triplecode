'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { describeEditHunk, applyEdit } = require('../review-logic.cjs');
const { parseMarkdown, safeHref, assertSafeMarkdownAst } = require('../markdown-logic.cjs');

describe('S12 describeEditHunk', () => {
  it('shows context, deletions, and additions', () => {
    const before = ['a', 'b', 'c', 'd', 'e'].join('\n');
    const edit = { offset: before.indexOf('c'), deleteLength: 1, insertion: 'C\nX' };
    const preview = describeEditHunk(before, edit, 1);
    assert.equal(preview.removed, 1);
    assert.equal(preview.added, 2);
    assert.ok(preview.hunk.some(line => line.type === 'ctx' && line.text === 'b'));
    assert.ok(preview.hunk.some(line => line.type === 'del' && line.text === 'c'));
    assert.ok(preview.hunk.some(line => line.type === 'add' && line.text === 'C'));
    assert.ok(preview.hunk.some(line => line.type === 'add' && line.text === 'X'));
    assert.equal(applyEdit(before, edit).includes('C\nX'), true);
  });

  it('insertion-only comment shows adds without dels', () => {
    const before = 'hello\nworld\n';
    const edit = { offset: 0, deleteLength: 0, insertion: '// note\n' };
    const preview = describeEditHunk(before, edit, 1);
    assert.equal(preview.removed, 0);
    assert.ok(preview.added >= 1);
    assert.ok(preview.hunk.every(line => line.type !== 'del'));
  });
});

describe('S12 markdown sanitize', () => {
  it('parses headings lists and fences', () => {
    const blocks = parseMarkdown('# Title\n\n- one\n- two\n\n```ts\nconst x = 1\n```\n');
    assert.equal(blocks[0].type, 'heading');
    assert.equal(blocks[1].type, 'list');
    assert.equal(blocks[2].type, 'code');
    assert.equal(blocks[2].lang, 'ts');
  });

  it('keeps angle brackets and scripts as text, not HTML', () => {
    const blocks = parseMarkdown('Hello <script>alert(1)</script> **ok**');
    const para = blocks[0];
    assert.equal(para.type, 'paragraph');
    const joined = JSON.stringify(para);
    assert.match(joined, /script/);
    assert.ok(!joined.includes('"type":"html"'));
    assert.deepEqual(assertSafeMarkdownAst(blocks), []);
  });

  it('allows https links and drops javascript:', () => {
    assert.equal(safeHref('https://example.com/a'), 'https://example.com/a');
    assert.equal(safeHref('javascript:alert(1)'), null);
    const blocks = parseMarkdown('see [x](javascript:alert(1)) and [y](https://ok.test)');
    const dump = JSON.stringify(blocks);
    assert.ok(!/"type":"link"[^}]*javascript:/.test(dump));
    assert.match(dump, /"type":"link".*"href":"https:\/\/ok\.test"/);
  });
});
