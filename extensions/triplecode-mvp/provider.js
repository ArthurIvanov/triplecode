'use strict';

const {
  parseOllamaStreamLine, parseCompletionsSseData, splitLines, splitSseEvents, appendDelta
} = require('./stream-logic.cjs');

async function probe(endpoint, timeoutMs = 2000) {
  try {
    const response = await fetch(`${endpoint}/api/version`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

async function chat({ endpoint, model, messages, timeoutMs = 120000, signal, numPredict = 2048, numCtx = 8192 }) {
  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: 0.2, num_predict: numPredict, num_ctx: numCtx }
    }),
    signal: signal ?? AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Model request failed (HTTP ${response.status}).`);
  const data = await response.json();
  const text = data?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Model returned an empty response.');
  return text.trim();
}

async function chatCompletions({ baseUrl, apiKey, model, messages, timeoutMs = 120000, signal, maxTokens = 4096 }) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      stream: false
    }),
    signal: signal ?? AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Model request failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : '.'}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Model returned an empty response.');
  return text.trim();
}

async function chatStream({ endpoint, model, messages, timeoutMs = 120000, signal, numPredict = 2048, numCtx = 8192, onDelta }) {
  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature: 0.2, num_predict: numPredict, num_ctx: numCtx }
    }),
    signal: signal ?? AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Model request failed (HTTP ${response.status}).`);
  if (!response.body) throw new Error('Model stream has no body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const { lines, rest } = splitLines(pending);
    pending = rest;
    for (const line of lines) {
      const { delta, done: finished } = parseOllamaStreamLine(line);
      if (delta) {
        full = appendDelta(full, delta);
        onDelta?.(delta, full);
      }
      if (finished) break;
    }
  }
  if (pending.trim()) {
    const { delta } = parseOllamaStreamLine(pending);
    if (delta) {
      full = appendDelta(full, delta);
      onDelta?.(delta, full);
    }
  }
  if (!full.trim()) throw new Error('Model returned an empty response.');
  return full.trim();
}

async function chatCompletionsStream({ baseUrl, apiKey, model, messages, timeoutMs = 120000, signal, maxTokens = 4096, onDelta }) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      stream: true
    }),
    signal: signal ?? AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Model request failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : '.'}`);
  }
  if (!response.body) throw new Error('Model stream has no body.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const { events, rest } = splitSseEvents(pending);
    pending = rest;
    for (const event of events) {
      const { delta, done: finished } = parseCompletionsSseData(event);
      if (delta) {
        full = appendDelta(full, delta);
        onDelta?.(delta, full);
      }
      if (finished && event.trim() === '[DONE]') break;
    }
  }
  if (pending.trim()) {
    for (const line of pending.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const { delta } = parseCompletionsSseData(line.slice(5).trimStart());
      if (delta) {
        full = appendDelta(full, delta);
        onDelta?.(delta, full);
      }
    }
  }
  if (!full.trim()) throw new Error('Model returned an empty response.');
  return full.trim();
}

async function listOllamaModels(endpoint, timeoutMs = 3000) {
  try {
    const response = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return [];
    const data = await response.json();
    return (data?.models || []).map(model => model.name).filter(Boolean);
  } catch {
    return [];
  }
}

function fileContext(document, maxChars = 14000) {
  let content = document.getText();
  if (!content.trim()) content = '(empty file)';
  const truncated = content.length > maxChars;
  if (truncated) content = `${content.slice(0, maxChars)}\n// … truncated …`;
  return `File: ${document.uri.fsPath}\nLanguage: ${document.languageId}\n\n${content}`;
}

function askMessages(document, request, projectTree = '') {
  const tree = projectTree ? `\n\nProject files:\n${projectTree}` : '';
  return [
    { role: 'system', content: 'You are a coding assistant inside an IDE. Answer briefly and concretely.' },
    { role: 'user', content: `${document ? fileContext(document) : ''}${tree}\n\nQuestion: ${request}` }
  ];
}

function planMessages(document, request, projectTree = '') {
  const tree = projectTree ? `\n\nProject files:\n${projectTree}` : '';
  return [
    { role: 'system', content: 'You are a coding assistant inside an IDE. Reply with a short numbered plan, one step per line.' },
    { role: 'user', content: `${document ? fileContext(document) : ''}${tree}\n\nTask: ${request}` }
  ];
}

function rewriteMessages(document, request) {
  const exampleBefore = 'function add(a, b) {\n  return a + b;\n}\n';
  const exampleAfter = 'function add(a, b) {\n  return a + b;\n}\n\nfunction subtract(a, b) {\n  return a - b;\n}\n';
  return [
    { role: 'system', content: 'You are a coding assistant inside an IDE. You rewrite files precisely.' },
    {
      role: 'user',
      content: 'File: example.js\nLanguage: javascript\n\n' + exampleBefore +
        '\nRequest: add a subtract function\n\nReply with the COMPLETE updated file inside one code fence.'
    },
    { role: 'assistant', content: '```javascript\n' + exampleAfter + '```' },
    {
      role: 'user',
      content: `${fileContext(document)}\n\nRequest: ${request}\n\n` +
        'Reply with the COMPLETE updated file content inside a single code fence ' +
        '(``` followed by the language id). Change only what the request needs and ' +
        'keep every other line byte-identical — do not reformat, rename or fix ' +
        'unrelated code. If no change is needed, reply NOCHANGE.'
    }
  ];
}

function multiFileMessages(documents, request, projectTree = '') {
  const context = documents.map(document => {
    let content = document.getText();
    if (!content.trim()) content = '(empty file)';
    if (content.length > 6000) content = `${content.slice(0, 6000)}\n// … truncated …`;
    return `${document.uri.fsPath}\n\n${content}`;
  }).join('\n\n');
  const tree = projectTree ? `\n\nProject files:\n${projectTree}` : '';
  return [
    {
      role: 'system',
      content:
        'You are a coding assistant inside an IDE. You use a short tool protocol and rewrite files precisely.\n' +
        'Tools (one turn may combine them; the host runs tools and replies with TOOL RESULT …):\n' +
        '- READ: <workspace-relative-path> — inspect a file not yet in context.\n' +
        '- CHECK: [command] — run project checks (omit command to use the IDE default).\n' +
        '- MCP: <server>/<tool> then optional ```json arguments fence — call a configured MCP tool (needs user permission).\n' +
        '- FILE: <path> then a full-file code fence — propose an edit (complete file, untouched lines identical).\n' +
        '- ANSWER: <text> — final text reply with no file changes.\n' +
        '- NOCHANGE — nothing to edit.\n' +
        'Prefer READ before editing unknown files. After CHECK/MCP results, either FILE edits or ANSWER.'
    },
    {
      role: 'user',
      content: `Files:\n\n${context}${tree}\n\nTask: ${request}\n\n` +
        'Respond with READ:, CHECK:, MCP:, FILE: (+ fence), ANSWER:, or NOCHANGE as needed.'
    }
  ];
}

function parseMultiRewrite(text) {
  const trimmed = text.trim();
  if (/^NO\s*CHANGE\b/i.test(trimmed)) {
    return { noChange: true, reason: trimmed.replace(/^NO\s*CHANGE\b[:\-–—]?\s*/i, '').slice(0, 300) };
  }
  const answer = /^ANSWER[:\-–—]\s*([\s\S]+)$/i.exec(trimmed);
  if (answer) return { answer: answer[1].trim().slice(0, 8000) };
  const files = [];
  const blockPattern = /^FILE:[ \t]*(.+?)[ \t]*\r?\n(?:[ \t]*\r?\n)*[ \t]*```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/gm;
  let match;
  while ((match = blockPattern.exec(text))) {
    const content = match[2].replace(/\s+$/, '');
    if (content.trim() && !/^NO\s*CHANGE\s*$/i.test(content.trim())) {
      files.push({ path: match[1].trim(), content });
    }
  }
  const reads = [];
  const outsideFences = text.replace(/```[\s\S]*?```/g, '');
  for (const read of outsideFences.matchAll(/^READ:[ \t]*(\S+)[ \t]*$/gm)) {
    reads.push(read[1].trim().replace(/^['"]+|['"]+$/g, ''));
  }
  if (!files.length && !reads.length) return null;
  return { files, reads };
}

function parseRewrite(text) {
  const trimmed = text.trim();
  if (/^NO\s*CHANGE\b/i.test(trimmed)) {
    return { noChange: true, reason: trimmed.replace(/^NO\s*CHANGE\b[:\-–—]?\s*/i, '').slice(0, 300) };
  }
  const fence = /```[a-z]*\s*\r?\n([\s\S]*?)```/i.exec(text);
  if (!fence) return null;
  const content = fence[1].replace(/\s+$/, '');
  if (!content.trim()) return null;
  if (/^NO\s*CHANGE\s*$/i.test(content.trim())) return { noChange: true };
  return { content };
}

function lineOffset(text, index) {
  if (index === 0) return 0;
  let pos = -1;
  for (let i = 0; i < index; i++) {
    pos = text.indexOf('\n', pos + 1);
    if (pos === -1) return text.length;
  }
  return pos + 1;
}

function diffEdit(before, after, eol = '\n') {
  const bLines = before.split('\n');
  const aLines = after.split('\n');
  let start = 0;
  const maxStart = Math.min(bLines.length, aLines.length);
  while (start < maxStart && bLines[start] === aLines[start]) start++;
  let endB = bLines.length;
  let endA = aLines.length;
  while (endB > start && endA > start && bLines[endB - 1] === aLines[endA - 1]) {
    endB--;
    endA--;
  }
  const offset = lineOffset(before, start);
  const deleteEnd = endB === bLines.length ? before.length : lineOffset(before, endB);
  const insertEnd = endA === aLines.length ? after.length : lineOffset(after, endA);
  const insertion = after.slice(offset, insertEnd).replace(/\r?\n/g, eol);
  const deleteLength = deleteEnd - offset;
  if (!insertion.trim() && deleteLength === 0) return null;
  return { offset, deleteLength, insertion };
}

module.exports = {
  probe, chat, chatCompletions, chatStream, chatCompletionsStream,
  listOllamaModels, askMessages, planMessages, rewriteMessages, multiFileMessages,
  parseRewrite, parseMultiRewrite, diffEdit
};
