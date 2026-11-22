import { execFileSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { app, safeStorage } from 'electron';

const workerFlag = '--triplecode-keychain-worker';
let child;
let nextId = 0;
const pending = new Map();

function rejectPending(error) {
  for (const { reject } of pending.values()) reject(error);
  pending.clear();
}

function startWorker() {
  const args = [workerFlag, '--user-data-dir=' + join(app.getPath('userData'), 'Keychain Worker')];
  if (app.commandLine.hasSwitch('use-mock-keychain')) args.push('--use-mock-keychain');
  child = spawn(process.execPath, args, { stdio: ['pipe', 'pipe', 'ignore'] });
  const worker = child;
  const fail = () => {
    if (child !== worker) return;
    child = undefined;
    worker.kill('SIGKILL');
    rejectPending(new Error('TripleCode Keychain worker stopped'));
  };
  worker.once('error', fail);
  worker.once('exit', fail);
  worker.stdin.on('error', fail);
  createInterface({ input: worker.stdout }).on('line', line => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      fail();
      return;
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.failed) request.reject(new Error('macOS Keychain operation failed'));
    else request.resolve(message.value);
  });
  return worker;
}

export function requestKeychain(operation, value) {
  const worker = child ?? startWorker();
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.stdin.write(JSON.stringify({ id, operation, value }) + '\n');
  });
}

// Chromium waits for an outstanding Keychain task on shutdown. Stop only the
// dedicated worker, after the main app has completed its normal shutdown.
app.once('quit', () => {
  child?.kill('SIGKILL');
});

export function runKeychainWorker() {
  // The worker can decrypt data as this bundle. Only accept the pipe from
  // another instance of this executable, never from a standalone invocation.
  try {
    execFileSync(join(process.resourcesPath, 'keychain-parent'), [
      String(process.ppid), process.execPath
    ], { stdio: 'ignore' });
  } catch {
    app.exit(1);
    return;
  }
  app.setActivationPolicy('prohibited');
  const input = createInterface({ input: process.stdin });
  input.once('close', () => process.kill(process.pid, 'SIGKILL'));
  input.on('line', async line => {
    let request;
    try {
      request = JSON.parse(line);
      await app.whenReady();
      let value;
      if (request.operation === 'encrypt') {
        value = (await safeStorage.encryptStringAsync(request.value)).toString('base64');
      } else if (request.operation === 'decrypt') {
        const bytes = Buffer.from(request.value, 'base64');
        value = (await safeStorage.decryptStringAsync(bytes)).result;
      } else {
        throw new Error('Unknown Keychain operation');
      }
      process.stdout.write(JSON.stringify({ id: request.id, value }) + '\n');
    } catch {
      if (request) process.stdout.write(JSON.stringify({ id: request.id, failed: true }) + '\n');
    }
  });
}
