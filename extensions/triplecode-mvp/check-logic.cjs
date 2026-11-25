'use strict';

const { exec } = require('node:child_process');
const { mkdtemp, mkdir, writeFile, cp, symlink, rm } = require('node:fs/promises');
const { join, relative, dirname, isAbsolute, sep } = require('node:path');
const { tmpdir } = require('node:os');
const { applyEdit } = require('./review-logic.cjs');

function execCheck(command, cwd, { timeout = 60000, maxBuffer = 512 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout, maxBuffer }, (error, out, err) => {
      if (error && typeof error.code !== 'number') return reject(error);
      resolve({ stdout: out, stderr: err, code: error ? error.code : 0 });
    });
  });
}

function checkResultEntry(command, result, target) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const tail = output.split('\n').slice(-8).join('\n');
  return {
    command,
    code: result.code,
    output: tail,
    target,
    summaryLine: tail.split('\n')[0] ?? ''
  };
}

/**
 * Copy workspace to an isolated scratch dir, apply proposed edits, run command.
 * Source tree is never written. Caller may pass applyEditImpl for tests.
 */
async function runIsolatedPatchCheck({
  root,
  command,
  files,
  applyEditImpl = applyEdit,
  scratchParent = tmpdir()
}) {
  const scratch = await mkdtemp(join(scratchParent, 'triplecode-patch-'));
  try {
    await cp(root, scratch, {
      recursive: true,
      filter: source => {
        const name = source.slice(root.length).split(sep)[1];
        return name !== 'node_modules' && name !== '.git';
      }
    });
    try {
      await symlink(join(root, 'node_modules'), join(scratch, 'node_modules'), 'dir');
    } catch { /* no dependencies to link */ }

    for (const file of files) {
      const abs = file.path || file.document?.uri?.fsPath;
      if (!abs) continue;
      const rel = relative(root, abs);
      if (rel.startsWith('..') || isAbsolute(rel)) continue;
      const target = join(scratch, rel);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, applyEditImpl(file.before, file.edit), 'utf-8');
    }

    const result = await execCheck(command, scratch);
    return { scratch, result, entry: checkResultEntry(command, result, 'proposed-patch') };
  } finally {
    await rm(scratch, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = {
  execCheck,
  checkResultEntry,
  runIsolatedPatchCheck
};
