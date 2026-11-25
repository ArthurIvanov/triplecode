'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  createSessionRecord,
  decidePrDelivery,
  worktreeBranchName,
  formatSessionBadge,
  formatSessionStatus,
  chatIdFromSessionId,
  listSessionSummary,
  sanitizeSessionPatch
} = require('../session-logic.cjs');

describe('S11 / Wave E session handoff', () => {
  it('creates sessions and formats badges', () => {
    const session = createSessionRecord({ id: 'chat-1', title: 'Fix flaky tests' });
    assert.equal(session.kind, 'local');
    assert.equal(formatSessionBadge(session), 'Local');
    assert.equal(formatSessionBadge(sanitizeSessionPatch(session, { kind: 'background' })), 'Background');
    assert.match(worktreeBranchName('chat-1', 'Fix flaky tests'), /^triplecode\/fix-flaky-tests-/);
  });

  it('formats cloud awaiting status and maps session ids to chats', () => {
    const cloud = sanitizeSessionPatch(
      createSessionRecord({ id: 'chat-7', kind: 'cloud', status: 'waiting' }),
      {}
    );
    assert.equal(formatSessionStatus(cloud), 'awaiting cloud');
    assert.equal(formatSessionBadge(cloud), 'Cloud');
    assert.equal(chatIdFromSessionId('chat-7'), 7);
    assert.equal(chatIdFromSessionId('other'), null);
  });

  it('keeps PR delivery idempotent for the same handoff key', () => {
    const session = createSessionRecord({ id: 'chat-9', title: 'Ship feature' });
    const first = decidePrDelivery(session, { baseBranch: 'main', title: 'Ship feature' });
    assert.equal(first.action, 'create');
    const delivered = sanitizeSessionPatch(session, {
      prUrl: 'https://github.com/org/repo/pull/1',
      prKey: first.prKey,
      status: 'handed-off'
    });
    const again = decidePrDelivery(delivered, { baseBranch: 'main', title: 'Ship feature' });
    assert.equal(again.action, 'reuse');
    assert.equal(again.prUrl, 'https://github.com/org/repo/pull/1');
  });

  it('summarizes sessions and wires package commands', () => {
    const rows = listSessionSummary([
      createSessionRecord({ id: 'a', kind: 'cloud', status: 'running' })
    ]);
    assert.equal(rows[0].badge, 'Cloud');
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const commands = pkg.contributes.commands.map(item => item.command);
    assert.ok(commands.includes('triplecode.prepareWorktree'));
    assert.ok(commands.includes('triplecode.markBackgroundSession'));
    assert.ok(commands.includes('triplecode.markCloudSession'));
    assert.ok(commands.includes('triplecode.deliverPr'));
  });
});
