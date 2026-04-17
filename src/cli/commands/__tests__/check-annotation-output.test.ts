import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ContractCheckResult } from '../../../interface/types/index.js';

const runContractCheckMock = vi.fn();
const resolveContractDiffScopeMock = vi.fn();

vi.mock('../../contract-checker.js', () => ({
  hasBlockingContractViolations: (result: ContractCheckResult) =>
    result.violations.some((violation) => violation.severity === 'error'),
  runContractCheck: runContractCheckMock,
}));

vi.mock('../../contract-diff-scope.js', () => ({
  resolveContractDiffScope: resolveContractDiffScopeMock,
}));

const { createCheckCommand } = await import('../check.js');

function createSqliteConfiguredRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-check-annotation-'));
  mkdirSync(path.join(root, 'src'), { recursive: true });
  writeFileSync(
    path.join(root, 'mycodemap.config.json'),
    JSON.stringify({
      storage: {
        type: 'sqlite',
        databasePath: '.codemap/governance.sqlite',
      },
    }, null, 2),
  );
  return root;
}

function createResult(overrides: Partial<ContractCheckResult> = {}): ContractCheckResult {
  return {
    passed: false,
    scan_mode: 'full',
    contract_path: '/repo/mycodemap.design.md',
    against_path: 'src',
    changed_files: [],
    scanned_files: ['src/core/service.ts'],
    warnings: [],
    violations: [
      {
        rule: 'core 不可依赖 cli',
        rule_type: 'layer_direction',
        severity: 'error',
        location: 'src/core/service.ts',
        message: 'src/core/service.ts 依赖 src/cli/command.ts，违反规则 core 不可依赖 cli',
        dependency_chain: ['src/core/service.ts', 'src/cli/command.ts'],
        hard_fail: true,
        diagnostic: {
          file: 'src/core/service.ts',
          line: 3,
          column: 21,
          endLine: 3,
          endColumn: 37,
          scope: 'line',
          source: 'dependency-cruiser',
          category: 'dependency',
          degraded: false,
        },
      },
    ],
    summary: {
      total_violations: 1,
      error_count: 1,
      warn_count: 0,
      scanned_file_count: 1,
      rule_count: 1,
    },
    ...overrides,
  };
}

describe('check command annotation output', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let checkCommand = createCheckCommand();
  let tempRoot: string | undefined;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    tempRoot = createSqliteConfiguredRoot();
    runContractCheckMock.mockReset();
    resolveContractDiffScopeMock.mockReset();
    resolveContractDiffScopeMock.mockResolvedValue({
      scanMode: 'full',
      changedFiles: [],
      warnings: [],
    });
    checkCommand = createCheckCommand();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.exitCode = originalExitCode;
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  it('renders GitHub workflow command annotations from canonical diagnostics', async () => {
    expect(tempRoot).toBeDefined();
    runContractCheckMock.mockResolvedValue(createResult());

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(tempRoot!, 'mycodemap.design.md'),
      '--against',
      path.join(tempRoot!, 'src'),
      '--annotation-format',
      'github',
    ]);

    const output = String(consoleLogSpy.mock.calls[0]?.[0]);
    expect(output).toContain('::error');
    expect(output).toContain('file=src/core/service.ts');
    expect(output).toContain('line=3');
    expect(output).toContain('title=layer_direction%3A core 不可依赖 cli');
    expect(process.exitCode).toBe(1);
  });

  it('writes GitLab artifact JSON and skips degraded file-only diagnostics', async () => {
    expect(tempRoot).toBeDefined();
    const annotationFile = path.join(tempRoot!, 'artifacts', 'gl-code-quality-report.json');
    runContractCheckMock.mockResolvedValue(createResult({
      violations: [
        createResult().violations[0]!,
        {
          rule: 'complexity budget',
          rule_type: 'complexity_threshold',
          severity: 'warn',
          location: 'src/cli/heavy.ts',
          message: 'file-level degradation example',
          dependency_chain: ['src/cli/heavy.ts'],
          hard_fail: false,
          diagnostic: {
            file: 'src/cli/heavy.ts',
            scope: 'file',
            source: 'custom-evaluator',
            category: 'complexity',
            degraded: true,
          },
        },
      ],
      summary: {
        total_violations: 2,
        error_count: 1,
        warn_count: 1,
        scanned_file_count: 2,
        rule_count: 2,
      },
    }));

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(tempRoot!, 'mycodemap.design.md'),
      '--against',
      path.join(tempRoot!, 'src'),
      '--annotation-format',
      'gitlab',
      '--annotation-file',
      annotationFile,
    ]);

    const artifact = JSON.parse(readFileSync(annotationFile, 'utf8')) as Array<Record<string, unknown>>;
    expect(artifact).toHaveLength(1);
    expect(artifact[0]).toEqual(expect.objectContaining({
      check_name: 'layer_direction:core 不可依赖 cli',
      severity: 'major',
    }));
    expect(String(consoleLogSpy.mock.calls[0]?.[0])).toContain(annotationFile);
  });
});
