/**
 * [META] since:2026-04-23 | owner:cli-team | stable:false
 * [WHY] Expose read-only publish workflow snapshot truth as a standalone follow-up command for humans and agents
 */

import chalk from 'chalk';
import { Command } from 'commander';
import {
  snapshotPublishStatus,
  type MonitorResult,
  type MonitorStatus,
} from './ship/monitor.js';

export interface PublishStatusCommandOptions {
  tag: string;
  sha: string;
  workflowFile?: string;
  json?: boolean;
  structured?: boolean;
}

export interface PublishStatusCommandResult {
  success: boolean;
  status: Exclude<MonitorStatus, 'timeout'>;
  workflowUrl?: string;
  releaseUrl?: string;
  runId?: number;
  failedJobs: string[];
  reason?: string;
  details?: string;
  matchedRunCount?: number;
  content?: string;
}

function toCommandResult(result: MonitorResult, structured: boolean): PublishStatusCommandResult {
  const base: PublishStatusCommandResult = {
    success: result.success,
    status: result.status === 'timeout' ? 'unavailable' : result.status,
    workflowUrl: result.workflowUrl,
    releaseUrl: result.releaseUrl,
    runId: result.runId,
    failedJobs: result.failedJobs ?? [],
    reason: result.reason,
    details: result.details ?? result.error,
    matchedRunCount: result.matchedRunCount,
  };

  if (structured) {
    return base;
  }

  return {
    ...base,
    content: renderPublishStatusResult(base),
  };
}

function formatStatusLabel(status: PublishStatusCommandResult['status']): string {
  switch (status) {
    case 'success':
      return chalk.green('success');
    case 'failure':
      return chalk.red('failure');
    case 'pending':
      return chalk.yellow('pending');
    case 'ambiguous':
      return chalk.yellow('ambiguous');
    case 'unavailable':
      return chalk.yellow('unavailable');
    default:
      return chalk.yellow(status);
  }
}

export function renderPublishStatusResult(result: PublishStatusCommandResult): string {
  const lines: string[] = [
    `Publish 状态: ${formatStatusLabel(result.status)}`,
  ];

  if (result.runId) {
    lines.push(`Run ID: ${result.runId}`);
  }

  if (result.reason) {
    lines.push(`Reason: ${result.reason}`);
  }

  if (result.details) {
    lines.push(`Details: ${result.details}`);
  }

  if (result.failedJobs.length > 0) {
    lines.push(`Failed Jobs: ${result.failedJobs.join(', ')}`);
  }

  if (result.matchedRunCount && result.matchedRunCount > 1) {
    lines.push(`Matched Runs: ${result.matchedRunCount}`);
  }

  if (result.workflowUrl) {
    lines.push(`Workflow: ${result.workflowUrl}`);
  }

  if (result.releaseUrl) {
    lines.push(`Release: ${result.releaseUrl}`);
  }

  return lines.join('\n');
}

export async function executePublishStatusCommand(
  options: PublishStatusCommandOptions,
): Promise<PublishStatusCommandResult> {
  const snapshot = await snapshotPublishStatus({
    tagName: options.tag,
    headSha: options.sha,
    workflowFile: options.workflowFile,
  });

  return toCommandResult(snapshot, options.structured === true);
}

export async function handlePublishStatusCommand(
  options: PublishStatusCommandOptions,
): Promise<void> {
  if (options.structured && !options.json) {
    throw new Error('--structured 需要配合 --json 使用');
  }

  const result = await executePublishStatusCommand(options);

  if (!options.json) {
    console.log(renderPublishStatusResult(result));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

export function createPublishStatusCommand(): Command {
  return new Command('publish-status')
    .description('查询 publish workflow 的只读 snapshot 状态（默认人类可读输出）')
    .requiredOption('--tag <tag>', '发布 tag（精确匹配）')
    .requiredOption('--sha <sha>', '发布 commit SHA（精确匹配）')
    .option('--workflow-file <file>', 'GitHub Actions workflow 文件名', 'publish.yml')
    .option('--json', 'JSON 格式输出')
    .option('--structured', '输出完全结构化的 JSON（不包含自然语言字符串，需要配合 --json 使用）')
    .action(handlePublishStatusCommand);
}

export const publishStatusCommand = createPublishStatusCommand();
