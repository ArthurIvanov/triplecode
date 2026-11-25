'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseOllamaStreamLine,
  parseCompletionsSseData,
  splitLines,
  splitSseEvents,
  appendDelta
} = require('../stream-logic.cjs');

describe('S13 / R-C1 stream parsing', () => {
  it('parses Ollama NDJSON deltas', () => {
    assert.deepEqual(
      parseOllamaStreamLine('{"message":{"content":"Hel"},"done":false}'),
      { delta: 'Hel', done: false }
    );
    assert.deepEqual(
      parseOllamaStreamLine('{"message":{"content":"lo"},"done":true}'),
      { delta: 'lo', done: true }
    );
    assert.equal(appendDelta('Hel', 'lo'), 'Hello');
  });

  it('parses OpenAI SSE data payloads', () => {
    assert.deepEqual(
      parseCompletionsSseData('{"choices":[{"delta":{"content":"Hi"}}]}'),
      { delta: 'Hi', done: false }
    );
    assert.deepEqual(parseCompletionsSseData('[DONE]'), { delta: '', done: true });
    assert.equal(parseCompletionsSseData('javascript:alert(1)').delta, '');
  });

  it('splits line and SSE buffers without dropping rest', () => {
    assert.deepEqual(splitLines('a\nb\nc'), { lines: ['a', 'b'], rest: 'c' });
    const { events, rest } = splitSseEvents('data: {"choices":[{"delta":{"content":"x"}}]}\n\ndata: [DONE]\n\ndata: partial');
    assert.equal(events.length, 2);
    assert.equal(events[1], '[DONE]');
    assert.equal(rest, 'data: partial');
  });
});
