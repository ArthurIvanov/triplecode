'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  PILOT_STEPS,
  isPilotStep,
  sanitizePilotTaskId,
  pilotEventPayload
} = require('../pilot-logic.cjs');

describe('S22 / R-β6 pilot step events', () => {
  it('accepts only known steps', () => {
    assert.deepEqual(PILOT_STEPS.map(s => s.id), ['import', 'first_agent', 'review_keep', 'done']);
    assert.equal(isPilotStep('import'), true);
    assert.equal(isPilotStep('done'), true);
    assert.equal(isPilotStep('hack'), false);
    assert.equal(isPilotStep(''), false);
  });

  it('sanitizes task id and builds payload', () => {
    assert.equal(sanitizePilotTaskId('P01'), 'P01');
    assert.equal(sanitizePilotTaskId('p-1_x'), 'p-1_x');
    assert.equal(sanitizePilotTaskId('bad id!'), '');
    assert.equal(sanitizePilotTaskId('x'.repeat(65)), '');
    assert.equal(sanitizePilotTaskId(''), '');
    assert.deepEqual(pilotEventPayload('P03', 'review_keep'), { task_id: 'P03', step: 'review_keep' });
    assert.equal(pilotEventPayload('bad id', 'done'), null);
    assert.equal(pilotEventPayload('P01', 'nope'), null);
  });

  it('package contributes pilot command and taskId setting', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const commands = pkg.contributes.commands.map(item => item.command);
    assert.ok(commands.includes('triplecode.pilotStep'));
    assert.equal(pkg.contributes.configuration.properties['triplecode.pilot.taskId'].default, '');
  });
});
