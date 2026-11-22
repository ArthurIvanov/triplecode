'use strict';

const vscode = require('vscode');
const provider = require('./provider');

const LANGUAGES = [
  { language: 'typescript' },
  { language: 'typescriptreact' },
  { language: 'javascript' },
  { language: 'javascriptreact' }
];

const DEBOUNCE_MS = 300;
const MAX_SUGGESTION_CHARS = 3000;
const MAX_IN_FLIGHT = 2;

function registerInlineAI(context) {
  let inFlight = 0;
  let ollamaProbe = { endpoint: '', ok: false, ts: 0 };

  async function probeOllama(endpoint) {
    if (ollamaProbe.endpoint === endpoint && Date.now() - ollamaProbe.ts < 30000) {
      return ollamaProbe.ok;
    }
    const ok = await provider.probe(endpoint).catch(() => false);
    ollamaProbe = { endpoint, ok, ts: Date.now() };
    return ok;
  }

  async function aiChat(messages) {
    const config = vscode.workspace.getConfiguration('triplecode');
    const kind = config.get('ai.inlineProvider', 'ollama');
    const timeoutMs = Math.min(Number(config.get('ai.timeoutMs', 120000)) || 120000, 10000);
    try {
      if (kind === 'openai') {
        const model = config.get('ai.inlineModel', '');
        if (!model) return null;
        const apiKey = await context.secrets.get('triplecode.inlineApiKey') || '';
        return await provider.chatCompletions({
          baseUrl: config.get('ai.inlineEndpoint', 'http://localhost:8000/v1'),
          apiKey,
          model,
          messages,
          timeoutMs,
          maxTokens: 256
        });
      }
      const endpoint = config.get('ai.inlineEndpoint', 'http://localhost:11434');
      if (!(await probeOllama(endpoint))) return null;
      return await provider.chat({
        endpoint,
        model: config.get('ai.inlineModel', 'qwen2.5-coder:1.5b'),
        messages,
        timeoutMs,
        numPredict: 256,
        numCtx: 8192
      });
    } catch {
      return null;
    }
  }

  function completionMessages(document, position) {
    const offset = document.offsetAt(position);
    const text = document.getText();
    const before = text.slice(Math.max(0, offset - 6000), offset);
    const after = text.slice(offset, offset + 2000);
    return [
      {
        role: 'system',
        content: 'You are a code completion engine inside an IDE. Continue the code exactly at the <CURSOR> marker. ' +
          'Output ONLY the raw code to insert at the cursor: no markdown fences, no explanation, no repetition of code that already exists.'
      },
      {
        role: 'user',
        content: `File: ${document.fileName.split('/').pop()} (${document.languageId})\n\n` +
          `${before}<CURSOR>${after}\n\nCode to insert at <CURSOR>:`
      }
    ];
  }

  function parseSuggestion(reply, afterText) {
    if (!reply) return null;
    let text = reply.trim();
    const fence = /^```[\w-]*\n?([\s\S]*?)```\s*$/.exec(text);
    if (fence) text = fence[1];
    if (!text || text.includes('<CURSOR>') || text.length > MAX_SUGGESTION_CHARS) return null;
    text = text.replace(/[ \t]+$/gm, '').replace(/\s+$/, '');
    if (!text.trim() || afterText.startsWith(text)) return null;
    return text;
  }

  const registration = vscode.languages.registerInlineCompletionItemProvider(
    LANGUAGES,
    {
      async provideInlineCompletionItems(document, position, _trigger, token) {
        const config = vscode.workspace.getConfiguration('triplecode');
        if (!config.get('ai.inlineEnabled', false)) return { items: [] };
        if (token.isCancellationRequested || inFlight >= MAX_IN_FLIGHT) return { items: [] };
        await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS));
        if (token.isCancellationRequested) return { items: [] };
        inFlight += 1;
        try {
          const reply = await aiChat(completionMessages(document, position));
          const offset = document.offsetAt(position);
          const suggestion = parseSuggestion(reply, document.getText().slice(offset, offset + 2000));
          if (!suggestion) return { items: [] };
          const range = new vscode.Range(position, position);
          return { items: [new vscode.InlineCompletionItem(suggestion, range)] };
        } finally {
          inFlight -= 1;
        }
      }
    }
  );
  context.subscriptions.push(registration);
}

module.exports = { registerInlineAI };
