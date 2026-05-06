// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Phase 55/58 — generate .mycodemap/env-contract.json from discovery engine.
// Phase 55 produced env-contract.seed.v1; Phase 58 upgrades to env-contract.v1.

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { InitAsset } from './reconciler.js';
import { discoverProjectEnvironmentContract } from '../env-contract/discovery.js';
import { validateProjectEnvironmentContract } from '../env-contract/validation.js';
import type { ProjectEnvironmentContract } from '../env-contract/types.js';

interface FileWriteAction {
  targetPath: string;
  content: string;
}

export interface EnvContractPlan {
  assets: InitAsset[];
  writes: FileWriteAction[];
}

const ASSET_KEY = 'env-contract';
const ASSET_LABEL = 'env-contract';
const ASSET_ORIGIN = 'discovery-engine';

function makeAsset(
  status: InitAsset['status'],
  details: string[],
  options: {
    path?: string;
    hash?: string;
    rollbackHint?: string;
    manualAction?: string;
  } = {},
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
    manualAction: options.manualAction,
  };
}

function normalizeContractForComparison(
  contract: ProjectEnvironmentContract | Record<string, unknown>
): string {
  const normalized = JSON.parse(JSON.stringify(contract)) as Record<string, unknown>;
  delete normalized.generatedAt;
  return JSON.stringify(normalized);
}

/**
 * Check if existing content is a Phase 55 seed contract (env-contract.seed.v1).
 */
function isSeedContract(parsed: unknown): parsed is { schemaVersion: string; items?: unknown[] } {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as Record<string, unknown>).schemaVersion === 'env-contract.seed.v1'
  );
}

/**
 * Build an EnvContractPlan describing the env-contract.json decision.
 *
 * States:
 * - file exists + same content          → already-synced
 * - file exists + seed v1               → migrate + installed (deterministic)
 * - file exists + different + not seed  → conflict (manual review)
 * - file missing + preview mode         → skipped
 * - file missing + apply mode           → installed + write action
 */
export function createEnvContractPlan(
  rootDir: string,
  profileName?: string,
  mode: 'preview' | 'apply' = 'apply',
  options?: { generatedAt?: string },
): EnvContractPlan {
  const targetPath = path.join(rootDir, '.mycodemap', 'env-contract.json');
  const contract = discoverProjectEnvironmentContract(rootDir, {
    profileName,
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
  });
  const contractJson = JSON.stringify(contract, null, 2);

  // File already exists — check if content matches
  if (existsSync(targetPath)) {
    try {
      const currentContent = readFileSync(targetPath, 'utf8');

      // Try to parse existing content
      let parsed: unknown;
      try {
        parsed = JSON.parse(currentContent);
      } catch {
        // Unparseable — conflict
        return {
          assets: [
            makeAsset('conflict', [
              '无法解析 .mycodemap/env-contract.json，需手动确认',
            ], {
              path: targetPath,
              manualAction: '手动审阅 .mycodemap/env-contract.json 的内容，确认后可删除该文件再重跑 init',
            }),
          ],
          writes: [],
        };
      }

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        normalizeContractForComparison(parsed as Record<string, unknown>) ===
          normalizeContractForComparison(contract)
      ) {
        return {
          assets: [
            makeAsset('already-synced', [
              'env-contract.json 内容已同步，无需更新',
            ], { path: targetPath }),
          ],
          writes: [],
        };
      }

      // Seed v1 migration — deterministic upgrade
      if (isSeedContract(parsed)) {
        return {
          assets: [
            makeAsset('installed', [
              '从 env-contract.seed.v1 迁移至 env-contract.v1',
              `发现 ${contract.items.length} 项契约`,
              `发现 ${contract.sourceSnapshots.length} 个源快照`,
            ], {
              path: targetPath,
              rollbackHint: '如需回退，可删除 `.mycodemap/env-contract.json`',
            }),
          ],
          writes: [
            {
              targetPath,
              content: contractJson,
            },
          ],
        };
      }

      // Content differs and is not a recognized seed — conflict
      return {
        assets: [
          makeAsset('conflict', [
            '检测到 .mycodemap/env-contract.json 与当前提取结果不同，本次不会自动覆盖',
          ], {
            path: targetPath,
            manualAction: '手动审阅 .mycodemap/env-contract.json 的内容，确认后可删除该文件再重跑 init',
          }),
        ],
        writes: [],
      };
    } catch {
      // Read error — treat as conflict
      return {
        assets: [
          makeAsset('conflict', [
            '无法读取 .mycodemap/env-contract.json，需手动确认',
          ], {
            path: targetPath,
            manualAction: '手动审阅 .mycodemap/env-contract.json 的内容，确认后可删除该文件再重跑 init',
          }),
        ],
        writes: [],
      };
    }
  }

  // Preview mode — don't write
  if (mode === 'preview') {
    return {
      assets: [
        makeAsset('skipped', [
          `schemaVersion: ${contract.schemaVersion}`,
          `projectProfile: ${contract.projectProfile.name}`,
          `items: ${contract.items.length} 项`,
          `sourceSnapshots: ${contract.sourceSnapshots.length} 个`,
          '预览模式不会写入 .mycodemap/env-contract.json；使用 --yes 应用',
        ]),
      ],
      writes: [],
    };
  }

  // Apply mode — write the file
  return {
    assets: [
      makeAsset('installed', [
        '将生成 .mycodemap/env-contract.json',
        `发现 ${contract.items.length} 项契约`,
        `发现 ${contract.sourceSnapshots.length} 个源快照`,
      ], {
        path: targetPath,
        rollbackHint: '如需回退，可删除 `.mycodemap/env-contract.json`',
      }),
    ],
    writes: [
      {
        targetPath,
        content: contractJson,
      },
    ],
  };
}

/**
 * Apply the env-contract plan: write the JSON file to disk.
 */
export async function applyEnvContractPlan(plan: EnvContractPlan): Promise<void> {
  for (const write of plan.writes) {
    await mkdir(path.dirname(write.targetPath), { recursive: true });
    await writeFile(write.targetPath, write.content, 'utf8');
  }
}
