// [META] since:2026-03-24 | owner:cli-team | stable:false
// [WHY] Centralize CLI storage configuration loading so runtime commands honor the configured backend

import { cwd } from 'node:process';
import type { IStorage } from '../interface/types/storage.js';
import { storageFactory } from '../infrastructure/storage/StorageFactory.js';
import { loadCodemapConfig, type LoadedCodemapConfig } from './config-loader.js';

export interface LoadedStorageRuntime {
  loadedConfig: LoadedCodemapConfig;
  storage: IStorage;
}

export async function createConfiguredStorage(rootDir: string = cwd()): Promise<LoadedStorageRuntime> {
  const loadedConfig = await loadCodemapConfig(rootDir);
  const storage = await storageFactory.createForProject(rootDir, loadedConfig.config.storage);

  return {
    loadedConfig,
    storage,
  };
}
