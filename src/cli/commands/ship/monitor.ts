// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 5: 精确监控 tag push 触发的 GitHub Actions 发布状态

import chalk from 'chalk';
import { execSync } from 'child_process';

export interface MonitorResult {
  success: boolean;
  status: 'success' | 'failure' | 'timeout' | 'pending';
  workflowUrl?: string;
  releaseUrl?: string;
  runId?: number;
  failedJobs?: string[];
  error?: string;
  duration?: number;
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
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/runs?event=push&per_page=20`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json() as { workflow_runs?: GitHubActionsRun[] };
  return data.workflow_runs ?? [];
}

function findMatchingRun(
  runs: GitHubActionsRun[],
  tagName: string,
  headSha: string,
  startedAtMs?: number
): GitHubActionsRun | null {
  const createdAfter = (startedAtMs ?? 0) - 120_000;

  for (const run of runs) {
    const createdAt = new Date(run.created_at).getTime();
    const branchMatched = !run.head_branch || run.head_branch === tagName;
    const shaMatched = !run.head_sha || run.head_sha === headSha;
    const timeMatched = createdAt >= createdAfter;

    if (branchMatched && shaMatched && timeMatched) {
      return run;
    }
  }

  return null;
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
      error: '缺少 tagName/headSha，无法精确匹配 workflow run'
    };
  }

  const repo = resolveRepoSlug();
  if (!repo) {
    return {
      success: false,
      status: 'failure',
      error: '无法解析 GitHub 仓库地址'
    };
  }

  const workflowFile = options.workflowFile ?? 'publish.yml';
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const releaseUrl = `https://github.com/${repo}/releases/tag/${options.tagName}`;

  console.log(chalk.gray('  等待 CI 完成...'));

  const startTime = Date.now();
  let lastSeenRun: GitHubActionsRun | null = null;

  while (Date.now() - startTime < timeoutMs) {
    const runs = await listWorkflowRuns(repo, workflowFile);
    const run = findMatchingRun(runs, options.tagName, options.headSha, options.startedAtMs);

    if (run) {
      lastSeenRun = run;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      if (run.conclusion === 'success') {
        return {
          success: true,
          status: 'success',
          runId: run.id,
          workflowUrl: run.html_url,
          releaseUrl,
          duration: Date.now() - startTime
        };
      }

      if (['failure', 'cancelled', 'timed_out', 'action_required'].includes(run.conclusion ?? '')) {
        const failedJobs = await readFailedJobs(run);
        return {
          success: false,
          status: 'failure',
          runId: run.id,
          workflowUrl: run.html_url,
          releaseUrl,
          failedJobs,
          error: failedJobs.length > 0 ? failedJobs.join('; ') : undefined,
          duration: Date.now() - startTime
        };
      }

      console.log(chalk.gray(`  [${minutes}:${seconds.toString().padStart(2, '0')}] 构建中...`));
    } else {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      console.log(chalk.gray(`  [${minutes}:${seconds.toString().padStart(2, '0')}] 等待 workflow 创建...`));
    }

    await sleep(pollIntervalMs);
  }

  return {
    success: false,
    status: 'timeout',
    workflowUrl: lastSeenRun?.html_url,
    releaseUrl,
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
      case 'timeout':
        lines.push(chalk.yellow('⏱️ CI 监控超时'));
        lines.push(chalk.gray('  tag 已推送，但 CI 未在 10 分钟内完成'));
        if (result.workflowUrl) {
          lines.push(chalk.gray(`  ${result.workflowUrl}`));
        }
        break;
      default:
        lines.push(chalk.yellow('⚠️ CI 状态未知'));
        if (result.error) {
          lines.push(chalk.gray(`  ${result.error}`));
        }
    }
  }

  if (verbose && result.duration) {
    lines.push(chalk.gray(`  耗时: ${Math.round(result.duration / 1000)}s`));
  }

  return lines.join('\n');
}
