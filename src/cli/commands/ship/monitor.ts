// [META] since:2026-03 | owner:cli-team | stable:false
// [WHY] Step 5: 监控 CI 状态，轮询 GitHub Actions

import chalk from 'chalk';
import { execSync } from 'child_process';

export interface MonitorResult {
  success: boolean;
  status: 'success' | 'failure' | 'timeout' | 'pending';
  workflowUrl?: string;
  error?: string;
  duration?: number;
}

export interface GitHubActionsRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

const POLL_INTERVAL_MS = 10_000; // 10 秒
const TIMEOUT_MS = 600_000; // 10 分钟

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getLatestWorkflowRun(): Promise<GitHubActionsRun | null> {
  try {
    const repo = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf-8' })
      .trim()
      .replace(/.*github\.com[/:]/, '')
      .replace(/\.git$/, '');

    const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'codemap-ship'
    };

    // 使用 GITHUB_TOKEN 认证（如果有的话）
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?branch=${branch}&per_page=1`,
      { headers }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { workflow_runs: GitHubActionsRun[] };
    return data.workflow_runs[0] || null;

  } catch {
    return null;
  }
}

export async function monitorCI(dryRun: boolean = false): Promise<MonitorResult> {
  if (dryRun) {
    console.log(chalk.gray('  [dry-run] 跳过 CI 监控'));
    return { success: true, status: 'success' };
  }

  console.log(chalk.gray('  等待 CI 完成...'));

  const startTime = Date.now();
  let run: GitHubActionsRun | null;

  while (Date.now() - startTime < TIMEOUT_MS) {
    run = await getLatestWorkflowRun();

    if (run) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;

      if (run.conclusion === 'success') {
        return {
          success: true,
          status: 'success',
          workflowUrl: run.html_url,
          duration: Date.now() - startTime
        };
      }

      if (run.conclusion === 'failure') {
        return {
          success: false,
          status: 'failure',
          workflowUrl: run.html_url,
          duration: Date.now() - startTime
        };
      }

      console.log(chalk.gray(`  [${minutes}:${seconds.toString().padStart(2, '0')}] 构建中...`));
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // 超时
  return {
    success: false,
    status: 'timeout',
    error: `CI 监控超时 (${TIMEOUT_MS / 1000} 秒)`
  };
}

export function formatMonitorOutput(result: MonitorResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push(chalk.green('✅ CI 构建成功'));
    if (result.workflowUrl) {
      lines.push(chalk.gray(`  ${result.workflowUrl}`));
    }
  } else {
    switch (result.status) {
      case 'failure':
        lines.push(chalk.red('❌ CI 构建失败'));
        if (result.workflowUrl) {
          lines.push(chalk.gray(`  ${result.workflowUrl}`));
        }
        break;
      case 'timeout':
        lines.push(chalk.yellow('⏱️ CI 监控超时'));
        lines.push(chalk.gray('  发布已成功，但 CI 未在 10 分钟内完成'));
        lines.push(chalk.gray('  请手动检查 CI 状态'));
        break;
      default:
        lines.push(chalk.yellow('⚠️ CI 状态未知'));
    }
  }

  return lines.join('\n');
}
