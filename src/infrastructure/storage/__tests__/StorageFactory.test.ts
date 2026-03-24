import { describe, expect, it } from 'vitest';
import type { StorageConfig } from '../../../interface/types/storage.js';
import { StorageFactory } from '../StorageFactory.js';

describe('StorageFactory', () => {
  it('rejects deprecated neo4j backends with a migration error', async () => {
    const factory = new StorageFactory();

    await expect(factory.create({
      type: 'neo4j',
    } as unknown as StorageConfig)).rejects.toMatchObject({
      name: 'StorageError',
      code: 'UNSUPPORTED_STORAGE_TYPE',
    });
  });

  it('does not advertise neo4j as an available storage type', () => {
    expect(StorageFactory.getAvailableStorageTypes()).not.toContain('neo4j');
  });
});
