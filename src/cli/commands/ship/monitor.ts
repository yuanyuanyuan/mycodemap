// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 5: 精确监控 tag push 触发的 GitHub Actions 发布状态

import chalk from 'chalk';
import { execSync } from 'child_process';

export type MonitorStatus = 'success' | 'failure' | 'timeout' | 'pending' | 'unavailable' | 'ambiguous';

export interface MonitorResult {
  success: boolean;
  status: MonitorStatus;
  workflowUrl?: string;
  releaseUrl?: string;
  runId?: number;
  failedJobs?: string[];
  error?: string;
  reason?: string;
  details?: string;
  duration?: number;
  matchedRunCount?: number;
}

export interface MonitorOptions {
  dryRun?: boolean;
  tagName?: string;
  headSha?: string;
  workflowFile?: string;
  startedAtMs?: number;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface GitHubActionsRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch?: string;
  head_sha?: string;
  jobs_url: string;
}

interface WorkflowRunsResponse {
  runs: GitHubActionsRun[];
  error?: string;
}

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS = 600_000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveRepoSlug(): string | null {
  try {
    return execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' })
      .trim()
      .replace(/.*github\.com[/:]/, '')
      .replace(/\.git$/, '');
  } catch {
    return null;
  }
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'codemap-ship'
  };

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

async function listWorkflowRuns(repo: string, workflowFile: string): Promise<GitHubActionsRun[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/runs?event=push&per_page=20`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { workflow_runs?: GitHubActionsRun[] };
    return data.workflow_runs ?? [];
  } catch {
    return [];
  }
}

async function fetchWorkflowRuns(repo: string, workflowFile: string): Promise<WorkflowRunsResponse> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/runs?event=push&per_page=20`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      return {
        runs: [],
        error: `GitHub Actions API 返回 ${response.status} ${response.statusText || ''}`.trim(),
      };
    }

    const data = await response.json() as { workflow_runs?: GitHubActionsRun[] };
    return {
      runs: data.workflow_runs ?? [],
    };
  } catch (error) {
    return {
      runs: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function findMatchingRuns(
  runs: GitHubActionsRun[],
  tagName: string,
  headSha: string,
  startedAtMs?: number
): GitHubActionsRun[] {
  const createdAfter = (startedAtMs ?? 0) - 120_000;

  const matchedRuns: GitHubActionsRun[] = [];

  for (const run of runs) {
    const createdAt = new Date(run.created_at).getTime();
    const branchMatched = !run.head_branch || run.head_branch === tagName;
    const shaMatched = !run.head_sha || run.head_sha === headSha;
    const timeMatched = createdAt >= createdAfter;

    if (branchMatched && shaMatched && timeMatched) {
      matchedRuns.push(run);
    }
  }

  return matchedRuns.sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

async function readFailedJobs(run: GitHubActionsRun): Promise<string[]> {
  try {
    const response = await fetch(run.jobs_url, { headers: getHeaders() });
    if (!response.ok) {
      return [];
    }

    const data = await response.json() as {
      jobs?: Array<{
        name: string;
        conclusion: string | null;
        steps?: Array<{ name: string; conclusion: string | null }>;
      }>;
    };

    return (data.jobs ?? [])
      .filter(job => job.conclusion === 'failure')
      .map(job => {
        const failedStep = (job.steps ?? []).find(step => step.conclusion === 'failure');
        return failedStep ? `${job.name} / ${failedStep.name}` : job.name;
      });
  } catch {
    return [];
  }
}

function buildReleaseUrl(repo: string, tagName?: string): string | undefined {
  if (!tagName) {
    return undefined;
  }

  return `https://github.com/${repo}/releases/tag/${tagName}`;
}

function toFailureDetails(failedJobs: string[], conclusion: string | null): string {
  if (failedJobs.length > 0) {
    return `失败任务: ${failedJobs.join(', ')}`;
  }

  if (conclusion) {
    return `workflow conclusion: ${conclusion}`;
  }

  return 'workflow 已失败，但 GitHub 未返回失败任务详情';
}

export async function snapshotPublishStatus(options: MonitorOptions = {}): Promise<MonitorResult> {
  if (!options.tagName || !options.headSha) {
    return {
      success: false,
      status: 'unavailable',
      reason: '缺少精确匹配 publish workflow 所需的 tagName/headSha',
      details: 'publish-status 必须同时提供 tag 和 sha',
      error: '缺少 tagName/headSha，无法精确匹配 workflow run',
    };
  }

  const repo = resolveRepoSlug();
  if (!repo) {
    return {
      success: false,
      status: 'unavailable',
      reason: '无法解析当前仓库对应的 GitHub repo slug',
      details: 'git remote origin 不可用，无法构造 publish workflow 查询',
      error: '无法解析 GitHub 仓库地址',
    };
  }

  const workflowFile = options.workflowFile ?? 'publish.yml';
  const releaseUrl = buildReleaseUrl(repo, options.tagName);
  const workflowRuns = await fetchWorkflowRuns(repo, workflowFile);

  if (workflowRuns.error) {
    return {
      success: false,
      status: 'unavailable',
      releaseUrl,
      reason: '无法读取 GitHub Actions publish workflow runs',
      details: workflowRuns.error,
      error: workflowRuns.error,
    };
  }

  const matchedRuns = findMatchingRuns(
    workflowRuns.runs,
    options.tagName,
    options.headSha,
    options.startedAtMs
  );

  if (matchedRuns.length > 1) {
    return {
      success: false,
      status: 'ambiguous',
      releaseUrl,
      matchedRunCount: matchedRuns.length,
      reason: '发现多个同时匹配 tag 和 sha 的 publish workflow runs',
      details: `run ids: ${matchedRuns.map(run => String(run.id)).join(', ')}`,
    };
  }

  const run = matchedRuns[0];
  if (!run) {
    return {
      success: false,
      status: 'pending',
      releaseUrl,
      reason: '尚未观察到精确匹配的 publish workflow run',
      details: `tag=${options.tagName}, sha=${options.headSha}`,
    };
  }

  if (run.conclusion === 'success') {
    return {
      success: true,
      status: 'success',
      runId: run.id,
      workflowUrl: run.html_url,
      releaseUrl,
      reason: 'publish workflow 已成功完成',
    };
  }

  if (['failure', 'cancelled', 'timed_out', 'action_required'].includes(run.conclusion ?? '')) {
    const failedJobs = await readFailedJobs(run);
    const details = toFailureDetails(failedJobs, run.conclusion);

    return {
      success: false,
      status: 'failure',
      runId: run.id,
      workflowUrl: run.html_url,
      releaseUrl,
      failedJobs,
      reason: 'publish workflow 执行失败',
      details,
      error: failedJobs.length > 0 ? failedJobs.join('; ') : details,
    };
  }

  if (run.status === 'completed') {
    return {
      success: false,
      status: 'unavailable',
      runId: run.id,
      workflowUrl: run.html_url,
      releaseUrl,
      reason: '找到了精确匹配的 workflow run，但无法确认最终 publish truth',
      details: `status=${run.status}, conclusion=${run.conclusion ?? 'null'}`,
      error: `无法确认 workflow 结论: ${run.conclusion ?? 'null'}`,
    };
  }

  return {
    success: false,
    status: 'pending',
    runId: run.id,
    workflowUrl: run.html_url,
    releaseUrl,
    reason: 'publish workflow 仍在执行中',
    details: `status=${run.status}, conclusion=${run.conclusion ?? 'null'}`,
  };
}

export async function monitorCI(options: MonitorOptions = {}): Promise<MonitorResult> {
  const dryRun = options.dryRun ?? false;
  if (dryRun) {
    console.log(chalk.gray('  [dry-run] 跳过 CI 监控'));
    return { success: true, status: 'success' };
  }

  if (!options.tagName || !options.headSha) {
    return {
      success: false,
      status: 'failure',
      reason: '缺少精确匹配 publish workflow 所需的 tagName/headSha',
      error: '缺少 tagName/headSha，无法精确匹配 workflow run'
    };
  }

  const repo = resolveRepoSlug();
  if (!repo) {
    return {
      success: false,
      status: 'failure',
      reason: '无法解析当前仓库对应的 GitHub repo slug',
      error: '无法解析 GitHub 仓库地址'
    };
  }

  const workflowFile = options.workflowFile ?? 'publish.yml';
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const releaseUrl = buildReleaseUrl(repo, options.tagName);

  console.log(chalk.gray('  等待 CI 完成...'));

  const startTime = Date.now();
  let lastWorkflowUrl: string | undefined;

  while (Date.now() - startTime < timeoutMs) {
    const snapshot = await snapshotPublishStatus({
      ...options,
      workflowFile,
    });

    if (snapshot.workflowUrl) {
      lastWorkflowUrl = snapshot.workflowUrl;
    }

    if (snapshot.status === 'success' || snapshot.status === 'failure') {
      return {
        ...snapshot,
        releaseUrl,
        duration: Date.now() - startTime,
      };
    }

    if (snapshot.status === 'ambiguous' || snapshot.status === 'unavailable') {
      return {
        ...snapshot,
        releaseUrl,
        duration: Date.now() - startTime,
      };
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const prefix = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;

    if (snapshot.runId) {
      console.log(chalk.gray(`  ${prefix} 构建中...`));
    } else {
      console.log(chalk.gray(`  ${prefix} 等待 workflow 创建...`));
    }

    await sleep(pollIntervalMs);
  }

  return {
    success: false,
    status: 'timeout',
    workflowUrl: lastWorkflowUrl,
    releaseUrl,
    reason: 'publish workflow 未在超时时间内进入可判定状态',
    error: `CI 监控超时 (${timeoutMs / 1000} 秒)`
  };
}

export function formatMonitorOutput(result: MonitorResult, verbose: boolean = false): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push(chalk.green('✅ CI 构建成功'));
    if (result.workflowUrl) {
      lines.push(chalk.gray(`  ${result.workflowUrl}`));
    }
    if (result.releaseUrl) {
      lines.push(chalk.gray(`  ${result.releaseUrl}`));
    }
  } else {
    switch (result.status) {
      case 'failure':
        lines.push(chalk.red('❌ CI 构建失败'));
        if (result.workflowUrl) {
          lines.push(chalk.gray(`  ${result.workflowUrl}`));
        }
        if (result.failedJobs && result.failedJobs.length > 0) {
          lines.push(chalk.gray(`  失败任务: ${result.failedJobs.join(', ')}`));
        } else if (result.error) {
          lines.push(chalk.gray(`  ${result.error}`));
        }
        break;
      case 'pending':
        lines.push(chalk.yellow('⏳ CI 仍在进行中'));
        if (result.workflowUrl) {
          lines.push(chalk.gray(`  ${result.workflowUrl}`));
        }
        if (result.reason) {
          lines.push(chalk.gray(`  ${result.reason}`));
        }
        break;
      case 'timeout':
        lines.push(chalk.yellow('⏱️ CI 监控超时'));
        lines.push(chalk.gray('  tag 已推送，但 CI 未在 10 分钟内完成'));
        if (result.workflowUrl) {
          lines.push(chalk.gray(`  ${result.workflowUrl}`));
        }
        break;
      case 'ambiguous':
        lines.push(chalk.yellow('⚠️ CI 状态存在歧义'));
        if (result.reason) {
          lines.push(chalk.gray(`  ${result.reason}`));
        }
        if (result.details) {
          lines.push(chalk.gray(`  ${result.details}`));
        }
        break;
      case 'unavailable':
        lines.push(chalk.yellow('⚠️ 无法确认 CI 状态'));
        if (result.workflowUrl) {
          lines.push(chalk.gray(`  ${result.workflowUrl}`));
        }
        if (result.reason) {
          lines.push(chalk.gray(`  ${result.reason}`));
        }
        if (result.details) {
          lines.push(chalk.gray(`  ${result.details}`));
        } else if (result.error) {
          lines.push(chalk.gray(`  ${result.error}`));
        }
        break;
      default:
        lines.push(chalk.yellow('⚠️ CI 状态未知'));
        if (result.reason) {
          lines.push(chalk.gray(`  ${result.reason}`));
        } else if (result.error) {
          lines.push(chalk.gray(`  ${result.error}`));
        }
    }
  }

  if (verbose && result.duration) {
    lines.push(chalk.gray(`  耗时: ${Math.round(result.duration / 1000)}s`));
  }

  return lines.join('\n');
}
