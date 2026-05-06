// [META] since:2026-05-01 | owner:cli-team | stable:false
// [WHY] 把 bootstrap profile 应用建模为 InitAsset，复用 reconciler 的 preview/apply 流程

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDefaultCodemapConfigFile } from '../config-loader.js';
import type { BootstrapProfile } from './profile-loader.js';
import type { InitAsset } from './reconciler.js';

interface FileWriteAction {
  targetPath: string;
  content: string;
}

/**
 * Minimal scan shape consumed by createProfilePlan.
 *
 * Defined locally (not imported from reconciler.ts) to avoid a circular
 * type import; reconciler.ts's full InitScan structurally satisfies this.
 */
export interface ProfilePlanScan {
  hasCanonicalConfig: boolean;
  paths: {
    canonicalConfigPath: string;
  };
}

export interface ProfilePlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
  /** Serialized merged config for preview rendering. */
  mergedConfigText?: string;
  /** Profile name for display, when one was selected. */
  profileName?: string;
}

const ASSET_KEY = 'bootstrap-profile';
const ASSET_LABEL = 'bootstrap profile';
const ASSET_ORIGIN = 'project-detection';

function fileHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function mapAnalysisDepth(
  depth: BootstrapProfile['analysis_depth']
): 'fast' | 'hybrid' | 'smart' {
  switch (depth) {
    case 'shallow':
      return 'fast';
    case 'standard':
      return 'hybrid';
    case 'deep':
      return 'smart';
    default:
      return 'hybrid';
  }
}

function buildMergedConfigText(profile: BootstrapProfile): string {
  const defaults = createDefaultCodemapConfigFile();
  const merged = {
    ...defaults,
    mode: mapAnalysisDepth(profile.analysis_depth),
    include: [...profile.parser.include],
    exclude: [...defaults.exclude, ...profile.ignore],
  };
  return JSON.stringify(merged, null, 2);
}

function buildAsset(
  status: InitAsset['status'],
  details: string[],
  options: {
    path?: string;
    hash?: string;
    rollbackHint?: string;
  } = {}
): InitAsset {
  return {
    key: ASSET_KEY,
    label: ASSET_LABEL,
    status,
    ownership: 'tool-owned',
    origin: ASSET_ORIGIN,
    path: options.path,
    details,
    hash: options.hash,
    rollbackHint: options.rollbackHint,
  };
}

/**
 * Build a ProfilePlan describing the bootstrap profile decision.
 *
 * - profile === null              → skipped (no marker detected, or detection bypassed)
 * - scan.hasCanonicalConfig       → already-synced (D-16: respect existing config)
 * - mode === 'preview'            → skipped with merged-config preview text
 * - mode === 'apply'              → installed; queues canonical config write
 */
export function createProfilePlan(
  _rootDir: string,
  profile: BootstrapProfile | null,
  scan: ProfilePlanScan,
  mode: 'preview' | 'apply',
  profileName?: string
): ProfilePlan {
  if (scan.hasCanonicalConfig) {
    return {
      assets: [
        buildAsset(
          'already-synced',
          [
            '检测到已存在的 .mycodemap/config.json；跳过 profile 应用。如需重新检测，请使用 --re-detect',
          ],
          { path: scan.paths.canonicalConfigPath }
        ),
      ],
      writes: [],
      profileName,
    };
  }

  if (profile === null) {
    return {
      assets: [
        buildAsset('skipped', [
          '未检测到项目类型标记；跳过 bootstrap profile 推荐',
        ]),
      ],
      writes: [],
    };
  }

  const mergedConfigText = buildMergedConfigText(profile);
  const displayName = profileName ?? 'profile';

  if (mode === 'preview') {
    return {
      assets: [
        buildAsset('skipped', [
          `推荐 profile: ${displayName}`,
          '预览模式不会写入配置；使用 --yes 应用',
        ]),
      ],
      writes: [],
      mergedConfigText,
      profileName,
    };
  }

  return {
    assets: [
      buildAsset(
        'installed',
        [
          `应用 profile: ${displayName}`,
          '已将推荐配置合并到 .mycodemap/config.json',
        ],
        {
          path: scan.paths.canonicalConfigPath,
          hash: fileHash(mergedConfigText),
          rollbackHint: '如需回退本次 profile 应用，可删除 `.mycodemap/config.json`',
        }
      ),
    ],
    writes: [
      {
        targetPath: scan.paths.canonicalConfigPath,
        content: mergedConfigText,
      },
    ],
    mergedConfigText,
    profileName,
  };
}

export async function applyProfilePlan(plan: ProfilePlan): Promise<void> {
  for (const write of plan.writes) {
    await mkdir(path.dirname(write.targetPath), { recursive: true });
    await writeFile(write.targetPath, write.content, 'utf8');
  }
}
