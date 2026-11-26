'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createIndex, indexAdd, indexRemove, indexClear, indexPaths,
  scorePath, queryIndex, DEFAULT_INDEX_LIMIT
} = require('../context-index.cjs');

const ROOT = '/repo';

function seed() {
  const index = createIndex();
  for (const p of [
    '/repo/src/route.ts',
    '/repo/src/store.ts',
    '/repo/src/routes/users.ts',
    '/repo/docs/guide.md',
    '/repo/package.json',
    '/repo/node_modules/pkg/index.js',
    '/repo/.env.local',
    '/repo/src/secrets/key.pem'
  ]) indexAdd(index, p);
  index.ready = true;
  return index;
}

describe('S21 / R-β5 context index', () => {
  it('adds, removes and clears paths; rejects sensitive ones', () => {
    const index = createIndex();
    assert.equal(indexAdd(index, '/repo/a.ts'), true);
    assert.equal(indexAdd(index, '/repo/a.ts'), false);
    assert.equal(indexAdd(index, '/repo/.env'), false);
    assert.equal(indexAdd(index, '/repo/certs/id_rsa'), false);
    assert.equal(indexRemove(index, '/repo/a.ts'), true);
    assert.equal(indexRemove(index, '/repo/a.ts'), false);
    indexAdd(index, '/repo/b.ts');
    indexClear(index);
    assert.equal(index.count, 0);
    assert.deepEqual(indexPaths(index), []);
  });

  it('ranks basename and segment matches above deep substring hits', () => {
    const index = seed();
    const hits = queryIndex(index, 'store', { root: ROOT });
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].path, '/repo/src/store.ts');
    const routeHits = queryIndex(index, 'route', { root: ROOT });
    assert.ok(routeHits.some(hit => hit.path === '/repo/src/route.ts'));
    assert.ok(routeHits.some(hit => hit.path === '/repo/src/routes/users.ts'));
  });

  it('returns all shallow paths for empty query, capped by limit', () => {
    const index = seed();
    const all = queryIndex(index, '', { root: ROOT, limit: 50 });
    assert.ok(all.length > 0);
    // node_modules exclusion is the host glob's job; the index only drops secret-like paths.
    assert.ok(!all.some(hit => hit.path.includes('.env') || hit.path.includes('.pem')));
    const capped = queryIndex(index, '', { root: ROOT, limit: 2 });
    assert.equal(capped.length, 2);
  });

  it('excludes sensitive paths even when present in the index', () => {
    const index = createIndex();
    index.files.set('/repo/.env.production', { path: '/repo/.env.production' });
    index.files.set('/repo/app/settings.json', { path: '/repo/app/settings.json' });
    index.count = 2;
    const hits = queryIndex(index, 'settings', { root: ROOT });
    assert.deepEqual(hits.map(hit => hit.path), ['/repo/app/settings.json']);
  });

  it('scorePath prefers exact basename over substring', () => {
    assert.ok(scorePath('/repo/src/store.ts', 'store.ts', ROOT) >
      scorePath('/repo/src/store-utils.ts', 'store.ts', ROOT));
    assert.equal(scorePath('/repo/src/a.ts', 'zzz', ROOT), 0);
  });

  it('host module wires index into attach candidates', () => {
    const { createContextIndexHost } = require('../context-index-host.cjs');
    const fakeVscode = {
      workspace: {
        workspaceFolders: [{ uri: { fsPath: ROOT } }],
        findFiles: async () => [
          { fsPath: '/repo/src/route.ts' },
          { fsPath: '/repo/src/store.ts' },
          { fsPath: '/repo/.env' }
        ],
        createFileSystemWatcher: () => ({ onDidCreate() {}, onDidDelete() {}, dispose() {} })
      },
      RelativePattern: class { constructor(base, pat) { this.base = base; this.pattern = pat; } }
    };
    const host = createContextIndexHost(fakeVscode);
    return host.start().then(() => {
      assert.equal(host.isReady(), true);
      const items = host.candidatesForQuery('store', {
        activeFile: { path: '/repo/src/route.ts', name: 'route.ts' },
        selection: null
      });
      const fileItems = items.filter(item => item.kind === 'file' && String(item.id).startsWith('file:'));
      assert.equal(fileItems[0].path, '/repo/src/store.ts');
      assert.ok(!fileItems.some(item => item.path.includes('.env')));
      assert.equal(host.status().state, 'ready');
      assert.equal(host.status().count, 2);
      assert.ok(DEFAULT_INDEX_LIMIT > 0);
      host.stop();
    });
  });
});
