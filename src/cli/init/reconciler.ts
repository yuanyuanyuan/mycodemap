// [META] since:2026-04-21 | owner:cli-team | stable:false
// [WHY] 把 init 命令拆成可测试的状态扫描与收敛计划，避免入口函数膨胀

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDefaultCodemapConfigFile } from '../config-loader.js';
import { applyHookPlan, createHookPlan, type HookPlan } from './hooks.js';
import { applyRulesPlan, createRulesPlan, type RulesPlan } from './rules.js';
import {
  CONFIG_FILE_CANONICAL,
  CONFIG_FILE_NEW,
  CONFIG_FILE_OLD,
  DEFAULT_OUTPUT_DIR_NEW,
  DEFAULT_OUTPUT_DIR_OLD,
} from '../paths.js';

export type InitAssetStatus =
  | 'missing'
  | 'already-synced'
  | 'migrated'
  | 'installed'
  | 'conflict'
  | 'manual-action-needed'
  | 'skipped';

export type InitAssetOwnership = 'tool-owned' | 'team-owned' | 'user-owned';

export interface InitAsset {
  key: string;
  label: string;
  status: InitAssetStatus;
  ownership: InitAssetOwnership;
  origin: string;
  path?: string;
  details: string[];
  hash?: string;
  versionHint?: string;
  rollbackHint?: string;
  manualAction?: string;
}

export interface InitReceipt {
  version: 1;
  generatedAt: string;
  mode: 'preview' | 'apply';
  rootDir: string;
  receiptPath: string;
  canonicalConfigPath: string;
  assets: InitAsset[];
  summary: Record<InitAssetStatus, number>;
  notes: string[];
  nextSteps: string[];
}

export interface InitPlan {
  receipt: InitReceipt;
  actions: {
    ensureWorkspace: boolean;
    writeCanonicalConfig: boolean;
    canonicalConfigText?: string;
    hookPlan: HookPlan;
    rulesPlan: RulesPlan;
  };
}

interface InitPaths {
  workspaceRoot: string;
  canonicalConfigPath: string;
  legacyRootConfigPath: string;
  oldRootConfigPath: string;
  legacyOutputDir: string;
  logsDir: string;
  workflowDir: string;
  rulesDir: string;
  hooksDir: string;
  storageDir: string;
  statusDir: string;
  receiptPath: string;
  firstRunMarkerPath: string;
  gitDir: string;
  gitignorePath: string;
  claudePath: string;
  agentsPath: string;
}

interface InitScan {
  rootDir: string;
  paths: InitPaths;
  hasCanonicalConfig: boolean;
  hasLegacyOutputDir: boolean;
  hasFirstRunMarker: boolean;
  canonicalConfigText?: string;
  canonicalConfigHash?: string;
  migrationSourcePath?: string;
  migrationSourceText?: string;
  migrationSourceHash?: string;
  legacyStorageHints: string[];
  workspaceMissingDirs: string[];
  receiptExists: boolean;
}

const RECEIPT_VERSION_HINT = 'init-receipt-v1';

function buildInitPaths(rootDir: string): InitPaths {
  const workspaceRoot = path.join(rootDir, DEFAULT_OUTPUT_DIR_NEW);

  return {
    workspaceRoot,
    canonicalConfigPath: path.join(workspaceRoot, CONFIG_FILE_CANONICAL),
    legacyRootConfigPath: path.join(rootDir, CONFIG_FILE_NEW),
    oldRootConfigPath: path.join(rootDir, CONFIG_FILE_OLD),
    legacyOutputDir: path.join(rootDir, DEFAULT_OUTPUT_DIR_OLD),
    logsDir: path.join(workspaceRoot, 'logs'),
    workflowDir: path.join(workspaceRoot, 'workflow'),
    rulesDir: path.join(workspaceRoot, 'rules'),
    hooksDir: path.join(workspaceRoot, 'hooks'),
    storageDir: path.join(workspaceRoot, 'storage'),
    statusDir: path.join(workspaceRoot, 'status'),
    receiptPath: path.join(workspaceRoot, 'status', 'init-last.json'),
    firstRunMarkerPath: path.join(workspaceRoot, '.first-run-done'),
    gitDir: path.join(rootDir, '.git'),
    gitignorePath: path.join(rootDir, '.gitignore'),
    claudePath: path.join(rootDir, 'CLAUDE.md'),
    agentsPath: path.join(rootDir, 'AGENTS.md'),
  };
}

function fileHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function safeReadText(filePath: string): string | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }

  return readFileSync(filePath, 'utf8');
}

function safeReadJson(filePath: string): Record<string, unknown> | undefined {
  const text = safeReadText(filePath);
  if (!text) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function describeRelative(rootDir: string, targetPath: string): string {
  const relativePath = path.relative(rootDir, targetPath);
  return relativePath.length > 0 ? relativePath : '.';
}

function getWorkspaceDirectories(paths: InitPaths): string[] {
  return [
    paths.workspaceRoot,
    paths.logsDir,
    paths.workflowDir,
    paths.rulesDir,
    paths.hooksDir,
    paths.storageDir,
    paths.statusDir,
  ];
}

function getMissingWorkspaceDirectories(paths: InitPaths): string[] {
  return getWorkspaceDirectories(paths).filter((directoryPath) => !existsSync(directoryPath));
}

function getMigrationSource(paths: InitPaths): { path: string; text: string; hash: string } | undefined {
  const preferredSourcePath = existsSync(paths.legacyRootConfigPath)
    ? paths.legacyRootConfigPath
    : existsSync(paths.oldRootConfigPath)
      ? paths.oldRootConfigPath
      : undefined;

  if (!preferredSourcePath) {
    return undefined;
  }

  const sourceText = readFileSync(preferredSourcePath, 'utf8');
  return {
    path: preferredSourcePath,
    text: sourceText,
    hash: fileHash(sourceText),
  };
}

function collectLegacyStorageHints(configText: string | undefined): string[] {
  if (!configText) {
    return [];
  }

  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>;
    const hints: string[] = [];

    if (parsed.output === DEFAULT_OUTPUT_DIR_OLD) {
      hints.push('output 仍指向 .codemap');
    }

    const storage = parsed.storage;
    if (storage && typeof storage === 'object' && !Array.isArray(storage)) {
      const outputPath = (storage as Record<string, unknown>).outputPath;
      if (outputPath === `${DEFAULT_OUTPUT_DIR_OLD}/storage`) {
        hints.push('storage.outputPath 仍指向 .codemap/storage');
      }
    }

    return hints;
  } catch {
    return ['配置文件无法解析，需手动确认其中是否仍引用旧路径'];
  }
}

function scanInitState(rootDir: string): InitScan {
  const paths = buildInitPaths(rootDir);
  const canonicalConfigText = safeReadText(paths.canonicalConfigPath);
  const migrationSource = getMigrationSource(paths);
  const effectiveConfigText = canonicalConfigText ?? migrationSource?.text;

  return {
    rootDir,
    paths,
    hasCanonicalConfig: canonicalConfigText !== undefined,
    hasLegacyOutputDir: existsSync(paths.legacyOutputDir),
    hasFirstRunMarker: existsSync(paths.firstRunMarkerPath),
    canonicalConfigText,
    canonicalConfigHash: canonicalConfigText ? fileHash(canonicalConfigText) : undefined,
    migrationSourcePath: migrationSource?.path,
    migrationSourceText: migrationSource?.text,
    migrationSourceHash: migrationSource?.hash,
    legacyStorageHints: collectLegacyStorageHints(effectiveConfigText),
    workspaceMissingDirs: getMissingWorkspaceDirectories(paths),
    receiptExists: existsSync(paths.receiptPath),
  };
}

function createAsset(
  key: string,
  label: string,
  status: InitAssetStatus,
  ownership: InitAssetOwnership,
  origin: string,
  details: string[],
  options: {
    path?: string;
    hash?: string;
    versionHint?: string;
    rollbackHint?: string;
    manualAction?: string;
  } = {}
): InitAsset {
  return {
    key,
    label,
    status,
    ownership,
    origin,
    path: options.path,
    details,
    hash: options.hash,
    versionHint: options.versionHint,
    rollbackHint: options.rollbackHint,
    manualAction: options.manualAction,
  };
}

function buildWorkspaceAsset(scan: InitScan): InitAsset {
  const details = scan.workspaceMissingDirs.length === 0
    ? ['`.mycodemap/` workspace 目录结构已就绪']
    : [`将确保创建 ${scan.workspaceMissingDirs.map((directoryPath) => `\`${describeRelative(scan.rootDir, directoryPath)}\``).join('、')}`];

  return createAsset(
    'workspace',
    'workspace',
    scan.workspaceMissingDirs.length === 0 ? 'already-synced' : 'installed',
    'tool-owned',
    'generated',
    details,
    {
      path: scan.paths.workspaceRoot,
      rollbackHint:
        scan.workspaceMissingDirs.length === 0
          ? undefined
          : '如需回退，可删除新建的 `.mycodemap/` 子目录并保留你确认需要的文件',
    }
  );
}

function buildCanonicalConfigText(scan: InitScan): string {
  if (scan.migrationSourceText) {
    return scan.migrationSourceText;
  }

  return JSON.stringify(createDefaultCodemapConfigFile(), null, 2);
}

function buildConfigAsset(scan: InitScan): InitAsset {
  if (scan.hasCanonicalConfig) {
    return createAsset(
      'canonical-config',
      'canonical config',
      'already-synced',
      'tool-owned',
      'canonical-config',
      ['共享 CLI 配置加载已优先读取 `.mycodemap/config.json`'],
      {
        path: scan.paths.canonicalConfigPath,
        hash: scan.canonicalConfigHash,
      }
    );
  }

  if (scan.migrationSourcePath) {
    return createAsset(
      'canonical-config',
      'canonical config',
      'migrated',
      'tool-owned',
      describeRelative(scan.rootDir, scan.migrationSourcePath),
      [
        `将复制 \`${describeRelative(scan.rootDir, scan.migrationSourcePath)}\` 到 \`${describeRelative(scan.rootDir, scan.paths.canonicalConfigPath)}\``,
        '根目录旧配置会保留，便于人工确认后再删除',
      ],
      {
        path: scan.paths.canonicalConfigPath,
        hash: scan.migrationSourceHash,
        rollbackHint: '如需回退本次迁移，可删除 `.mycodemap/config.json`；根目录旧配置仍会保留',
      }
    );
  }

  return createAsset(
    'canonical-config',
    'canonical config',
    'installed',
    'tool-owned',
    'generated-default',
    ['将写入默认 `.mycodemap/config.json`，作为后续命令的 canonical 配置'],
    {
      path: scan.paths.canonicalConfigPath,
      hash: fileHash(buildCanonicalConfigText(scan)),
      rollbackHint: '如需回退本次初始化，可删除 `.mycodemap/config.json`',
    }
  );
}

function buildLegacyRootConfigAssets(scan: InitScan): InitAsset[] {
  const assets: InitAsset[] = [];
  const rootConfigFiles = [
    scan.paths.legacyRootConfigPath,
    scan.paths.oldRootConfigPath,
  ];

  for (const rootConfigPath of rootConfigFiles) {
    const text = safeReadText(rootConfigPath);
    if (!text) {
      continue;
    }

    assets.push(createAsset(
      `legacy-root-config:${path.basename(rootConfigPath)}`,
      path.basename(rootConfigPath),
      'manual-action-needed',
      'user-owned',
      'legacy-root-config',
      [
        `根目录旧配置 \`${describeRelative(scan.rootDir, rootConfigPath)}\` 已被视为 migration source，而非 steady-state truth`,
        '确认 `.mycodemap/config.json` 可用后，可手动删除该旧配置文件',
      ],
      {
        path: rootConfigPath,
        hash: fileHash(text),
        manualAction: `确认 canonical 配置无误后，删除 \`${describeRelative(scan.rootDir, rootConfigPath)}\``,
        rollbackHint: '如需回退，可继续使用该根目录配置文件，但建议尽快收敛到 canonical 路径',
      }
    ));
  }

  return assets;
}

function buildLegacyOutputAsset(scan: InitScan): InitAsset | undefined {
  if (!scan.hasLegacyOutputDir) {
    return undefined;
  }

  return createAsset(
    'legacy-output-dir',
    'legacy .codemap',
    'manual-action-needed',
    'user-owned',
    'legacy-workspace',
    [
      '检测到旧 `.codemap/` 目录，说明项目仍存在迁移前的 workspace / storage 痕迹',
      '本次 init 不会自动删除旧目录，避免误删用户数据',
    ],
    {
      path: scan.paths.legacyOutputDir,
      manualAction: '确认旧目录内容已迁移后，手动清理 `.codemap/`',
      rollbackHint: '保留 `.codemap/` 即可维持旧状态；删除前请先确认其中没有仍需保留的数据',
    }
  );
}

function buildLegacyStorageAsset(scan: InitScan): InitAsset | undefined {
  if (scan.legacyStorageHints.length === 0) {
    return undefined;
  }

  return createAsset(
    'legacy-storage-hints',
    'legacy storage hints',
    'manual-action-needed',
    'user-owned',
    'config-drift',
    scan.legacyStorageHints.map((hint) => `配置 drift：${hint}`),
    {
      path: scan.paths.canonicalConfigPath,
      manualAction: '按需把 canonical 配置中的旧 `.codemap` 路径改为 `.mycodemap` 命名空间',
      rollbackHint: '保留旧路径配置可继续兼容旧数据，但会延续两套 workspace 心智',
    }
  );
}

function buildFirstRunAsset(scan: InitScan): InitAsset {
  return createAsset(
    'first-run-marker',
    'first-run marker',
    scan.hasFirstRunMarker ? 'already-synced' : 'skipped',
    'tool-owned',
    'cli-first-run-guide',
    scan.hasFirstRunMarker
      ? ['首次运行标记已存在，CLI 欢迎信息不会重复打扰']
      : ['首次运行标记由 CLI 欢迎流程维护；本次 init 不额外写入该标记'],
    {
      path: scan.paths.firstRunMarkerPath,
    }
  );
}

function buildStatusLedgerAsset(scan: InitScan, mode: 'preview' | 'apply'): InitAsset {
  const status: InitAssetStatus = mode === 'preview'
    ? 'skipped'
    : scan.receiptExists
      ? 'already-synced'
      : 'installed';
  const details = mode === 'preview'
    ? ['预览模式不会写入 `.mycodemap/status/init-last.json`']
    : ['本次 init 会把 machine-readable receipt 写入 `.mycodemap/status/init-last.json`'];

  return createAsset(
    'status-ledger',
    'status ledger',
    status,
    'tool-owned',
    RECEIPT_VERSION_HINT,
    details,
    {
      path: scan.paths.receiptPath,
      versionHint: RECEIPT_VERSION_HINT,
      rollbackHint: mode === 'apply' ? '如需回退本次 ledger，可删除 `.mycodemap/status/init-last.json`' : undefined,
    }
  );
}

function summarizeAssets(assets: InitAsset[]): Record<InitAssetStatus, number> {
  return assets.reduce<Record<InitAssetStatus, number>>(
    (summary, asset) => {
      summary[asset.status] += 1;
      return summary;
    },
    {
      missing: 0,
      'already-synced': 0,
      migrated: 0,
      installed: 0,
      conflict: 0,
      'manual-action-needed': 0,
      skipped: 0,
    }
  );
}

function buildReceiptNotes(scan: InitScan): string[] {
  const notes = [
    'canonical 配置位置是 `.mycodemap/config.json`；根目录 `mycodemap.config.json` / `codemap.config.json` 仅作为迁移来源保留',
    '旧 `.codemap/` 或旧 storage 路径不会被静默忽略；若仍存在，receipt 会把它们标记为 drift / manual action',
  ];

  if (scan.legacyStorageHints.length > 0) {
    notes.push(`检测到 legacy storage hint：${scan.legacyStorageHints.join('；')}`);
  }

  return notes;
}

function buildNextSteps(assets: InitAsset[]): string[] {
  const manualSteps = assets
    .filter((asset) => asset.status === 'manual-action-needed' && asset.manualAction)
    .map((asset) => asset.manualAction as string);

  if (manualSteps.length > 0) {
    return manualSteps;
  }

  const conflictSteps = assets
    .filter((asset) => asset.status === 'conflict' && asset.manualAction)
    .map((asset) => asset.manualAction as string);

  if (conflictSteps.length > 0) {
    return conflictSteps;
  }

  return [
    '运行 `mycodemap generate` 生成代码地图',
    '运行 `mycodemap --help` 查看更多命令',
  ];
}

export function createInitPlan(rootDir: string, mode: 'preview' | 'apply'): InitPlan {
  const scan = scanInitState(rootDir);
  const hookPlan = createHookPlan(rootDir);
  const rulesPlan = createRulesPlan(rootDir);
  const assets: InitAsset[] = [
    buildWorkspaceAsset(scan),
    buildConfigAsset(scan),
    ...buildLegacyRootConfigAssets(scan),
    buildStatusLedgerAsset(scan, mode),
    ...hookPlan.assets,
    ...rulesPlan.assets,
    buildFirstRunAsset(scan),
  ];

  const legacyOutputAsset = buildLegacyOutputAsset(scan);
  if (legacyOutputAsset) {
    assets.push(legacyOutputAsset);
  }

  const legacyStorageAsset = buildLegacyStorageAsset(scan);
  if (legacyStorageAsset) {
    assets.push(legacyStorageAsset);
  }

  return {
    receipt: {
      version: 1,
      generatedAt: new Date().toISOString(),
      mode,
      rootDir,
      receiptPath: scan.paths.receiptPath,
      canonicalConfigPath: scan.paths.canonicalConfigPath,
      assets,
      summary: summarizeAssets(assets),
      notes: buildReceiptNotes(scan),
      nextSteps: buildNextSteps(assets),
    },
    actions: {
      ensureWorkspace: scan.workspaceMissingDirs.length > 0,
      writeCanonicalConfig: !scan.hasCanonicalConfig,
      canonicalConfigText: !scan.hasCanonicalConfig ? buildCanonicalConfigText(scan) : undefined,
      hookPlan,
      rulesPlan,
    },
  };
}

async function ensureWorkspaceDirectories(paths: InitPaths): Promise<void> {
  for (const directoryPath of getWorkspaceDirectories(paths)) {
    await mkdir(directoryPath, { recursive: true });
  }
}

async function maybeWriteCanonicalConfig(paths: InitPaths, plan: InitPlan): Promise<void> {
  if (!plan.actions.writeCanonicalConfig || !plan.actions.canonicalConfigText) {
    return;
  }

  await mkdir(path.dirname(paths.canonicalConfigPath), { recursive: true });
  await writeFile(paths.canonicalConfigPath, plan.actions.canonicalConfigText, 'utf8');
}

function receiptPaths(receipt: InitReceipt): InitPaths {
  return buildInitPaths(receipt.rootDir);
}

export async function applyInitPlan(plan: InitPlan): Promise<InitReceipt> {
  const paths = receiptPaths(plan.receipt);
  await ensureWorkspaceDirectories(paths);
  await maybeWriteCanonicalConfig(paths, plan);
  await applyHookPlan(plan.actions.hookPlan);
  await applyRulesPlan(plan.actions.rulesPlan);
  return plan.receipt;
}

export async function writeInitReceipt(receipt: InitReceipt): Promise<void> {
  await mkdir(path.dirname(receipt.receiptPath), { recursive: true });
  await writeFile(receipt.receiptPath, JSON.stringify(receipt, null, 2), 'utf8');
}

export function readReceiptConfigPath(receiptPath: string): string | undefined {
  const parsed = safeReadJson(receiptPath);
  const value = parsed?.canonicalConfigPath;
  return typeof value === 'string' ? value : undefined;
}
