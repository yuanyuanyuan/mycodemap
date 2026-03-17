import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const REQUIRED_FIXTURE_FILES = [
  'package.json',
  'README.md',
  'docs/AI_ASSISTANT_SETUP.md',
  'docs/SETUP_GUIDE.md',
  'docs/rules/testing.md',
  'docs/rules/validation.md',
  'docs/rules/engineering-with-codex-openai.md',
  'src/cli/index.ts',
  'vitest.config.ts',
  'vitest.benchmark.config.ts',
  '.github/workflows/ci-gateway.yml',
  '.githooks/pre-commit'
];

function createFixtureRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-docs-check-'));

  for (const relativePath of REQUIRED_FIXTURE_FILES) {
    cpSync(path.join(repoRoot, relativePath), path.join(root, relativePath), { recursive: true });
  }

  return root;
}

describe('validate-docs.js', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes for the current documentation fixture', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).not.toThrow();
  });

  it('fails when README reintroduces outdated analyze syntax', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      'mycodemap analyze -i impact -t src/cli/index.ts --include-tests',
      'mycodemap analyze --intent impact --file src/cli/index.ts'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when README drops the documented docs guardrail commands', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const readmePath = path.join(fixtureRoot, 'README.md');
    const updatedReadme = readFileSync(readmePath, 'utf8').replace(
      'mycodemap ci check-docs-sync',
      'mycodemap ci check-docs'
    );
    writeFileSync(readmePath, updatedReadme);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });

  it('fails when CI workflow drops the typecheck step', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const workflowPath = path.join(fixtureRoot, '.github/workflows/ci-gateway.yml');
    const updatedWorkflow = readFileSync(workflowPath, 'utf8').replace(
      "      - name: Run typecheck\n        run: npm run typecheck\n",
      ''
    );
    writeFileSync(workflowPath, updatedWorkflow);

    expect(() => {
      execFileSync('node', ['scripts/validate-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/documentation guardrails failed/);
  });
});
