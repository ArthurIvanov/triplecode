'use strict';

const { buildDiagnosticsReport, createLogRing, redactSecrets } = require('./debug-logic.cjs');

function registerDebugDiagnostics(vscode, context, {
  getSnapshot,
  logRing = createLogRing()
} = {}) {
  if (typeof getSnapshot !== 'function') throw new Error('getSnapshot is required');

  const channel = vscode.window.createOutputChannel('TripleCode');
  context.subscriptions.push(channel);

  function appendLog(level, message) {
    const text = redactSecrets(String(message ?? ''));
    logRing.append(level, text);
    const line = `${new Date().toISOString()} [${level}] ${text}`;
    channel.appendLine(line);
  }

  async function collectDiagnostics() {
    const snapshot = await getSnapshot();
    const report = buildDiagnosticsReport({
      ...snapshot,
      generatedAt: new Date().toISOString(),
      logLines: logRing.snapshot()
    });
    channel.clear();
    channel.appendLine(report);
    channel.show(true);

    const choice = await vscode.window.showInformationMessage(
      'TripleCode diagnostics ready in Output.',
      'Copy report',
      'Save…'
    );
    if (choice === 'Copy report') {
      await vscode.env.clipboard.writeText(report);
      void vscode.window.showInformationMessage('Diagnostics copied to clipboard.');
      return report;
    }
    if (choice === 'Save…') {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('triplecode-diagnostics.md'),
        filters: { Markdown: ['md'], Text: ['txt'] }
      });
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(report, 'utf8'));
        void vscode.window.showInformationMessage(`Saved ${uri.fsPath}`);
      }
    }
    return report;
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('triplecode.collectDiagnostics', collectDiagnostics),
    vscode.commands.registerCommand('triplecode.showOutput', () => channel.show(true))
  );

  appendLog('info', 'TripleCode diagnostics channel ready');

  return { channel, appendLog, collectDiagnostics, logRing };
}

module.exports = { registerDebugDiagnostics };
