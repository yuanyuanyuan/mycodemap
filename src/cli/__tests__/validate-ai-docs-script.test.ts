import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const REQUIRED_FIXTURE_FILES = [
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'AI_GUIDE.md',
  'AI_DISCOVERY.md',
  'ai-document-index.yaml',
  'llms.txt',
  'docs/ai-guide/README.md',
  'docs/ai-guide/QUICKSTART.md',
  'docs/ai-guide/COMMANDS.md',
  'docs/ai-guide/OUTPUT.md',
  'docs/ai-guide/PATTERNS.md',
  'docs/ai-guide/PROMPTS.md',
  'docs/ai-guide/INTEGRATION.md',
];

function createFixtureRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-ai-docs-check-'));

  for (const relativePath of REQUIRED_FIXTURE_FILES) {
    cpSync(path.join(repoRoot, relativePath), path.join(root, relativePath), { recursive: true });
  }

  return root;
}

describe('validate-ai-docs.js', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes for the current AI documentation fixture', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    expect(() => {
      execFileSync('node', ['scripts/validate-ai-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).not.toThrow();
  });

  it('fails when QUICKSTART reintroduces a legacy analyze intent', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const quickstartPath = path.join(fixtureRoot, 'docs/ai-guide/QUICKSTART.md');
    const updatedQuickstart = readFileSync(quickstartPath, 'utf8').replace(
      'analyze -i read -t "XXX" --scope transitive --json',
      'analyze -i impact -t "XXX" --json'
    );
    writeFileSync(quickstartPath, updatedQuickstart);

    expect(() => {
      execFileSync('node', ['scripts/validate-ai-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/AI documentation guardrails failed/);
  });

  it('fails when llms.txt reintroduces legacy complexity analyze example', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const llmsPath = path.join(fixtureRoot, 'llms.txt');
    const updatedLlms = readFileSync(llmsPath, 'utf8').replace(
      'node dist/cli/index.js analyze -i read -t "src/" --json',
      'node dist/cli/index.js analyze -i complexity -t "src/" --json'
    );
    writeFileSync(llmsPath, updatedLlms);

    expect(() => {
      execFileSync('node', ['scripts/validate-ai-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/AI documentation guardrails failed/);
  });

  it('fails when INTEGRATION reintroduces legacy analyze intent in argv-array form', () => {
    const fixtureRoot = createFixtureRoot();
    tempRoots.push(fixtureRoot);

    const integrationPath = path.join(fixtureRoot, 'docs/ai-guide/INTEGRATION.md');
    const updatedIntegration = readFileSync(integrationPath, 'utf8').replace(
      "'analyze', '-i', 'find'",
      "'analyze', '-i', 'search'"
    );
    writeFileSync(integrationPath, updatedIntegration);

    expect(() => {
      execFileSync('node', ['scripts/validate-ai-docs.js', '--root', fixtureRoot], {
        cwd: repoRoot,
        stdio: 'pipe'
      });
    }).toThrow(/AI documentation guardrails failed/);
  });
});
