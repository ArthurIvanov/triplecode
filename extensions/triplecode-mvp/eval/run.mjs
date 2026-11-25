#!/usr/bin/env node
// Eval runner for TripleCode local-model prompts.
// Builds real prompt payloads via provider.js and scores model replies.
// Usage: node eval/run.mjs   (requires Ollama at OLLAMA_HOST or localhost:11434)

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const provider = require('../provider.js');

const ENDPOINT = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = process.env.EVAL_MODEL || 'qwen2.5-coder:7b';
const NUM_CTX = Number(process.env.EVAL_NUM_CTX || 8192);

// ---- Fixtures ---------------------------------------------------------------

const fixture = (fsPath, languageId, content) => ({
  uri: { fsPath, toString: () => `file://${fsPath}` },
  languageId,
  isClosed: false,
  getText: () => content
});

const MATH_JS = `export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}
`;

const UTIL_JS = `export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}
`;

const MAIN_JS = `import { add } from './math.js';
import { clamp } from './util.js';

export function run(x) {
  return clamp(add(x, 1), 0, 10);
}
`;

const DOCS = {
  math: fixture('/eval-fixture/src/math.js', 'javascript', MATH_JS),
  util: fixture('/eval-fixture/src/util.js', 'javascript', UTIL_JS),
  main: fixture('/eval-fixture/src/main.js', 'javascript', MAIN_JS)
};

const FILE_TREE = 'src/math.js\nsrc/util.js\nsrc/main.js';
const PROJECT = 'Project: eval-fixture\nWorkspace files:\nsrc/math.js\nsrc/util.js\nsrc/main.js\n\n';
const pathFor = doc => doc.uri.fsPath.replace('/eval-fixture/', '');

// ---- Scenarios ---------------------------------------------------------------
// expect: { contains?: RegExp, parse?: 'multi' | 'none', files?: string[] }

const SCENARIOS = [
  {
    id: 'ask-about-function',
    mode: 'ask',
    document: DOCS.math,
    request: 'What does the add function return?',
    options: { maxChars: 6000 },
    expect: { contains: /add/i }
  },
  {
    id: 'ask-project-scope',
    mode: 'ask',
    document: null,
    request: 'Which file exports the clamp function?',
    options: { project: PROJECT, maxChars: 6000 },
    expect: { contains: /util/i }
  },
  {
    id: 'ask-remembers-history',
    mode: 'ask',
    document: DOCS.math,
    request: 'What is my favorite number?',
    options: {
      maxChars: 6000,
      history: [
        { role: 'user', content: 'My favorite number is 42.' },
        { role: 'assistant', content: 'Noted — your favorite number is 42.' }
      ]
    },
    expect: { contains: /42/ }
  },
  {
    id: 'plan-numbered',
    mode: 'plan',
    document: DOCS.main,
    request: 'Plan how to add unit tests for run()',
    options: { maxChars: 6000 },
    expect: { contains: /^\s*\d+[.)]\s/m }
  },
  {
    id: 'agent-single-file',
    mode: 'agent',
    documents: [DOCS.math],
    request: 'Add a subtract function to math.js',
    options: { maxChars: 8000, pathFor, fileTree: FILE_TREE },
    expect: { parse: 'multi', files: ['math.js'] }
  },
  {
    id: 'agent-multi-file',
    mode: 'agent',
    documents: [DOCS.main, DOCS.math, DOCS.util],
    request: 'In math.js rename the add function to plus, and update the import and call in main.js',
    options: { maxChars: 8000, pathFor, fileTree: FILE_TREE },
    expect: { parse: 'multi' }
  },
  {
    id: 'agent-no-change',
    mode: 'agent',
    documents: [DOCS.math],
    request: 'math.js already exports add and multiply correctly — do not change anything',
    options: { maxChars: 8000, pathFor, fileTree: FILE_TREE },
    expect: { parse: 'multi', noChange: true }
  },
  {
    id: 'agent-expand-context',
    // util.js is deliberately NOT in the initial context: the model must
    // reference it, the runner then adds it (like the extension's second
    // pass) and the model regenerates with the real content.
    mode: 'agent-expand',
    documents: [DOCS.main, DOCS.math],
    request: 'Add an isInRange(value, lo, hi) export to util.js and use it in main.js run() instead of clamp',
    options: { maxChars: 8000, pathFor, fileTree: FILE_TREE },
    expect: { parse: 'multi', files: ['util.js', 'main.js'] }
  }
];

function buildMessages(scenario) {
  if (scenario.mode === 'ask') {
    return provider.askMessages(scenario.document, scenario.request, scenario.options);
  }
  if (scenario.mode === 'plan') {
    return provider.planMessages(scenario.document, scenario.request, scenario.options);
  }
  return provider.multiFileMessages(scenario.documents, scenario.request, scenario.options);
}

function score(scenario, reply) {
  const failures = [];
  if (scenario.expect.contains && !scenario.expect.contains.test(reply)) {
    failures.push(`reply does not match ${scenario.expect.contains}`);
  }
  if (scenario.expect.parse === 'multi') {
    const parsed = provider.parseMultiRewrite(reply);
    if (!parsed) {
      failures.push('parseMultiRewrite failed');
    } else {
      if (scenario.expect.noChange && !parsed.noChange) {
        failures.push(`expected NOCHANGE, got ${parsed.files?.length ?? 0} file block(s)`);
      }
      if (scenario.expect.noChange === false && parsed.noChange) {
        failures.push('expected file changes, got NOCHANGE');
      }
      if (scenario.expect.files?.length && parsed.noChange) {
        failures.push('expected file changes, got NOCHANGE');
      }
      if (!parsed.noChange && scenario.expect.files?.length) {
        const paths = parsed.files.map(file => file.path);
        for (const expected of scenario.expect.files) {
          if (!paths.some(path => path.includes(expected))) {
            failures.push(`expected FILE entry for ${expected}, got: ${paths.join(', ') || '(none)'}`);
          }
        }
      }
    }
  }
  return failures;
}

const ALL_DOCS = Object.values(DOCS);

function docForPath(parsedPath) {
  return ALL_DOCS.find(doc => {
    const rel = pathFor(doc);
    return rel === parsedPath ||
      rel.endsWith(`/${parsedPath}`) || parsedPath.endsWith(`/${rel}`) ||
      doc.uri.fsPath.endsWith(parsedPath);
  });
}

function chatOnce(messages) {
  return provider.chat({
    endpoint: ENDPOINT,
    model: MODEL,
    messages,
    numCtx: NUM_CTX,
    numPredict: 1024,
    timeoutMs: 180000
  });
}

// ---- Runner ------------------------------------------------------------------

const alive = await provider.probe(ENDPOINT).catch(() => false);
if (!alive) {
  console.log(`Ollama not reachable at ${ENDPOINT} — eval skipped.`);
  process.exit(0);
}

let failed = 0;
for (const scenario of SCENARIOS) {
  const started = Date.now();
  try {
    let reply;
    if (scenario.mode === 'agent-expand') {
      // Emulates the extension's context-expansion pass: parse the reply,
      // add referenced fixture docs missing from the context, ask again.
      const docs = [...scenario.documents];
      for (let pass = 0; pass < 2; pass++) {
        reply = await chatOnce(provider.multiFileMessages(docs, scenario.request, scenario.options));
        const parsed = provider.parseMultiRewrite(reply);
        if (!parsed || parsed.noChange) break;
        const known = new Set(docs.map(doc => doc.uri.fsPath));
        const missing = [];
        for (const file of parsed.files) {
          const doc = docForPath(file.path);
          if (doc && !known.has(doc.uri.fsPath) && !missing.includes(doc)) missing.push(doc);
        }
        if (!missing.length) break;
        docs.push(...missing);
      }
    } else {
      reply = await chatOnce(buildMessages(scenario));
    }
    const failures = score(scenario, reply);
    const ms = Date.now() - started;
    if (failures.length) {
      failed++;
      console.log(`FAIL ${scenario.id} (${ms}ms)`);
      for (const failure of failures) console.log(`     - ${failure}`);
      console.log(`     reply preview: ${reply.slice(0, 200).replace(/\n/g, ' ')}`);
    } else {
      console.log(`PASS ${scenario.id} (${ms}ms)`);
    }
  } catch (error) {
    failed++;
    console.log(`FAIL ${scenario.id} — ${error.message}`);
  }
}

console.log(`\n${SCENARIOS.length - failed}/${SCENARIOS.length} scenarios passed (model: ${MODEL}, ctx: ${NUM_CTX}).`);
process.exit(failed ? 1 : 0);
