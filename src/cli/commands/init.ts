// [META] since:2026-03 | owner:cli-team | stable:true
// [WHY] Initialize CodeMap configuration for new projects

import chalk from 'chalk';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { detectProjectType, promptForProfileSelection } from '../init/detect.js';
import { loadProfile } from '../init/profile-loader.js';
import type { BootstrapProfile, ProjectType } from '../init/profile-loader.js';
import { applyInitPlan, createInitPlan, writeInitReceipt, type InitReceipt } from '../init/reconciler.js';
import { renderInitPreview, renderInitReceipt } from '../init/receipt.js';
import { CONFIG_FILE_CANONICAL, DEFAULT_OUTPUT_DIR_NEW } from '../paths.js';

export interface InitCommandOptions {
  yes?: boolean;
  interactive?: boolean;
  cwd?: string;
  profile?: string;
}

interface ResolvedProfile {
  profile: BootstrapProfile | null;
  profileName?: string;
}

function resolveInitMode(options: InitCommandOptions): 'preview' | 'apply' {
  if (options.yes) {
    return 'apply';
  }

  return 'preview';
}

function hasCanonicalConfig(rootDir: string): boolean {
  return existsSync(path.join(rootDir, DEFAULT_OUTPUT_DIR_NEW, CONFIG_FILE_CANONICAL));
}

const NO_MARKER_HINT =
  '未检测到项目类型标记。请使用 --profile <name> 指定 profile，或在包含 package.json / pyproject.toml / go.mod / Cargo.toml 的目录中运行。';

async function resolveProfile(
  rootDir: string,
  options: InitCommandOptions
): Promise<ResolvedProfile> {
  // Explicit --profile bypasses detection entirely (D-13).
  if (options.profile) {
    return {
      profile: loadProfile(options.profile),
      profileName: options.profile,
    };
  }

  // Existing canonical config skips detection by default (D-16).
  // The profile-plan handles the already-synced asset; we just return null here.
  if (hasCanonicalConfig(rootDir)) {
    return { profile: null };
  }

  const result = detectProjectType(rootDir);

  if (result.candidates.length === 0) {
    // D-04 + D-12: no silent fallback. Refuse with a clear message in every path.
    throw new Error(NO_MARKER_HINT);
  }

  if (result.candidates.length === 1 && result.recommended) {
    const profileName = result.recommended;
    return {
      profile: loadProfile(profileName),
      profileName,
    };
  }

  // Multiple markers — needs disambiguation.
  if (!process.stdout.isTTY) {
    const markers = result.candidates.map((c) => c.markerFile).join(', ');
    throw new Error(
      `检测到多个项目类型标记: ${markers}。非交互环境请使用 --profile <name> 指定。`
    );
  }

  console.log(chalk.yellow('检测到多个项目类型标记'));
  const selected: ProjectType = await promptForProfileSelection(result.candidates);
  return {
    profile: loadProfile(selected),
    profileName: selected,
  };
}

export async function executeInitCommand(options: InitCommandOptions): Promise<InitReceipt> {
  const rootDir = options.cwd ?? process.cwd();
  const mode = resolveInitMode(options);
  const { profile, profileName } = await resolveProfile(rootDir, options);
  const plan = createInitPlan(rootDir, mode, profile, profileName);

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
