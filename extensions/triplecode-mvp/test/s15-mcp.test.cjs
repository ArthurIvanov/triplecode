'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  parseMcpConfig,
  decidePermission,
  applyPermissionDecision,
  sessionAllows,
  grantSession,
  parseMcpInvocations,
  formatMcpCatalog,
  formatMcpResult,
  encodeJsonRpcLine,
  tryParseJsonRpcLine,
  permissionKey
} = require('../mcp-logic.cjs');
const { createMcpConnection, createMcpRegistry } = require('../mcp-host.cjs');
const { parseToolTurn, nextLoopDecision } = require('../tool-loop.cjs');
const { parseMultiRewrite } = require('../provider');

describe('S15 / R-C3 mcp-logic', () => {
  it('parses mcp.json servers and rejects bad entries', () => {
    const ok = parseMcpConfig({
      mcpServers: {
        demo: { command: 'node', args: ['server.js'], env: { TOKEN: 'x' } }
      }
    });
    assert.equal(ok.servers.demo.command, 'node');
    assert.deepEqual(ok.servers.demo.args, ['server.js']);
    assert.equal(ok.errors.length, 0);

    const bad = parseMcpConfig({ mcpServers: { 'bad name': { command: 'x' }, empty: {} } });
    assert.ok(bad.errors.length >= 1);
    assert.equal(Object.keys(bad.servers).length, 0);
  });

  it('permission decide/apply and session allow-once', () => {
    assert.equal(decidePermission({}, 's', 't'), 'ask');
    const always = applyPermissionDecision({}, 's', 't', 'always');
    assert.equal(decidePermission(always, 's', 't'), 'allow');
    const denied = applyPermissionDecision({}, 's', 't', 'deny');
    assert.equal(decidePermission(denied, 's', 't'), 'deny');
    assert.equal(decidePermission(applyPermissionDecision({}, 's', 't', 'once'), 's', 't'), 'ask');
    const session = grantSession({}, 's', 't');
    assert.equal(sessionAllows(session, 's', 't'), true);
    assert.equal(permissionKey('a', 'b'), 'a/b');
  });

  it('parses MCP invocations with JSON args', () => {
    const calls = parseMcpInvocations(
      'MCP: demo/echo\n```json\n{"text":"hi"}\n```\n'
    );
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { server: 'demo', tool: 'echo', args: { text: 'hi' } });
    assert.equal(parseMcpInvocations('MCP: demo/echo').length, 1);
  });

  it('formats catalog and results', () => {
    assert.match(formatMcpCatalog({ demo: { name: 'demo' } }, {}), /connect on first use/);
    assert.match(
      formatMcpCatalog({ demo: {} }, { demo: [{ name: 'echo', description: 'Echo' }] }),
      /demo\/echo/
    );
    assert.match(formatMcpResult('demo', 'echo', { error: 'denied' }), /Error: denied/);
    assert.match(
      formatMcpResult('demo', 'echo', { content: [{ type: 'text', text: 'ok' }] }),
      /\nok$/
    );
  });

  it('encodes and parses JSON-RPC lines', () => {
    const line = encodeJsonRpcLine({ jsonrpc: '2.0', id: 1, method: 'ping' });
    assert.equal(line.endsWith('\n'), true);
    assert.equal(tryParseJsonRpcLine(line).method, 'ping');
    assert.equal(tryParseJsonRpcLine('not-json'), null);
  });
});

describe('S15 tool-loop MCP kind', () => {
  it('classifies MCP turns ahead of CHECK/FILE', () => {
    const turn = parseToolTurn(
      'MCP: demo/echo\n```json\n{}\n```\nCHECK: npm test\n',
      parseMultiRewrite
    );
    assert.equal(turn.kind, 'mcp');
    assert.equal(nextLoopDecision(turn).action, 'mcp');
  });
});

function mockSpawn(script) {
  return function spawnImpl() {
    const child = new EventEmitter();
    child.stdin = {
      write(data) {
        const msg = tryParseJsonRpcLine(String(data));
        if (!msg) return true;
        queueMicrotask(() => script(msg, child));
        return true;
      },
      end() {}
    };
    child.stdout = new EventEmitter();
    child.stdout.setEncoding = () => {};
    child.stderr = new EventEmitter();
    child.stderr.setEncoding = () => {};
    child.kill = () => {
      child.emit('exit', 0, null);
    };
    return child;
  };
}

describe('S15 / R-C3 mcp-host', () => {
  it('initializes, lists tools, and calls over mock stdio', async () => {
    const spawnImpl = mockSpawn((msg, child) => {
      if (msg.method === 'initialize') {
        child.stdout.emit('data', `${JSON.stringify({
          jsonrpc: '2.0', id: msg.id,
          result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'demo', version: '1' } }
        })}\n`);
        return;
      }
      if (msg.method === 'notifications/initialized') return;
      if (msg.method === 'tools/list') {
        child.stdout.emit('data', `${JSON.stringify({
          jsonrpc: '2.0', id: msg.id,
          result: { tools: [{ name: 'echo', description: 'Echo text', inputSchema: { type: 'object' } }] }
        })}\n`);
        return;
      }
      if (msg.method === 'tools/call') {
        child.stdout.emit('data', `${JSON.stringify({
          jsonrpc: '2.0', id: msg.id,
          result: { content: [{ type: 'text', text: msg.params.arguments.text || '' }], isError: false }
        })}\n`);
      }
    });

    const conn = createMcpConnection(
      { name: 'demo', command: 'mock', args: [] },
      { spawnImpl, timeoutMs: 2000 }
    );
    await conn.initialize();
    const tools = await conn.listTools();
    assert.equal(tools[0].name, 'echo');
    const result = await conn.callTool('echo', { text: 'ping' });
    assert.equal(result.content[0].text, 'ping');
    conn.close();

    const registry = createMcpRegistry({ spawnImpl, timeoutMs: 2000 });
    const again = await registry.call(
      { name: 'demo', command: 'mock', args: [] },
      'echo',
      { text: 'hi' }
    );
    assert.equal(again.content[0].text, 'hi');
    assert.equal(registry.getTools('demo')[0].name, 'echo');
    registry.closeAll();
  });
});
