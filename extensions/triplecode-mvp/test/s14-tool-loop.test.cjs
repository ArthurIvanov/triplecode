'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_TOOL_ROUNDS,
  parseToolTurn,
  nextLoopDecision,
  formatReadResult,
  formatCheckResult,
  formatToolBatch,
  describeToolStep,
  truncateContent
} = require('../tool-loop.cjs');
const { parseMultiRewrite } = require('../provider');

describe('S14 / R-C2 tool-loop', () => {
  it('parses READ / FILE / CHECK / ANSWER / NOCHANGE turns', () => {
    assert.equal(
      parseToolTurn('ANSWER: looks fine', parseMultiRewrite).kind,
      'answer'
    );
    assert.equal(
      parseToolTurn('NOCHANGE: already correct', parseMultiRewrite).kind,
      'noChange'
    );
    assert.deepEqual(
      parseToolTurn('READ: src/a.ts\nREAD: src/b.ts', parseMultiRewrite),
      { kind: 'read', reads: ['src/a.ts', 'src/b.ts'], files: [], checks: [], mcpCalls: [] }
    );
    const edit = parseToolTurn(
      'FILE: src/a.ts\n\n```ts\nexport const x = 1;\n```\n',
      parseMultiRewrite
    );
    assert.equal(edit.kind, 'edit');
    assert.equal(edit.files[0].path, 'src/a.ts');
    assert.match(edit.files[0].content, /export const x = 1/);

    const checkOnly = parseToolTurn('CHECK: npm test', parseMultiRewrite);
    assert.equal(checkOnly.kind, 'check');
    assert.deepEqual(checkOnly.checks, ['npm test']);

    const checkEdit = parseToolTurn(
      'CHECK:\nFILE: src/a.ts\n\n```ts\nok\n```\n',
      parseMultiRewrite
    );
    assert.equal(checkEdit.kind, 'check_with_edit');
    assert.equal(checkEdit.checks[0], null);
    assert.equal(checkEdit.files.length, 1);
  });

  it('prioritizes READ over FILE in the same turn', () => {
    const turn = parseToolTurn(
      'READ: lib.ts\nFILE: lib.ts\n\n```ts\nchanged\n```\n',
      parseMultiRewrite
    );
    assert.equal(turn.kind, 'read');
    assert.deepEqual(turn.reads, ['lib.ts']);
  });

  it('decides loop actions and round limit', () => {
    assert.equal(nextLoopDecision({ kind: 'answer' }).action, 'answer');
    assert.equal(nextLoopDecision({ kind: 'read', reads: ['a'] }).action, 'read');
    assert.equal(nextLoopDecision({ kind: 'check', checks: [null] }).action, 'check');
    assert.equal(nextLoopDecision({ kind: 'edit', files: [{}] }).action, 'edit');
    assert.equal(nextLoopDecision({ kind: 'unparsed' }).action, 'error');
    assert.equal(
      nextLoopDecision({ kind: 'edit', files: [{}] }, { round: MAX_TOOL_ROUNDS }).action,
      'limit'
    );
  });

  it('formats tool results for the next model turn', () => {
    const read = formatReadResult('src/a.ts', 'hello');
    assert.match(read, /TOOL RESULT READ src\/a\.ts/);
    assert.match(read, /hello/);
    assert.match(formatReadResult('missing.ts', '', { error: 'not found' }), /Error: not found/);

    const check = formatCheckResult('npm test', { code: 1, output: 'fail\nline2' }, { target: 'proposed-patch' });
    assert.match(check, /Exit: 1/);
    assert.match(check, /proposed-patch/);
    assert.match(formatToolBatch([read, check]), /Continue with READ:/);

    const { truncated } = truncateContent('x'.repeat(7000));
    assert.equal(truncated, true);

    assert.equal(describeToolStep('read', 'a.ts').title, 'Read a.ts');
    assert.equal(describeToolStep('check', 'npm test — exit 0').type, 'command');
  });
});
