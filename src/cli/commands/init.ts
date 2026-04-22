// [META] since:2026-03 | owner:cli-team | stable:true
// [WHY] Initialize CodeMap configuration for new projects

import chalk from 'chalk';
import { applyInitPlan, createInitPlan, writeInitReceipt, type InitReceipt } from '../init/reconciler.js';
import { renderInitPreview, renderInitReceipt } from '../init/receipt.js';

export interface InitCommandOptions {
  yes?: boolean;
  interactive?: boolean;
  cwd?: string;
}

function resolveInitMode(options: InitCommandOptions): 'preview' | 'apply' {
  if (options.yes) {
    return 'apply';
  }

  return 'preview';
}

export async function executeInitCommand(options: InitCommandOptions): Promise<InitReceipt> {
  const rootDir = options.cwd ?? process.cwd();
  const mode = resolveInitMode(options);
  const plan = createInitPlan(rootDir, mode);

  console.log(chalk.blue('🚀 初始化 CodeMap...'));

  if (mode === 'preview') {
    renderInitPreview(plan.receipt);
    return plan.receipt;
  }

  const receipt = await applyInitPlan(plan);
  await writeInitReceipt(receipt);
  renderInitReceipt(receipt);
  return receipt;
}

export async function initCommand(options: InitCommandOptions): Promise<void> {
  await executeInitCommand(options);
}
