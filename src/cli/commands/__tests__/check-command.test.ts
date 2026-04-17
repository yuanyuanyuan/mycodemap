import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-check-command-'));
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
    passed: true,
    scan_mode: 'full',
    contract_path: '/repo/mycodemap.design.md',
    against_path: 'src',
    changed_files: [],
    scanned_files: ['src/core/service.ts'],
    warnings: [],
    violations: [],
    summary: {
      total_violations: 0,
      error_count: 0,
      warn_count: 0,
      scanned_file_count: 1,
      rule_count: 1,
    },
    history: {
      status: 'ok',
      confidence: 'high',
      freshness: 'fresh',
      scope_mode: 'full',
      enriched_file_count: 1,
      unavailable_count: 0,
      stale_count: 0,
      low_confidence_count: 0,
      requires_precompute: false,
    },
    ...overrides,
  };
}

describe('check command', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const originalExitCode = process.exitCode;
  let checkCommand = createCheckCommand();
  let tempRoot: string | undefined;

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
    consoleLogSpy?.mockRestore();
    process.exitCode = originalExitCode;
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  it('prints JSON by default', async () => {
    expect(tempRoot).toBeDefined();
    const contractPath = path.join(tempRoot!, 'mycodemap.design.md');
    const againstPath = path.join(tempRoot!, 'src');
    runContractCheckMock.mockResolvedValue(createResult());

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      contractPath,
      '--against',
      againstPath,
    ]);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload).toEqual(expect.objectContaining({ passed: true, scan_mode: 'full' }));
    expect(runContractCheckMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contractPath,
        againstPath,
        scanMode: 'full',
      }),
    );
  });

  it('renders human output when requested', async () => {
    expect(tempRoot).toBeDefined();
    runContractCheckMock.mockResolvedValue(createResult({
      violations: [
        {
          rule: 'warn only',
          rule_type: 'forbidden_imports',
          severity: 'warn',
          location: 'src/parser.ts',
          message: 'warn only',
          dependency_chain: ['src/parser.ts', 'fs'],
          hard_fail: false,
          risk: {
            status: 'ok',
            level: 'high',
            confidence: 'high',
            freshness: 'fresh',
            score: 0.8,
            factors: ['recent bugfixes'],
            analyzed_at: '2026-04-15T00:00:00.000Z',
          },
        },
      ],
      summary: {
        total_violations: 1,
        error_count: 0,
        warn_count: 1,
        scanned_file_count: 1,
        rule_count: 1,
      },
    }));

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(tempRoot!, 'mycodemap.design.md'),
      '--against',
      path.join(tempRoot!, 'src'),
      '--human',
    ]);

    expect(String(consoleLogSpy.mock.calls[0]?.[0])).toContain('Contract check passed');
    expect(String(consoleLogSpy.mock.calls[0]?.[0])).toContain('History Risk: status=ok');
    expect(String(consoleLogSpy.mock.calls[0]?.[0])).toContain('risk=high');
  });

  it('keeps risk block in JSON output', async () => {
    expect(tempRoot).toBeDefined();
    runContractCheckMock.mockResolvedValue(createResult({
      violations: [
        {
          rule: 'error rule',
          rule_type: 'layer_direction',
          severity: 'error',
          location: 'src/core/service.ts',
          message: 'error rule',
          dependency_chain: ['src/core/service.ts', 'src/cli/command.ts'],
          hard_fail: true,
          risk: {
            status: 'ok',
            level: 'medium',
            confidence: 'medium',
            freshness: 'fresh',
            score: 0.55,
            factors: ['shared hot file'],
            analyzed_at: '2026-04-15T00:00:00.000Z',
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
    }));

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(tempRoot!, 'mycodemap.design.md'),
      '--against',
      path.join(tempRoot!, 'src'),
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.history).toEqual(expect.objectContaining({ status: 'ok' }));
    expect(payload.violations[0]?.risk).toEqual(expect.objectContaining({ level: 'medium' }));
  });

  it('does not fail the process for warn-only violations', async () => {
    expect(tempRoot).toBeDefined();
    runContractCheckMock.mockResolvedValue(createResult({
      passed: true,
      violations: [
        {
          rule: 'warn only',
          rule_type: 'forbidden_imports',
          severity: 'warn',
          location: 'src/parser.ts',
          message: 'warn only',
          dependency_chain: ['src/parser.ts', 'fs'],
          hard_fail: false,
        },
      ],
      summary: {
        total_violations: 1,
        error_count: 0,
        warn_count: 1,
        scanned_file_count: 1,
        rule_count: 1,
      },
    }));

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(tempRoot!, 'mycodemap.design.md'),
      '--against',
      path.join(tempRoot!, 'src'),
    ]);

    expect(process.exitCode).toBeUndefined();
  });

  it('sets failing exitCode for error violations', async () => {
    expect(tempRoot).toBeDefined();
    runContractCheckMock.mockResolvedValue(createResult({
      passed: false,
      violations: [
        {
          rule: 'error rule',
          rule_type: 'layer_direction',
          severity: 'error',
          location: 'src/core/service.ts',
          message: 'error rule',
          dependency_chain: ['src/core/service.ts', 'src/cli/command.ts'],
          hard_fail: true,
        },
      ],
      summary: {
        total_violations: 1,
        error_count: 1,
        warn_count: 0,
        scanned_file_count: 1,
        rule_count: 1,
      },
    }));

    await checkCommand.parseAsync([
      'node',
      'check',
      '--contract',
      path.join(tempRoot!, 'mycodemap.design.md'),
      '--against',
      path.join(tempRoot!, 'src'),
    ]);

    expect(process.exitCode).toBe(1);
  });
});
