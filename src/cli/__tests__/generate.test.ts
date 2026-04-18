// ============================================
// CLI Commands Integration Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { analyze } from '../../core/analyzer.js';
import { generateAIMap, generateJSON, generateContext, generateMermaidGraph } from '../../generator/index.js';

const mockLoadCodemapConfig = vi.fn();
const mockCreateForProject = vi.fn();
const mockStorageSaveCodeGraph = vi.fn();
const mockStorageClose = vi.fn();

function createSymbolLevelAnalyzeResult() {
  return {
    version: '1.0.0',
    generatedAt: '2026-04-18T00:00:00.000Z',
    project: {
      name: 'test-project',
      rootDir: '/test',
    },
    summary: {
      totalFiles: 2,
      totalLines: 20,
      totalModules: 2,
      totalExports: 2,
    },
    modules: [
      {
        id: 'module-a',
        path: '/test/src/a.ts',
        absolutePath: '/test/src/a.ts',
        type: 'source',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
        exports: [],
        imports: [],
        symbols: [
          {
            id: 'sym-source',
            name: 'caller',
            kind: 'function',
            location: { file: 'a.ts', line: 1, column: 1 },
            visibility: 'public',
            relatedSymbols: [],
            signature: {
              parameters: [],
              returnType: 'void',
              async: false,
              calls: [{ callee: 'callee', line: 2, column: 3 }],
            },
          },
        ],
        dependencies: [],
        dependents: [],
        callGraph: {
          calls: [{ caller: 'caller', callee: 'callee', line: 2 }],
          recursive: [],
          callCounts: { caller: 1 },
          crossFileCalls: [
            {
              callee: 'callee',
              calleeLocation: { file: 'src/b.ts', line: 1, column: 1 },
              callerLocation: { file: 'src/a.ts', line: 2, column: 3 },
              resolved: true,
              importPath: './b',
            },
          ],
        },
      },
      {
        id: 'module-b',
        path: '/test/src/b.ts',
        absolutePath: '/test/src/b.ts',
        type: 'source',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
        exports: [],
        imports: [],
        symbols: [
          {
            id: 'sym-target',
            name: 'callee',
            kind: 'function',
            location: { file: 'b.ts', line: 1, column: 1 },
            visibility: 'public',
            relatedSymbols: [],
            signature: {
              parameters: [],
              returnType: 'string',
              async: false,
            },
          },
        ],
        dependencies: [],
        dependents: [],
        callGraph: {
          calls: [],
          recursive: [],
          callCounts: {},
        },
      },
    ],
    dependencies: { nodes: [], edges: [] },
    graphStatus: 'complete',
    failedFileCount: 0,
    actualMode: 'smart',
  };
}

// Mock dependencies
vi.mock('../../core/analyzer.js', () => ({
  analyze: vi.fn().mockResolvedValue({
    project: {
      name: 'test-project',
      rootDir: '/test'
    },
    summary: {
      totalFiles: 10,
      totalLines: 500,
      totalModules: 5,
      totalExports: 20
    },
    modules: [],
    dependencies: [],
    actualMode: 'fast'
  })
}));

vi.mock('../../generator/index.js', () => ({
  generateAIMap: vi.fn().mockResolvedValue(undefined),
  generateJSON: vi.fn().mockResolvedValue(undefined),
  generateContext: vi.fn().mockResolvedValue(undefined),
  generateMermaidGraph: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../config-loader.js', () => ({
  loadCodemapConfig: (...args: unknown[]) => mockLoadCodemapConfig(...args),
}));

vi.mock('../../infrastructure/storage/StorageFactory.js', () => ({
  storageFactory: {
    createForProject: (...args: unknown[]) => mockCreateForProject(...args),
  },
}));

describe('generate command', () => {
  const testDir = path.join(process.cwd(), 'test-output');
  const outputDir = path.join(testDir, '.mycodemap');

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLoadCodemapConfig.mockResolvedValue({
      config: {
        mode: 'hybrid',
        include: ['src/**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.test.ts', '**/*.spec.ts', '**/*.d.ts'],
        output: '.mycodemap',
        watch: false,
        storage: {
          type: 'filesystem',
          outputPath: '.codemap/storage',
        },
        plugins: {
          builtInPlugins: true,
          plugins: [],
          debug: false,
        },
      },
      configPath: '/test/mycodemap.config.json',
      exists: false,
      isLegacy: false,
      hasExplicitPluginConfig: false,
    });
    mockStorageSaveCodeGraph.mockResolvedValue(undefined);
    mockStorageClose.mockResolvedValue(undefined);
    mockCreateForProject.mockResolvedValue({
      type: 'filesystem',
      saveCodeGraph: mockStorageSaveCodeGraph,
      close: mockStorageClose,
    });

    // Clean up test directories
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should be able to import generate command', async () => {
    // This test verifies the module can be imported
    const { generateCommand } = await import('../commands/generate.js');
    expect(generateCommand).toBeDefined();
    expect(typeof generateCommand).toBe('function');
  });

  it('should call analyze with correct options', async () => {
    const { generateCommand } = await import('../commands/generate.js');

    await generateCommand({
      mode: 'fast',
      output: outputDir
    });

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'fast',
        output: outputDir
      })
    );
  });

  it('should use hybrid mode by default', async () => {
    const { generateCommand } = await import('../commands/generate.js');

    await generateCommand({
      output: outputDir
    });

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'hybrid'
      })
    );
  });

  it('should read mode and output from normalized config when flags are omitted', async () => {
    const { generateCommand } = await import('../commands/generate.js');
    mockLoadCodemapConfig.mockResolvedValue({
      config: {
        mode: 'smart',
        include: ['src/**/*.ts'],
        exclude: ['node_modules/**'],
        output: '.configured-output',
        watch: false,
        storage: {
          type: 'filesystem',
          outputPath: '.codemap/storage',
        },
        plugins: {
          builtInPlugins: true,
          plugins: [],
          debug: false,
        },
      },
      configPath: '/test/mycodemap.config.json',
      exists: true,
      isLegacy: false,
      hasExplicitPluginConfig: false,
    });

    await generateCommand({});

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'smart',
        output: '.configured-output',
      })
    );
  });

  it('should generate output files', async () => {
    const { generateCommand } = await import('../commands/generate.js');

    await generateCommand({
      mode: 'fast',
      output: outputDir
    });

    expect(generateAIMap).toHaveBeenCalled();
    expect(generateJSON).toHaveBeenCalled();
    expect(generateMermaidGraph).toHaveBeenCalled();
    expect(generateContext).toHaveBeenCalled();
  });

  it('should materialize symbol call dependencies when --symbol-level is enabled', async () => {
    const { generateCommand } = await import('../commands/generate.js');
    vi.mocked(analyze).mockResolvedValueOnce(createSymbolLevelAnalyzeResult());

    await generateCommand({
      mode: 'smart',
      output: outputDir,
      symbolLevel: true,
    });

    const savedGraph = mockStorageSaveCodeGraph.mock.calls.at(-1)?.[0];
    expect(savedGraph).toBeDefined();
    expect(savedGraph.symbols.find((symbol: { name: string }) => symbol.name === 'caller')?.signature)
      .toContain('caller() => void');

    const callDependencies = savedGraph.dependencies.filter((dependency: { type: string }) => dependency.type === 'call');
    expect(callDependencies).toHaveLength(1);
    expect(callDependencies[0]).toEqual(expect.objectContaining({
      sourceEntityType: 'symbol',
      targetEntityType: 'symbol',
      confidence: 'high',
      filePath: '/test/src/a.ts',
      line: 2,
    }));
  });

    it('should keep default generate behavior module-only when --symbol-level is omitted', async () => {
    const { generateCommand } = await import('../commands/generate.js');
    vi.mocked(analyze).mockResolvedValueOnce(createSymbolLevelAnalyzeResult());

    await generateCommand({
      mode: 'smart',
      output: outputDir,
    });

    const savedGraph = mockStorageSaveCodeGraph.mock.calls.at(-1)?.[0];
    expect(savedGraph).toBeDefined();
    expect(savedGraph.dependencies.filter((dependency: { type: string }) => dependency.type === 'call')).toEqual([]);
  });

  it('should persist partial graph metadata into storage when analyze degrades', async () => {
    const { generateCommand } = await import('../commands/generate.js');
    vi.mocked(analyze).mockResolvedValueOnce({
      ...createSymbolLevelAnalyzeResult(),
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['/test/src/b.ts'],
    });

    await generateCommand({
      mode: 'smart',
      output: outputDir,
      symbolLevel: true,
    });

    const savedGraph = mockStorageSaveCodeGraph.mock.calls.at(-1)?.[0];
    expect(savedGraph).toEqual(expect.objectContaining({
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['/test/src/b.ts'],
    }));
  });
});

// Cleanup
afterAll(async () => {
  try {
    await fs.rm(path.join(process.cwd(), 'test-output'), { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});
