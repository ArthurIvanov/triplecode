'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldYieldToSuggest,
  parseSuggestion,
  completionMessages,
  latencyStatusLabel
} = require('../inline-logic.cjs');
const {
  cmdkMessages,
  parseCmdkRewrite,
  applySelectionEdit,
  selectionTooLarge
} = require('../cmdk-logic.cjs');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

describe('S10 / R-C5 inline', () => {
  it('yields to IntelliSense selectedCompletionInfo', () => {
    assert.equal(shouldYieldToSuggest({ selectedCompletionInfo: { text: 'foo' } }), true);
    assert.equal(shouldYieldToSuggest({}), false);
    assert.equal(shouldYieldToSuggest(undefined), false);
  });

  it('parses suggestions and drops duplicates of after-text', () => {
    assert.equal(parseSuggestion('```js\nhello\n```', 'world'), 'hello');
    assert.equal(parseSuggestion('hello', 'hello there'), null);
    assert.equal(parseSuggestion('x'.repeat(4000), ''), null);
    assert.equal(parseSuggestion('has <CURSOR> marker', ''), null);
  });

  it('builds completion prompts and latency labels', () => {
    const messages = completionMessages('a.ts', 'typescript', 'const x = ', ';');
    assert.match(messages[1].content, /<CURSOR>/);
    assert.equal(latencyStatusLabel(3000), 'Inline slow…');
    assert.equal(latencyStatusLabel(500), 'Inline…');
  });
});

describe('S10 / R-C5 Cmd-K', () => {
  it('parses rewrite / NOCHANGE and applies selection splice', () => {
    assert.deepEqual(
      parseCmdkRewrite('```ts\nreturn 1;\n```'),
      { content: 'return 1;' }
    );
    assert.equal(parseCmdkRewrite('NOCHANGE: already fine').noChange, true);
    assert.equal(applySelectionEdit('abXXXcd', 2, 5, 'Y'), 'abYcd');
    assert.equal(selectionTooLarge('x'.repeat(30000)), true);
    assert.match(cmdkMessages({
      fileName: 'a.ts', languageId: 'typescript',
      selection: 'x', instruction: 'rename'
    })[1].content, /Instruction: rename/);
  });

  it('package wires Cmd-K commands and keybindings', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const commands = pkg.contributes.commands.map(item => item.command);
    assert.ok(commands.includes('triplecode.editSelection'));
    assert.ok(commands.includes('triplecode.toggleInline'));
    const keys = pkg.contributes.keybindings.map(item => item.command);
    assert.ok(keys.includes('triplecode.editSelection'));
    assert.equal(pkg.contributes.configuration.properties['triplecode.ai.cmdkEnabled'].default, true);
  });
});
