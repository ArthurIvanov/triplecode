'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  inlineUserConfigured,
  planInlineAutoEnable,
  createInlineTracker
} = require('../inline-logic.cjs');

function collect() {
  const events = [];
  return { events, tracker: createInlineTracker({ emit: e => events.push(e), now: () => 1000 }) };
}

describe('S20 / R-β3 inline smart default', () => {
  it('detects explicit user setting vs default', () => {
    assert.equal(inlineUserConfigured({ globalValue: false, defaultValue: false }), true);
    assert.equal(inlineUserConfigured({ workspaceValue: true }), true);
    assert.equal(inlineUserConfigured({ defaultValue: false }), false);
    assert.equal(inlineUserConfigured(undefined), false);
  });

  it('plans auto-enable only when unset and probe OK', () => {
    assert.equal(planInlineAutoEnable({ autoEnable: true, userSet: false, probeOk: true }), 'enable');
    assert.equal(planInlineAutoEnable({ autoEnable: true, userSet: false, probeOk: false }), 'setup');
    assert.equal(planInlineAutoEnable({ autoEnable: true, userSet: true, probeOk: true }), 'respect');
    assert.equal(planInlineAutoEnable({ autoEnable: false, userSet: false, probeOk: true }), 'respect');
  });

  it('tracks terminal outcomes without completion text', () => {
    const { events, tracker } = collect();
    const id = tracker.begin(900);
    tracker.ghostShown(id);
    tracker.accept(id);
    assert.deepEqual(events, [{ feature: 'inline', outcome: 'accepted', durationMs: 100 }]);
    assert.ok(!JSON.stringify(events).includes('suggestion'));
  });

  it('counts superseded ghost as rejected and ignores stale ids', () => {
    const { events, tracker } = collect();
    const first = tracker.begin(100);
    tracker.ghostShown(first);
    const second = tracker.begin(200);
    assert.deepEqual(events.map(e => e.outcome), ['rejected']);
    tracker.accept(first);
    assert.equal(events.length, 1);
    tracker.dismiss(second);
    assert.equal(events.length, 1);
  });

  it('emits error on backend failure and stays silent on empty', () => {
    const { events, tracker } = collect();
    tracker.begin(0);
    tracker.fail();
    tracker.begin(0);
    tracker.empty();
    assert.deepEqual(events.map(e => e.outcome), ['error']);
  });

  it('package exposes auto-enable setting and keeps explicit default off', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const props = pkg.contributes.configuration.properties;
    assert.equal(props['triplecode.ai.inlineEnabled'].default, false);
    assert.equal(props['triplecode.ai.inlineAutoEnable'].default, true);
    assert.match(props['triplecode.ai.inlineEnabled'].markdownDescription, /Inline \/ Tab/);
  });
});
