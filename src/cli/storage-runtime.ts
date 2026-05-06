// [META] since:2026-03-24 | owner:cli-team | stable:false
// [WHY] Centralize CLI storage configuration loading so runtime commands honor the configured backend

import { readFile } from 'node:fs/promises';
import { cwd } from 'node:process';
import type { IStorage } from '../interface/types/storage.js';
import type { CodeMap } from '../types/index.js';
import { storageFactory } from '../infrastructure/storage/StorageFactory.js';
import { resolveDataPath } from './paths.js';
import { loadCodemapConfig, type LoadedCodemapConfig } from './config-loader.js';

export interface LoadedStorageRuntime {
  loadedConfig: LoadedCodemapConfig;
  storage: IStorage;
}

export interface LoadedCodeMapRuntime {
  rootDir: string;
  dataPath: string;
  codeMap: CodeMap;
}

export async function createConfiguredStorage(rootDir: string = cwd()): Promise<LoadedStorageRuntime> {
  const loadedConfig = await loadCodemapConfig(rootDir);
  const storage = await storageFactory.createForProject(rootDir, loadedConfig.config.storage);

  return {
    loadedConfig,
    storage,
  };
}

export async function loadCodeMapRuntime(rootDir: string = cwd()): Promise<LoadedCodeMapRuntime> {
  const dataPath = resolveDataPath(rootDir);

  try {
    const raw = await readFile(dataPath, 'utf-8');
    return {
      rootDir,
      dataPath,
      codeMap: JSON.parse(raw) as CodeMap,
    };
  } catch (error) {
    const runtimeError = new Error(
      error instanceof Error && error.message
        ? error.message
        : 'Code map not found, run codemap generate first'
    ) as Error & { code: string; remediation: string; cause?: unknown };

    runtimeError.code = 'INDEX_NOT_FOUND';
    runtimeError.remediation = 'Run codemap generate to create the code map';
    runtimeError.cause = error;
    throw runtimeError;
  }
}
