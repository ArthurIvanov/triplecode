'use strict';

/**
 * Parse one Ollama /api/chat NDJSON line → content delta (or '').
 */
function parseOllamaStreamLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return { delta: '', done: false };
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { delta: '', done: false };
  }
  const delta = typeof data?.message?.content === 'string' ? data.message.content : '';
  return { delta, done: Boolean(data?.done) };
}

/**
 * Parse one OpenAI/OpenRouter SSE payload (after "data: ") → content delta.
 */
function parseCompletionsSseData(payload) {
  const trimmed = String(payload || '').trim();
  if (!trimmed) return { delta: '', done: false };
  if (trimmed === '[DONE]') return { delta: '', done: true };
  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return { delta: '', done: false };
  }
  const delta = data?.choices?.[0]?.delta?.content;
  return {
    delta: typeof delta === 'string' ? delta : '',
    done: Boolean(data?.choices?.[0]?.finish_reason)
  };
}

/**
 * Split a chunk buffer into complete lines; return { lines, rest }.
 */
function splitLines(buffer) {
  const text = String(buffer || '');
  const parts = text.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts, rest };
}

/**
 * Consume SSE event stream text: returns parsed data payloads and unused rest.
 */
function splitSseEvents(buffer) {
  const text = String(buffer || '');
  const events = [];
  let rest = text;
  while (true) {
    const sep = rest.indexOf('\n\n');
    if (sep < 0) break;
    const block = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    for (const line of block.split('\n')) {
      if (line.startsWith('data:')) events.push(line.slice(5).trimStart());
    }
  }
  return { events, rest };
}

function appendDelta(previous, delta) {
  return `${previous || ''}${delta || ''}`;
}

module.exports = {
  parseOllamaStreamLine,
  parseCompletionsSseData,
  splitLines,
  splitSseEvents,
  appendDelta
};
