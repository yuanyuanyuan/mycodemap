// [META] since:2026-04-21 | owner:cli-team | stable:false
// [WHY] 统一 init 预览与执行后 receipt 的终端呈现，确保状态解释一致

import { existsSync, readFileSync } from 'node:fs';
import chalk from 'chalk';
import path from 'node:path';
import type { InitAsset, InitReceipt } from './reconciler.js';

type TeamFileSyncStatus = 'already-synced' | 'manual-action-needed';

function detectTeamFileSync(rootDir: string, fileName: string): TeamFileSyncStatus {
  const filePath = path.join(rootDir, fileName);
  if (!existsSync(filePath)) return 'manual-action-needed';
  const content = readFileSync(filePath, 'utf8');
  return /\.mycodemap\//i.test(content) ? 'already-synced' : 'manual-action-needed';
}

interface TeamFileStatus {
  fileName: string;
  status: TeamFileSyncStatus;
  snippet?: string;
}

function getTeamFileStatuses(rootDir: string): TeamFileStatus[] {
  const files = ['CLAUDE.md', 'AGENTS.md'];
  return files.map((fileName) => {
    const status = detectTeamFileSync(rootDir, fileName);
    const snippet =
      status === 'manual-action-needed'
        ? `将 .mycodemap/assistants/${fileName === 'CLAUDE.md' ? 'claude-context' : 'agents-context'}.md 中的内容复制到项目根目录的 ${fileName}`
        : undefined;
    return { fileName, status, snippet };
  });
}

type AssetSection = 'main-agent' | 'subagent' | 'infrastructure';

function classifyAsset(asset: InitAsset): AssetSection {
  if (asset.origin === 'assistant-bootstrap') {
    if (/context/i.test(asset.label)) return 'main-agent';
    if (/hook|agent-example/i.test(asset.label)) return 'subagent';
  }
  if (asset.origin === 'rules') return 'main-agent';
  return 'infrastructure';
}

function mainAgentAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((a) => classifyAsset(a) === 'main-agent');
}

function subagentAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((a) => classifyAsset(a) === 'subagent');
}

function infrastructureAssets(receipt: InitReceipt): InitAsset[] {
  return receipt.assets.filter((a) => classifyAsset(a) === 'infrastructure');
}

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

  const mainAgent = mainAgentAssets(receipt);
  if (mainAgent.length > 0) {
    console.log('');
    console.log(chalk.white('Main Agent（主 Agent 上下文）'));
    for (const asset of mainAgent) {
      renderAsset(receipt, asset);
    }
    const teamStatuses = getTeamFileStatuses(receipt.rootDir);
    for (const ts of teamStatuses) {
      const icon = ts.status === 'already-synced' ? '✅' : '⚠️';
      const label = ts.status === 'already-synced' ? 'already-synced' : 'manual action';
      console.log(`${icon} ${ts.fileName} [${label}]`);
      if (ts.snippet) {
        console.log(chalk.gray(`   - ${ts.snippet}`));
      }
    }
  }

  const subagent = subagentAssets(receipt);
  if (subagent.length > 0) {
    console.log('');
    console.log(chalk.white('Subagent（子 Agent 配置）'));
    for (const asset of subagent) {
      renderAsset(receipt, asset);
    }
  }

  const infra = infrastructureAssets(receipt);
  if (infra.length > 0) {
    console.log('');
    console.log(chalk.white('基础设施'));
    for (const asset of infra) {
      renderAsset(receipt, asset);
    }
  }

  renderNotes(receipt);
  renderNextSteps(receipt);
}

export function renderInitReceipt(receipt: InitReceipt): void {
  console.log(chalk.blue('🧭 CodeMap init 收敛结果'));
  console.log(chalk.gray(`状态台账: ${relativePath(receipt.rootDir, receipt.receiptPath)}`));

  // Main Agent section
  const mainAgent = mainAgentAssets(receipt);
  if (mainAgent.length > 0) {
    console.log('');
    console.log(chalk.white('Main Agent（主 Agent 上下文）'));
    for (const asset of mainAgent) {
      renderAsset(receipt, asset);
    }
    const teamStatuses = getTeamFileStatuses(receipt.rootDir);
    for (const ts of teamStatuses) {
      const icon = ts.status === 'already-synced' ? '✅' : '⚠️';
      const label = ts.status === 'already-synced' ? 'already-synced' : 'manual action';
      console.log(`${icon} ${ts.fileName} [${label}]`);
      if (ts.snippet) {
        console.log(chalk.gray(`   - ${ts.snippet}`));
      }
    }
  }

  // Subagent section
  const subagent = subagentAssets(receipt);
  if (subagent.length > 0) {
    console.log('');
    console.log(chalk.white('Subagent（子 Agent 配置）'));
    for (const asset of subagent) {
      renderAsset(receipt, asset);
    }
  }

  // Infrastructure (collapsed)
  const infra = infrastructureAssets(receipt);
  if (infra.length > 0) {
    console.log('');
    console.log(chalk.white('基础设施'));
    for (const asset of infra) {
      renderAsset(receipt, asset);
    }
  }

  renderNotes(receipt);
  renderNextSteps(receipt);
}
