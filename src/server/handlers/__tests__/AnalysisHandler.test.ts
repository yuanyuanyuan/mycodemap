// [META] since:2026-03 | owner:architecture-team | stable:true
// [WHY] AnalysisHandler unit tests for explicit unsupported contracts
// ============================================

import { describe, expect, it } from 'vitest';
import { AnalysisHandler, UnsupportedAnalysisOperationError } from '../AnalysisHandler.js';
import type { IStorage } from '../../../interface/types/storage.js';
import { CodeGraphBuilder } from '../../../domain/services/CodeGraphBuilder.js';

function createStorageMock(): IStorage {
  return {
    type: 'memory',
    async initialize() {},
    async close() {},
    async saveCodeGraph() {},
    async loadCodeGraph() {
      return {
        project: { id: 'proj-1', name: 'demo', rootPath: '/tmp' },
        modules: [],
        symbols: [],
        dependencies: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          generator: 'test',
          version: '1.0.0',
        },
      };
    },
    async deleteProject() {},
    async updateModule() {},
    async deleteModule() {},
    async findModuleById() { return null; },
    async findModulesByPath() { return []; },
    async findSymbolByName() { return []; },
    async findSymbolById() { return null; },
    async findDependencies() { return []; },
    async findDependents() { return []; },
    async findCallers() { return []; },
    async findCallees() { return []; },
    async search() { return []; },
    async detectCycles() { return []; },
    async calculateImpact() {
      return {
        rootModule: 'root',
        affectedModules: [],
        depth: 1,
      };
    },
    async getStatistics() {
      return {
        totalModules: 0,
        totalSymbols: 0,
        totalDependencies: 0,
        totalProjects: 1,
      };
    },
  };
}

describe('AnalysisHandler', () => {
  const handler = new AnalysisHandler(
    createStorageMock(),
    CodeGraphBuilder.create({ mode: 'fast', rootDir: '/tmp' })
  );

  it('rejects analyze with an explicit unsupported error', async () => {
    await expect(handler.analyze({ projectPath: '/tmp' })).rejects.toMatchObject({
      name: 'UnsupportedAnalysisOperationError',
      code: 'ANALYSIS_NOT_SUPPORTED',
      statusCode: 501,
    } satisfies Partial<UnsupportedAnalysisOperationError>);
  });

  it('rejects refresh with an explicit unsupported error', async () => {
    await expect(handler.refresh('/tmp')).rejects.toMatchObject({
      name: 'UnsupportedAnalysisOperationError',
      code: 'REFRESH_NOT_SUPPORTED',
      statusCode: 501,
    } satisfies Partial<UnsupportedAnalysisOperationError>);
  });
});
