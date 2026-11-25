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
    options: { maxChars: 8000, pathFor },
    expect: { parse: 'multi', files: ['math.js'] }
  },
  {
    id: 'agent-multi-file',
    mode: 'agent',
    documents: [DOCS.main, DOCS.math, DOCS.util],
    request: 'In math.js rename the add function to plus, and update the import and call in main.js',
    options: { maxChars: 8000, pathFor },
    expect: { parse: 'multi' }
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
    } else if (!parsed.noChange && scenario.expect.files?.length) {
      const paths = parsed.files.map(file => file.path);
      for (const expected of scenario.expect.files) {
        if (!paths.some(path => path.includes(expected))) {
          failures.push(`expected FILE entry for ${expected}, got: ${paths.join(', ') || '(none)'}`);
        }
      }
    }
  }
  return failures;
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
    const messages = buildMessages(scenario);
    const reply = await provider.chat({
      endpoint: ENDPOINT,
      model: MODEL,
      messages,
      numCtx: NUM_CTX,
      numPredict: 1024,
      timeoutMs: 180000
    });
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
