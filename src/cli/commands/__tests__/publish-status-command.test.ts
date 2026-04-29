import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const snapshotPublishStatusMock = vi.fn();

vi.mock('../ship/monitor.js', () => ({
  snapshotPublishStatus: (...args: unknown[]) => snapshotPublishStatusMock(...args),
}));

const { createPublishStatusCommand } = await import('../publish-status.js');

describe('publish-status command', () => {
  let command = createPublishStatusCommand();
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    command = createPublishStatusCommand();
    snapshotPublishStatusMock.mockReset();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('renders human-readable output by default', async () => {
    snapshotPublishStatusMock.mockResolvedValue({
      success: true,
      status: 'success',
      runId: 42,
      workflowUrl: 'https://example.com/actions/runs/42',
      releaseUrl: 'https://example.com/releases/tag/v0.4.1',
      reason: 'publish workflow 已成功完成',
    });

    await command.parseAsync([
      'node',
      'publish-status',
      '--tag',
      'v0.4.1',
      '--sha',
      'target-sha',
    ]);

    expect(snapshotPublishStatusMock).toHaveBeenCalledWith({
      tagName: 'v0.4.1',
      headSha: 'target-sha',
      workflowFile: 'publish.yml',
    });

    const output = String(consoleLogSpy.mock.calls[0]?.[0]);
    expect(output).toContain('Publish 状态: success');
    expect(output).toContain('Run ID: 42');
    expect(output).toContain('Workflow: https://example.com/actions/runs/42');
  });

  it('outputs JSON with content in machine mode', async () => {
    snapshotPublishStatusMock.mockResolvedValue({
      success: false,
      status: 'pending',
      releaseUrl: 'https://example.com/releases/tag/v0.4.1',
      reason: '尚未观察到精确匹配的 publish workflow run',
      details: 'tag=v0.4.1, sha=target-sha',
    });

    await command.parseAsync([
      'node',
      'publish-status',
      '--tag',
      'v0.4.1',
      '--sha',
      'target-sha',
      '--json',
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.status).toBe('pending');
    expect(payload.content).toContain('Publish 状态: pending');
    expect(payload.releaseUrl).toBe('https://example.com/releases/tag/v0.4.1');
  });

  it('outputs structured JSON without content when requested', async () => {
    snapshotPublishStatusMock.mockResolvedValue({
      success: false,
      status: 'ambiguous',
      matchedRunCount: 2,
      reason: '发现多个同时匹配 tag 和 sha 的 publish workflow runs',
      details: 'run ids: 10, 11',
    });

    await command.parseAsync([
      'node',
      'publish-status',
      '--tag',
      'v0.4.1',
      '--sha',
      'target-sha',
      '--json',
      '--structured',
    ]);

    const payload = JSON.parse(String(consoleLogSpy.mock.calls[0]?.[0]));
    expect(payload.status).toBe('ambiguous');
    expect(payload.matchedRunCount).toBe(2);
    expect(payload.content).toBeUndefined();
  });

  it('rejects structured output without json mode', async () => {
    snapshotPublishStatusMock.mockResolvedValue({
      success: false,
      status: 'unavailable',
      reason: '无法读取 GitHub Actions publish workflow runs',
    });

    await expect(command.parseAsync([
      'node',
      'publish-status',
      '--tag',
      'v0.4.1',
      '--sha',
      'target-sha',
      '--structured',
    ])).rejects.toThrow('--structured 需要配合 --json 使用');
  });
});
