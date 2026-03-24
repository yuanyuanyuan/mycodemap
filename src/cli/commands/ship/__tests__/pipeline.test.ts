import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  analyzeCommitsMock,
  calculateVersionMock,
  runQualityChecksMock,
  shouldBlockReleaseMock,
  publishMock,
  monitorCIMock
} = vi.hoisted(() => ({
  analyzeCommitsMock: vi.fn(),
  calculateVersionMock: vi.fn(),
  runQualityChecksMock: vi.fn(),
  shouldBlockReleaseMock: vi.fn(),
  publishMock: vi.fn(),
  monitorCIMock: vi.fn()
}));

vi.mock('../analyzer.js', () => ({
  analyzeCommits: analyzeCommitsMock,
  formatAnalyzeOutput: () => 'analyze'
}));

vi.mock('../versioner.js', () => ({
  calculateVersion: calculateVersionMock,
  formatVersionOutput: () => 'version'
}));

vi.mock('../checker.js', () => ({
  runQualityChecks: runQualityChecksMock,
  formatCheckOutput: () => 'checks',
  shouldBlockRelease: shouldBlockReleaseMock
}));

vi.mock('../publisher.js', () => ({
  publish: publishMock,
  formatPublishOutput: () => 'publish',
  isLargeRelease: () => false,
  formatLargeReleaseWarning: () => []
}));

vi.mock('../monitor.js', () => ({
  monitorCI: monitorCIMock,
  formatMonitorOutput: () => 'monitor'
}));

import { runShipPipeline } from '../pipeline.js';

describe('ship pipeline', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    analyzeCommitsMock.mockResolvedValue({
      commits: [{ hash: 'abc1234', type: 'bugfix', message: 'ship: 修复 workflow 监控', isBreaking: false }],
      summary: { features: 0, bugfixes: 1, refactors: 0, docs: 0, other: 0 },
      versionType: 'patch',
      breakingChanges: false,
      changedFiles: ['src/cli/commands/ship/monitor.ts'],
      lastTag: 'v0.4.0',
      commitsSinceTag: 1
    });

    calculateVersionMock.mockResolvedValue({
      currentVersion: '0.4.0',
      suggestedVersion: '0.4.1',
      versionType: 'patch',
      reason: '包含 1 个 bug 修复',
      shouldRelease: true
    });

    runQualityChecksMock.mockResolvedValue({
      mustPassResults: new Map([
        ['workingTreeClean', { passed: true }],
        ['correctBranch', { passed: true }],
        ['allChecksPass', { passed: true }],
        ['noBreakingWithoutMajor', { passed: true }]
      ]),
      shouldPassResults: new Map(),
      allMustPassed: true,
      confidence: {
        score: 85,
        decision: 'auto',
        reasons: [],
        breakdown: { base: 50, bonuses: [], penalties: [] }
      }
    });

    shouldBlockReleaseMock.mockReturnValue(false);

    publishMock.mockResolvedValue({
      success: true,
      version: '0.4.1',
      tagName: 'v0.4.1',
      versionCommitted: true,
      tagCreated: true,
      pushed: true,
      headSha: 'target-sha',
      pushedAtMs: Date.now()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fail the whole pipeline when GitHub Actions publish fails', async () => {
    monitorCIMock.mockResolvedValue({
      success: false,
      status: 'failure',
      workflowUrl: 'https://example.com/run/1'
    });

    const result = await runShipPipeline({
      dryRun: false,
      verbose: false,
      autoConfirm: true
    });

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
    expect(result.blockReason).toBe('GitHub Actions 发布失败');
  });
});
