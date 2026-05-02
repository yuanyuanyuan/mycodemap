// [META] since:2026-05-02 | owner:cli-team | stable:false
// [WHY] Phase 55 — generate .mycodemap/env-contract.json seed from manifest
// extraction facts. Produces EnvContractPlan with InitAsset[] and FileWriteAction[].

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { InitAsset } from './reconciler.js';
import { extractManifestFacts, type ManifestItem } from './manifest-extractors.js';

export interface EnvContractItem {
  category: 'execution' | 'commit' | 'retrieval' | 'validation' | 'style';
  key: string;
  value?: string;
  status?: 'unknown';
  source: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface EnvContractSeed {
  schemaVersion: 'env-contract.seed.v1';
  generatedAt: string;
  projectProfile: {
    name: string;
    source: string;
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  items: EnvContractItem[];
}

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
const ASSET_ORIGIN = 'manifest-extraction';

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

function buildSeed(
  facts: ReturnType<typeof extractManifestFacts>,
): EnvContractSeed {
  return {
    schemaVersion: 'env-contract.seed.v1',
    generatedAt: new Date().toISOString(),
    projectProfile: {
      name: facts.projectType,
      source: facts.projectSource,
      confidence: 'high',
    },
    items: facts.items as EnvContractItem[],
  };
}

/**
 * Build an EnvContractPlan describing the env-contract.json seed decision.
 *
 * States:
 * - file exists + same content  → already-synced
 * - file exists + different     → conflict (manual review)
 * - file missing + preview mode → skipped
 * - file missing + apply mode   → installed + write action
 */
export function createEnvContractPlan(
  rootDir: string,
  profileName?: string,
  mode: 'preview' | 'apply' = 'apply',
): EnvContractPlan {
  const targetPath = path.join(rootDir, '.mycodemap', 'env-contract.json');
  const facts = extractManifestFacts(rootDir, profileName);
  const seed = buildSeed(facts);
  const seedJson = JSON.stringify(seed, null, 2);

  // File already exists — check if content matches
  if (existsSync(targetPath)) {
    try {
      const currentContent = readFileSync(targetPath, 'utf8');
      if (currentContent === seedJson) {
        return {
          assets: [
            makeAsset('already-synced', [
              'env-contract.json 内容已同步，无需更新',
            ], { path: targetPath }),
          ],
          writes: [],
        };
      }

      // Content differs — conflict
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
          `schemaVersion: ${seed.schemaVersion}`,
          `projectProfile: ${seed.projectProfile.name}`,
          `items: ${seed.items.length} 项`,
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
        '将生成 .mycodemap/env-contract.json 作为 env-contract seed',
        `提取 ${seed.items.length} 项项目事实`,
      ], {
        path: targetPath,
        rollbackHint: '如需回退，可删除 `.mycodemap/env-contract.json`',
      }),
    ],
    writes: [
      {
        targetPath,
        content: seedJson,
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
