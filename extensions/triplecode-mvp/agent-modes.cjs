'use strict';

const REQUEST_LIMIT = 500;

/** Only Agent mode may open a Review patch that can write after Keep. */
function modeMayWriteDisk(mode) {
  return mode === 'agent';
}

/** Plan/Ask store chat/plan text only — never a pending patch by themselves. */
function modeCreatesPending(mode) {
  return mode === 'agent';
}

function allowRequestLength(text, { approvedPlan = false, limit = REQUEST_LIMIT } = {}) {
  if (typeof text !== 'string' || !text.trim()) return false;
  if (approvedPlan) return true;
  return text.length <= limit;
}

function buildExecuteRequest(plan) {
  if (!plan || typeof plan.task !== 'string' || typeof plan.plan !== 'string') {
    throw new Error('Plan is missing task or body.');
  }
  return `${plan.task}\n\nApproved plan:\n${plan.plan}`;
}

/** Draft text is independent of mode switching. */
function draftAfterModeChange(draft) {
  return typeof draft === 'string' ? draft : '';
}

function sanitizePlanEdit(plan, nextBody) {
  if (!plan || typeof plan.id !== 'string') throw new Error('No plan to edit.');
  if (typeof nextBody !== 'string' || !nextBody.trim()) throw new Error('Plan text cannot be empty.');
  return { ...plan, plan: nextBody };
}

module.exports = {
  REQUEST_LIMIT,
  modeMayWriteDisk,
  modeCreatesPending,
  allowRequestLength,
  buildExecuteRequest,
  draftAfterModeChange,
  sanitizePlanEdit
};
