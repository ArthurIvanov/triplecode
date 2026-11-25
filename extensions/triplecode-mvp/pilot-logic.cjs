'use strict';

const PILOT_STEPS = [
  { id: 'import', label: 'Import profile done', description: 'S02 import wizard completed' },
  { id: 'first_agent', label: 'First AI task done', description: 'First agent/plan turn returned ok' },
  { id: 'review_keep', label: 'First patch kept', description: 'First Review patch accepted (Keep)' },
  { id: 'done', label: 'Pilot task done', description: 'Participant finished the pilot task' }
];

const PILOT_TASK_ID = /^[A-Za-z0-9_-]{1,64}$/;

function isPilotStep(step) {
  return PILOT_STEPS.some(item => item.id === step);
}

function sanitizePilotTaskId(value) {
  const id = String(value || '').trim();
  return PILOT_TASK_ID.test(id) ? id : '';
}

/** Payload fragment merged into POST /api/usage/event. */
function pilotEventPayload(taskId, step) {
  const id = sanitizePilotTaskId(taskId);
  if (!id || !isPilotStep(step)) return null;
  return { task_id: id, step };
}

module.exports = {
  PILOT_STEPS,
  PILOT_TASK_ID,
  isPilotStep,
  sanitizePilotTaskId,
  pilotEventPayload
};
