'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  accountStatusLabel,
  accountStatusTooltip,
  accountMenuItems,
  softPlanCopy,
  CABINET_ORIGIN
} = require('../account-logic.cjs');

describe('S09 / R-A1 account UI helpers', () => {
  it('labels guest, waiting, and signed-in states', () => {
    assert.equal(accountStatusLabel('guest'), 'Войти в TripleCode');
    assert.equal(accountStatusLabel('waiting'), 'Вход…');
    assert.equal(accountStatusLabel('signed-in', 'artur@example.com'), 'artur');
    assert.match(accountStatusTooltip('signed-in', 'artur@example.com'), /Pilot · BYOK/);
  });

  it('builds cabinet menu actions with soft plan copy', () => {
    const items = accountMenuItems('artur@example.com');
    assert.equal(items[0].kind, 'header');
    assert.ok(items.some(item => item.kind === 'usage' && item.url === `${CABINET_ORIGIN}/account/usage`));
    assert.ok(items.some(item => item.kind === 'plan' && item.url.endsWith('/account/plan')));
    assert.ok(items.some(item => item.kind === 'logout'));
    assert.equal(softPlanCopy().id, 'pilot-byok');
  });
});
