import { describe, expect, it } from 'vitest';
import type { CodeGraph } from '../../../interface/types/index.js';
import { getGraphMetadataFromGraph } from '../graph-helpers.js';
import { analyzeCommunitiesInGraph } from '../community-helpers.js';

function createCommunityGraphFixture(): CodeGraph {
  return {
    project: {
      id: 'proj-66',
      name: 'community-fixture',
      rootPath: '/fixture',
      createdAt: new Date('2026-05-09T00:00:00Z'),
      updatedAt: new Date('2026-05-09T00:00:00Z'),
    },
    modules: [
      {
        id: 'mod-auth-service',
        projectId: 'proj-66',
        path: 'src/auth/service.ts',
        language: 'ts',
        stats: { lines: 20, codeLines: 15, commentLines: 3, blankLines: 2 },
      },
      {
        id: 'mod-auth-policy',
        projectId: 'proj-66',
        path: 'src/auth/policy.ts',
        language: 'ts',
        stats: { lines: 18, codeLines: 14, commentLines: 2, blankLines: 2 },
      },
      {
        id: 'mod-billing-invoice',
        projectId: 'proj-66',
        path: 'src/billing/invoice.ts',
        language: 'ts',
        stats: { lines: 24, codeLines: 18, commentLines: 3, blankLines: 3 },
      },
      {
        id: 'mod-billing-ledger',
        projectId: 'proj-66',
        path: 'src/billing/ledger.ts',
        language: 'ts',
        stats: { lines: 22, codeLines: 17, commentLines: 3, blankLines: 2 },
      },
      {
        id: 'mod-shared-types',
        projectId: 'proj-66',
        path: 'src/shared/types.ts',
        language: 'ts',
        stats: { lines: 12, codeLines: 9, commentLines: 2, blankLines: 1 },
      },
    ],
    symbols: [
      {
        id: 'sym-auth-service',
        moduleId: 'mod-auth-service',
        name: 'authService',
        kind: 'function',
        location: { file: 'src/auth/service.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-auth-policy',
        moduleId: 'mod-auth-policy',
        name: 'authPolicy',
        kind: 'function',
        location: { file: 'src/auth/policy.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-billing-invoice',
        moduleId: 'mod-billing-invoice',
        name: 'invoice',
        kind: 'function',
        location: { file: 'src/billing/invoice.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-billing-ledger',
        moduleId: 'mod-billing-ledger',
        name: 'ledger',
        kind: 'function',
        location: { file: 'src/billing/ledger.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: [
      {
        id: 'dep-call-auth',
        sourceId: 'sym-auth-service',
        sourceEntityType: 'symbol',
        targetId: 'sym-auth-policy',
        targetEntityType: 'symbol',
        type: 'call',
        confidence: 'EXTRACTED',
      },
      {
        id: 'dep-inherit-auth',
        sourceId: 'mod-auth-policy',
        sourceEntityType: 'module',
        targetId: 'mod-auth-service',
        targetEntityType: 'module',
        type: 'inherit',
        confidence: 'EXTRACTED',
      },
      {
        id: 'dep-implement-billing',
        sourceId: 'mod-billing-invoice',
        sourceEntityType: 'module',
        targetId: 'mod-billing-ledger',
        targetEntityType: 'module',
        type: 'implement',
        confidence: 'EXTRACTED',
      },
      {
        id: 'dep-import-billing',
        sourceId: 'mod-billing-ledger',
        sourceEntityType: 'module',
        targetId: 'mod-billing-invoice',
        targetEntityType: 'module',
        type: 'import',
        confidence: 'EXTRACTED',
      },
      {
        id: 'dep-type-ref-auth-shared',
        sourceId: 'mod-auth-service',
        sourceEntityType: 'module',
        targetId: 'mod-shared-types',
        targetEntityType: 'module',
        type: 'type-ref',
        confidence: 'EXTRACTED',
      },
    ],
    graphStatus: 'complete',
    failedFileCount: 0,
    parseFailureFiles: [],
  };
}

describe('community-helpers', () => {
  it('projects persisted truth to weighted module communities using only supported dependency kinds', () => {
    const result = analyzeCommunitiesInGraph(createCommunityGraphFixture());

    expect(result).toEqual(expect.objectContaining({
      status: 'ok',
      confidence: 'high',
      summary: expect.objectContaining({
        totalModules: 5,
        totalEdges: 3,
        communityCount: 2,
      }),
    }));
    expect(result.communities).toEqual([
      expect.objectContaining({
        label: 'src/auth',
        modulePaths: ['src/auth/policy.ts', 'src/auth/service.ts', 'src/shared/types.ts'],
        dominantEdgeKinds: ['call', 'inherit', 'type-ref'],
      }),
      expect.objectContaining({
        label: 'src/billing',
        modulePaths: ['src/billing/invoice.ts', 'src/billing/ledger.ts'],
        dominantEdgeKinds: ['implement', 'import'],
      }),
    ]);
  });

  it('degrades sparse and singleton-heavy graphs instead of overclaiming precision', () => {
    const graph = createCommunityGraphFixture();
    graph.dependencies = [
      {
        id: 'dep-type-ref-auth-shared',
        sourceId: 'mod-auth-service',
        sourceEntityType: 'module',
        targetId: 'mod-shared-types',
        targetEntityType: 'module',
        type: 'type-ref',
        confidence: 'EXTRACTED',
      },
    ];

    const result = analyzeCommunitiesInGraph(graph);

    expect(result.confidence).toBe('reduced');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'LOW_SIGNAL_SPARSE_GRAPH' }),
      expect.objectContaining({ code: 'LOW_SIGNAL_SINGLETON_HEAVY' }),
    ]));
  });

  it('keeps partial truth visible in the shared warning contract', () => {
    const graph = createCommunityGraphFixture();
    graph.graphStatus = 'partial';
    graph.failedFileCount = 1;
    graph.parseFailureFiles = ['src/stale.ts'];

    const result = analyzeCommunitiesInGraph(graph, getGraphMetadataFromGraph(graph));

    expect(result.confidence).toBe('reduced');
    expect(result.graphStatus).toBe('partial');
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'GRAPH_PARTIAL' }),
    ]));
  });

  it('fails closed when persisted graph truth is missing', () => {
    const result = analyzeCommunitiesInGraph({
      project: {
        id: 'empty',
        name: 'empty',
        rootPath: '/fixture',
        createdAt: new Date('2026-05-09T00:00:00Z'),
        updatedAt: new Date('2026-05-09T00:00:00Z'),
      },
      modules: [],
      symbols: [],
      dependencies: [],
      graphStatus: 'complete',
      failedFileCount: 0,
      parseFailureFiles: [],
    });

    expect(result).toEqual(expect.objectContaining({
      status: 'unavailable',
      confidence: 'unavailable',
      graphStatus: 'missing',
      error: expect.objectContaining({ code: 'GRAPH_NOT_FOUND' }),
    }));
  });
});
