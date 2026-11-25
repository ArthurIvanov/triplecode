'use strict';

const { spawn } = require('node:child_process');
const {
  encodeJsonRpcLine, tryParseJsonRpcLine,
  buildInitializeRequest, buildInitializedNotification,
  buildToolsListRequest, buildToolsCallRequest
} = require('./mcp-logic.cjs');

/**
 * Minimal MCP stdio client (newline-delimited JSON-RPC).
 * `spawnImpl` injectable for tests.
 */
function createMcpConnection(serverDef, {
  spawnImpl = spawn,
  timeoutMs = 30000,
  cwd
} = {}) {
  if (!serverDef?.command) throw new Error('MCP server command is required');
  const child = spawnImpl(serverDef.command, serverDef.args || [], {
    cwd: serverDef.cwd || cwd,
    env: { ...process.env, ...(serverDef.env || {}) },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let nextId = 1;
  let buffer = '';
  const pending = new Map();
  let closed = false;
  const stderrChunks = [];

  const failAll = (error) => {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  };

  const onLine = (line) => {
    const msg = tryParseJsonRpcLine(line);
    if (!msg) return;
    if (msg.id === undefined || msg.id === null) return; // notifications ignored for now
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    clearTimeout(entry.timer);
    if (msg.error) {
      entry.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      return;
    }
    entry.resolve(msg.result);
  };

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      onLine(line);
    }
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {
    stderrChunks.push(chunk);
    if (stderrChunks.length > 40) stderrChunks.shift();
  });
  child.on('error', error => {
    closed = true;
    failAll(error);
  });
  child.on('exit', (code, signal) => {
    closed = true;
    failAll(new Error(`MCP server exited (code=${code}, signal=${signal})`));
  });

  function request(message, { timeout = timeoutMs } = {}) {
    if (closed) return Promise.reject(new Error('MCP connection closed'));
    const id = message.id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP request timed out: ${message.method}`));
      }, timeout);
      pending.set(id, { resolve, reject, timer });
      try {
        child.stdin.write(encodeJsonRpcLine(message));
      } catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  function notify(message) {
    if (closed) return;
    child.stdin.write(encodeJsonRpcLine(message));
  }

  async function initialize() {
    const result = await request(buildInitializeRequest(nextId++));
    notify(buildInitializedNotification());
    return result;
  }

  async function listTools() {
    const result = await request(buildToolsListRequest(nextId++));
    return Array.isArray(result?.tools) ? result.tools : [];
  }

  async function callTool(name, args) {
    return request(buildToolsCallRequest(nextId++, name, args));
  }

  function close() {
    if (closed) return;
    closed = true;
    failAll(new Error('MCP connection closed'));
    try { child.stdin.end(); } catch { /* ignore */ }
    try { child.kill('SIGTERM'); } catch { /* ignore */ }
  }

  function stderrTail() {
    return stderrChunks.join('').slice(-2000);
  }

  return { initialize, listTools, callTool, close, stderrTail, child };
}

/** Cache of live connections keyed by server name. */
function createMcpRegistry({ spawnImpl = spawn, timeoutMs = 30000 } = {}) {
  const connections = new Map();
  const toolCache = new Map();

  async function ensure(serverDef, { cwd } = {}) {
    const existing = connections.get(serverDef.name);
    if (existing) return existing;
    const conn = createMcpConnection(serverDef, { spawnImpl, timeoutMs, cwd });
    try {
      await conn.initialize();
      const tools = await conn.listTools();
      toolCache.set(serverDef.name, tools);
      connections.set(serverDef.name, conn);
      return conn;
    } catch (error) {
      conn.close();
      throw error;
    }
  }

  function getTools(serverName) {
    return toolCache.get(serverName) || [];
  }

  function toolIndex() {
    const out = {};
    for (const [name, tools] of toolCache) out[name] = tools;
    return out;
  }

  async function call(serverDef, tool, args, { cwd } = {}) {
    const conn = await ensure(serverDef, { cwd });
    return conn.callTool(tool, args);
  }

  function closeAll() {
    for (const conn of connections.values()) conn.close();
    connections.clear();
  }

  return { ensure, getTools, toolIndex, call, closeAll, connections };
}

module.exports = {
  createMcpConnection,
  createMcpRegistry
};
