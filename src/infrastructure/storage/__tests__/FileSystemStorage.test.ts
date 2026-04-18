import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CodeGraph } from '../../../interface/types/index.js';
import { FileSystemStorage } from '../adapters/FileSystemStorage.js';

function createGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-fs',
      name: 'fs-fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-04-19T00:00:00.000Z'),
      updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    },
    modules: [{
      id: 'mod-a',
      projectId: 'proj-fs',
      path: 'src/a.ts',
      language: 'ts',
      stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
    }],
    symbols: [{
      id: 'sym-a',
      moduleId: 'mod-a',
      name: 'createCodeMapMcpServer',
      kind: 'function',
      signature: 'createCodeMapMcpServer() => void',
      location: { file: 'src/server/mcp/server.ts', line: 1, column: 1 },
      visibility: 'public',
    }],
    dependencies: [],
    graphStatus: 'complete',
    failedFileCount: 0,
    parseFailureFiles: [],
  };
}

describe('FileSystemStorage', () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    while (tempRoots.length > 0) {
      const tempRoot = tempRoots.pop();
      if (tempRoot) {
        await rm(tempRoot, { recursive: true, force: true });
      }
    }
  });

  it('reopens persisted graphs with Date fields restored for graph metadata', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'codemap-fs-storage-'));
    tempRoots.push(rootDir);
    const storageConfig = { type: 'filesystem' as const, outputPath: '.codemap/storage' };

    const firstStorage = new FileSystemStorage(storageConfig);
    await firstStorage.initialize(rootDir);
    await firstStorage.saveCodeGraph(createGraphFixture());
    await firstStorage.close();

    const secondStorage = new FileSystemStorage(storageConfig);
    await secondStorage.initialize(rootDir);

    const loadedGraph = await secondStorage.loadCodeGraph();
    const metadata = await secondStorage.loadGraphMetadata();

    expect(loadedGraph.project.updatedAt).toBeInstanceOf(Date);
    expect(metadata.generatedAt).toBe('2026-04-19T00:00:00.000Z');
    expect(metadata.graphStatus).toBe('complete');
    expect(metadata.moduleCount).toBe(1);

    await secondStorage.close();
  });
});
