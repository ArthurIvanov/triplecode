'use strict';

async function probe(endpoint, timeoutMs = 2000) {
  try {
    const response = await fetch(`${endpoint}/api/version`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

async function chat({ endpoint, model, messages, timeoutMs = 120000, signal, numPredict = 2048, numCtx = 8192, onDelta }) {
  if (onDelta) return chatStream({ endpoint, model, messages, timeoutMs, signal, numPredict, numCtx, onDelta });
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

// Streams Ollama's NDJSON response and reports the accumulated text via
// onDelta so the UI can render partial replies.
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
  if (!response.body) throw new Error('Model returned an empty response.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  const flush = () => {
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const chunk = JSON.parse(trimmed);
        const piece = chunk?.message?.content;
        if (typeof piece === 'string') text += piece;
      } catch { /* partial JSON line — wait for the rest */ }
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flush();
    if (text) onDelta(text);
  }
  buffer += decoder.decode();
  flush();
  if (text) onDelta(text);
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Model returned an empty response.');
  return trimmed;
}

async function chatCompletions({ baseUrl, apiKey, model, messages, timeoutMs = 120000, signal, maxTokens = 4096, onDelta }) {
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
      stream: Boolean(onDelta)
    }),
    signal: signal ?? AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Model request failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : '.'}`);
  }
  if (onDelta && response.body) return chatCompletionsStream(response, onDelta);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Model returned an empty response.');
  return text.trim();
}

// OpenAI-compatible SSE stream: lines of "data: {json}" ending with
// "data: [DONE]". Accumulated content is reported via onDelta.
async function chatCompletionsStream(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  const handleLine = line => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return;
    try {
      const piece = JSON.parse(payload)?.choices?.[0]?.delta?.content;
      if (typeof piece === 'string') text += piece;
    } catch { /* partial JSON — ignore */ }
  };
  const flush = () => {
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) handleLine(line);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flush();
    if (text) onDelta(text);
  }
  buffer += decoder.decode();
  flush();
  if (text) onDelta(text);
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Model returned an empty response.');
  return trimmed;
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

// ---- Context packing -------------------------------------------------------
// Local models have small context windows. Everything below works in
// characters; ~3 chars per token is a conservative estimate for source code.

const CHARS_PER_TOKEN = 3;

function estimateTokens(text) {
  return Math.ceil(String(text ?? '').length / CHARS_PER_TOKEN);
}

// Keep the tail of a long conversation: merge consecutive same-role turns and
// cap both the number of messages and the size of each one.
function clampHistory(history, { maxMessages = 12, maxChars = 6000 } = {}) {
  if (!Array.isArray(history)) return [];
  const merged = [];
  for (const item of history) {
    if (!item || (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string') continue;
    const content = item.content.trim();
    if (!content) continue;
    const clipped = content.length > maxChars ? `${content.slice(0, maxChars)}\n…` : content;
    const last = merged[merged.length - 1];
    if (last && last.role === item.role) last.content += `\n\n${clipped}`;
    else merged.push({ role: item.role, content: clipped });
  }
  return merged.slice(-maxMessages);
}

// Truncate long content keeping both the head and the tail — imports, types
// and entry points usually live at the top, usage sites at the bottom.
function truncateMiddle(content, maxChars) {
  if (content.length <= maxChars) return { text: content, omitted: 0 };
  const marker = (omitted) => `\n// … ${omitted} chars omitted …\n`;
  const overhead = marker(content.length).length;
  const body = Math.max(0, maxChars - overhead);
  const head = Math.floor(body * 0.6);
  const tail = body - head;
  const omitted = content.length - head - tail;
  return {
    text: `${content.slice(0, head)}${marker(omitted)}${content.slice(content.length - tail)}`,
    omitted
  };
}

function fileBlock({ path, languageId, content, budgetChars, outline }) {
  const lines = content.split('\n').length;
  const outlinePart = outline ? `Outline:\n${outline}\n\n` : '';
  const header = `File: ${path}\nLanguage: ${languageId || 'text'}\nLines: ${lines}\n${outlinePart}\n`;
  const bodyBudget = Math.max(200, budgetChars - header.length);
  const { text, omitted } = truncateMiddle(content, bodyBudget);
  return { block: `${header}${text}`, omitted, lines };
}

function documentContent(document) {
  let content = document.getText();
  if (!content.trim()) content = '(empty file)';
  return content;
}

// ---- System prompts --------------------------------------------------------
// Small local models follow short, explicit instructions better than long
// prose. Repository rules go into the system message, not the user tail.

function withRules(base, rules) {
  return rules ? `${base}\n\nRepository rules (.triplecode/rules.md):\n${rules}` : base;
}

const SYSTEM_ASK = 'You are TripleCode, a coding assistant inside an IDE. ' +
  'Answer briefly and concretely using only the provided context. ' +
  'Mention file paths when referring to code. ' +
  'If the context is insufficient, say what information is missing instead of guessing.';

const SYSTEM_PLAN = 'You are TripleCode, a coding assistant inside an IDE. ' +
  'Reply with a short numbered plan, one step per line. Do not write code.';

const SYSTEM_AGENT = 'You are TripleCode, a coding assistant inside an IDE. You rewrite files precisely. ' +
  'Earlier messages are conversation context; the latest request is authoritative.';

// ---- Message builders ------------------------------------------------------
// All builders accept an options object:
//   history  – previous turns [{role, content}] for multi-turn chats
//   rules    – repository rules text (.triplecode/rules.md)
//   project  – pre-formatted workspace/project digest
//   path     – display path override (relative path preferred over absolute)
//   pathFor  – function mapping a document to its display path (agent mode)
//   maxChars – character budget for file contents
//   fileTree – workspace file listing for agent mode

function documentPath(document, fallback) {
  return fallback || document.uri.fsPath;
}

function contextBlocks(documents, options, fallbackBudget) {
  const docs = (Array.isArray(documents) ? documents : [documents])
    .filter(document => document && !document.isClosed);
  const budget = options.maxChars ?? fallbackBudget;
  if (!docs.length) return '';
  const perFile = Math.max(800, Math.floor(budget / docs.length));
  return docs.map((document, index) => {
    const { block } = fileBlock({
      path: options.pathFor
        ? options.pathFor(document)
        : (options.path && index === 0 ? options.path : documentPath(document)),
      languageId: document.languageId,
      content: documentContent(document),
      budgetChars: perFile,
      outline: options.outlines?.get(document.uri.toString())
    });
    return block;
  }).join('\n\n') + '\n\n';
}

function askMessages(document, request, options = {}) {
  const history = clampHistory(options.history);
  const extra = options.documents || [];
  const allDocs = [document, ...extra].filter(Boolean);
  const filePart = contextBlocks(allDocs, options, 20000);
  const projectPart = options.project ? `${options.project}\n\n` : '';
  return [
    { role: 'system', content: withRules(SYSTEM_ASK, options.rules) },
    ...history,
    { role: 'user', content: `${projectPart}${filePart}Question: ${request}` }
  ];
}

function planMessages(document, request, options = {}) {
  const history = clampHistory(options.history);
  const extra = options.documents || [];
  const allDocs = [document, ...extra].filter(Boolean);
  const filePart = contextBlocks(allDocs, options, 16000);
  const projectPart = options.project ? `${options.project}\n\n` : '';
  return [
    { role: 'system', content: withRules(SYSTEM_PLAN, options.rules) },
    ...history,
    { role: 'user', content: `${projectPart}${filePart}Task: ${request}` }
  ];
}

function rewriteMessages(document, request, options = {}) {
  const history = clampHistory(options.history, { maxMessages: 6, maxChars: 3000 });
  const exampleBefore = 'function add(a, b) {\n  return a + b;\n}\n';
  const exampleAfter = 'function add(a, b) {\n  return a + b;\n}\n\nfunction subtract(a, b) {\n  return a - b;\n}\n';
  const budget = options.maxChars ?? 20000;
  const { block } = fileBlock({
    path: documentPath(document, options.path),
    languageId: document.languageId || 'javascript',
    content: documentContent(document),
    budgetChars: budget
  });
  return [
    { role: 'system', content: withRules(SYSTEM_AGENT, options.rules) },
    ...history,
    {
      role: 'user',
      content: 'File: example.js\nLanguage: javascript\n\n' + exampleBefore +
        '\nRequest: add a subtract function\n\nReply with the COMPLETE updated file inside one code fence.'
    },
    { role: 'assistant', content: '```javascript\n' + exampleAfter + '```' },
    {
      role: 'user',
      content: `${block}\n\nRequest: ${request}\n\n` +
        'Reply with the COMPLETE updated file content inside a single code fence ' +
        '(``` followed by the language id). Change only what the request needs and ' +
        'keep every other line byte-identical — do not reformat, rename or fix ' +
        'unrelated code. If no change is needed, reply NOCHANGE.'
    }
  ];
}

const MULTI_REWRITE_INSTRUCTIONS =
  'For each file that must change, output a line FILE: followed by its path exactly as listed above, ' +
  'then the COMPLETE updated file content inside one code fence. Keep every ' +
  'untouched line identical. If the task requires a file that is not shown above, ' +
  'you may still reference its path from the Workspace files list — its content ' +
  'will be provided on a follow-up pass. If no change is needed, reply NOCHANGE.';

// Small local models reliably copy an output format only when it is shown once.
// This compact worked example costs ~100 tokens and prevents NOCHANGE/parse
// failures on otherwise trivial edit requests.
const MULTI_REWRITE_EXAMPLE_USER =
  'Workspace files:\nsrc/calc.js\n\n' +
  'Files:\n\nFile: src/calc.js\nLanguage: javascript\nLines: 3\n\n' +
  'function add(a, b) {\n  return a + b;\n}\n\n' +
  'Task: add a subtract function\n\n' + MULTI_REWRITE_INSTRUCTIONS;
const MULTI_REWRITE_EXAMPLE_ASSISTANT =
  'FILE: src/calc.js\n```javascript\n' +
  'function add(a, b) {\n  return a + b;\n}\n\n' +
  'function subtract(a, b) {\n  return a - b;\n}\n' +
  '```';

function multiFileMessages(documents, request, options = {}) {
  const history = clampHistory(options.history, { maxMessages: 8, maxChars: 3000 });
  const totalBudget = options.maxChars ?? 24000;
  const treePart = options.fileTree ? `Workspace files:\n${options.fileTree}\n\n` : '';

  // Split the remaining character budget evenly across the files so the whole
  // prompt stays inside the model's context window.
  const docs = documents.filter(document => document && !document.isClosed);
  const blocks = [];
  let omittedTotal = 0;
  if (docs.length) {
    const perFile = Math.max(800, Math.floor(totalBudget / docs.length));
    for (const document of docs) {
      const { block, omitted } = fileBlock({
        path: options.pathFor ? options.pathFor(document) : documentPath(document),
        languageId: document.languageId,
        content: documentContent(document),
        budgetChars: perFile,
        outline: options.outlines?.get(document.uri.toString())
      });
      omittedTotal += omitted;
      blocks.push(block);
    }
  }
  const filesPart = blocks.length ? `Files:\n\n${blocks.join('\n\n')}\n\n` : '';
  const omittedNote = omittedTotal ? `\n(Note: ${omittedTotal} chars of file content were omitted to fit the context window.)\n` : '\n';
  return [
    { role: 'system', content: withRules(SYSTEM_AGENT, options.rules) },
    ...history,
    { role: 'user', content: MULTI_REWRITE_EXAMPLE_USER },
    { role: 'assistant', content: MULTI_REWRITE_EXAMPLE_ASSISTANT },
    {
      role: 'user',
      content: `${treePart}${filesPart}Task: ${request}${omittedNote}\n` +
        MULTI_REWRITE_INSTRUCTIONS
    }
  ];
}

function parseMultiRewrite(text) {
  const trimmed = text.trim();
  if (/^NO\s*CHANGE\b/i.test(trimmed)) {
    return { noChange: true, reason: trimmed.replace(/^NO\s*CHANGE\b[:\-–—]?\s*/i, '').slice(0, 300) };
  }
  const files = [];
  const blockPattern = /^FILE:[ \t]*(.+?)[ \t]*\r?\n(?:[ \t]*\r?\n)*[ \t]*```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/gm;
  let match;
  while ((match = blockPattern.exec(text))) {
    const content = match[2].replace(/\s+$/, '');
    if (content.trim() && !/^NO\s*CHANGE\s*$/i.test(content.trim())) {
      files.push({ path: match[1].trim(), content });
    }
  }
  if (!files.length) return null;
  return { files };
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
  probe, chat, chatStream, chatCompletions, chatCompletionsStream, listOllamaModels,
  estimateTokens, clampHistory, truncateMiddle, fileBlock,
  askMessages, planMessages, rewriteMessages, multiFileMessages,
  parseRewrite, parseMultiRewrite, diffEdit
};
