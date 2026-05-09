import { describe, expect, it } from 'vitest';
import type { CodeGraph } from '../../../interface/types/index.js';
import {
  analyzeImpactInGraph,
  calculateImpactInGraph,
  createEmptyCodeGraph,
  deserializeCodeGraphSnapshot,
  deleteModuleFromGraph,
  detectCyclesInGraph,
  findCalleesInGraph,
  findCallersInGraph,
  getProjectStatisticsFromGraph,
  serializeCodeGraphSnapshot,
  upsertModuleInGraph,
} from '../graph-helpers.js';

function createGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-1',
      name: 'fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-03-24T00:00:00Z'),
      updatedAt: new Date('2026-03-24T00:00:00Z'),
    },
    modules: [
      {
        id: 'mod-a',
        projectId: 'proj-1',
        path: 'src/a.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-b',
        projectId: 'proj-1',
        path: 'src/b.ts',
        language: 'ts',
        stats: { lines: 20, codeLines: 17, commentLines: 2, blankLines: 1 },
      },
      {
        id: 'mod-c',
        projectId: 'proj-1',
        path: 'src/c.ts',
        language: 'ts',
        stats: { lines: 30, codeLines: 24, commentLines: 3, blankLines: 3 },
      },
    ],
    symbols: [
      {
        id: 'sym-a',
        moduleId: 'mod-a',
        name: 'callA',
        kind: 'function',
        location: { file: 'src/a.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-b',
        moduleId: 'mod-b',
        name: 'callB',
        kind: 'function',
        location: { file: 'src/b.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: [
      { id: 'dep-1', sourceId: 'mod-a', targetId: 'mod-b', type: 'import' },
      { id: 'dep-2', sourceId: 'mod-b', targetId: 'mod-c', type: 'import' },
      { id: 'dep-3', sourceId: 'mod-c', targetId: 'mod-a', type: 'import' },
      { id: 'dep-4', sourceId: 'sym-a', targetId: 'sym-b', type: 'call' },
    ],
  };
}

describe('graph-helpers', () => {
  it('creates an empty graph with the provided project path', () => {
    const graph = createEmptyCodeGraph('/project-root');

    expect(graph.project.rootPath).toBe('/project-root');
    expect(graph.modules).toHaveLength(0);
  });

  it('upserts and deletes modules without mutating the original graph', () => {
    const graph = createGraphFixture();
    const updated = upsertModuleInGraph(graph, {
      id: 'mod-d',
      projectId: 'proj-1',
      path: 'src/d.ts',
      language: 'ts',
      stats: { lines: 5, codeLines: 4, commentLines: 0, blankLines: 1 },
    });
    const deleted = deleteModuleFromGraph(updated, 'mod-b');

    expect(graph.modules).toHaveLength(3);
    expect(updated.modules).toHaveLength(4);
    expect(deleted.modules.find(module => module.id === 'mod-b')).toBeUndefined();
    expect(deleted.symbols.find(symbol => symbol.moduleId === 'mod-b')).toBeUndefined();
  });

  it('finds callers/callees and graph analytics consistently', () => {
    const graph = createGraphFixture();

    expect(findCallersInGraph(graph, 'sym-b').map(symbol => symbol.id)).toEqual(['sym-a']);
    expect(findCalleesInGraph(graph, 'sym-a').map(symbol => symbol.id)).toEqual(['sym-b']);
    expect(detectCyclesInGraph(graph)).toEqual([
      {
        modules: ['mod-a', 'mod-b', 'mod-c'],
        length: 3,
      },
    ]);
  });

  it('calculates impact and statistics from the same graph contract', () => {
    const graph = createGraphFixture();

    expect(calculateImpactInGraph(graph, 'mod-c', 2)).toEqual(expect.objectContaining({
      status: 'ok',
      summary: expect.objectContaining({
        directCount: 1,
        transitiveCount: 1,
      }),
      direct: [
        expect.objectContaining({ id: 'mod-b', depth: 1, path: ['mod-c', 'mod-b'] }),
      ],
      transitiveLayers: [
        expect.objectContaining({
          depth: 2,
          nodes: [expect.objectContaining({ id: 'mod-a', depth: 2, path: ['mod-c', 'mod-b', 'mod-a'] })],
        }),
      ],
      affectedModules: [
        expect.objectContaining({ id: 'mod-b' }),
        expect.objectContaining({ id: 'mod-a' }),
      ],
    }));
    expect(getProjectStatisticsFromGraph(graph)).toEqual({
      totalModules: 3,
      totalSymbols: 2,
      totalDependencies: 4,
      totalLines: 60,
      averageComplexity: 0,
    });
  });

  it('serializes and deserializes graph snapshots with Date fields restored', () => {
    const graph = createGraphFixture();
    const roundTrip = deserializeCodeGraphSnapshot(serializeCodeGraphSnapshot(graph), '/fallback');

    expect(roundTrip.project.createdAt).toBeInstanceOf(Date);
    expect(roundTrip.project.updatedAt).toBeInstanceOf(Date);
    expect(roundTrip.project.rootPath).toBe('/fixture');
    expect(roundTrip.modules).toHaveLength(3);
  });

  it('returns explicit not_found and ambiguous impact states instead of empty success', () => {
    const graph = createGraphFixture();
    graph.symbols.push({
      id: 'sym-a-duplicate',
      moduleId: 'mod-b',
      name: 'callA',
      kind: 'function',
      location: { file: 'src/b.ts', line: 4, column: 1 },
      visibility: 'public',
    });

    expect(analyzeImpactInGraph(graph, {
      kind: 'file',
      filePath: 'src/missing.ts',
      depth: 2,
    })).toEqual(expect.objectContaining({
      status: 'not_found',
      error: expect.objectContaining({ code: 'FILE_NOT_FOUND' }),
    }));

    expect(analyzeImpactInGraph(graph, {
      kind: 'symbol',
      symbol: 'callA',
      depth: 2,
      limit: 10,
    })).toEqual(expect.objectContaining({
      status: 'ambiguous',
      error: expect.objectContaining({ code: 'AMBIGUOUS_ENTRYPOINT' }),
      entrypoint: expect.objectContaining({
        candidates: expect.arrayContaining([
          expect.objectContaining({ id: 'sym-a' }),
          expect.objectContaining({ id: 'sym-a-duplicate' }),
        ]),
      }),
    }));
  });

  it('degrades confidence for partial truth and marks traversal truncation explicitly', () => {
    const graph = createGraphFixture();
    graph.graphStatus = 'partial';
    graph.failedFileCount = 1;
    graph.parseFailureFiles = ['src/stale.ts'];

    const truncated = analyzeImpactInGraph(graph, {
      kind: 'file',
      filePath: 'src/a.ts',
      depth: 3,
      limit: 1,
    });

    expect(truncated).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'reduced',
      truncated: true,
      warnings: expect.arrayContaining([
        expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
        expect.objectContaining({ code: 'TRAVERSAL_TRUNCATED' }),
      ]),
      summary: expect.objectContaining({
        directCount: 1,
        transitiveCount: 0,
        truncated: true,
      }),
    }));
  });
});
