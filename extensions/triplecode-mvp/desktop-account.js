'use strict';

const vscode = require('vscode');
const os = require('node:os');
const { randomBytes, randomUUID, createHash } = require('node:crypto');

const origin = 'https://triplecode.ru';
const providerId = 'triplecode';
const sessionKey = 'triplecode.account.session';
const pendingKey = 'triplecode.account.pending';
const authority = 'triplecode.triplecode-mvp';
const callbackPath = '/auth/callback';
const opaque = /^[A-Za-z0-9_-]{43}$/;
const lifetime = 10 * 60 * 1000;

function randomSecret() {
  return randomBytes(32).toString('base64url');
}

async function api(action, data) {
  const response = await fetch(origin + '/api/desktop/' + action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    redirect: 'error',
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    const error = new Error('Сервер входа недоступен. Попробуйте ещё раз.');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function credentials(response, state, knownId) {
  if (typeof response.email !== 'string' || !response.email ||
    typeof response.access_token !== 'string' || !response.access_token ||
    typeof response.refresh_token !== 'string' || !response.refresh_token ||
    !Number.isFinite(response.expires_in) || response.expires_in <= 0) {
    throw new Error('Сервер вернул неполные данные входа.');
  }
  const id = typeof response.session_id === 'string' && /^[a-f0-9-]{36}$/.test(response.session_id)
    ? response.session_id
    : (typeof knownId === 'string' && /^[a-f0-9-]{36}$/.test(knownId) ? knownId : randomUUID());
  return {
    id,
    state,
    email: response.email,
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000
  };
}

function authenticationSession(value) {
  return {
    id: value.id,
    accessToken: value.accessToken,
    account: { id: value.email, label: value.email },
    scopes: []
  };
}

function registerDesktopAccount(context) {
  if (vscode.env.uriScheme !== 'triplecode') return;
  const { secrets } = context;
  const changed = new vscode.EventEmitter();
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, -999);
  let previous;
  let refreshing;
  let signingIn;
  let exchanging = false;

  async function read(key) {
    try {
      return JSON.parse(await secrets.get(key) || 'null');
    } catch {
      return null;
    }
  }

  async function updateStatus() {
    const value = await read(sessionKey);
    status.text = value ? '$(account) TripleCode' : '$(account) Войти в TripleCode';
    status.tooltip = value?.email || 'Войти в TripleCode';
    status.command = value ? 'triplecode.account' : 'triplecode.signIn';
    const before = previous;
    previous = value;
    if (before?.id !== value?.id) {
      changed.fire({
        added: value ? [authenticationSession(value)] : [],
        removed: before ? [authenticationSession(before)] : [],
        changed: []
      });
    } else if (value && before.accessToken !== value.accessToken) {
      changed.fire({ added: [], removed: [], changed: [authenticationSession(value)] });
    }
  }

  async function activeSession() {
    const value = await read(sessionKey);
    if (!value || value.expiresAt > Date.now() + 30_000) return value;
    if (!refreshing) {
      refreshing = (async () => {
        try {
          const result = await api('refresh', { refresh_token: value.refreshToken, session_id: value.id });
          const refreshed = credentials(result, value.state, value.id);
          const latest = await read(sessionKey);
          if (latest?.id !== value.id) return latest;
          await secrets.store(sessionKey, JSON.stringify(refreshed));
          return refreshed;
        } catch (error) {
          if (error.status !== 401) throw error;
          const latest = await read(sessionKey);
          if (latest?.refreshToken !== value.refreshToken) return latest;
          await secrets.delete(sessionKey);
          return null;
        }
      })().finally(() => { refreshing = undefined; });
    }
    return refreshing;
  }

  async function forgetPending(state) {
    if ((await read(pendingKey))?.state === state) await secrets.delete(pendingKey);
  }

  function createSession() {
    if (signingIn) return signingIn;
    signingIn = vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Вход в TripleCode. Подтвердите email в браузере.',
      cancellable: true
    }, async (_progress, cancellation) => {
      const verifier = randomSecret();
      const state = randomSecret();
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const url = new URL('/desktop/start', origin);
      url.search = new URLSearchParams({ state, code_challenge: challenge, code_challenge_method: 'S256' });
      await secrets.store(pendingKey, JSON.stringify({ verifier, state, expiresAt: Date.now() + lifetime }));

      let timer, secretListener, cancelListener;
      try {
        const result = new Promise(resolve => {
          timer = setTimeout(() => resolve(null), lifetime);
          cancelListener = cancellation.onCancellationRequested(() => resolve(null));
          secretListener = secrets.onDidChange(({ key }) => {
            if (key === sessionKey) {
              void read(sessionKey).then(value => {
                if (value?.state === state) resolve(value);
              });
            }
            if (key === pendingKey) {
              void read(pendingKey).then(value => {
                if (value && value.state !== state) resolve(null);
              });
            }
          });
        });
        if (cancellation.isCancellationRequested) throw new vscode.CancellationError();
        if (!(await vscode.env.openExternal(vscode.Uri.parse(url.toString())))) {
          throw new Error('Не удалось открыть браузер.');
        }
        const value = await result;
        if (!value) {
          if (cancellation.isCancellationRequested) throw new vscode.CancellationError();
          throw new Error('Запрос входа истёк или был заменён. Начните вход заново.');
        }
        return authenticationSession(value);
      } finally {
        clearTimeout(timer);
        secretListener?.dispose();
        cancelListener?.dispose();
        await forgetPending(state);
      }
    }).finally(() => { signingIn = undefined; });
    return signingIn;
  }

  async function removeSession(id) {
    const value = await activeSession();
    if (!value || value.id !== id) return;
    try {
      await api('logout', { access_token: value.accessToken, session_id: value.id });
    } catch (error) {
      if (error.status !== 401) throw error;
    }
    if ((await read(sessionKey))?.id === id) await secrets.delete(sessionKey);
  }

  async function handleUri(uri) {
    if (uri.authority !== authority || uri.path !== callbackPath || exchanging) return;
    const params = new URLSearchParams(uri.query);
    const code = params.get('code');
    const state = params.get('state');
    if (!opaque.test(code || '') || !opaque.test(state || '')) return;
    exchanging = true;
    try {
      const pending = await read(pendingKey);
      if (!pending || pending.state !== state || pending.expiresAt <= Date.now()) {
        void vscode.window.showWarningMessage('Запрос входа истёк. Начните вход заново в TripleCode.');
        return;
      }
      const result = await api('exchange', {
        code, verifier: pending.verifier,
        label: ('TripleCode IDE · ' + os.hostname()).slice(0, 120)
      });
      if ((await read(pendingKey))?.state !== state) {
        await api('logout', { access_token: result.access_token }).catch(() => {});
        return;
      }
      const value = credentials(result, state);
      await secrets.store(sessionKey, JSON.stringify(value));
      await forgetPending(state);
      void vscode.window.showInformationMessage('Вход выполнен: ' + value.email);
    } catch {
      void vscode.window.showWarningMessage('Не удалось завершить вход. Откройте ссылку в браузере ещё раз или начните новый вход.');
    } finally {
      exchanging = false;
    }
  }

  async function showAccount() {
    try {
      const value = await activeSession();
      if (!value) {
        await createSession();
        return;
      }
      const action = await vscode.window.showQuickPick(['Выйти из TripleCode'], {
        title: 'TripleCode · ' + value.email
      });
      if (action === 'Выйти из TripleCode') await removeSession(value.id);
    } catch (error) {
      if (!(error instanceof vscode.CancellationError)) void vscode.window.showErrorMessage(error.message);
    }
  }

  context.subscriptions.push(
    status,
    changed,
    secrets.onDidChange(({ key }) => {
      if (key === sessionKey) void updateStatus();
    }),
    vscode.window.registerUriHandler({ handleUri }),
    vscode.authentication.registerAuthenticationProvider(providerId, 'TripleCode', {
      onDidChangeSessions: changed.event,
      async getSessions() {
        const value = await activeSession();
        return value ? [authenticationSession(value)] : [];
      },
      createSession,
      removeSession
    }),
    vscode.commands.registerCommand('triplecode.signIn', showAccount),
    vscode.commands.registerCommand('triplecode.account', showAccount)
  );
  void updateStatus();
  status.show();
}

module.exports = { registerDesktopAccount };
