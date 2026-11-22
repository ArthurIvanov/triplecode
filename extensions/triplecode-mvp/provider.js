'use strict';

async function probe(endpoint, timeoutMs = 2000) {
  try {
    const response = await fetch(`${endpoint}/api/version`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok;
  } catch {
    return false;
  }
}

async function chat({ endpoint, model, messages, timeoutMs = 120000 }) {
  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: 0.2, num_predict: 2048 }
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`Model request failed (HTTP ${response.status}).`);
  const data = await response.json();
  const text = data?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Model returned an empty response.');
  return text.trim();
}

function fileContext(document, maxChars = 14000) {
  let content = document.getText();
  const truncated = content.length > maxChars;
  if (truncated) content = `${content.slice(0, maxChars)}\n// … truncated …`;
  return `File: ${document.uri.fsPath}\nLanguage: ${document.languageId}\n\n${content}`;
}

function askMessages(document, request) {
  return [
    { role: 'system', content: 'You are a coding assistant inside an IDE. Answer briefly and concretely.' },
    { role: 'user', content: `${document ? fileContext(document) : ''}\n\nQuestion: ${request}` }
  ];
}

function planMessages(document, request) {
  return [
    { role: 'system', content: 'You are a coding assistant inside an IDE. Reply with a short numbered plan, one step per line.' },
    { role: 'user', content: `${document ? fileContext(document) : ''}\n\nTask: ${request}` }
  ];
}

function editMessages(document, request) {
  return [
    { role: 'system', content: 'You edit source files inside an IDE. Reply with the edit block only.' },
    {
      role: 'user',
      content: `${fileContext(document)}\n\nRequest: ${request}\n\n` +
        'Reply in exactly this format:\n' +
        'FILE: <same path>\n' +
        'ANCHOR: <exact existing line to insert after, or TOP>\n' +
        'INSERT:\n' +
        '<lines to insert>\n' +
        'If the request cannot be satisfied, reply NOCHANGE.'
    }
  ];
}

function parseEdit(text) {
  const anchor = /^ANCHOR:\s*(.+?)\s*$/m.exec(text)?.[1];
  const insert = /^INSERT:\s*\n([\s\S]*)$/m.exec(text)?.[1];
  if (!anchor || insert === undefined) return null;
  const insertion = insert
    .split(/^FILE:/m)[0]
    .replace(/```[a-z]*\s*$/i, '')
    .replace(/```[\s\S]*$/, '')
    .trimEnd();
  if (!insertion.trim() || /^NOCHANGE\b/i.test(insertion.trim())) return { noChange: true };
  return { anchor, insertion };
}

module.exports = { probe, chat, askMessages, planMessages, editMessages, parseEdit };
