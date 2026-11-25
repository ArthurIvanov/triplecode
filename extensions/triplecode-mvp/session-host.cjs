'use strict';

const { spawn } = require('node:child_process');
const { join } = require('node:path');
const { mkdir } = require('node:fs/promises');
const {
  createSessionRecord, sanitizeSessionPatch, decidePrDelivery,
  worktreeBranchName, listSessionSummary, formatSessionBadge
} = require('./session-logic.cjs');

function runGit(args, { cwd, timeoutMs = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`git ${args[0]} timed out`));
    }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(stderr.trim() || `git ${args.join(' ')} exited ${code}`));
    });
  });
}

function registerSessionHost(vscode, context, {
  getChats = () => [],
  persistChats = () => {},
  appendLog = () => {},
  postChats = () => {}
} = {}) {
  function loadSessions() {
    return context.workspaceState.get('triplecode.sessions', []) || [];
  }

  async function saveSessions(sessions) {
    await context.workspaceState.update('triplecode.sessions', sessions.slice(0, 40));
  }

  function sessionForChat(chat) {
    if (!chat) return null;
    if (chat.session) return chat.session;
    const sessions = loadSessions();
    const found = sessions.find(item => item.id === `chat-${chat.id}`);
    return found || null;
  }

  async function ensureChatSession(chat) {
    let session = sessionForChat(chat);
    if (session) return session;
    session = createSessionRecord({
      id: `chat-${chat.id}`,
      title: chat.name || `Chat ${chat.id}`,
      kind: 'local',
      status: 'idle'
    });
    chat.session = session;
    const sessions = loadSessions().filter(item => item.id !== session.id);
    sessions.unshift(session);
    await saveSessions(sessions);
    persistChats();
    return session;
  }

  async function prepareWorktree() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder || folder.uri.scheme !== 'file') {
      throw new Error('Open a local git folder first.');
    }
    const root = folder.uri.fsPath;
    const chats = getChats();
    const chat = chats[0];
    if (!chat) throw new Error('No active chat.');
    const session = await ensureChatSession(chat);
    const branch = worktreeBranchName(session.id, session.title);
    const worktreesRoot = join(root, '.triplecode', 'worktrees');
    await mkdir(worktreesRoot, { recursive: true });
    const worktreePath = join(worktreesRoot, branch.replace(/\//g, '-'));

    session.status = 'preparing';
    chat.session = session;
    persistChats();
    postChats();

    try {
      await runGit(['rev-parse', '--is-inside-work-tree'], { cwd: root });
      try {
        await runGit(['worktree', 'add', '-b', branch, worktreePath], { cwd: root });
      } catch (error) {
        if (!/already exists|already checked out/i.test(error.message)) throw error;
      }
      const next = sanitizeSessionPatch(session, {
        status: 'idle',
        kind: 'local',
        worktreePath,
        branch
      });
      chat.session = next;
      const sessions = loadSessions().filter(item => item.id !== next.id);
      sessions.unshift(next);
      await saveSessions(sessions);
      persistChats();
      postChats();
      appendLog('info', `worktree ready ${branch} → ${worktreePath}`);
      await vscode.window.showInformationMessage(
        `Session worktree ready on ${branch}. Path: ${worktreePath}`
      );
      return next;
    } catch (error) {
      chat.session = sanitizeSessionPatch(session, { status: 'failed' });
      persistChats();
      postChats();
      throw error;
    }
  }

  async function markBackground() {
    const chats = getChats();
    const chat = chats.find(Boolean);
    if (!chat) throw new Error('No active chat.');
    const session = await ensureChatSession(chat);
    const next = sanitizeSessionPatch(session, { kind: 'background', status: 'running' });
    chat.session = next;
    const sessions = loadSessions().filter(item => item.id !== next.id);
    sessions.unshift(next);
    await saveSessions(sessions);
    persistChats();
    postChats();
    appendLog('info', `session ${next.id} marked background (local stub; cloud runtime later)`);
    await vscode.window.showInformationMessage(
      'Session marked Background. It stays on this machine until cloud runtime (R-E2) is wired.'
    );
    return next;
  }

  async function deliverPr() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const chats = getChats();
    const chat = chats.find(Boolean);
    if (!chat) throw new Error('No active chat.');
    const session = await ensureChatSession(chat);
    const decision = decidePrDelivery(session, {
      baseBranch: 'main',
      title: session.title
    });
    if (decision.action === 'reuse') {
      await vscode.env.openExternal(vscode.Uri.parse(session.prUrl));
      await vscode.window.showInformationMessage('Reusing existing PR for this handoff key.');
      return session;
    }

    let remote = '';
    if (folder?.uri.scheme === 'file') {
      try {
        remote = (await runGit(['remote', 'get-url', 'origin'], { cwd: folder.uri.fsPath })).stdout;
      } catch { /* optional */ }
    }

    const branch = session.branch || worktreeBranchName(session.id, session.title);
    let prUrl = '';
    if (/github\.com[:/](.+?)(?:\.git)?$/i.test(remote)) {
      const repo = RegExp.$1.replace(/\.git$/, '');
      prUrl = `https://github.com/${repo}/compare/main...${encodeURIComponent(branch)}?expand=1`;
    } else {
      prUrl = `https://github.com/new?title=${encodeURIComponent(session.title)}`;
    }

    const next = sanitizeSessionPatch(session, {
      status: 'handed-off',
      prUrl,
      prKey: decision.prKey,
      branch
    });
    chat.session = next;
    const sessions = loadSessions().filter(item => item.id !== next.id);
    sessions.unshift(next);
    await saveSessions(sessions);
    persistChats();
    postChats();
    appendLog('info', `PR handoff ${decision.prKey} → ${prUrl}`);
    await vscode.env.openExternal(vscode.Uri.parse(prUrl));
    await vscode.window.showInformationMessage('Opened PR create/compare URL (idempotent key stored).');
    return next;
  }

  function chatStateExtras(chat) {
    const session = sessionForChat(chat);
    return {
      session: session ? {
        ...session,
        badge: formatSessionBadge(session)
      } : null,
      sessions: listSessionSummary(loadSessions())
    };
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('triplecode.prepareWorktree', () => prepareWorktree()),
    vscode.commands.registerCommand('triplecode.markBackgroundSession', () => markBackground()),
    vscode.commands.registerCommand('triplecode.deliverPr', () => deliverPr())
  );

  return {
    prepareWorktree,
    markBackground,
    deliverPr,
    chatStateExtras,
    ensureChatSession,
    loadSessions
  };
}

module.exports = { registerSessionHost, runGit };
