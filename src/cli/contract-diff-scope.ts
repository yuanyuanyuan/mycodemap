// [META] since:2026-04-15 | owner:cli-team | stable:false
// [WHY] Resolve explicit diff-aware contract-check inputs and fail safely back to full scan when scope is unreliable

import { existsSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { cwd } from 'node:process';
import { promisify } from 'node:util';
import type { ContractCheckWarning, ContractScanMode } from '../interface/types/index.js';
import {
  CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
  isWithinContractGateHardGateWindow,
} from './contract-gate-thresholds.js';
import { resolveContractCheckPaths, type ContractCheckPaths } from './contract-checker.js';

const execFileAsync = promisify(execFile);

export interface ResolveContractDiffScopeOptions {
  againstPath: string;
  rootDir?: string;
  base?: string;
  changedFiles?: string[];
}

export interface ResolvedContractDiffScope {
  scanMode: ContractScanMode;
  changedFiles: string[];
  warnings: ContractCheckWarning[];
}

function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/gu, '/');
}

function isWithinDirectory(targetPath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function isWithinAgainstPath(targetPath: string, againstPath: string): boolean {
  if (statSync(againstPath).isFile()) {
    return normalizePath(targetPath) === normalizePath(againstPath);
  }

  return isWithinDirectory(targetPath, againstPath);
}

function fallbackToFullScan(message: string): ResolvedContractDiffScope {
  return {
    scanMode: 'full',
    changedFiles: [],
    warnings: [
      {
        code: 'diff-scope-fallback',
        message,
        details: {
          calibrated: false,
          recommended_mode: 'warn-only',
          max_changed_files: CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
        },
      },
    ],
  };
}

function createHardGateWindowWarning(changedFileCount: number): ContractCheckWarning | undefined {
  if (isWithinContractGateHardGateWindow(changedFileCount)) {
    return undefined;
  }

  return {
    code: 'hard-gate-window-exceeded',
    message: `changed files=${changedFileCount} 超出 calibrated hard-gate window <=${CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE}`,
    details: {
      calibrated: false,
      changed_files: changedFileCount,
      max_changed_files: CONTRACT_GATE_MAX_CHANGED_FILES_FOR_HARD_GATE,
      recommended_mode: 'warn-only',
    },
  };
}

function normalizeChangedFiles(
  changedFiles: readonly string[],
  paths: ContractCheckPaths,
): ResolvedContractDiffScope {
  if (changedFiles.length === 0) {
    return fallbackToFullScan('显式 diff 输入为空，已回退 full scan');
  }

  const normalizedFiles: string[] = [];

  for (const changedFile of changedFiles) {
    const absoluteChangedFile = path.resolve(
      path.isAbsolute(changedFile) ? changedFile : path.join(paths.rootDir, changedFile),
    );

    if (!existsSync(absoluteChangedFile)) {
      return fallbackToFullScan(`changed file 不存在: ${changedFile}`);
    }

    if (!isWithinAgainstPath(absoluteChangedFile, paths.againstAbsolutePath)) {
      return fallbackToFullScan(`changed file 超出 --against 范围: ${changedFile}`);
    }

    normalizedFiles.push(normalizePath(path.relative(paths.projectRoot, absoluteChangedFile)));
  }

  const uniqueChangedFiles = Array.from(new Set(normalizedFiles)).sort();
  const hardGateWindowWarning = createHardGateWindowWarning(uniqueChangedFiles.length);

  return {
    scanMode: 'diff',
    changedFiles: uniqueChangedFiles,
    warnings: hardGateWindowWarning ? [hardGateWindowWarning] : [],
  };
}

async function getChangedFilesFromBase(
  base: string,
  paths: ContractCheckPaths,
): Promise<ResolvedContractDiffScope> {
  const againstGitPath = normalizePath(path.relative(paths.rootDir, paths.againstAbsolutePath)) || '.';

  try {
    const { stdout } = await execFileAsync('git', [
      '-C',
      paths.rootDir,
      'diff',
      '--name-only',
      `${base}...HEAD`,
      '--',
      againstGitPath,
    ]);
    const changedFiles = stdout.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    return normalizeChangedFiles(changedFiles, paths);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fallbackToFullScan(`无法解析 --base ${base}: ${message}`);
  }
}

export async function resolveContractDiffScope(
  options: ResolveContractDiffScopeOptions,
): Promise<ResolvedContractDiffScope> {
  const paths = resolveContractCheckPaths(options.againstPath, options.rootDir ?? cwd());
  const changedFiles = options.changedFiles ?? [];

  if (changedFiles.length > 0) {
    const resolvedScope = normalizeChangedFiles(changedFiles, paths);
    if (options.base && resolvedScope.scanMode === 'diff') {
      return {
        ...resolvedScope,
        warnings: [
          ...resolvedScope.warnings,
          {
            code: 'changed-files-overrides-base',
            message: '--changed-files 已显式提供，忽略 --base',
          },
        ],
      };
    }
    return resolvedScope;
  }

  if (options.base) {
    return getChangedFilesFromBase(options.base, paths);
  }

  return {
    scanMode: 'full',
    changedFiles: [],
    warnings: [],
  };
}
