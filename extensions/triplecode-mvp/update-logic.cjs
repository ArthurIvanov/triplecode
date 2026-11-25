'use strict';

/**
 * Compare dotted versions (semver-ish). Returns -1 / 0 / 1.
 */
function compareVersions(a, b) {
  const pa = String(a || '0').replace(/^v/i, '').split(/[.+-]/).map(part => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
  const pb = String(b || '0').replace(/^v/i, '').split(/[.+-]/).map(part => {
    const n = Number.parseInt(part, 10);
    return Number.isFinite(n) ? n : 0;
  });
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

function pickArtifact(manifest, { os, arch }) {
  const arts = Array.isArray(manifest?.artifacts) ? manifest.artifacts : [];
  return arts.find(item => item.os === os && item.arch === arch)
    || arts.find(item => item.os === os)
    || null;
}

/**
 * @returns {{ state: 'idle'|'available'|'rollback'|'error', message: string, artifact?: object, manifest?: object }}
 */
function decideUpdateState({ currentVersion, manifest, os, arch, preferChannel }) {
  if (!manifest || typeof manifest !== 'object') {
    return { state: 'error', message: 'Update manifest missing or invalid.' };
  }
  if (preferChannel && manifest.channel && manifest.channel !== preferChannel) {
    return {
      state: 'idle',
      message: `Manifest channel is ${manifest.channel}; configured ${preferChannel}.`,
      manifest
    };
  }
  const remote = manifest.version;
  if (!remote) return { state: 'error', message: 'Manifest has no version.', manifest };
  const cmp = compareVersions(currentVersion, remote);
  const artifact = pickArtifact(manifest, { os, arch });
  if (cmp === 0) {
    return { state: 'idle', message: `Up to date (${currentVersion}).`, manifest, artifact };
  }
  if (cmp < 0) {
    return {
      state: 'available',
      message: `Update available: ${currentVersion} → ${remote}.`,
      manifest,
      artifact
    };
  }
  return {
    state: 'rollback',
    message: `Channel points to older ${remote} (running ${currentVersion}). Rollback available.`,
    manifest,
    artifact
  };
}

function platformTriple(platform = process.platform, arch = process.arch) {
  const os = platform === 'darwin' ? 'darwin' : platform === 'win32' ? 'win32' : 'linux';
  const mappedArch = arch === 'arm64' ? 'arm64' : 'x64';
  return { os, arch: mappedArch };
}

function resolveUpdateUrl({ settingUrl, productUpdateUrl } = {}) {
  const setting = String(settingUrl || '').trim();
  if (setting) return setting;
  const product = String(productUpdateUrl || '').trim();
  return product || '';
}

function shouldAutoCheck({ lastCheckAt = 0, now = Date.now(), intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  const last = Number(lastCheckAt) || 0;
  return !last || (now - last) >= intervalMs;
}

function formatAboutLines({
  productName = 'TripleCode',
  version,
  channel,
  vscodeVersion,
  updateState
}) {
  return [
    `${productName} ${version}`,
    `Channel: ${channel || 'manual'}`,
    `VS Code engine: ${vscodeVersion || 'unknown'}`,
    updateState ? `Update: ${updateState}` : 'Update: not checked'
  ];
}

module.exports = {
  compareVersions,
  pickArtifact,
  decideUpdateState,
  platformTriple,
  resolveUpdateUrl,
  shouldAutoCheck,
  formatAboutLines
};
