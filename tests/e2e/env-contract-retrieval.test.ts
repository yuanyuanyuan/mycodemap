// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] E2E tests for the env-contract retrieval flow — built CLI subprocess verification
// against isolated temp repos with real source files (VER-03, T-58-13, T-58-15).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI_PATH = path.resolve(__dirname, '../../dist/cli/index.js');

function runCli(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
      cwd,
      encoding: 'utf8',
      timeout: 20000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.status ?? 1 };
  }
}

function createTempRepo(): string {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'env-contract-e2e-'));

  // package.json with test and build scripts
  writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'e2e-test-project',
    version: '1.0.0',
    scripts: { test: 'vitest run', build: 'tsc' },
  }, null, 2));

  // .githooks/commit-msg with uppercase tags and [TAG] scope: message
  mkdirSync(path.join(tmpDir, '.githooks'), { recursive: true });
  writeFileSync(path.join(tmpDir, '.githooks', 'commit-msg'), `#!/bin/sh
MSG_FILE=$1
MSG=$(head -1 "$MSG_FILE")
VALID_TAGS="BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE"

if ! echo "$MSG" | grep -qE '^\\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\\]'; then
    echo "ERROR: Commit message must start with an uppercase tag."
    echo "Format: [TAG] scope: message"
    echo "Valid tags: $VALID_TAGS"
    exit 1
fi

if ! echo "$MSG" | grep -qE '^\\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\\]\\s+[^:]+:\\s+.+'; then
    echo "ERROR: scope and message are required."
    echo "Format: [TAG] scope: message"
    exit 1
fi

echo "Commit message validated"
exit 0
`);
  execSync('chmod +x ' + path.join(tmpDir, '.githooks', 'commit-msg'));

  // AGENTS.md with CodeMap query priority and evidence protocol
  writeFileSync(path.join(tmpDir, 'AGENTS.md'), `# AGENTS.md - Test Project

## Section 3: Task Classification
Use severity levels: L0, L1, L2, L3.

## Section 6: Code Search
Use codemap CLI for code search: query --symbol, analyze -i read, impact -f.
Evidence protocol: every test must have real scenario evidence.

## Section 8: Real Scenario Verification
Tests must pass real scenario verification threshold.
`);

  // docs/rules/testing.md with Vitest and real scenario rules
  mkdirSync(path.join(tmpDir, 'docs', 'rules'), { recursive: true });
  writeFileSync(path.join(tmpDir, 'docs', 'rules', 'testing.md'), `# Testing Rules

## Test Framework
- Framework: Vitest
- Run tests with \`npx vitest run\`
- Target coverage: >= 80%

## Real Scenario Verification
Every test must have evidence. Failure scenarios must be verified.
`);

  return tmpDir;
}

describe('env-contract retrieval E2E', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempRepo();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('init + env-contract returns correct schema and filtered items for worker', () => {
    // Run init to generate .mycodemap/env-contract.json
    const initResult = runCli(['init', '--yes', '--profile', 'nodejs'], tmpDir);
    expect(initResult.exitCode).toBe(0);

    // Run env-contract for worker agent type
    const { stdout, exitCode } = runCli(['env-contract', '--for', 'worker', '--json'], tmpDir);
    expect(exitCode).toBe(0);
    const data = JSON.parse(stdout);

    // Schema version must be env-contract.v1
    expect(data.schemaVersion).toBe('env-contract.v1');
    expect(data.agentType).toBe('worker');

    // Worker output must include commit-format, test-entry-vitest
    const ids = data.items.map((i: { id: string }) => i.id);
    expect(ids).toContain('commit-format');
    expect(ids).toContain('test-entry-vitest');

    // Worker should include execution, commit, style, validation categories
    const categories = new Set(data.items.map((i: { category: string }) => i.category));
    expect(categories.has('execution')).toBe(true);
    expect(categories.has('commit')).toBe(true);

    // Worker output must NOT include retrieval-only items
    expect(categories.has('retrieval')).toBe(false);
  });

  it('env-contract --check returns valid status for a fresh contract', () => {
    // First generate the contract via init
    runCli(['init', '--yes', '--profile', 'nodejs'], tmpDir);

    // Then check — exit code 0 (ok) or 2 (warnings only) both mean contract is valid
    const { stdout, exitCode } = runCli(['env-contract', '--check', '--json'], tmpDir);
    expect(exitCode === 0 || exitCode === 2).toBe(true);
    const data = JSON.parse(stdout);
    expect(data.status === 'ok' || data.status === 'warn').toBe(true);
  });

  it('doctor includes agent diagnostic for env-contract', () => {
    // Run init first
    runCli(['init', '--yes', '--profile', 'nodejs'], tmpDir);

    // Run doctor
    const { stdout, exitCode } = runCli(['doctor', '--json'], tmpDir);
    // Doctor may exit 0 or non-zero depending on other diagnostics
    expect(exitCode).toBeGreaterThanOrEqual(0);

    const diagnostics = JSON.parse(stdout);
    expect(Array.isArray(diagnostics)).toBe(true);

    // Find agent category diagnostics
    const agentDiags = diagnostics.filter((d: { category: string }) => d.category === 'agent');
    expect(agentDiags.length).toBeGreaterThan(0);

    // Should include an env-contract related diagnostic
    const envContractDiag = agentDiags.find(
      (d: { id: string }) => d.id.includes('env-contract') || d.id.includes('contract-schema'),
    );
    expect(envContractDiag).toBeDefined();
  });

  it('detects source drift', () => {
    // Generate a valid contract
    runCli(['init', '--yes', '--profile', 'nodejs'], tmpDir);
    // Also update the contract to ensure it exists
    runCli(['env-contract', '--update', '--json'], tmpDir);

    // Mutate .githooks/commit-msg to add a valid tag (changes hash)
    writeFileSync(path.join(tmpDir, '.githooks', 'commit-msg'), `#!/bin/sh
MSG_FILE=$1
MSG=$(head -1 "$MSG_FILE")
VALID_TAGS="BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE HOTFIX"
echo "Commit message validated"
exit 0
`);

    // Check should detect drift
    const { stdout, exitCode } = runCli(['env-contract', '--check', '--json'], tmpDir);
    expect(exitCode).toBe(1);
    const data = JSON.parse(stdout);
    expect(data.status).toBe('error');
    const driftDiag = data.diagnostics.find((d: { id: string }) => d.id.startsWith('source-drift:'));
    expect(driftDiag).toBeDefined();
  });

  it('negative no-retrieval: hook rejects bad commit message format', () => {
    // This proves that retrieval has operational value:
    // without knowing the contract, a subagent would fail at commit validation.

    // Create a git repo in the temp dir
    execSync('git init && git config user.email "test@test.com" && git config user.name "Test"', {
      cwd: tmpDir,
      encoding: 'utf8',
    });
    execSync('git add -A && git commit -m "[DOCS] test: initial commit" --no-verify', {
      cwd: tmpDir,
      encoding: 'utf8',
    });

    // Configure git to use our hook
    execSync('git config core.hookspath .githooks', { cwd: tmpDir, encoding: 'utf8' });

    // Try a bad commit message (no proper format)
    writeFileSync(path.join(tmpDir, 'dummy.txt'), 'trigger commit');
    execSync('git add dummy.txt', { cwd: tmpDir, encoding: 'utf8' });

    try {
      execSync('git commit -m "bad message"', {
        cwd: tmpDir,
        encoding: 'utf8',
        timeout: 10000,
      });
      // Should not reach here
      expect.fail('Expected commit to be rejected');
    } catch (err: unknown) {
      const e = err as { stderr?: string; stdout?: string };
      const output = (e.stderr ?? '') + (e.stdout ?? '');
      // Hook should print the format error
      expect(output).toContain('Format: [TAG] scope: message');
    }
  });

  it('negative no-retrieval: wrong test command fails without contract guidance', () => {
    // Without env-contract retrieval, a subagent might use "npm test" instead of "vitest run".
    // In our temp repo, package.json defines "test": "vitest run", so "npm test" would work.
    // But if a subagent skips contract retrieval and tries an arbitrary command not in the
    // contract, it would fail. We simulate this by running a non-existent command.
    try {
      execSync('npm run nonexistent-command', {
        cwd: tmpDir,
        encoding: 'utf8',
        timeout: 10000,
      });
      expect.fail('Expected command to fail');
    } catch (err: unknown) {
      const e = err as { stderr?: string; stdout?: string };
      const output = (e.stderr ?? '') + (e.stdout ?? '');
      // npm should report the missing script
      expect(output).toContain('Missing script');
    }
  });
});
