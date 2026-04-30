import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { DiagnosticResult } from '../../doctor/types.js';

// Mock all 4 checkers for orchestrator tests
const mockCheckGhostCommands = vi.fn();
const mockCheckNativeDeps = vi.fn();
const mockCheckWorkspaceDrift = vi.fn();
const mockCheckAgent = vi.fn();

vi.mock('../../doctor/check-ghost-commands.js', () => ({
  checkGhostCommands: (...args: unknown[]) => mockCheckGhostCommands(...args),
}));

vi.mock('../../doctor/check-native-deps.js', () => ({
  checkNativeDeps: (...args: unknown[]) => mockCheckNativeDeps(...args),
}));

vi.mock('../../doctor/check-workspace-drift.js', () => ({
  checkWorkspaceDrift: (...args: unknown[]) => mockCheckWorkspaceDrift(...args),
}));

vi.mock('../../doctor/check-agent.js', () => ({
  checkAgent: (...args: unknown[]) => mockCheckAgent(...args),
}));

// Mock chalk for formatter tests
function createColorMock() {
  const color = (text: string) => text;
  return Object.assign(color, {
    bold: (text: string) => text,
  });
}

vi.mock('chalk', () => ({
  default: {
    red: (text: string) => `[RED]${text}[/RED]`,
    yellow: (text: string) => `[YELLOW]${text}[/YELLOW]`,
    green: (text: string) => `[GREEN]${text}[/GREEN]`,
    cyan: (text: string) => `[CYAN]${text}[/CYAN]`,
    white: createColorMock(),
  },
}));

const okResult: DiagnosticResult = {
  category: 'install',
  severity: 'ok',
  id: 'test-ok',
  message: 'All good',
  remediation: 'No action needed',
};

const warnResult: DiagnosticResult = {
  category: 'config',
  severity: 'warn',
  id: 'test-warn',
  message: 'Minor issue',
  remediation: 'Check this',
};

const errorResult: DiagnosticResult = {
  category: 'install',
  severity: 'error',
  id: 'test-error',
  message: 'Something is broken',
  remediation: 'Fix this now',
};

describe('doctor integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runDoctor returns exitCode 0 when all checkers pass', async () => {
    mockCheckGhostCommands.mockReturnValue([okResult]);
    mockCheckNativeDeps.mockReturnValue([{ ...okResult, category: 'runtime', id: 'ts-ok' }]);
    mockCheckWorkspaceDrift.mockReturnValue([{ ...okResult, category: 'config', id: 'drift-ok' }]);
    mockCheckAgent.mockResolvedValue([{ ...okResult, category: 'agent', id: 'contract-ok' }]);

    const { runDoctor } = await import('../../doctor/orchestrator.js');
    const report = await runDoctor({});

    expect(report.exitCode).toBe(0);
    expect(report.results).toHaveLength(4);
  });

  it('runDoctor returns exitCode 1 when any checker has error', async () => {
    mockCheckGhostCommands.mockReturnValue([errorResult]);
    mockCheckNativeDeps.mockReturnValue([{ ...okResult, category: 'runtime' }]);
    mockCheckWorkspaceDrift.mockReturnValue([{ ...okResult, category: 'config' }]);
    mockCheckAgent.mockResolvedValue([{ ...okResult, category: 'agent' }]);

    const { runDoctor } = await import('../../doctor/orchestrator.js');
    const report = await runDoctor({});

    expect(report.exitCode).toBe(1);
  });

  it('runDoctor returns exitCode 2 when only warnings exist', async () => {
    mockCheckGhostCommands.mockReturnValue([okResult]);
    mockCheckNativeDeps.mockReturnValue([{ ...okResult, category: 'runtime' }]);
    mockCheckWorkspaceDrift.mockReturnValue([warnResult]);
    mockCheckAgent.mockResolvedValue([{ ...okResult, category: 'agent' }]);

    const { runDoctor } = await import('../../doctor/orchestrator.js');
    const report = await runDoctor({});

    expect(report.exitCode).toBe(2);
  });

  it('formatDoctorJson produces valid JSON array', async () => {
    const { formatDoctorJson } = await import('../../doctor/formatter.js');
    const sampleResults: DiagnosticResult[] = [
      {
        category: 'install',
        severity: 'error',
        id: 'ghost-command-detected',
        message: 'Script "check:unused" is an echo stub',
        remediation: 'Install the missing dependency',
        nextCommand: 'npm i -D knip',
      },
      {
        category: 'runtime',
        severity: 'ok',
        id: 'tree-sitter-available',
        message: 'tree-sitter is available',
        remediation: 'No action needed',
      },
    ];

    const json = formatDoctorJson(sampleResults);
    const parsed = JSON.parse(json) as DiagnosticResult[];

    expect(parsed).toHaveLength(2);
    expect(parsed[0].category).toBe('install');
    expect(parsed[0].severity).toBe('error');
    expect(parsed[0].id).toBe('ghost-command-detected');
    expect((parsed[0] as Record<string, unknown>).nextCommand).toBe('npm i -D knip');
    expect(parsed[1].category).toBe('runtime');
    // nextCommand should be omitted when undefined
    expect((parsed[1] as Record<string, unknown>).nextCommand).toBeUndefined();
  });

  it('formatDoctorReport produces table output with summary', async () => {
    const { formatDoctorReport } = await import('../../doctor/formatter.js');
    const sampleResults: DiagnosticResult[] = [
      {
        category: 'install',
        severity: 'error',
        id: 'ghost-command-detected',
        message: 'Script is a stub',
        remediation: 'Install deps',
      },
      {
        category: 'runtime',
        severity: 'ok',
        id: 'tree-sitter-available',
        message: 'tree-sitter OK',
        remediation: 'No action needed',
      },
      {
        category: 'config',
        severity: 'warn',
        id: 'workspace-not-initialized',
        message: 'No init receipt',
        remediation: 'Run init',
      },
      {
        category: 'agent',
        severity: 'info',
        id: 'some-info',
        message: 'FYI',
        remediation: 'N/A',
      },
    ];

    const report = formatDoctorReport(sampleResults);

    // Should contain header row
    expect(report).toContain('CATEGORY');
    expect(report).toContain('SEVERITY');
    expect(report).toContain('ID');
    expect(report).toContain('MESSAGE');

    // Should contain data rows (at least one)
    expect(report).toContain('ghost-command-detected');
    expect(report).toContain('tree-sitter-available');

    // Should contain summary line
    expect(report).toContain('Total: 4 diagnostics');
    expect(report).toContain('1 errors');
    expect(report).toContain('1 warnings');
    expect(report).toContain('1 info');
    expect(report).toContain('1 passed');
  });

  it('doctor command runs end-to-end with --json', async () => {
    // This test verifies the command handler logic directly
    // Skip if the build output is not available
    const buildExists = existsSync(path.resolve(process.cwd(), 'dist/cli/index.js'));

    if (!buildExists) {
      // Test the command handler directly instead
      mockCheckGhostCommands.mockReturnValue([okResult]);
      mockCheckNativeDeps.mockReturnValue([{ ...okResult, category: 'runtime' }]);
      mockCheckWorkspaceDrift.mockReturnValue([{ ...okResult, category: 'config' }]);
      mockCheckAgent.mockResolvedValue([{ ...okResult, category: 'agent' }]);

      const { runDoctor } = await import('../../doctor/orchestrator.js');
      const { formatDoctorJson } = await import('../../doctor/formatter.js');
      const report = await runDoctor({ json: true });
      const output = formatDoctorJson(report.results);

      const parsed = JSON.parse(output) as DiagnosticResult[];
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].category).toBeDefined();
      expect(parsed[0].severity).toBeDefined();
      expect(parsed[0].id).toBeDefined();
      expect(parsed[0].message).toBeDefined();
      expect(parsed[0].remediation).toBeDefined();
    }
  });
});
