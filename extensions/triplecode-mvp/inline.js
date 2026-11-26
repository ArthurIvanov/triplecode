'use strict';

const vscode = require('vscode');
const provider = require('./provider');
const {
  LATENCY_STATUS_MS,
  shouldYieldToSuggest,
  parseSuggestion,
  completionMessages,
  resolveInlineEnabled,
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

function registerInlineAI(context, { onEvent = null } = {}) {
  let inFlight = 0;
  let ollamaProbe = { endpoint: '', ok: false, ts: 0 };
  let pendingAccept = null;
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  status.name = 'TripleCode Inline';
  status.command = 'triplecode.toggleInline';
  context.subscriptions.push(status);

  async function probeOllama(endpoint) {
    if (ollamaProbe.endpoint === endpoint && Date.now() - ollamaProbe.ts < 30000) {
      return ollamaProbe.ok;
    }
    const ok = await provider.probe(endpoint).catch(() => false);
    ollamaProbe = { endpoint, ok, ts: Date.now() };
    return ok;
  }

  async function autoBackendReady() {
    const config = vscode.workspace.getConfiguration('triplecode');
    if (config.get('ai.inlineProvider', 'ollama') === 'openai') {
      const apiKey = await context.secrets.get('triplecode.inlineApiKey').catch(() => '');
      return Boolean(apiKey && config.get('ai.inlineModel', ''));
    }
    return probeOllama(config.get('ai.inlineEndpoint', 'http://localhost:11434'));
  }

  async function effectiveEnabled() {
    const config = vscode.workspace.getConfiguration('triplecode');
    // VS Code reports defaultValue:false for boolean keys without an explicit
    // default, so inspect() is the only reliable way to see a user-set value.
    const inspected = config.inspect('ai.inlineEnabled');
    const setting = inspected?.globalValue ?? inspected?.workspaceValue;
    if (setting === true || setting === false) return setting;
    return resolveInlineEnabled(setting, { auto: await autoBackendReady() });
  }

  async function refreshStatusIdle() {
    const enabled = await effectiveEnabled().catch(() => false);
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

  function emitAccept(outcome, meta = {}) {
    if (!onEvent) { pendingAccept = null; return; }
    try { onEvent(outcome, meta); } catch { /* telemetry is best-effort */ }
    pendingAccept = null;
  }

  async function aiChat(messages) {
    const config = vscode.workspace.getConfiguration('triplecode');
    const kind = config.get('ai.inlineProvider', 'ollama');
    const meta = { provider: kind === 'openai' ? 'openai' : 'ollama', model: config.get('ai.inlineModel', '') };
    const timeoutMs = Math.min(Number(config.get('ai.timeoutMs', 120000)) || 120000, 10000);
    try {
      if (kind === 'openai') {
        const model = config.get('ai.inlineModel', '');
        if (!model) return { text: null, meta };
        const apiKey = await context.secrets.get('triplecode.inlineApiKey') || '';
        const text = await provider.chatCompletions({
          baseUrl: config.get('ai.inlineEndpoint', 'http://localhost:8000/v1'),
          apiKey,
          model,
          messages,
          timeoutMs,
          maxTokens: 256
        });
        return { text, meta };
      }
      const endpoint = config.get('ai.inlineEndpoint', 'http://localhost:11434');
      if (!(await probeOllama(endpoint))) return { text: null, meta };
      const text = await provider.chat({
        endpoint,
        model: config.get('ai.inlineModel', 'qwen2.5-coder:1.5b'),
        messages,
        timeoutMs,
        numPredict: 256,
        numCtx: 8192
      });
      return { text, meta };
    } catch {
      return { text: null, meta };
    }
  }

  const registration = vscode.languages.registerInlineCompletionItemProvider(
    LANGUAGES,
    {
      async provideInlineCompletionItems(document, position, contextInline, token) {
        const config = vscode.workspace.getConfiguration('triplecode');
        if (!(await effectiveEnabled())) return { items: [] };
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
          const { text: reply, meta } = await aiChat(completionMessages(fileName, document.languageId, before, after));
          if (token.isCancellationRequested) return { items: [] };
          const suggestion = parseSuggestion(reply, after);
          if (pendingAccept) emitAccept('dismissed', { ...pendingAccept.meta, durationMs: Date.now() - pendingAccept.at });
          if (!suggestion) {
            if (Date.now() - started >= 2500) {
              status.text = '$(warning) Inline slow';
              status.tooltip = 'Inline model was slow or empty. Check triplecode.ai.inline* / Set Inline API Key.';
              setTimeout(refreshStatusIdle, 2500);
            }
            return { items: [] };
          }
          const range = new vscode.Range(position, position);
          pendingAccept = {
            uri: document.uri.toString(), offset, text: suggestion,
            meta: { ...meta, durationMs: Date.now() - started }, at: Date.now()
          };
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
    const next = !(await effectiveEnabled().catch(() => false));
    await vscode.workspace.getConfiguration('triplecode')
      .update('ai.inlineEnabled', next, vscode.ConfigurationTarget.Global);
    if (next) {
      const kind = vscode.workspace.getConfiguration('triplecode').get('ai.inlineProvider', 'ollama');
      const tip = kind === 'openai'
        ? 'Inline on. Use TripleCode: Set Inline API Key for BYOK OpenAI-compatible completions.'
        : 'Inline on. Uses local Ollama model from triplecode.ai.inlineModel.';
      void vscode.window.showInformationMessage(tip);
    }
    void refreshStatusIdle();
  }

  context.subscriptions.push(
    registration,
    vscode.commands.registerCommand('triplecode.toggleInline', toggleInline),
    vscode.workspace.onDidChangeTextDocument(event => {
      const pending = pendingAccept;
      if (!pending || event.document.uri.toString() !== pending.uri) return;
      const accepted = event.contentChanges.some(change =>
        change.rangeOffset === pending.offset && change.text === pending.text);
      emitAccept(accepted ? 'accepted' : 'dismissed', pending.meta);
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('triplecode.ai.inline')) void refreshStatusIdle();
    })
  );
  void refreshStatusIdle();
}

module.exports = { registerInlineAI };
