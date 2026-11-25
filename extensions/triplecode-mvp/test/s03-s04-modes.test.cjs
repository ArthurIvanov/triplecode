'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  modeMayWriteDisk, modeCreatesPending, allowRequestLength, buildExecuteRequest,
  draftAfterModeChange, sanitizePlanEdit, REQUEST_LIMIT
} = require('../agent-modes.cjs');

describe('S03 Ask never writes', () => {
  it('ask and plan are reply-only; only agent may write after Keep', () => {
    assert.equal(modeMayWriteDisk('ask'), false);
    assert.equal(modeMayWriteDisk('plan'), false);
    assert.equal(modeMayWriteDisk('agent'), true);
  });

  it('plan/ask do not create a pending patch by themselves', () => {
    assert.equal(modeCreatesPending('plan'), false);
    assert.equal(modeCreatesPending('ask'), false);
    assert.equal(modeCreatesPending('agent'), true);
  });

  it('mode switch keeps draft text', () => {
    assert.equal(draftAfterModeChange('keep me'), 'keep me');
    assert.equal(draftAfterModeChange(''), '');
  });
});

describe('S04 Plan execute uses confirmed body', () => {
  it('rejects overlong composer requests unless approvedPlan', () => {
    const long = 'x'.repeat(REQUEST_LIMIT + 1);
    assert.equal(allowRequestLength(long), false);
    assert.equal(allowRequestLength(long, { approvedPlan: true }), true);
    assert.equal(allowRequestLength('ok'), true);
    assert.equal(allowRequestLength('   '), false);
  });

  it('buildExecuteRequest embeds full plan body over 8000 chars', () => {
    const planBody = 'step\n'.repeat(2000); // > 8000
    assert.ok(planBody.length > 8000);
    const payload = buildExecuteRequest({ task: 'Refactor utils', plan: planBody });
    assert.ok(payload.startsWith('Refactor utils\n\nApproved plan:\n'));
    assert.ok(payload.endsWith(planBody));
    assert.equal(payload.includes(planBody), true);
    assert.equal(allowRequestLength(payload, { approvedPlan: true }), true);
  });

  it('sanitizePlanEdit updates confirmed plan text', () => {
    const plan = { id: 'p1', task: 'T', plan: '1. old' };
    const next = sanitizePlanEdit(plan, '1. revised criterion\n2. do it');
    assert.equal(next.id, 'p1');
    assert.equal(next.task, 'T');
    assert.equal(next.plan, '1. revised criterion\n2. do it');
    const executed = buildExecuteRequest(next);
    assert.match(executed, /revised criterion/);
  });

  it('sanitizePlanEdit rejects empty body', () => {
    assert.throws(() => sanitizePlanEdit({ id: 'p1', task: 'T', plan: 'x' }, '  '));
  });
});
