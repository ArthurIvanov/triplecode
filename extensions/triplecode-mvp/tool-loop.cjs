'use strict';

const { parseMcpInvocations } = require('./mcp-logic.cjs');

const MAX_TOOL_ROUNDS = 8;
const MAX_READS_PER_TURN = 16;
const MAX_FILES_PER_TURN = 8;
const READ_CONTENT_LIMIT = 6000;

/**
 * Parse one model turn into tool intents.
 * Relies on provider.parseMultiRewrite for FILE / READ / ANSWER / NOCHANGE;
 * adds CHECK: and MCP: server/tool.
 */
function parseToolTurn(text, parseMultiRewrite) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { kind: 'empty' };

  const outsideFences = trimmed.replace(/```[\s\S]*?```/g, '');
  const checks = [];
  for (const match of outsideFences.matchAll(/^CHECK:[ \t]*(.*)$/gim)) {
    const command = match[1].trim();
    checks.push(command || null);
  }
  const mcpCalls = parseMcpInvocations(trimmed);

  const parsed = typeof parseMultiRewrite === 'function' ? parseMultiRewrite(trimmed) : null;
  if (parsed?.answer) {
    return { kind: 'answer', answer: parsed.answer, checks, mcpCalls };
  }
  if (parsed?.noChange) {
    return { kind: 'noChange', reason: parsed.reason || '', checks, mcpCalls };
  }

  const reads = Array.isArray(parsed?.reads) ? parsed.reads.slice(0, MAX_READS_PER_TURN) : [];
  const files = Array.isArray(parsed?.files) ? parsed.files.slice(0, MAX_FILES_PER_TURN) : [];

  if (reads.length) {
    return { kind: 'read', reads, files, checks, mcpCalls };
  }
  if (mcpCalls.length) {
    return { kind: 'mcp', mcpCalls, files, checks };
  }
  if (checks.length && files.length) {
    return { kind: 'check_with_edit', files, checks, mcpCalls };
  }
  if (checks.length) {
    return { kind: 'check', checks, mcpCalls };
  }
  if (files.length) {
    return { kind: 'edit', files, mcpCalls };
  }
  return { kind: 'unparsed' };
}

/**
 * Decide host action for a parsed turn.
 * Priority: answer → noChange → read → mcp → check(+edit) → edit → stop.
 */
function nextLoopDecision(turn, { round = 0, maxRounds = MAX_TOOL_ROUNDS } = {}) {
  if (round >= maxRounds) {
    return { action: 'limit', message: 'Tool loop reached the round limit without a final patch.' };
  }
  if (!turn || turn.kind === 'empty' || turn.kind === 'unparsed') {
    return { action: 'error', message: 'unparsed' };
  }
  if (turn.kind === 'answer') return { action: 'answer' };
  if (turn.kind === 'noChange') return { action: 'noChange' };
  if (turn.kind === 'read') return { action: 'read' };
  if (turn.kind === 'mcp') return { action: 'mcp' };
  if (turn.kind === 'check' || turn.kind === 'check_with_edit') return { action: 'check' };
  if (turn.kind === 'edit') return { action: 'edit' };
  return { action: 'error', message: 'unparsed' };
}

function truncateContent(content, limit = READ_CONTENT_LIMIT) {
  const text = String(content ?? '');
  if (text.length <= limit) return { text, truncated: false };
  return { text: `${text.slice(0, limit)}\n// … truncated …`, truncated: true };
}

function formatReadResult(path, content, { error } = {}) {
  if (error) {
    return `TOOL RESULT READ ${path}\nError: ${error}`;
  }
  const { text, truncated } = truncateContent(content);
  const note = truncated ? '\n(truncated for context limit)' : '';
  return `TOOL RESULT READ ${path}${note}\n\n${text || '(empty file)'}`;
}

function formatCheckResult(command, { code, output }, { target = 'working-tree', error } = {}) {
  if (error) {
    return `TOOL RESULT CHECK\nCommand: ${command}\nError: ${error}`;
  }
  const tail = String(output || '').trim().split('\n').slice(-24).join('\n');
  return [
    'TOOL RESULT CHECK',
    `Command: ${command}`,
    `Target: ${target}`,
    `Exit: ${code}`,
    tail ? `Output:\n${tail}` : 'Output: (empty)'
  ].join('\n');
}

function formatToolBatch(results) {
  return [
    'Tool results follow. Continue with READ:, FILE:, CHECK:, ANSWER:, or NOCHANGE.',
    ...results
  ].join('\n\n');
}

function describeToolStep(action, detail) {
  switch (action) {
    case 'read':
      return { type: 'tool', title: `Read ${detail}`, description: `Opened ${detail} for the model` };
    case 'check':
      return { type: 'command', title: 'Check', description: detail };
    case 'edit':
      return { type: 'edit', title: 'Process file', description: `Computing diff for ${detail}` };
    case 'mcp':
      return { type: 'tool', title: `MCP ${detail}`, description: `Calling ${detail}` };
    case 'mcp-permission':
      return { type: 'tool', title: 'MCP permission', description: detail };
    case 'model':
      return { type: 'tool', title: 'Model turn', description: detail };
    default:
      return { type: 'tool', title: action, description: detail || '' };
  }
}

module.exports = {
  MAX_TOOL_ROUNDS,
  MAX_READS_PER_TURN,
  MAX_FILES_PER_TURN,
  READ_CONTENT_LIMIT,
  parseToolTurn,
  nextLoopDecision,
  truncateContent,
  formatReadResult,
  formatCheckResult,
  formatToolBatch,
  describeToolStep
};
