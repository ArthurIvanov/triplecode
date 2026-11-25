'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');

const repoRoot = join(__dirname, '..', '..', '..');

describe('S17 / R-B2 packaging helpers', () => {
  it('embed-extension copies package and skips node_modules/webview', () => {
    const root = mkdtempSync(join(tmpdir(), 'tc-embed-'));
    try {
      const src = join(root, 'ext');
      const resources = join(root, 'resources', 'app');
      mkdirSync(join(src, 'node_modules', 'x'), { recursive: true });
      mkdirSync(join(src, 'webview'), { recursive: true });
      writeFileSync(join(src, 'package.json'), '{"name":"triplecode-mvp"}\n');
      writeFileSync(join(src, 'extension.js'), 'module.exports = {};\n');
      writeFileSync(join(src, 'node_modules', 'x', 'index.js'), 'nope\n');
      writeFileSync(join(src, 'webview', 'agent.tsx'), 'nope\n');
      mkdirSync(resources, { recursive: true });

      const result = spawnSync(
        'python3',
        [join(repoRoot, 'scripts', 'embed-extension.py'), src, resources],
        { encoding: 'utf8' }
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const dest = join(resources, 'extensions', 'triplecode-mvp');
      assert.equal(JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).name, 'triplecode-mvp');
      assert.equal(existsSync(join(dest, 'extension.js')), true);
      assert.equal(existsSync(join(dest, 'node_modules')), false);
      assert.equal(existsSync(join(dest, 'webview')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('check-packaging.sh passes on the repo', () => {
    const result = spawnSync('bash', [join(repoRoot, 'scripts', 'check-packaging.sh')], {
      cwd: repoRoot,
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /OK packaging pins/);
  });
});
