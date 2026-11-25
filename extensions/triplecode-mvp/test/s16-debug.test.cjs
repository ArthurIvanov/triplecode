'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  redactSecrets,
  createLogRing,
  buildDiagnosticsReport
} = require('../debug-logic.cjs');

describe('S16 / R-C6 diagnostics', () => {
  it('redacts keys, bearer tokens, and private key blocks', () => {
    assert.match(redactSecrets('apiKey=sk-abcdefghijklmnopqrst'), /apiKey=\*\*\*/);
    assert.equal(redactSecrets('Bearer abc.def.ghi'), 'Bearer ***');
    assert.doesNotMatch(redactSecrets('Authorization: Bearer abc.def.ghi'), /abc\.def\.ghi/);
    assert.equal(redactSecrets('hello world'), 'hello world');
    assert.match(
      redactSecrets('-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----'),
      /REDACTED PRIVATE KEY/
    );
  });

  it('keeps a redacted ring buffer of recent logs', () => {
    const ring = createLogRing({ limit: 3 });
    ring.append('info', 'one');
    ring.append('warn', 'token=supersecretvalue');
    ring.append('error', 'three');
    ring.append('info', 'four');
    const lines = ring.snapshot();
    assert.equal(lines.length, 3);
    assert.match(lines[0], /token=\*\*\*/);
    assert.match(lines[2], /four/);
  });

  it('builds a markdown report without embedding prompts', () => {
    const report = buildDiagnosticsReport({
      generatedAt: '2026-11-25T00:00:00.000Z',
      extensionVersion: '0.0.1',
      vscodeVersion: '1.143.0',
      nodeVersion: 'v22',
      platform: 'darwin',
      arch: 'arm64',
      appName: 'TripleCode',
      folderCount: 1,
      trusted: true,
      aiProvider: 'ollama',
      aiEndpoint: 'http://localhost:11434',
      aiModel: 'qwen2.5-coder:7b',
      inlineEnabled: false,
      mcpServers: ['demo'],
      chatCount: 2,
      activeRun: false,
      pendingReview: true,
      mcpPermissionCount: 1,
      hasOpenRouterKey: true,
      logLines: ['2026-11-25T00:00:00.000Z [info] ready']
    });
    assert.match(report, /# TripleCode diagnostics/);
    assert.match(report, /OpenRouter key present: yes/);
    assert.match(report, /Servers: demo/);
    assert.doesNotMatch(report, /User prompt:|system prompt:/i);
    assert.doesNotMatch(report, /sk-[A-Za-z0-9]/);
    assert.match(report, /excludes prompts/);
  });

  it('package contributes collect diagnostics commands', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const commands = pkg.contributes.commands.map(item => item.command);
    assert.ok(commands.includes('triplecode.collectDiagnostics'));
    assert.ok(commands.includes('triplecode.showOutput'));
  });
});
