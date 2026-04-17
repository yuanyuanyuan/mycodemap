/**
 * [META] since:2026-04-15 | owner:cli-team | stable:false
 * [WHY] Expose symbol-first git history as a public machine-first CLI command backed by the canonical history risk service
 */

import { Command } from 'commander';
import { cwd } from 'node:process';
import type { SymbolHistoryResult } from '../../interface/types/history-risk.js';
import { GitHistoryService } from '../../orchestrator/history-risk-service.js';
import { createConfiguredStorage } from '../storage-runtime.js';

export interface HistoryCommandOptions {
  symbol: string;
  human?: boolean;
}

export interface HistoryCommandResult {
  query: string;
  status: SymbolHistoryResult['diagnostics']['status'];
  symbol: SymbolHistoryResult['symbol'];
  candidates: SymbolHistoryResult['candidates'];
  files: string[];
  timeline: SymbolHistoryResult['timeline'];
  risk: SymbolHistoryResult['risk'];
  warnings: string[];
  diagnostics: SymbolHistoryResult['diagnostics'];
}

function toHistoryCommandResult(result: SymbolHistoryResult): HistoryCommandResult {
  return {
    query: result.query,
    status: result.diagnostics.status,
    symbol: result.symbol,
    candidates: result.candidates,
    files: result.files,
    timeline: result.timeline,
    risk: result.risk,
    warnings: [...result.diagnostics.reasons],
    diagnostics: result.diagnostics,
  };
}

export function renderHistoryResult(result: HistoryCommandResult): string {
  const lines: string[] = [
    `History status: ${result.status}`,
    `Query: ${result.query}`,
    `Confidence: ${result.diagnostics.confidence}`,
    `Freshness: ${result.diagnostics.freshness}`,
  ];

  if (result.symbol) {
    lines.push(
      `Symbol: ${result.symbol.name} (${result.symbol.kind}) @ ${result.symbol.file}:${result.symbol.line}`,
    );
  }

  if (result.candidates.length > 1) {
    lines.push('Candidates:');
    for (const candidate of result.candidates) {
      lines.push(`- ${candidate.symbolId} ${candidate.name} ${candidate.kind} ${candidate.file}:${candidate.line}`);
    }
  }

  lines.push(`Risk: ${result.risk.level}`);
  if (result.risk.riskFactors.length > 0) {
    lines.push(`Risk Factors: ${result.risk.riskFactors.join(', ')}`);
  }

  lines.push('Timeline:');
  if (result.timeline.length === 0) {
    lines.push('- none');
  } else {
    for (const entry of result.timeline) {
      lines.push(`- ${entry.date} [${entry.tagType}] ${entry.author}: ${entry.subject}`);
    }
  }

  lines.push('Warnings:');
  if (result.warnings.length === 0) {
    lines.push('- none');
  } else {
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join('\n');
}

export async function executeHistoryCommand(
  options: HistoryCommandOptions,
): Promise<HistoryCommandResult> {
  const { storage } = await createConfiguredStorage(cwd());

  try {
    const service = new GitHistoryService({
      projectRoot: cwd(),
      storage,
    });
    const result = await service.analyzeSymbol(options.symbol, { persist: true });
    return toHistoryCommandResult(result);
  } finally {
    await storage.close();
  }
}

async function handleHistoryCommand(options: HistoryCommandOptions): Promise<void> {
  const result = await executeHistoryCommand(options);
  if (options.human) {
    console.log(renderHistoryResult(result));
    return;
  }

  console.log(JSON.stringify(result, null, 2));
}

export function createHistoryCommand(): Command {
  return new Command('history')
    .description('查询符号级 git history 与 risk 摘要（默认 JSON）')
    .requiredOption('--symbol <name>', '目标符号名或 symbol id')
    .option('--human', '使用人类可读输出（默认 JSON）')
    .action(handleHistoryCommand);
}

export const historyCommand = createHistoryCommand();
