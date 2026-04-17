import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadModule = async (relativePath) => import(pathToFileURL(path.join(repoRoot, relativePath)).href);
const { runContractCheck } = await loadModule('dist/cli/contract-checker.js');
const { resolveContractDiffScope } = await loadModule('dist/cli/contract-diff-scope.js');
const { renderGitHubAnnotations } = await loadModule('dist/cli/commands/check.js');
const {
  CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
  CONTRACT_GATE_MAX_FALSE_POSITIVE_RATE,
  CONTRACT_GATE_PERF_BUDGET,
} = await loadModule('dist/cli/contract-gate-thresholds.js');

function parseArgs(argv) {
  const args = {
    maxChangedFiles: CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
    maxFalsePositiveRate: CONTRACT_GATE_MAX_FALSE_POSITIVE_RATE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === '--max-changed-files' && next) {
      args.maxChangedFiles = Number(next);
    }
    if (current === '--max-false-positive-rate' && next) {
      args.maxFalsePositiveRate = Number(next);
    }
  }

  return args;
}

function collectTsFiles(rootDir) {
  const files = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') {
          continue;
        }
        queue.push(entryPath);
        continue;
      }

      if (/\.[cm]?[jt]sx?$/u.test(entry.name) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(entry.name)) {
        files.push(entryPath);
      }
    }
  }

  return files.sort();
}

async function runCalibrationCase(testCase) {
  const startedAt = performance.now();
  const diffScope = await resolveContractDiffScope({
    againstPath: testCase.againstPath,
    rootDir: repoRoot,
    changedFiles: testCase.changedFiles,
    base: testCase.base,
  });
  const result = await runContractCheck({
    contractPath: testCase.contractPath,
    againstPath: testCase.againstPath,
    rootDir: repoRoot,
    scanMode: diffScope.scanMode,
    changedFiles: diffScope.changedFiles,
    warnings: diffScope.warnings,
  });
  const durationMs = performance.now() - startedAt;

  return {
    name: testCase.name,
    kind: testCase.kind,
    durationMs: Math.round(durationMs * 100) / 100,
    scanMode: diffScope.scanMode,
    changedFiles: diffScope.changedFiles,
    warnings: result.warnings,
    errorCount: result.summary.error_count,
    warningCount: result.summary.warn_count,
    annotationCount: renderGitHubAnnotations(result)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length,
  };
}

const args = parseArgs(process.argv.slice(2));
const designFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'design-contracts');
const contractFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'contract-check');
const repoSourceFiles = collectTsFiles(path.join(repoRoot, 'src')).slice(0, args.maxChangedFiles + 1);

if (repoSourceFiles.length < args.maxChangedFiles + 1) {
  throw new Error(`无法收集足够的 repo source files 来验证 hard-gate window，至少需要 ${args.maxChangedFiles + 1} 个文件`);
}

const calibrationCases = [
  {
    name: 'good-valid-core-service',
    kind: 'good',
    contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
    againstPath: path.join(contractFixturesDir, 'valid-project'),
    changedFiles: [path.join(contractFixturesDir, 'valid-project', 'src', 'core', 'service.ts')],
  },
  {
    name: 'good-valid-reader',
    kind: 'good',
    contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
    againstPath: path.join(contractFixturesDir, 'valid-project'),
    changedFiles: [path.join(contractFixturesDir, 'valid-project', 'src', 'infrastructure', 'parser', 'reader.ts')],
  },
  {
    name: 'good-valid-domain-public-api',
    kind: 'good',
    contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
    againstPath: path.join(contractFixturesDir, 'valid-project'),
    changedFiles: [path.join(contractFixturesDir, 'valid-project', 'src', 'app', 'use-domain.ts')],
  },
  {
    name: 'bad-invalid-core-layer',
    kind: 'bad',
    contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
    againstPath: path.join(contractFixturesDir, 'invalid-project'),
    changedFiles: [path.join(contractFixturesDir, 'invalid-project', 'src', 'core', 'bad.ts')],
  },
  {
    name: 'bad-barrel-downstream',
    kind: 'bad',
    contractPath: path.join(designFixturesDir, 'contract-barrel.design.md'),
    againstPath: path.join(contractFixturesDir, 'barrel-project'),
    changedFiles: [path.join(contractFixturesDir, 'barrel-project', 'src', 'domain', 'index.ts')],
  },
];

const caseResults = [];
for (const testCase of calibrationCases) {
  caseResults.push(await runCalibrationCase(testCase));
}

const windowScope = await resolveContractDiffScope({
  againstPath: path.join(repoRoot, 'src'),
  rootDir: repoRoot,
  changedFiles: repoSourceFiles,
});
const fallbackScope = await resolveContractDiffScope({
  againstPath: path.join(contractFixturesDir, 'invalid-project'),
  rootDir: repoRoot,
  base: 'not-a-real-base-ref',
});

const goodCases = caseResults.filter((entry) => entry.kind === 'good');
const badCases = caseResults.filter((entry) => entry.kind === 'bad');
const falsePositives = goodCases.filter((entry) => entry.errorCount > 0);
const falseNegatives = badCases.filter((entry) => entry.errorCount === 0);
const missingAnnotations = badCases.filter((entry) => entry.annotationCount === 0);
const falsePositiveRate = goodCases.length === 0 ? 0 : falsePositives.length / goodCases.length;
const maxObservedDurationMs = caseResults.reduce((max, entry) => Math.max(max, entry.durationMs), 0);

const failures = [];
if (falsePositiveRate > args.maxFalsePositiveRate) {
  failures.push(`false-positive rate ${falsePositiveRate.toFixed(2)} exceeds max ${args.maxFalsePositiveRate.toFixed(2)}`);
}
if (falseNegatives.length > 0) {
  failures.push(`false negatives detected: ${falseNegatives.map((entry) => entry.name).join(', ')}`);
}
if (missingAnnotations.length > 0) {
  failures.push(`annotation output missing for bad cases: ${missingAnnotations.map((entry) => entry.name).join(', ')}`);
}
if (maxObservedDurationMs > CONTRACT_GATE_PERF_BUDGET.maxLoadMs) {
  failures.push(`max case duration ${maxObservedDurationMs.toFixed(2)}ms exceeds perf budget ${CONTRACT_GATE_PERF_BUDGET.maxLoadMs}ms`);
}
if (!windowScope.warnings.some((warning) => warning.code === 'hard-gate-window-exceeded')) {
  failures.push('hard-gate window overrun did not emit hard-gate-window-exceeded warning');
}
if (!fallbackScope.warnings.some((warning) => warning.code === 'diff-scope-fallback')) {
  failures.push('invalid diff base did not emit diff-scope-fallback warning');
}

const recommendation = failures.length === 0
  ? 'hard-gate-ok'
  : failures.some((failure) => failure.includes('false-positive rate') || failure.includes('false negatives') || failure.includes('annotation output'))
    ? 'warn-only'
    : 're-scope';

const output = {
  ok: failures.length === 0,
  thresholds: {
    maxChangedFiles: args.maxChangedFiles,
    maxFalsePositiveRate: args.maxFalsePositiveRate,
    perfBudget: CONTRACT_GATE_PERF_BUDGET,
  },
  summary: {
    goodCaseCount: goodCases.length,
    badCaseCount: badCases.length,
    falsePositiveCount: falsePositives.length,
    falseNegativeCount: falseNegatives.length,
    falsePositiveRate: Math.round(falsePositiveRate * 1000) / 1000,
    maxObservedDurationMs,
    recommendation,
  },
  warnings: {
    windowScope: windowScope.warnings,
    fallbackScope: fallbackScope.warnings,
  },
  cases: caseResults,
  failures,
};

console.log(JSON.stringify(output, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
