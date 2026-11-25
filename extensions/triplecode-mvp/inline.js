'use strict';

const vscode = require('vscode');
const provider = require('./provider');
const {
  LATENCY_STATUS_MS,
  shouldYieldToSuggest,
  parseSuggestion,
  completionMessages,
  latencyStatusLabel
} = require('./inline-logic.cjs');

const LANGUAGES = [
  { language: 'typescript' },
  { language: 'typescriptreact' },
  { language: 'javascript' },
  { language: 'javascriptreact' },
  { language: 'python' },
  { language: 'go' },
  { language: 'rust' }
];

const DEBOUNCE_MS = 300;
const MAX_IN_FLIGHT = 2;

function registerInlineAI(context) {
  let inFlight = 0;
  let ollamaProbe = { endpoint: '', ok: false, ts: 0 };
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  status.name = 'TripleCode Inline';
  status.command = 'triplecode.toggleInline';
  context.subscriptions.push(status);

  function refreshStatusIdle() {
    const enabled = vscode.workspace.getConfiguration('triplecode').get('ai.inlineEnabled', false);
    if (!enabled) {
      status.text = '$(circle-slash) Inline off';
      status.tooltip = 'TripleCode inline completions are off. Click to enable (BYOK / local model).';
      status.show();
      return;
    }
    status.text = '$(sparkle) Inline';
    status.tooltip = 'TripleCode inline completions on. Click to disable.';
    status.show();
  }

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

  const registration = vscode.languages.registerInlineCompletionItemProvider(
    LANGUAGES,
    {
      async provideInlineCompletionItems(document, position, contextInline, token) {
        const config = vscode.workspace.getConfiguration('triplecode');
        if (!config.get('ai.inlineEnabled', false)) return { items: [] };
        if (shouldYieldToSuggest(contextInline)) return { items: [] };
        if (token.isCancellationRequested || inFlight >= MAX_IN_FLIGHT) return { items: [] };
        await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS));
        if (token.isCancellationRequested) return { items: [] };

        inFlight += 1;
        const started = Date.now();
        let latencyTimer = setTimeout(() => {
          status.text = `$(loading~spin) ${latencyStatusLabel(Date.now() - started)}`;
          status.show();
        }, LATENCY_STATUS_MS);
        try {
          const offset = document.offsetAt(position);
          const text = document.getText();
          const before = text.slice(Math.max(0, offset - 6000), offset);
          const after = text.slice(offset, offset + 2000);
          const fileName = document.fileName.split('/').pop() || 'file';
          const reply = await aiChat(completionMessages(fileName, document.languageId, before, after));
          if (token.isCancellationRequested) return { items: [] };
          const suggestion = parseSuggestion(reply, after);
          if (!suggestion) {
            if (Date.now() - started >= 2500) {
              status.text = '$(warning) Inline slow';
              status.tooltip = 'Inline model was slow or empty. Check triplecode.ai.inline* / Set Inline API Key.';
              setTimeout(refreshStatusIdle, 2500);
            }
            return { items: [] };
          }
          const range = new vscode.Range(position, position);
          return { items: [new vscode.InlineCompletionItem(suggestion, range)] };
        } finally {
          clearTimeout(latencyTimer);
          inFlight -= 1;
          if (inFlight === 0) refreshStatusIdle();
        }
      }
    }
  );

  async function toggleInline() {
    const config = vscode.workspace.getConfiguration('triplecode');
    const next = !config.get('ai.inlineEnabled', false);
    await config.update('ai.inlineEnabled', next, vscode.ConfigurationTarget.Global);
    if (next) {
      const kind = config.get('ai.inlineProvider', 'ollama');
      const tip = kind === 'openai'
        ? 'Inline on. Use TripleCode: Set Inline API Key for BYOK OpenAI-compatible completions.'
        : 'Inline on. Uses local Ollama model from triplecode.ai.inlineModel.';
      void vscode.window.showInformationMessage(tip);
    }
    refreshStatusIdle();
  }

  context.subscriptions.push(
    registration,
    vscode.commands.registerCommand('triplecode.toggleInline', toggleInline),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('triplecode.ai.inlineEnabled')) refreshStatusIdle();
    })
  );
  refreshStatusIdle();
}

module.exports = { registerInlineAI };
