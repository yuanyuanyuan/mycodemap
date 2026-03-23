import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn()
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock
}));

import { monitorCI } from '../monitor.js';

describe('ship monitor', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
    execSyncMock.mockReturnValue('git@github.com:yuanyuanyuan/mycodemap.git\n');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should match workflow run by tag and sha instead of current branch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        workflow_runs: [
          {
            id: 1,
            name: 'Publish to NPM',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://example.com/main',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            head_branch: 'main',
            head_sha: 'other-sha',
            jobs_url: 'https://example.com/jobs/1'
          },
          {
            id: 2,
            name: 'Publish to NPM',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://example.com/tag',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            head_branch: 'v0.4.1',
            head_sha: 'target-sha',
            jobs_url: 'https://example.com/jobs/2'
          }
        ]
      }), { status: 200 })
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await monitorCI({
      tagName: 'v0.4.1',
      headSha: 'target-sha',
      workflowFile: 'publish.yml',
      pollIntervalMs: 0,
      timeoutMs: 50,
      startedAtMs: Date.now()
    });

    expect(result.success).toBe(true);
    expect(result.runId).toBe(2);
    expect(result.workflowUrl).toBe('https://example.com/tag');
  });

  it('should surface failed jobs from the matching workflow run', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          workflow_runs: [
            {
              id: 3,
              name: 'Publish to NPM',
              status: 'completed',
              conclusion: 'failure',
              html_url: 'https://example.com/failure',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              head_branch: 'v0.4.1',
              head_sha: 'target-sha',
              jobs_url: 'https://example.com/jobs/3'
            }
          ]
        }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          jobs: [
            {
              name: 'Build and Publish',
              conclusion: 'failure',
              steps: [
                { name: 'Install dependencies', conclusion: 'success' },
                { name: 'Run tests', conclusion: 'failure' }
              ]
            }
          ]
        }), { status: 200 })
      );

    vi.stubGlobal('fetch', fetchMock);

    const result = await monitorCI({
      tagName: 'v0.4.1',
      headSha: 'target-sha',
      workflowFile: 'publish.yml',
      pollIntervalMs: 0,
      timeoutMs: 50,
      startedAtMs: Date.now()
    });

    expect(result.success).toBe(false);
    expect(result.failedJobs).toEqual(['Build and Publish / Run tests']);
    expect(result.error).toContain('Run tests');
  });
});
