import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

function createTempRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'codemap-hook-payloads-'));
  execSync('git init -q', { cwd: dir });
  execSync('git config user.name test', { cwd: dir });
  execSync('git config user.email test@example.com', { cwd: dir });

  mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  mkdirSync(path.join(dir, '.mycodemap', 'hooks'), { recursive: true });

  cpSync(path.join(process.cwd(), '.githooks', 'pre-commit'), path.join(dir, '.githooks', 'pre-commit'));
  cpSync(path.join(process.cwd(), '.githooks', 'commit-msg'), path.join(dir, '.githooks', 'commit-msg'));
  cpSync(path.join(process.cwd(), '.mycodemap', 'hooks', 'pre-commit'), path.join(dir, '.mycodemap', 'hooks', 'pre-commit'));
  cpSync(path.join(process.cwd(), '.mycodemap', 'hooks', 'commit-msg'), path.join(dir, '.mycodemap', 'hooks', 'commit-msg'));

  execSync('chmod +x .githooks/pre-commit .githooks/commit-msg .mycodemap/hooks/pre-commit .mycodemap/hooks/commit-msg', { cwd: dir });
  execSync('git config core.hooksPath .githooks', { cwd: dir });

  return dir;
}

function runCommit(repoDir: string, message: string): { exitCode: number; output: string } {
  try {
    const stdout = execSync(`git commit -m ${JSON.stringify(message)}`, {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { exitCode: 0, output: stdout };
  } catch (error: unknown) {
    const execError = error as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer };
    const stdout = typeof execError.stdout === 'string' ? execError.stdout : execError.stdout?.toString('utf8') ?? '';
    const stderr = typeof execError.stderr === 'string' ? execError.stderr : execError.stderr?.toString('utf8') ?? '';
    return {
      exitCode: execError.status ?? 1,
      output: `${stdout}${stderr}`,
    };
  }
}

describe('managed hook payloads', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('explains commit-format failures with a rule id and recovery hint', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    mkdirSync(path.join(repoDir, 'notes'), { recursive: true });
    writeFileSync(path.join(repoDir, 'notes', 'todo.txt'), 'todo\n', 'utf8');
    execSync('git add notes/todo.txt', { cwd: repoDir });

    const result = runCommit(repoDir, 'docs: bad message');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: commit-format');
    expect(result.output).toContain('TRIGGERED_BY_NON_DOT_FILES:');
    expect(result.output).toContain('notes/todo.txt');
    expect(result.output).toContain('If you intended the dot-directory exemption');
  });

  it('explains staged-file-limit failures without suggesting --no-verify', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    writeFileSync(path.join(repoDir, 'base.txt'), 'base\n', 'utf8');
    execSync('git add base.txt', { cwd: repoDir });
    execSync('git commit -m "[DOCS] init: base"', { cwd: repoDir, stdio: 'pipe' });

    mkdirSync(path.join(repoDir, 'notes'), { recursive: true });
    for (let index = 1; index <= 11; index += 1) {
      writeFileSync(path.join(repoDir, 'notes', `file-${index}.txt`), `${index}\n`, 'utf8');
    }
    execSync('git add notes', { cwd: repoDir });

    const result = runCommit(repoDir, '[DOCS] notes: bulk add');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: staged-file-limit');
    expect(result.output).toContain('STAGED_FILES:');
    expect(result.output).not.toContain('--no-verify');
  });

  it('explains docs guardrail failures with trigger paths and retry guidance', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    writeFileSync(
      path.join(repoDir, 'package.json'),
      JSON.stringify({
        name: 'tmp',
        scripts: {
          'docs:check': `node -e "console.error('DOCSYNC: AGENTS.md missing AI-friendly section'); process.exit(1)"`,
        },
      }, null, 2),
      'utf8',
    );
    writeFileSync(path.join(repoDir, 'README.md'), '# readme\n', 'utf8');
    execSync('git add package.json README.md', { cwd: repoDir });

    const result = runCommit(repoDir, '[DOCS] docs: update readme');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: docs-guardrail');
    expect(result.output).toContain('TRIGGERED_BY:');
    expect(result.output).toContain('README.md');
    expect(result.output).toContain('package.json');
    expect(result.output).toContain('Run npm run docs:check');
  });

  it('explains missing header failures with the required header template', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    mkdirSync(path.join(repoDir, 'node_modules', 'vitest'), { recursive: true });
    writeFileSync(
      path.join(repoDir, 'node_modules', 'vitest', 'vitest.mjs'),
      "console.log('vitest stub pass');\nprocess.exit(0);\n",
      'utf8',
    );
    mkdirSync(path.join(repoDir, 'src'), { recursive: true });
    writeFileSync(path.join(repoDir, 'src', 'no-header.ts'), 'export const value = 1;\n', 'utf8');
    execSync('git add src/no-header.ts', { cwd: repoDir });

    const result = runCommit(repoDir, '[FEATURE] src: add no header');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: source-file-headers');
    expect(result.output).toContain('// [META] since:YYYY-MM | owner:team | stable:false');
    expect(result.output).toContain('// [WHY] Explain why this file exists');
  });

  it('filters known MCP warning noise and prints a bottom summary for related test failures', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    mkdirSync(path.join(repoDir, 'node_modules', 'vitest'), { recursive: true });
    writeFileSync(
      path.join(repoDir, 'node_modules', 'vitest', 'vitest.mjs'),
      [
        'process.stderr.write(\'Contract tool "codemap_env_contract" renamed to "codemap_env_contract_contract" -- name reserved by native tool\\n\');',
        'process.stderr.write(\'Contract tool "codemap_env_contract" skipped -- name reserved by native tool and alternative "codemap_env_contract_contract" also taken\\n\');',
        'process.stderr.write(\' FAIL  src/cli/env-contract/__tests__/discovery.test.ts > discovery > keeps hook topology stable\\n\');',
        'process.stderr.write(\'AssertionError: expected false to be true\\n\');',
        'process.exit(1);',
      ].join('\n'),
      'utf8',
    );

    mkdirSync(path.join(repoDir, 'src', 'cli', 'env-contract'), { recursive: true });
    writeFileSync(path.join(repoDir, 'src', 'cli', 'env-contract', 'discovery.ts'), 'export const discovery = true;\n', 'utf8');
    execSync('git add src/cli/env-contract/discovery.ts', { cwd: repoDir });

    const result = runCommit(repoDir, '[FEATURE] env-contract: adjust discovery flow');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: related-tests');
    expect(result.output).toContain('TEST_FAILURE_SUMMARY');
    expect(result.output).toContain('TEST_STRATEGY: vitest-related');
    expect(result.output).toContain('TEST_COMMAND: npx vitest related src/cli/env-contract/discovery.ts --watch=false --bail=1');
    expect(result.output).toContain('FAILED_TEST_FILE: src/cli/env-contract/__tests__/discovery.test.ts');
    expect(result.output).toContain('LIKELY_CAUSE: This looks like a behavior change near the modified module.');
    expect(result.output).toContain('TRIGGERED_SOURCE_FILES:');
    expect(result.output).toContain('src/cli/env-contract/discovery.ts');
    expect(result.output).toContain('VERIFY: npx vitest run src/cli/env-contract/__tests__/discovery.test.ts');
    expect(result.output).toContain('VERIFY: npx vitest related src/cli/env-contract/discovery.ts --watch=false --bail=1');
    expect(result.output).toContain('INFO: Suppressed 2 known MCP contract-tool warning line(s) from test output.');
    expect(result.output).not.toContain('Contract tool "codemap_env_contract"');
  });

  it('falls back to the project test command when no safe related-test runner is detected', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    mkdirSync(path.join(repoDir, 'scripts'), { recursive: true });
    writeFileSync(
      path.join(repoDir, 'package.json'),
      JSON.stringify({
        name: 'tmp',
        scripts: {
          test: 'node scripts/run-tests.js',
        },
      }, null, 2),
      'utf8',
    );
    writeFileSync(
      path.join(repoDir, 'scripts', 'run-tests.js'),
      [
        "console.error('FAILED tests/unit/custom.test.js > custom runner > reports failure');",
        "console.error('AssertionError: expected 1 to be 2');",
        'process.exit(1);',
      ].join('\n'),
      'utf8',
    );
    mkdirSync(path.join(repoDir, 'src'), { recursive: true });
    writeFileSync(path.join(repoDir, 'src', 'custom.js'), 'export const custom = true;\n', 'utf8');
    execSync('git add package.json scripts/run-tests.js src/custom.js', { cwd: repoDir });

    const result = runCommit(repoDir, '[FEATURE] hooks: fallback project test command');

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: related-tests');
    expect(result.output).toContain('TEST_FAILURE_SUMMARY');
    expect(result.output).toContain('TEST_STRATEGY: package-test');
    expect(result.output).toContain('TEST_COMMAND: npm test');
    expect(result.output).toContain('FAILED_TEST_FILE: tests/unit/custom.test.js');
    expect(result.output).toContain('VERIFY: npm test');
    expect(result.output).toContain('TRIGGERED_SOURCE_FILES:');
    expect(result.output).toContain('src/custom.js');
    expect(result.output).not.toContain('npx vitest related');
  });
});
