'use strict';

const vscode = require('vscode');
const provider = require('./provider');
const {
  LATENCY_STATUS_MS,
  shouldYieldToSuggest,
  parseSuggestion,
  completionMessages,
  latencyStatusLabel,
  inlineUserConfigured,
  planInlineAutoEnable,
  createInlineTracker
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
const AUTO_ENABLE_KEYS = [
  'ai.inlineEnabled',
  'ai.inlineAutoEnable',
  'ai.inlineProvider',
  'ai.inlineEndpoint',
  'ai.inlineModel'
];

function registerInlineAI(context, hooks = {}) {
  const reportUsage = typeof hooks.reportUsage === 'function' ? hooks.reportUsage : () => {};
  const debugLog = typeof hooks.debugLog === 'function' ? hooks.debugLog : () => ({ appendLog() {} });
  let inFlight = 0;
  let ollamaProbe = { endpoint: '', ok: false, ts: 0 };
  let backendState = 'unknown';
  let autoEnableRun = null;
  let pendingGhost = null;
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  status.name = 'TripleCode Inline';
  status.command = 'triplecode.toggleInline';
  context.subscriptions.push(status);

  const tracker = createInlineTracker({
    emit: ({ outcome, durationMs }) => {
      const config = vscode.workspace.getConfiguration('triplecode');
      const kind = config.get('ai.inlineProvider', 'ollama');
      reportUsage({
        feature: 'inline',
        provider: kind === 'ollama' ? 'ollama' : null,
        model: config.get('ai.inlineModel', '') || null,
        durationMs,
        outcome
      });
      debugLog().appendLog('info', `inline outcome=${outcome} duration_ms=${durationMs}`);
    }
  });

  function refreshStatusIdle() {
    const enabled = vscode.workspace.getConfiguration('triplecode').get('ai.inlineEnabled', false);
    if (!enabled) {
      if (backendState === 'missing' && !inlineUserConfigured(
        vscode.workspace.getConfiguration('triplecode').inspect('ai.inlineEnabled')
      )) {
        status.text = '$(circle-slash) Inline: setup';
        status.tooltip = 'Tab completions need a backend: start Ollama or set an inline API key (TripleCode: Set Inline API Key). Click to enable anyway.';
      } else {
        status.text = '$(circle-slash) Inline off';
        status.tooltip = 'TripleCode inline completions are off. Click to enable (BYOK / local model).';
      }
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

  async function inlineBackendReady() {
    const config = vscode.workspace.getConfiguration('triplecode');
    const kind = config.get('ai.inlineProvider', 'ollama');
    if (kind === 'openai') {
      const model = config.get('ai.inlineModel', '');
      const apiKey = await context.secrets.get('triplecode.inlineApiKey') || '';
      return Boolean(model && apiKey);
    }
    return probeOllama(config.get('ai.inlineEndpoint', 'http://localhost:11434'));
  }

  async function maybeAutoEnable() {
    if (autoEnableRun) return autoEnableRun;
    autoEnableRun = (async () => {
      const config = vscode.workspace.getConfiguration('triplecode');
      const plan = planInlineAutoEnable({
        autoEnable: config.get('ai.inlineAutoEnable', true),
        userSet: inlineUserConfigured(config.inspect('ai.inlineEnabled')),
        probeOk: await inlineBackendReady().catch(() => false)
      });
      backendState = plan === 'enable' ? 'ready' : plan === 'setup' ? 'missing' : backendState;
      if (plan === 'enable' && !config.get('ai.inlineEnabled', false)) {
        await config.update('ai.inlineEnabled', true, vscode.ConfigurationTarget.Global);
        if (!context.globalState.get('triplecode.inlineAutoNotified')) {
          void context.globalState.update('triplecode.inlineAutoNotified', true);
          void vscode.window.showInformationMessage(
            'TripleCode Tab completions enabled (ghost text). Disable anytime via “TripleCode: Toggle Inline” or Settings.'
          );
        }
      }
      refreshStatusIdle();
    })().finally(() => { autoEnableRun = null; });
    return autoEnableRun;
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

  function noteGhost(document, position, suggestion, requestId) {
    pendingGhost = {
      uri: document.uri.toString(),
      text: suggestion,
      requestId
    };
  }

  const registration = vscode.languages.registerInlineCompletionItemProvider(
    LANGUAGES,
    {
      async provideInlineCompletionItems(document, position, contextInline, token) {
        const config = vscode.workspace.getConfiguration('triplecode');
        if (!config.get('ai.inlineEnabled', false)) return { items: [] };
        if (shouldYieldToSuggest(contextInline)) {
          if (pendingGhost) {
            tracker.dismiss(pendingGhost.requestId);
            pendingGhost = null;
          }
          return { items: [] };
        }
        if (token.isCancellationRequested || inFlight >= MAX_IN_FLIGHT) return { items: [] };
        await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS));
        if (token.isCancellationRequested) return { items: [] };

        inFlight += 1;
        const started = Date.now();
        const requestId = tracker.begin(started);
        pendingGhost = null;
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
          if (token.isCancellationRequested) {
            tracker.dismiss(requestId);
            return { items: [] };
          }
          if (reply == null) {
            tracker.fail(requestId);
            if (Date.now() - started >= 2500) {
              status.text = '$(warning) Inline slow';
              status.tooltip = 'Inline model was slow or unreachable. Check triplecode.ai.inline* / Set Inline API Key.';
              setTimeout(refreshStatusIdle, 2500);
            }
            return { items: [] };
          }
          const suggestion = parseSuggestion(reply, after);
          if (!suggestion) {
            tracker.empty(requestId);
            return { items: [] };
          }
          tracker.ghostShown(requestId);
          noteGhost(document, position, suggestion, requestId);
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

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      const ghost = pendingGhost;
      if (!ghost || ghost.uri !== event.document.uri.toString()) return;
      pendingGhost = null;
      const accepted = event.contentChanges.some(change => change.text === ghost.text);
      if (accepted) tracker.accept(ghost.requestId);
      else tracker.dismiss(ghost.requestId);
    })
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
      if (AUTO_ENABLE_KEYS.some(key => event.affectsConfiguration(`triplecode.${key}`))) {
        void maybeAutoEnable();
      }
    })
  );
  refreshStatusIdle();
  void maybeAutoEnable();
}

module.exports = { registerInlineAI };
