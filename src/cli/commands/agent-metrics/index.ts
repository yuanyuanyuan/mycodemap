// [META] since:2026-05-10 | owner:cli-team | stable:false
// [WHY] Thin CLI wrapper for agent-metrics so measurement/report logic stays in the dedicated service

import { Command } from 'commander';
import { cwd } from 'node:process';
import {
  createProgressEmitter,
  formatError,
  renderOutput,
  resolveOutputMode,
} from '../../output/index.js';
import type { OutputMode } from '../../output/types.js';
import {
  AgentMetricsService,
  type AgentMetricsReportResult,
  type AgentMetricsTokenRunResult,
} from '../../../orchestrator/agent-metrics-service.js';
import {
  formatAgentMetricsReportHuman,
  formatAgentMetricsTokenRunHuman,
} from './human.js';

export interface AgentMetricsCommandOptions {
  json?: boolean;
  human?: boolean;
  maxTokensPerQuery?: string;
}

export interface AgentMetricsServiceLike {
  executeTokenRun(rootDir: string): Promise<AgentMetricsTokenRunResult>;
  runReportFlow(rootDir: string): Promise<AgentMetricsReportResult>;
  requireLatestReport(rootDir: string): Promise<AgentMetricsReportResult>;
}

function applyOutputOptions(command: Command): Command {
  return command
    .option('-j, --json', 'JSON 格式输出')
    .option('--human', '强制人类可读输出');
}

function applyThresholdOption(command: Command): Command {
  return command.option(
    '--max-tokens-per-query <number>',
    '报告路径允许的单次查询最大估算 token 数',
  );
}

function toMode(options: AgentMetricsCommandOptions): OutputMode {
  return resolveOutputMode({ json: options.json, human: options.human });
}

function toCommandOptions(command: Command): AgentMetricsCommandOptions {
  return command.opts() as AgentMetricsCommandOptions;
}

function toCommandOptionsWithGlobals(command: Command): AgentMetricsCommandOptions {
  return command.optsWithGlobals() as AgentMetricsCommandOptions;
}

function resolveMaxTokensPerQuery(options: AgentMetricsCommandOptions): number | undefined {
  if (options.maxTokensPerQuery === undefined) {
    return undefined;
  }

  const parsed = Number(options.maxTokensPerQuery);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const error = new Error(`Invalid --max-tokens-per-query value: ${options.maxTokensPerQuery}`) as Error & {
      code?: string;
      remediation?: string;
      nextCommand?: string;
      confidence?: number;
    };
    error.code = 'AGENT_METRICS_INVALID_THRESHOLD';
    error.remediation = 'Provide a finite non-negative number for --max-tokens-per-query.';
    error.nextCommand = 'codemap agent-metrics report --max-tokens-per-query 160';
    error.confidence = 0.95;
    throw error;
  }

  return parsed;
}

function renderReportResult(
  result: AgentMetricsReportResult,
  mode: OutputMode,
  maxTokensPerQuery?: number,
): void {
  const gatedResult = AgentMetricsService.withGate(result, maxTokensPerQuery);
  renderOutput(gatedResult, formatAgentMetricsReportHuman, mode);

  if (maxTokensPerQuery !== undefined && gatedResult.gate.verdict === 'fail') {
    process.exitCode = 1;
  }
}

async function handleTokenCommand(
  service: AgentMetricsServiceLike,
  options: AgentMetricsCommandOptions,
): Promise<void> {
  const mode = toMode(options);
  const progress = createProgressEmitter(mode, 'Measuring token costs...');

  try {
    progress.update(30, 'Running built-in agent-metrics samples...');
    const result = await service.executeTokenRun(cwd());
    progress.complete();
    renderOutput(result, formatAgentMetricsTokenRunHuman, mode);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap agent-metrics token') + '\n');
    process.exitCode = 1;
  }
}

async function handleReportCommand(
  service: AgentMetricsServiceLike,
  options: AgentMetricsCommandOptions,
): Promise<void> {
  const mode = toMode(options);
  const progress = createProgressEmitter(mode, 'Building agent-metrics report...');

  try {
    const maxTokensPerQuery = resolveMaxTokensPerQuery(options);
    progress.update(30, 'Loading latest persisted run...');
    const result = await service.requireLatestReport(cwd());
    progress.complete();
    renderReportResult(result, mode, maxTokensPerQuery);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap agent-metrics report') + '\n');
    process.exitCode = 1;
  }
}

async function handleRootCommand(
  service: AgentMetricsServiceLike,
  options: AgentMetricsCommandOptions,
): Promise<void> {
  const mode = toMode(options);
  const progress = createProgressEmitter(mode, 'Building agent-metrics report...');

  try {
    const maxTokensPerQuery = resolveMaxTokensPerQuery(options);
    progress.update(30, 'Loading latest run or executing the fixed sample set...');
    const result = await service.runReportFlow(cwd());
    progress.complete();
    renderReportResult(result, mode, maxTokensPerQuery);
  } catch (error) {
    progress.fail();
    process.stdout.write(formatError(error, mode, 'codemap agent-metrics') + '\n');
    process.exitCode = 1;
  }
}

export function createAgentMetricsCommand(
  service: AgentMetricsServiceLike = new AgentMetricsService(),
): Command {
  const command = applyThresholdOption(
    applyOutputOptions(
      new Command('agent-metrics')
        .description('分析 CodeMap 查询响应的估算 LLM token 成本')
    )
  );

  const tokenCommand = applyOutputOptions(
    command.command('token')
      .description('执行固定 built-in 查询样本并持久化 token-cost 明细')
  );
  tokenCommand.action(async (...args: unknown[]) => {
    const actionCommand = args.at(-1) as Command;
    await handleTokenCommand(service, toCommandOptions(actionCommand));
  });

  const reportCommand = applyThresholdOption(
    applyOutputOptions(
      command.command('report')
        .description('输出最新一次 token-cost run 的最小报告；若不存在则提示先运行测量')
    )
  );
  reportCommand.action(async (...args: unknown[]) => {
    const actionCommand = args.at(-1) as Command;
    await handleReportCommand(service, toCommandOptionsWithGlobals(actionCommand));
  });

  command.action(async (...args: unknown[]) => {
    const actionCommand = args.at(-1) as Command;
    await handleRootCommand(service, toCommandOptionsWithGlobals(actionCommand));
  });

  return command;
}

export const agentMetricsCommand = createAgentMetricsCommand();
