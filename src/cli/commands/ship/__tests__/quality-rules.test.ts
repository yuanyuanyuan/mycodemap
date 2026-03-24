import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  runWorkingTreeCheckMock,
  runBranchCheckMock,
  runScriptsCheckMock,
} = vi.hoisted(() => ({
  runWorkingTreeCheckMock: vi.fn(),
  runBranchCheckMock: vi.fn(),
  runScriptsCheckMock: vi.fn(),
}));

vi.mock('../../ci.js', () => ({
  runWorkingTreeCheck: runWorkingTreeCheckMock,
  runBranchCheck: runBranchCheckMock,
  runScriptsCheck: runScriptsCheckMock,
}));

import { mustPassRules } from '../rules/quality-rules.js';
import type { CheckContext } from '../rules/quality-rules.js';

const baseContext: CheckContext = {
  commits: [],
  changedFiles: [],
  currentVersion: '0.4.0',
  versionType: 'patch',
};

describe('ship quality rules', () => {
  afterEach(() => {
    runWorkingTreeCheckMock.mockReset();
    runBranchCheckMock.mockReset();
    runScriptsCheckMock.mockReset();
  });

  it('delegates working tree checks to ci helper', async () => {
    runWorkingTreeCheckMock.mockReturnValue({ passed: true });

    const rule = mustPassRules.find((item) => item.name === 'workingTreeClean');
    const result = await rule?.check(baseContext);

    expect(runWorkingTreeCheckMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ passed: true });
  });

  it('delegates branch checks to ci helper', async () => {
    runBranchCheckMock.mockReturnValue({ passed: true, branch: 'main' });

    const rule = mustPassRules.find((item) => item.name === 'correctBranch');
    const result = await rule?.check(baseContext);

    expect(runBranchCheckMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ passed: true, branch: 'main' });
  });

  it('delegates release script checks to ci helper', async () => {
    runScriptsCheckMock.mockReturnValue({ passed: false, message: '发布前脚本检查失败: build' });

    const rule = mustPassRules.find((item) => item.name === 'allChecksPass');
    const result = await rule?.check(baseContext);

    expect(runScriptsCheckMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ passed: false, message: '发布前脚本检查失败: build' });
  });
});
