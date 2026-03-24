import { afterEach, describe, expect, it, vi } from 'vitest';

const execFileSyncMock = vi.fn();
const execSyncMock = vi.fn();

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFileSync: execFileSyncMock,
    execSync: execSyncMock,
  };
});

const ciModule = await import('../ci.js');

describe('ci gate checks', () => {
  afterEach(() => {
    execFileSyncMock.mockReset();
    execSyncMock.mockReset();
    delete process.env.SHIP_IN_CI;
  });

  it('passes when working tree is clean', () => {
    execSyncMock.mockReturnValue('');

    expect(ciModule.runWorkingTreeCheck()).toEqual({ passed: true });
    expect(execSyncMock).toHaveBeenCalledWith(
      'git status --porcelain',
      expect.objectContaining({ encoding: 'utf-8' })
    );
  });

  it('fails when working tree has uncommitted changes', () => {
    execSyncMock.mockReturnValue(' M README.md\n');

    expect(ciModule.runWorkingTreeCheck()).toMatchObject({
      passed: false,
      message: '工作区有未提交的变更',
      details: 'M README.md',
    });
  });

  it('passes when current branch is allowed', () => {
    execSyncMock.mockReturnValue('main\n');

    expect(ciModule.runBranchCheck()).toMatchObject({
      passed: true,
      branch: 'main',
    });
  });

  it('fails when current branch is not allowed', () => {
    execSyncMock.mockReturnValue('feature/refactor\n');

    expect(ciModule.runBranchCheck()).toMatchObject({
      passed: false,
      branch: 'feature/refactor',
      message: expect.stringContaining('feature/refactor'),
      details: expect.stringContaining('main, master'),
    });
  });

  it('supports wildcard branch patterns for release branches', () => {
    execSyncMock.mockReturnValue('release/1.2.0\n');

    expect(
      ciModule.runBranchCheck({ allowedBranches: ['main', 'release/*'] })
    ).toMatchObject({
      passed: true,
      branch: 'release/1.2.0',
    });
  });

  it('falls back to CI environment branch names when git checkout is detached', () => {
    execSyncMock.mockReturnValue('\n');
    process.env.GITHUB_HEAD_REF = 'feature/from-pr';

    expect(
      ciModule.runBranchCheck({ allowedBranches: ['feature/*'] })
    ).toMatchObject({
      passed: true,
      branch: 'feature/from-pr',
    });
  });

  it('skips release scripts when SHIP_IN_CI is set', () => {
    process.env.SHIP_IN_CI = '1';

    expect(ciModule.runScriptsCheck()).toMatchObject({
      passed: true,
      details: 'SHIP_IN_CI=1，跳过本地重复检查',
    });
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('reports failed release scripts', () => {
    execSyncMock.mockImplementation((command: string) => {
      if (command === 'npm run build') {
        const error = new Error('build failed') as Error & { stderr?: string };
        error.stderr = 'build failed';
        throw error;
      }

      return '';
    });

    const result = ciModule.runScriptsCheck();

    expect(result.passed).toBe(false);
    expect(result.message).toContain('build');
    expect(result.details).toContain('[build]');
    expect(execSyncMock).toHaveBeenCalledTimes(ciModule.DEFAULT_RELEASE_SCRIPT_COMMANDS.length);
  });
});
