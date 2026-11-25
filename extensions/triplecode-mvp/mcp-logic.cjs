'use strict';

const PROTOCOL_VERSION = '2025-06-18';

function permissionKey(server, tool) {
  return `${String(server || '').trim()}/${String(tool || '').trim()}`;
}

/**
 * Parse `.triplecode/mcp.json` or settings overlay.
 * Shape: { mcpServers: { name: { command, args?, env? } } }
 */
function parseMcpConfig(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { servers: {}, errors: [] };
    try {
      data = JSON.parse(trimmed);
    } catch (error) {
      return { servers: {}, errors: [`Invalid JSON: ${error.message}`] };
    }
  }
  if (!data || typeof data !== 'object') return { servers: {}, errors: ['Config must be an object'] };

  const block = data.mcpServers && typeof data.mcpServers === 'object'
    ? data.mcpServers
    : data.servers && typeof data.servers === 'object'
      ? data.servers
      : data;
  const servers = {};
  const errors = [];
  for (const [name, def] of Object.entries(block)) {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) {
      errors.push(`Invalid server name: ${name}`);
      continue;
    }
    if (!def || typeof def !== 'object' || typeof def.command !== 'string' || !def.command.trim()) {
      errors.push(`Server ${name}: command is required`);
      continue;
    }
    const args = Array.isArray(def.args) ? def.args.map(String) : [];
    const env = def.env && typeof def.env === 'object' && !Array.isArray(def.env)
      ? Object.fromEntries(Object.entries(def.env).map(([k, v]) => [String(k), String(v)]))
      : {};
    servers[name] = {
      name,
      command: def.command.trim(),
      args,
      env,
      cwd: typeof def.cwd === 'string' ? def.cwd : undefined
    };
  }
  return { servers, errors };
}

function mergeServerMaps(...maps) {
  const out = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [name, def] of Object.entries(map)) out[name] = def;
  }
  return out;
}

/** @returns {'allow'|'deny'|'ask'} */
function decidePermission(store, server, tool) {
  const key = permissionKey(server, tool);
  const value = store && typeof store === 'object' ? store[key] : undefined;
  if (value === 'always' || value === 'allow') return 'allow';
  if (value === 'deny' || value === 'never') return 'deny';
  return 'ask';
}

function applyPermissionDecision(store, server, tool, decision) {
  const next = { ...(store && typeof store === 'object' ? store : {}) };
  const key = permissionKey(server, tool);
  if (decision === 'always') next[key] = 'always';
  else if (decision === 'deny') next[key] = 'deny';
  else if (decision === 'once') {
    /* session-only; do not persist */
  }
  return next;
}

function sessionAllows(sessionStore, server, tool) {
  return Boolean(sessionStore && sessionStore[permissionKey(server, tool)]);
}

function grantSession(sessionStore, server, tool) {
  return { ...(sessionStore || {}), [permissionKey(server, tool)]: true };
}

/**
 * Extract MCP invocations from a model turn.
 * `MCP: server/tool` optionally followed by a ```json fence with arguments.
 */
function parseMcpInvocations(text) {
  const source = String(text || '');
  const outside = source.replace(/```[\s\S]*?```/g, (fence, offset) => ' '.repeat(fence.length));
  const calls = [];
  const pattern = /^MCP:[ \t]*([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)[ \t]*$/gim;
  let match;
  while ((match = pattern.exec(outside))) {
    const server = match[1];
    const tool = match[2];
    const after = source.slice(match.index + match[0].length);
    const fence = /^[ \t]*\r?\n[ \t]*```(?:json)?[ \t]*\r?\n([\s\S]*?)```/i.exec(after);
    let args = {};
    if (fence) {
      try {
        const parsed = JSON.parse(fence[1]);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) args = parsed;
      } catch {
        args = { _parseError: 'Invalid JSON arguments' };
      }
    }
    calls.push({ server, tool, args });
  }
  return calls.slice(0, 8);
}

function formatMcpCatalog(servers, toolIndex) {
  const lines = ['Available MCP tools (call with MCP: server/tool and optional JSON fence):'];
  const names = Object.keys(servers || {});
  if (!names.length) {
    lines.push('(no MCP servers configured in .triplecode/mcp.json)');
    return lines.join('\n');
  }
  for (const name of names) {
    const tools = toolIndex?.[name];
    if (!tools?.length) {
      lines.push(`- ${name}: (connect on first use)`);
      continue;
    }
    for (const tool of tools) {
      const desc = tool.description ? ` — ${String(tool.description).slice(0, 120)}` : '';
      lines.push(`- ${name}/${tool.name}${desc}`);
    }
  }
  return lines.join('\n');
}

function formatMcpResult(server, tool, { content, isError, error }) {
  if (error) {
    return `TOOL RESULT MCP ${server}/${tool}\nError: ${error}`;
  }
  const body = Array.isArray(content)
    ? content.map(part => {
      if (!part || typeof part !== 'object') return String(part);
      if (part.type === 'text') return String(part.text || '');
      return JSON.stringify(part);
    }).join('\n')
    : String(content ?? '');
  const flag = isError ? '\n(isError: true)' : '';
  return `TOOL RESULT MCP ${server}/${tool}${flag}\n\n${body.slice(0, 8000) || '(empty)'}`;
}

function encodeJsonRpcLine(message) {
  return `${JSON.stringify(message)}\n`;
}

function tryParseJsonRpcLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return null;
  try {
    const msg = JSON.parse(trimmed);
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return null;
    return msg;
  } catch {
    return null;
  }
}

function buildInitializeRequest(id) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'triplecode', version: '0.0.1' }
    }
  };
}

function buildInitializedNotification() {
  return { jsonrpc: '2.0', method: 'notifications/initialized' };
}

function buildToolsListRequest(id) {
  return { jsonrpc: '2.0', id, method: 'tools/list', params: {} };
}

function buildToolsCallRequest(id, name, args) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name, arguments: args && typeof args === 'object' ? args : {} }
  };
}

module.exports = {
  PROTOCOL_VERSION,
  permissionKey,
  parseMcpConfig,
  mergeServerMaps,
  decidePermission,
  applyPermissionDecision,
  sessionAllows,
  grantSession,
  parseMcpInvocations,
  formatMcpCatalog,
  formatMcpResult,
  encodeJsonRpcLine,
  tryParseJsonRpcLine,
  buildInitializeRequest,
  buildInitializedNotification,
  buildToolsListRequest,
  buildToolsCallRequest
};
