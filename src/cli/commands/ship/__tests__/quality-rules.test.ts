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

import { hardRules, warnOnlyRules } from '../rules/quality-rules.js';
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

  describe('hard rules', () => {
    it('delegates working tree checks to ci helper', async () => {
      runWorkingTreeCheckMock.mockReturnValue({ passed: true });

      const rule = hardRules.find((item) => item.name === 'workingTreeClean');
      const result = await rule?.check(baseContext);

      expect(runWorkingTreeCheckMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'passed' });
      expect(rule?.gateMode).toBe('hard');
    });

    it('delegates branch checks to ci helper', async () => {
      runBranchCheckMock.mockReturnValue({ passed: true, branch: 'main' });

      const rule = hardRules.find((item) => item.name === 'correctBranch');
      const result = await rule?.check(baseContext);

      expect(runBranchCheckMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'passed' });
      expect(rule?.gateMode).toBe('hard');
    });

    it('delegates release script checks to ci helper', async () => {
      runScriptsCheckMock.mockReturnValue({ passed: false, message: '发布前脚本检查失败: build' });

      const rule = hardRules.find((item) => item.name === 'allChecksPass');
      const result = await rule?.check(baseContext);

      expect(runScriptsCheckMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ status: 'failed', message: '发布前脚本检查失败: build' });
      expect(rule?.gateMode).toBe('hard');
    });
  });

  describe('warn-only rules', () => {
    it('marks testCoverageAbove80 as warn-only', () => {
      const rule = warnOnlyRules.find((item) => item.name === 'testCoverageAbove80');
      expect(rule?.gateMode).toBe('warn-only');
    });

    it('marks changelogUpdated as warn-only', () => {
      const rule = warnOnlyRules.find((item) => item.name === 'changelogUpdated');
      expect(rule?.gateMode).toBe('warn-only');
    });

    it('marks commitsFollowConvention as warn-only', () => {
      const rule = warnOnlyRules.find((item) => item.name === 'commitsFollowConvention');
      expect(rule?.gateMode).toBe('warn-only');
    });
  });

  describe('gate mode separation', () => {
    it('has exactly 4 hard rules', () => {
      expect(hardRules).toHaveLength(4);
    });

    it('has exactly 3 warn-only rules', () => {
      expect(warnOnlyRules).toHaveLength(3);
    });

    it('does not share rule names between hard and warn-only', () => {
      const hardNames = new Set(hardRules.map(r => r.name));
      const warnNames = new Set(warnOnlyRules.map(r => r.name));
      for (const name of hardNames) {
        expect(warnNames.has(name)).toBe(false);
      }
    });
  });
});
