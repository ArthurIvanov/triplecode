'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  decideUpdateState, platformTriple, formatAboutLines, compareVersions,
  resolveUpdateUrl, shouldAutoCheck
} = require('./update-logic.cjs');

function readProductUpdateUrl(appRoot) {
  try {
    const product = JSON.parse(fs.readFileSync(path.join(appRoot, 'product.json'), 'utf8'));
    return String(product?.updateUrl || '').trim();
  } catch {
    return '';
  }
}

async function fetchManifest(url, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function registerUpdateCommands(vscode, context, {
  getProductVersion,
  appendLog = () => {},
  fetchImpl = fetch,
  readProductJson = () => readProductUpdateUrl(vscode.env?.appRoot || '')
} = {}) {
  function resolveManifestUrl() {
    const config = vscode.workspace.getConfiguration('triplecode');
    return resolveUpdateUrl({
      settingUrl: config.get('update.manifestUrl', ''),
      productUpdateUrl: readProductJson()
    });
  }

  async function checkUpdates({ silent = false } = {}) {
    const config = vscode.workspace.getConfiguration('triplecode');
    const url = resolveManifestUrl();
    const channel = config.get('update.channel', 'stable');
    const version = typeof getProductVersion === 'function'
      ? getProductVersion()
      : (context.extension?.packageJSON?.version || '0.0.0');
    const { os, arch } = platformTriple();

    if (!url) {
      const msg = 'No update manifest URL. Set triplecode.update.manifestUrl or TRIPLECODE_UPDATE_URL at build.';
      if (!silent) await vscode.window.showInformationMessage(msg);
      appendLog('info', msg);
      return { state: 'idle', message: msg };
    }

    try {
      const manifest = await fetchManifest(url, { fetchImpl });
      const decision = decideUpdateState({
        currentVersion: version,
        manifest,
        os,
        arch,
        preferChannel: channel
      });
      appendLog('info', decision.message);
      if (silent && decision.state === 'idle') return decision;

      if (decision.state === 'available' || decision.state === 'rollback') {
        const open = decision.artifact?.url ? 'Open download' : undefined;
        const choice = await vscode.window.showInformationMessage(
          decision.message,
          ...(open ? [open, 'Dismiss'] : ['Dismiss'])
        );
        if (choice === 'Open download' && decision.artifact?.url) {
          await vscode.env.openExternal(vscode.Uri.parse(decision.artifact.url));
        }
      } else if (decision.state === 'error') {
        if (!silent) await vscode.window.showWarningMessage(decision.message);
      } else if (!silent) {
        await vscode.window.showInformationMessage(decision.message);
      }
      return decision;
    } catch (error) {
      const message = `Update check failed: ${error.message}`;
      appendLog('error', message);
      if (!silent) await vscode.window.showWarningMessage(message);
      return { state: 'error', message };
    }
  }

  async function maybeAutoCheck() {
    if (!resolveManifestUrl()) return null;
    return autoCheck();
  }

  async function showAbout() {
    const config = vscode.workspace.getConfiguration('triplecode');
    const version = typeof getProductVersion === 'function'
      ? getProductVersion()
      : (context.extension?.packageJSON?.version || '0.0.0');
    const lines = formatAboutLines({
      version,
      channel: config.get('update.channel', 'stable'),
      vscodeVersion: vscode.version,
      updateState: config.get('update.manifestUrl') ? 'configured' : 'manual'
    });
    await vscode.window.showInformationMessage(lines.join('\n'), { modal: true });
  }

  async function autoCheck({ intervalMs = 24 * 60 * 60 * 1000 } = {}) {
    const last = Number(await context.globalState.get('triplecode.update.lastCheck', 0)) || 0;
    if (!shouldAutoCheck({ lastCheckAt: last, intervalMs })) return null;
    await context.globalState.update('triplecode.update.lastCheck', Date.now());
    return checkUpdates({ silent: true });
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('triplecode.checkUpdates', () => checkUpdates({ silent: false })),
    vscode.commands.registerCommand('triplecode.about', showAbout)
  );

  return { checkUpdates, showAbout, compareVersions, autoCheck, maybeAutoCheck, resolveManifestUrl };
}

module.exports = {
  fetchManifest,
  registerUpdateCommands
};
