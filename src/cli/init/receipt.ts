// [META] since:2026-04-21 | owner:cli-team | stable:false
// [WHY] 统一 init 预览与执行后 receipt 的终端呈现，确保状态解释一致

import chalk from 'chalk';
import path from 'node:path';
import type { InitAsset, InitReceipt } from './reconciler.js';

function relativePath(rootDir: string, targetPath?: string): string | undefined {
  if (!targetPath) {
    return undefined;
  }

  const relative = path.relative(rootDir, targetPath);
  return relative.length > 0 ? relative : '.';
}

function statusIcon(status: InitAsset['status']): string {
  switch (status) {
    case 'already-synced':
    case 'installed':
    case 'migrated':
      return '✅';
    case 'manual-action-needed':
      return '⚠️';
    case 'conflict':
    case 'missing':
      return '❌';
    case 'skipped':
      return '⏭';
  }
}

function statusLabel(status: InitAsset['status']): string {
  switch (status) {
    case 'already-synced':
      return 'already-synced';
    case 'installed':
      return 'installed';
    case 'migrated':
      return 'migrated';
    case 'manual-action-needed':
      return 'manual action';
    case 'conflict':
      return 'conflict';
    case 'missing':
      return 'missing';
    case 'skipped':
      return 'skipped';
  }
}

function renderAsset(receipt: InitReceipt, asset: InitAsset): void {
  const targetPath = relativePath(receipt.rootDir, asset.path);
  const labelSuffix = targetPath ? chalk.gray(` (${targetPath})`) : '';
  console.log(`${statusIcon(asset.status)} ${asset.label} [${statusLabel(asset.status)}]${labelSuffix}`);

  for (const detail of asset.details) {
    console.log(chalk.gray(`   - ${detail}`));
  }

  if (asset.rollbackHint) {
    console.log(chalk.gray(`   - 回退：${asset.rollbackHint}`));
  }
}

function renderSection(receipt: InitReceipt, title: string, assets: InitAsset[]): void {
  if (assets.length === 0) {
    return;
  }

  console.log('');
  console.log(chalk.white(title));
  for (const asset of assets) {
    renderAsset(receipt, asset);
  }
}

function renderNotes(receipt: InitReceipt): void {
  if (receipt.notes.length === 0) {
    return;
  }

  console.log('');
  console.log(chalk.white('关系说明'));
  for (const note of receipt.notes) {
    console.log(chalk.gray(`- ${note}`));
  }
}

function renderNextSteps(receipt: InitReceipt): void {
  if (receipt.nextSteps.length === 0) {
    return;
  }

  console.log('');
  console.log(chalk.white('下一步'));
  for (const step of receipt.nextSteps) {
    console.log(chalk.cyan(`- ${step}`));
  }
}

function doneAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((asset) => ['already-synced', 'installed', 'migrated'].includes(asset.status));
}

function manualAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((asset) => asset.status === 'manual-action-needed');
}

function conflictAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((asset) => asset.status === 'conflict' || asset.status === 'missing');
}

function skippedAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((asset) => asset.status === 'skipped');
}

export function renderInitPreview(receipt: InitReceipt): void {
  console.log(chalk.blue('🔎 CodeMap init 预览（未写入）'));
  console.log(chalk.gray('当前 CLI 尚未内置交互选择器；请确认以下收敛计划后使用 `mycodemap init --yes` 应用默认动作。'));

  renderSection(receipt, '将完成或已同步', doneAssets(receipt));
  renderSection(receipt, '仍需人工处理', manualAssets(receipt));
  renderSection(receipt, '暂不处理', skippedAssets(receipt));
  renderNotes(receipt);
  renderNextSteps(receipt);
}

export function renderInitReceipt(receipt: InitReceipt): void {
  console.log(chalk.blue('🧭 CodeMap init 收敛结果'));
  console.log(chalk.gray(`状态台账: ${relativePath(receipt.rootDir, receipt.receiptPath)}`));

  renderSection(receipt, '已完成 / 已同步', doneAssets(receipt));
  renderSection(receipt, '仍需人工处理', manualAssets(receipt));
  renderSection(receipt, '冲突 / 阻塞', conflictAssets(receipt));
  renderSection(receipt, '已跳过', skippedAssets(receipt));
  renderNotes(receipt);
  renderNextSteps(receipt);
}
