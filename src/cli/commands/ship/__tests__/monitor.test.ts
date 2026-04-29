import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn()
}));

vi.mock('child_process', () => ({
  execSync: execSyncMock
}));

import { monitorCI, snapshotPublishStatus } from '../monitor.js';

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

  it('should return ambiguous when multiple exact-match workflow runs exist', async () => {
    const createdAt = new Date().toISOString();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        workflow_runs: [
          {
            id: 10,
            name: 'Publish to NPM',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://example.com/run/10',
            created_at: createdAt,
            updated_at: createdAt,
            head_branch: 'v0.4.1',
            head_sha: 'target-sha',
            jobs_url: 'https://example.com/jobs/10'
          },
          {
            id: 11,
            name: 'Publish to NPM',
            status: 'in_progress',
            conclusion: null,
            html_url: 'https://example.com/run/11',
            created_at: createdAt,
            updated_at: createdAt,
            head_branch: 'v0.4.1',
            head_sha: 'target-sha',
            jobs_url: 'https://example.com/jobs/11'
          }
        ]
      }), { status: 200 })
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await snapshotPublishStatus({
      tagName: 'v0.4.1',
      headSha: 'target-sha',
      workflowFile: 'publish.yml'
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('ambiguous');
    expect(result.matchedRunCount).toBe(2);
    expect(result.details).toContain('10');
    expect(result.details).toContain('11');
  });

  it('should return unavailable when workflow runs cannot be fetched', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('forbidden', { status: 403, statusText: 'Forbidden' })
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await snapshotPublishStatus({
      tagName: 'v0.4.1',
      headSha: 'target-sha',
      workflowFile: 'publish.yml'
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('unavailable');
    expect(result.details).toContain('403');
  });

  it('should return pending when no exact-match workflow run exists yet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        workflow_runs: [
          {
            id: 12,
            name: 'Publish to NPM',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://example.com/run/12',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            head_branch: 'main',
            head_sha: 'other-sha',
            jobs_url: 'https://example.com/jobs/12'
          }
        ]
      }), { status: 200 })
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await snapshotPublishStatus({
      tagName: 'v0.4.1',
      headSha: 'target-sha',
      workflowFile: 'publish.yml'
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('pending');
    expect(result.reason).toContain('尚未观察到');
  });
});
