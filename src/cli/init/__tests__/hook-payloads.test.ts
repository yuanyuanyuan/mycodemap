import { afterEach, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

interface HookProtocolDescriptor {
  schema: string;
  hook_source: string;
  required_top_level_fields: string[];
  blocking_rules: Record<string, string>;
}

interface HookProtocolContract {
  line_prefixes: {
    protocol: string;
    log_path: string;
  };
  shared_env: {
    protocol_only: string;
    attempt_context: string;
  };
  output_modes: string[];
  hooks: {
    'pre-commit': HookProtocolDescriptor;
    'commit-msg': HookProtocolDescriptor;
  };
}

const HOOK_PROTOCOL_CONTRACT = JSON.parse(
  readFileSync(path.join(process.cwd(), 'scripts/hooks/templates/protocol-contract.json'), 'utf8'),
) as HookProtocolContract;
const PRE_COMMIT_CONTRACT = HOOK_PROTOCOL_CONTRACT.hooks['pre-commit'];
const COMMIT_MSG_CONTRACT = HOOK_PROTOCOL_CONTRACT.hooks['commit-msg'];

function createTempRepo(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'codemap-hook-payloads-'));
  execSync('git init -q', { cwd: dir });
  execSync('git config user.name test', { cwd: dir });
  execSync('git config user.email test@example.com', { cwd: dir });

  mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  mkdirSync(path.join(dir, '.mycodemap', 'hooks'), { recursive: true });

  cpSync(path.join(process.cwd(), '.githooks', 'pre-commit'), path.join(dir, '.githooks', 'pre-commit'));
  cpSync(path.join(process.cwd(), '.githooks', 'commit-msg'), path.join(dir, '.githooks', 'commit-msg'));

  // .mycodemap/hooks/ is gitignored; fall back to tracked templates in CI
  const mycodemapHooksDir = path.join(process.cwd(), '.mycodemap', 'hooks');
  const hookSource = existsSync(path.join(mycodemapHooksDir, 'pre-commit'))
    ? mycodemapHooksDir
    : path.join(process.cwd(), 'scripts', 'hooks', 'templates');
  cpSync(path.join(hookSource, 'pre-commit'), path.join(dir, '.mycodemap', 'hooks', 'pre-commit'));
  cpSync(path.join(hookSource, 'commit-msg'), path.join(dir, '.mycodemap', 'hooks', 'commit-msg'));

  execSync('chmod +x .githooks/pre-commit .githooks/commit-msg .mycodemap/hooks/pre-commit .mycodemap/hooks/commit-msg', { cwd: dir });
  execSync('git config core.hooksPath .githooks', { cwd: dir });

  return dir;
}

function runCommit(repoDir: string, message: string, extraEnv: Record<string, string> = {}): { exitCode: number; output: string } {
  try {
    const stdout = execSync(`git commit -m ${JSON.stringify(message)}`, {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: 'pipe',
      env: {
        ...process.env,
        ...extraEnv,
      },
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

function readProtocolLog(repoDir: string, protocol: Record<string, any>): Record<string, any> {
  const relativePath = protocol.attempt?.log_path as string | undefined;
  expect(relativePath).toBeTruthy();

  const absolutePath = path.join(repoDir, relativePath!);
  expect(existsSync(absolutePath)).toBe(true);
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
}

function extractProtocolPayloads(output: string): Record<string, any>[] {
  const prefix = HOOK_PROTOCOL_CONTRACT.line_prefixes.protocol;
  return output
    .split('\n')
    .filter((line) => line.startsWith(prefix))
    .map((line) => JSON.parse(line.slice(prefix.length)));
}

function extractProtocolPayload(output: string, hookSource?: string): Record<string, any> {
  const payloads = extractProtocolPayloads(output);

  expect(payloads.length, output).toBeGreaterThan(0);
  if (!hookSource) {
    return payloads[payloads.length - 1]!;
  }

  for (let index = payloads.length - 1; index >= 0; index -= 1) {
    if (payloads[index]?.hook_source === hookSource) {
      return payloads[index]!;
    }
  }

  throw new Error(`Missing protocol payload for hook source: ${hookSource}`);
}

function expectProtocolToMatchContract(protocol: Record<string, any>, descriptor: HookProtocolDescriptor): void {
  expect(protocol.schema).toBe(descriptor.schema);
  expect(protocol.hook_source).toBe(descriptor.hook_source);
  for (const field of descriptor.required_top_level_fields) {
    expect(protocol).toHaveProperty(field);
  }
  expect(HOOK_PROTOCOL_CONTRACT.output_modes).toContain(protocol.output?.mode);
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
    const protocol = extractProtocolPayload(result.output, COMMIT_MSG_CONTRACT.hook_source);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: commit-format');
    expect(result.output).toContain('TRIGGERED_BY_NON_DOT_FILES:');
    expect(result.output).toContain('notes/todo.txt');
    expect(result.output).toContain('If you intended the dot-directory exemption');
    expectProtocolToMatchContract(protocol, COMMIT_MSG_CONTRACT);
    expect(protocol).toMatchObject({
      schema: COMMIT_MSG_CONTRACT.schema,
      hook_source: COMMIT_MSG_CONTRACT.hook_source,
      commit_allowed: false,
      next_action: COMMIT_MSG_CONTRACT.blocking_rules['commit-format'],
      repo: {
        non_dot_files: ['notes/todo.txt'],
        only_dot_dirs: false,
      },
      block: {
        rule_id: 'commit-format',
        rule: {
          defined_at: expect.stringContaining('.mycodemap/hooks/commit-msg:'),
          doc_ref: 'docs/DEVELOPMENT.md',
        },
        resolution: {
          type: COMMIT_MSG_CONTRACT.blocking_rules['commit-format'],
          expected_format: '[TAG] scope: message',
          example: '[FEATURE] cli: add new command',
          triggered_non_dot_files: ['notes/todo.txt'],
        },
      },
    });
    expect(protocol.checks[0]).toMatchObject({
      name: 'commit-format',
      status: 'failed',
    });
    expect(protocol.checks[1]).toMatchObject({
      name: 'commit-scope-message',
      status: 'skipped',
      skip_reason: 'blocked-by-commit-format',
    });
    expect(result.output).toContain(HOOK_PROTOCOL_CONTRACT.line_prefixes.log_path);
    expect(readProtocolLog(repoDir, protocol)).toEqual(protocol);
  });

  it('explains commit scope/message failures with a dedicated rule id and rewrite route', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    mkdirSync(path.join(repoDir, 'notes'), { recursive: true });
    writeFileSync(path.join(repoDir, 'notes', 'todo.txt'), 'todo\n', 'utf8');
    execSync('git add notes/todo.txt', { cwd: repoDir });

    const result = runCommit(repoDir, '[FEATURE] missing-scope-separator');
    const protocol = extractProtocolPayload(result.output, COMMIT_MSG_CONTRACT.hook_source);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: commit-scope-message');
    expect(result.output).toContain('Rewrite the first line to match: [TAG] scope: message');
    expectProtocolToMatchContract(protocol, COMMIT_MSG_CONTRACT);
    expect(protocol.block).toMatchObject({
      rule_id: 'commit-scope-message',
      resolution: {
        type: COMMIT_MSG_CONTRACT.blocking_rules['commit-scope-message'],
        missing_parts: ['scope', 'colon', 'message'],
      },
    });
    expect(protocol.checks[0]).toMatchObject({
      name: 'commit-format',
      status: 'passed',
    });
    expect(protocol.checks[1]).toMatchObject({
      name: 'commit-scope-message',
      status: 'failed',
    });
  });

  it('supports protocol-only mode for autonomous agents', () => {
    const repoDir = createTempRepo();
    tempRoots.push(repoDir);

    mkdirSync(path.join(repoDir, 'notes'), { recursive: true });
    writeFileSync(path.join(repoDir, 'notes', 'todo.txt'), 'todo\n', 'utf8');
    execSync('git add notes/todo.txt', { cwd: repoDir });

    const result = runCommit(repoDir, 'docs: bad message', {
      [HOOK_PROTOCOL_CONTRACT.shared_env.protocol_only]: '1',
    });
    const protocol = extractProtocolPayload(result.output, COMMIT_MSG_CONTRACT.hook_source);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(HOOK_PROTOCOL_CONTRACT.line_prefixes.log_path);
    expect(result.output).toContain(HOOK_PROTOCOL_CONTRACT.line_prefixes.protocol);
    expect(result.output).not.toContain('Running pre-commit checks...');
    expect(result.output).not.toContain('ERROR: Commit precheck blocked the commit.');
    expectProtocolToMatchContract(protocol, COMMIT_MSG_CONTRACT);
    expect(protocol.output).toMatchObject({
      protocol_only: true,
      mode: HOOK_PROTOCOL_CONTRACT.output_modes[1],
    });
    expect(readProtocolLog(repoDir, protocol)).toEqual(protocol);
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
    const protocol = extractProtocolPayload(result.output);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: staged-file-limit');
    expect(result.output).toContain('STAGED_FILES:');
    expect(result.output).not.toContain('--no-verify');
    expect(result.output).not.toContain('Running tests for staged files...');
    expect(result.output).not.toContain('Running repo-local rule validation');
    expectProtocolToMatchContract(protocol, PRE_COMMIT_CONTRACT);
    expect(protocol).toMatchObject({
      schema: PRE_COMMIT_CONTRACT.schema,
      commit_allowed: false,
      next_action: PRE_COMMIT_CONTRACT.blocking_rules['staged-file-limit'],
      attempt: {
        context_env: HOOK_PROTOCOL_CONTRACT.shared_env.attempt_context,
        attempt_id: expect.stringContaining('precommit-'),
      },
      repo: {
        staged_count: 11,
        current_limit: 10,
        staged_files: expect.arrayContaining(['notes/file-1.txt', 'notes/file-11.txt']),
      },
      block: {
        rule_id: 'staged-file-limit',
        rule: {
          defined_at: expect.stringContaining('.mycodemap/hooks/pre-commit:'),
        },
        resolution: {
          type: PRE_COMMIT_CONTRACT.blocking_rules['staged-file-limit'],
          current: 11,
          limit: 10,
          reset_command: 'git reset HEAD',
        },
      },
    });
    expect(protocol.checks[0]).toMatchObject({
      name: 'staged-file-limit',
      order: 0,
      status: 'failed',
      blocking: true,
    });
    expect(protocol.checks[0].details).toMatchObject({
      staged_count: 11,
      current_limit: 10,
    });
    expect(protocol.checks[0].details).not.toHaveProperty('raw');
    expect(protocol.checks[1]).toMatchObject({
      name: 'source-file-headers',
      status: 'skipped',
      skip_reason: 'blocked-by-staged-file-limit',
    });
    expect(protocol.block.resolution.suggested_groups).toHaveLength(2);
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
    const protocol = extractProtocolPayload(result.output);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: docs-guardrail');
    expect(result.output).toContain('TRIGGERED_BY:');
    expect(result.output).toContain('README.md');
    expect(result.output).toContain('package.json');
    expect(result.output).toContain('Run npm run docs:check');
    expect(result.output).not.toContain('Running tests for staged files...');
    expect(protocol.block).toMatchObject({
      rule_id: 'docs-guardrail',
      resolution: {
        type: 'rerun_docs_check',
        command: 'npm run docs:check',
        triggered_by: expect.arrayContaining(['README.md', 'package.json']),
      },
    });
    expect(protocol.checks[2]).toMatchObject({
      name: 'docs-guardrail',
      status: 'failed',
    });
    expect(protocol.checks[3]).toMatchObject({
      name: 'related-tests',
      status: 'skipped',
      skip_reason: 'blocked-by-docs-guardrail',
    });
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
    const protocol = extractProtocolPayload(result.output);

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('RULE_ID: source-file-headers');
    expect(result.output).toContain('// [META] since:YYYY-MM | owner:team | stable:false');
    expect(result.output).toContain('// [WHY] Explain why this file exists');
    expect(protocol.block).toMatchObject({
      rule_id: 'source-file-headers',
      resolution: {
        type: 'edit_headers',
        files: ['src/no-header.ts'],
        header_template: [
          '// [META] since:YYYY-MM | owner:team | stable:false',
          '// [WHY] Explain why this file exists',
        ],
      },
    });
    expect(protocol.checks[1]).toMatchObject({
      name: 'source-file-headers',
      status: 'failed',
    });
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
    writeFileSync(
      path.join(repoDir, 'src', 'cli', 'env-contract', 'discovery.ts'),
      [
        '// [META] since:2026-05 | owner:cli-team | stable:false',
        '// [WHY] Exercise related-test failure routing without tripping header guardrails first.',
        'export const discovery = true;',
      ].join('\n') + '\n',
      'utf8',
    );
    execSync('git add src/cli/env-contract/discovery.ts', { cwd: repoDir });

    const result = runCommit(repoDir, '[FEATURE] env-contract: adjust discovery flow');
    const protocol = extractProtocolPayload(result.output);

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
    expect(protocol.block).toMatchObject({
      rule_id: 'related-tests',
      rule: {
        defined_at: expect.stringContaining('.mycodemap/hooks/pre-commit:'),
        doc_ref: 'docs/rules/testing.md#测试框架',
      },
      resolution: {
        type: 'rerun_verify_commands',
        test_strategy: 'vitest-related',
        failed_test_file: 'src/cli/env-contract/__tests__/discovery.test.ts',
        staged_source_files: ['src/cli/env-contract/discovery.ts'],
        likely_cause: 'This looks like a behavior change near the modified module. Check whether the affected test expectations need updating.',
      },
    });
    expect(protocol.block.resolution.verify_commands).toEqual(expect.arrayContaining([
      'npx vitest run src/cli/env-contract/__tests__/discovery.test.ts',
      'npx vitest related src/cli/env-contract/discovery.ts --watch=false --bail=1',
    ]));
    expect(protocol.checks[3]).toMatchObject({
      name: 'related-tests',
      status: 'failed',
    });
    expect(protocol.checks[4]).toMatchObject({
      name: 'repo-local-rule-validation',
      status: 'skipped',
      skip_reason: 'blocked-by-related-tests',
    });
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
          'docs:check': 'node -e "process.exit(0)"',
          test: 'node scripts/run-tests.js',
        },
      }, null, 2),
      'utf8',
    );
    writeFileSync(
      path.join(repoDir, 'scripts', 'run-tests.js'),
      [
        "const fs = require('node:fs');",
        "if (fs.existsSync('.tests-should-fail')) {",
        "  console.error('FAILED tests/unit/custom.test.js > custom runner > reports failure');",
        "  console.error('AssertionError: expected 1 to be 2');",
        '  process.exit(1);',
        '}',
        "console.log('project test passed');",
      ].join('\n'),
      'utf8',
    );
    execSync('git add package.json scripts/run-tests.js', { cwd: repoDir });
    execSync('git commit -m "[CONFIG] hooks: seed fallback runner"', { cwd: repoDir, stdio: 'pipe' });

    mkdirSync(path.join(repoDir, 'src'), { recursive: true });
    writeFileSync(path.join(repoDir, 'src', 'custom.js'), 'export const custom = true;\n', 'utf8');
    writeFileSync(path.join(repoDir, '.tests-should-fail'), '1\n', 'utf8');
    execSync('git add src/custom.js .tests-should-fail', { cwd: repoDir });

    const result = runCommit(repoDir, '[FEATURE] hooks: fallback project test command');
    const protocol = extractProtocolPayload(result.output);

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
    expect(protocol.block).toMatchObject({
      rule_id: 'related-tests',
      resolution: {
        type: 'rerun_verify_commands',
        test_strategy: 'package-test',
        failed_test_file: 'tests/unit/custom.test.js',
        staged_source_files: ['src/custom.js'],
      },
    });
    expect(protocol.block.resolution.verify_commands).toEqual(['npm test']);
  });
});
