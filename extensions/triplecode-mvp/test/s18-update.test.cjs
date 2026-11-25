'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  compareVersions,
  pickArtifact,
  decideUpdateState,
  platformTriple,
  formatAboutLines,
  resolveUpdateUrl,
  shouldAutoCheck
} = require('../update-logic.cjs');

const repoRoot = join(__dirname, '..', '..', '..');

describe('S18 / R-D2 update-logic', () => {
  it('compares versions and picks artifacts', () => {
    assert.equal(compareVersions('0.0.1', '0.1.0'), -1);
    assert.equal(compareVersions('1.2.0', '1.2.0'), 0);
    assert.equal(compareVersions('2.0.0', '1.9.9'), 1);
    const manifest = {
      version: '0.2.0',
      channel: 'stable',
      artifacts: [
        { os: 'darwin', arch: 'arm64', name: 'a.zip', url: 'https://example.invalid/a.zip', sha512: 'a'.repeat(128) },
        { os: 'linux', arch: 'x64', name: 'b.tgz', url: 'https://example.invalid/b.tgz', sha512: 'b'.repeat(128) }
      ]
    };
    assert.equal(pickArtifact(manifest, { os: 'darwin', arch: 'arm64' }).name, 'a.zip');
    assert.equal(decideUpdateState({
      currentVersion: '0.1.0', manifest, os: 'linux', arch: 'x64'
    }).state, 'available');
    assert.equal(decideUpdateState({
      currentVersion: '0.2.0', manifest, os: 'linux', arch: 'x64'
    }).state, 'idle');
    assert.equal(decideUpdateState({
      currentVersion: '0.3.0', manifest, os: 'linux', arch: 'x64'
    }).state, 'rollback');
  });

  it('formats about lines and maps platform', () => {
    assert.deepEqual(platformTriple('darwin', 'arm64'), { os: 'darwin', arch: 'arm64' });
    assert.match(formatAboutLines({ version: '0.0.1', channel: 'preview' }).join('\n'), /preview/);
  });

  it('resolves manifest url from setting or baked product.updateUrl', () => {
    assert.equal(resolveUpdateUrl({
      settingUrl: 'https://example.invalid/setting.json',
      productUpdateUrl: 'https://example.invalid/product.json'
    }), 'https://example.invalid/setting.json');
    assert.equal(resolveUpdateUrl({
      settingUrl: '',
      productUpdateUrl: ' https://example.invalid/product.json '
    }), 'https://example.invalid/product.json');
    assert.equal(resolveUpdateUrl({ settingUrl: ' ', productUpdateUrl: '' }), '');
  });

  it('throttles auto checks to the configured interval', () => {
    const day = 24 * 60 * 60 * 1000;
    assert.equal(shouldAutoCheck({ lastCheckAt: 0, now: 1000 }), true);
    assert.equal(shouldAutoCheck({ lastCheckAt: 1000, now: 1000 + day - 1, intervalMs: day }), false);
    assert.equal(shouldAutoCheck({ lastCheckAt: 1000, now: 1000 + day, intervalMs: day }), true);
  });

  it('package contributes update commands; fork threshold stays green', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    const commands = pkg.contributes.commands.map(item => item.command);
    assert.ok(commands.includes('triplecode.checkUpdates'));
    assert.ok(commands.includes('triplecode.about'));
    const fork = spawnSync('bash', [join(repoRoot, 'scripts', 'check-fork-threshold.sh')], {
      cwd: repoRoot,
      encoding: 'utf8'
    });
    assert.equal(fork.status, 0, fork.stderr || fork.stdout);
    assert.match(fork.stdout, /stay on VSCodium repackage/);
  });
});
