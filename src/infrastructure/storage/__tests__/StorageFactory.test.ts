import { describe, expect, it } from 'vitest';
import type { StorageConfig } from '../../../interface/types/storage.js';
import { StorageFactory } from '../StorageFactory.js';

describe('StorageFactory', () => {
  it('rejects deprecated filesystem backends with a migration error', async () => {
    const factory = new StorageFactory();

    await expect(factory.create({
      type: 'filesystem',
      outputPath: '.codemap/storage',
    } as unknown as StorageConfig)).rejects.toMatchObject({
      name: 'StorageError',
      code: 'UNSUPPORTED_STORAGE_TYPE',
    });
  });

  it('rejects deprecated kuzudb backends with a migration error', async () => {
    const factory = new StorageFactory();

    await expect(factory.create({
      type: 'kuzudb',
      databasePath: '.codemap/kuzu',
    } as unknown as StorageConfig)).rejects.toMatchObject({
      name: 'StorageError',
      code: 'UNSUPPORTED_STORAGE_TYPE',
    });
  });

  it('does not advertise deprecated backends as available storage types', () => {
    expect(StorageFactory.getAvailableStorageTypes()).toEqual(['sqlite', 'memory']);
  });
});
