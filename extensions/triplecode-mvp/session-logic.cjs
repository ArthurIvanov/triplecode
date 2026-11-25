'use strict';

const SESSION_KINDS = ['local', 'background', 'cloud'];
const SESSION_STATUSES = [
  'idle', 'preparing', 'running', 'waiting', 'completed', 'failed', 'handed-off'
];

function createSessionRecord({
  id,
  title = 'Session',
  kind = 'local',
  status = 'idle',
  worktreePath = '',
  branch = '',
  prUrl = '',
  prKey = '',
  createdAt = Date.now()
} = {}) {
  if (!id) throw new Error('session id required');
  return {
    id: String(id),
    title: String(title).slice(0, 120),
    kind: SESSION_KINDS.includes(kind) ? kind : 'local',
    status: SESSION_STATUSES.includes(status) ? status : 'idle',
    worktreePath: String(worktreePath || ''),
    branch: String(branch || ''),
    prUrl: String(prUrl || ''),
    prKey: String(prKey || ''),
    createdAt,
    updatedAt: createdAt
  };
}

function sanitizeSessionPatch(session, patch = {}) {
  const next = { ...session };
  if (patch.title != null) next.title = String(patch.title).slice(0, 120);
  if (patch.kind && SESSION_KINDS.includes(patch.kind)) next.kind = patch.kind;
  if (patch.status && SESSION_STATUSES.includes(patch.status)) next.status = patch.status;
  if (patch.worktreePath != null) next.worktreePath = String(patch.worktreePath);
  if (patch.branch != null) next.branch = String(patch.branch).slice(0, 200);
  if (patch.prUrl != null) next.prUrl = String(patch.prUrl).slice(0, 500);
  if (patch.prKey != null) next.prKey = String(patch.prKey).slice(0, 200);
  next.updatedAt = Date.now();
  return next;
}

/** Idempotent PR key for a session task + base branch. */
function prDeliveryKey({ sessionId, baseBranch = 'main', title = '' }) {
  const slug = String(title || 'task').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `${sessionId}:${baseBranch}:${slug || 'task'}`;
}

/**
 * Decide whether to create a new PR or reuse existing delivery.
 * @returns {{ action: 'create'|'reuse'|'blocked', prUrl?: string, prKey: string, reason?: string }}
 */
function decidePrDelivery(session, { baseBranch = 'main', title } = {}) {
  const prKey = prDeliveryKey({
    sessionId: session.id,
    baseBranch,
    title: title || session.title
  });
  if (session.prUrl && session.prKey === prKey) {
    return { action: 'reuse', prUrl: session.prUrl, prKey, reason: 'PR already delivered for this handoff key' };
  }
  if (session.prUrl && session.prKey && session.prKey !== prKey) {
    return { action: 'create', prKey, reason: 'Different handoff key than previous PR' };
  }
  return { action: 'create', prKey };
}

function worktreeBranchName(sessionId, title = '') {
  const slug = String(title || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return `triplecode/${slug || 'session'}-${String(sessionId).slice(0, 8)}`;
}

function formatSessionBadge(session) {
  if (!session) return 'Local';
  if (session.kind === 'cloud') return 'Cloud';
  if (session.kind === 'background') return 'Background';
  return 'Local';
}

function formatSessionStatus(session) {
  if (!session) return 'idle';
  const status = SESSION_STATUSES.includes(session.status) ? session.status : 'idle';
  if (session.kind === 'cloud' && status === 'waiting') return 'awaiting cloud';
  if (session.kind === 'background' && status === 'running') return 'background';
  return status;
}

function chatIdFromSessionId(sessionId) {
  const match = /^chat-(\d+)$/.exec(String(sessionId || ''));
  return match ? Number(match[1]) : null;
}

function listSessionSummary(sessions) {
  return (sessions || []).map(session => ({
    id: session.id,
    title: session.title,
    kind: session.kind,
    status: session.status,
    statusLabel: formatSessionStatus(session),
    badge: formatSessionBadge(session),
    branch: session.branch,
    prUrl: session.prUrl,
    worktreePath: session.worktreePath
  }));
}

module.exports = {
  SESSION_KINDS,
  SESSION_STATUSES,
  createSessionRecord,
  sanitizeSessionPatch,
  prDeliveryKey,
  decidePrDelivery,
  worktreeBranchName,
  formatSessionBadge,
  formatSessionStatus,
  chatIdFromSessionId,
  listSessionSummary
};
