// [META] since:2026-03 | owner:docs-team | stable:true
// [WHY] Validate high-signal documentation facts against the current repository guardrails

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRootDir = path.resolve(__dirname, '..');

function parseRootDir(argv) {
  const rootFlagIndex = argv.indexOf('--root');
  if (rootFlagIndex === -1) {
    return defaultRootDir;
  }

  const rootValue = argv[rootFlagIndex + 1];
  if (!rootValue) {
    console.error('ERROR: --root requires a directory path');
    process.exit(1);
  }

  return path.resolve(rootValue);
}

function readText(rootDir, relativePath, failures) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

function expectIncludes(text, snippet, label, failures) {
  if (!text.includes(snippet)) {
    failures.push(`${label} is missing expected snippet: ${snippet}`);
  }
}

function expectNotIncludes(text, snippet, label, failures) {
  if (text.includes(snippet)) {
    failures.push(`${label} still contains outdated snippet: ${snippet}`);
  }
}

function validatePackageScripts(rootDir, failures) {
  const packageJsonText = readText(rootDir, 'package.json', failures);
  if (!packageJsonText) {
    return;
  }

  let packageJson;
  try {
    packageJson = JSON.parse(packageJsonText);
  } catch {
    failures.push('package.json is not valid JSON');
    return;
  }

  const docsCheck = packageJson.scripts?.['docs:check'];
  if (!docsCheck || !docsCheck.includes('validate-docs.js')) {
    failures.push('package.json scripts.docs:check must include "validate-docs.js"');
  }
}

function validateAnalyzeDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const cliSource = readText(rootDir, 'src/cli/index.ts', failures);

  if (!readme || !cliSource) {
    return;
  }

  const requiredCliSnippets = [
    ".option('-i, --intent <type>'",
    ".option('-t, --targets <paths...>'",
    ".option('-k, --keywords <words...>'",
    ".option('--include-tests'"
  ];

  for (const snippet of requiredCliSnippets) {
    expectIncludes(cliSource, snippet, 'src/cli/index.ts', failures);
  }

  const requiredReadmeExamples = [
    'mycodemap analyze -i overview -t src/orchestrator',
    'mycodemap analyze -i impact -t src/cli/index.ts --include-tests',
    'mycodemap analyze -i dependency -t src/cli/index.ts',
    'mycodemap analyze -i search -k UnifiedResult'
  ];

  for (const example of requiredReadmeExamples) {
    expectIncludes(readme, example, 'README.md analyze examples', failures);
  }

  const outdatedReadmeExamples = [
    'mycodemap analyze "',
    'mycodemap analyze --intent impact --file',
    'mycodemap analyze --intent dependency --file',
    'mycodemap analyze --intent search "'
  ];

  for (const example of outdatedReadmeExamples) {
    expectNotIncludes(readme, example, 'README.md analyze examples', failures);
  }
}

function validateTestingDocs(rootDir, failures) {
  const testingRule = readText(rootDir, 'docs/rules/testing.md', failures);
  const vitestConfig = readText(rootDir, 'vitest.config.ts', failures);
  const benchmarkConfig = readText(rootDir, 'vitest.benchmark.config.ts', failures);

  if (!testingRule || !vitestConfig || !benchmarkConfig) {
    return;
  }

  const sharedSnippets = [
    "include: ['src/**/*.test.ts']",
    "exclude: ['node_modules', 'dist', 'refer/**/*.test.ts']",
    'testTimeout: 10000',
    'hookTimeout: 10000'
  ];

  for (const snippet of sharedSnippets) {
    expectIncludes(vitestConfig, snippet, 'vitest.config.ts', failures);
    expectIncludes(testingRule, snippet, 'docs/rules/testing.md', failures);
  }

  expectIncludes(benchmarkConfig, "include: ['refer/benchmark-quality.test.ts']", 'vitest.benchmark.config.ts', failures);
  expectIncludes(testingRule, '`refer/benchmark-quality.test.ts`', 'docs/rules/testing.md', failures);
  expectIncludes(testingRule, '`vitest.benchmark.config.ts`', 'docs/rules/testing.md', failures);
}

function validateGuardrailDocs(rootDir, failures) {
  const readme = readText(rootDir, 'README.md', failures);
  const engineeringRule = readText(rootDir, 'docs/rules/engineering-with-codex-openai.md', failures);
  const validationRule = readText(rootDir, 'docs/rules/validation.md', failures);
  const ciWorkflow = readText(rootDir, '.github/workflows/ci-gateway.yml', failures);
  const preCommitHook = readText(rootDir, '.githooks/pre-commit', failures);

  if (readme) {
    const requiredReadmeGuardrails = [
      'npm run docs:check',
      'mycodemap ci check-docs-sync'
    ];

    for (const snippet of requiredReadmeGuardrails) {
      expectIncludes(readme, snippet, 'README.md guardrail commands', failures);
    }
  }

  if (engineeringRule) {
    const requiredReferences = [
      '.githooks/pre-commit',
      '.githooks/commit-msg',
      '.github/workflows/ci-gateway.yml',
      '.github/workflows/publish.yml',
      'npm run docs:check'
    ];

    for (const reference of requiredReferences) {
      expectIncludes(engineeringRule, reference, 'docs/rules/engineering-with-codex-openai.md', failures);
    }
  }

  if (validationRule) {
    expectIncludes(validationRule, 'npm run docs:check', 'docs/rules/validation.md', failures);
  }

  if (ciWorkflow) {
    expectIncludes(ciWorkflow, 'run: npm run docs:check', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: npm run typecheck', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: npm run build', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'run: node dist/cli/index.js ci check-docs-sync', '.github/workflows/ci-gateway.yml', failures);
    expectIncludes(ciWorkflow, 'node dist/cli/index.js generate', '.github/workflows/ci-gateway.yml', failures);
  }

  if (preCommitHook) {
    expectIncludes(preCommitHook, 'npm run docs:check', '.githooks/pre-commit', failures);
  }
}

function validateAssistantDocs(rootDir, failures) {
  const assistantGuide = readText(rootDir, 'docs/AI_ASSISTANT_SETUP.md', failures);
  const setupGuide = readText(rootDir, 'docs/SETUP_GUIDE.md', failures);

  if (assistantGuide) {
    const requiredAssistantSnippets = [
      'npm run docs:check',
      'mycodemap ci check-docs-sync',
      'docs/rules/engineering-with-codex-openai.md'
    ];

    for (const snippet of requiredAssistantSnippets) {
      expectIncludes(assistantGuide, snippet, 'docs/AI_ASSISTANT_SETUP.md', failures);
    }
  }

  if (setupGuide) {
    const requiredSetupSnippets = [
      'npm run docs:check',
      'npm run typecheck',
      'npx mycodemap ci check-docs-sync',
      'npx mycodemap ci check-commit-size --range origin/main..HEAD',
      'npx mycodemap ci assess-risk --threshold=0.7',
      'npx mycodemap ci check-output-contract --schema-version v1.0.0 --top-k 8 --max-tokens 160',
      'git diff --exit-code .mycodemap/ai-feed.txt'
    ];

    for (const snippet of requiredSetupSnippets) {
      expectIncludes(setupGuide, snippet, 'docs/SETUP_GUIDE.md', failures);
    }
  }
}

function validateDocs(rootDir) {
  const failures = [];

  validatePackageScripts(rootDir, failures);
  validateAnalyzeDocs(rootDir, failures);
  validateTestingDocs(rootDir, failures);
  validateGuardrailDocs(rootDir, failures);
  validateAssistantDocs(rootDir, failures);

  if (failures.length > 0) {
    console.error('ERROR: documentation guardrails failed');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Documentation guardrails passed');
}

validateDocs(parseRootDir(process.argv.slice(2)));
