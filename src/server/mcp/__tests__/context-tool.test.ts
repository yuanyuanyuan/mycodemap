import { describe, expect, it } from 'vitest';
import type { CodeGraph } from '../../../interface/types/index.js';
import { MemoryStorage } from '../../../infrastructure/storage/adapters/MemoryStorage.js';
import { buildContextRoutingPayload } from '../context-tool.js';

function createGraphFixture(options: {
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
} = {}): CodeGraph {
  const updatedAt = options.updatedAt ?? new Date();

  return {
    project: {
      id: 'proj-ctx',
      name: 'fixture',
      rootPath: '/fixture',
      createdAt: updatedAt,
      updatedAt,
    },
    modules: [
      {
        id: 'mod-a',
        projectId: 'proj-ctx',
        path: 'src/a.ts',
        language: 'ts',
        stats: { lines: 10, codeLines: 8, commentLines: 1, blankLines: 1 },
      },
      {
        id: 'mod-b',
        projectId: 'proj-ctx',
        path: 'src/b.ts',
        language: 'ts',
        stats: { lines: 8, codeLines: 6, commentLines: 1, blankLines: 1 },
      },
    ],
    symbols: [
      {
        id: 'sym-a',
        moduleId: 'mod-a',
        name: 'alpha',
        kind: 'function',
        signature: 'alpha()',
        location: { file: 'src/a.ts', line: 1, column: 1 },
        visibility: 'public',
      },
      {
        id: 'sym-b',
        moduleId: 'mod-b',
        name: 'beta',
        kind: 'function',
        signature: 'beta()',
        location: { file: 'src/b.ts', line: 1, column: 1 },
        visibility: 'public',
      },
    ],
    dependencies: [
      {
        id: 'dep-1',
        sourceId: 'sym-a',
        sourceEntityType: 'symbol',
        targetId: 'sym-b',
        targetEntityType: 'symbol',
        type: 'call',
        confidence: 'high',
        filePath: 'src/a.ts',
        line: 2,
      },
      {
        id: 'dep-2',
        sourceId: 'mod-a',
        sourceEntityType: 'module',
        targetId: 'mod-b',
        targetEntityType: 'module',
        type: 'import',
        confidence: 'high',
        filePath: 'src/a.ts',
        line: 1,
      },
    ],
    graphStatus: options.graphStatus ?? 'complete',
    failedFileCount: options.failedFileCount ?? 0,
    parseFailureFiles: options.parseFailureFiles ?? [],
  };
}

async function createStorage(options: {
  withGraph?: boolean;
  updatedAt?: Date;
  graphStatus?: 'complete' | 'partial';
  failedFileCount?: number;
  parseFailureFiles?: string[];
} = {}): Promise<MemoryStorage> {
  const storage = new MemoryStorage();
  await storage.initialize('/fixture');
  if (options.withGraph ?? true) {
    await storage.saveCodeGraph(createGraphFixture(options));
  }
  return storage;
}

describe('buildContextRoutingPayload', () => {
  it('returns storage-backed graph stats and executable suggestions for review', async () => {
    const storage = await createStorage();

    const result = await buildContextRoutingPayload(storage, { task: 'review' });

    expect(result.status).toBe('ok');
    expect(result.task).toBe('review');
    expect(result.detailLevel).toBe('standard');
    expect(result.graphStats).toEqual({
      modules: 2,
      symbols: 2,
      edges: 2,
      cycles: 0,
    });
    expect(result.riskSummary.factors.length).toBeGreaterThan(0);
    expect(result.nextToolSuggestions.map(item => item.tool)).toEqual([
      'codemap_query',
      'codemap_impact',
      'codemap_analyze',
    ]);

    await storage.close();
  });

  it('degrades visibly when graph truth is missing', async () => {
    const storage = await createStorage({ withGraph: false });

    const result = await buildContextRoutingPayload(storage, { task: 'debug', detailLevel: 'minimal' });

    expect(result.status).toBe('ok');
    expect(result.confidence).toBe('reduced');
    expect(result.graph_status).toBe('missing');
    expect(result.riskSummary.factors).toContain('Graph metadata is missing, so routing confidence is reduced.');
    expect(result.warnings).toBeUndefined();
    expect(result.nextToolSuggestions.map(item => item.tool)).not.toContain('codemap_impact');
    expect(result.nextToolSuggestions[0]).toEqual(expect.objectContaining({ tool: 'codemap_doctor' }));

    await storage.close();
  });

  it('returns an explicit invalid-input result for unsupported tasks', async () => {
    const storage = await createStorage();

    const result = await buildContextRoutingPayload(storage, { task: 'triage' });

    expect(result.status).toBe('invalid_input');
    expect(result.error).toEqual(expect.objectContaining({ code: 'INVALID_TASK' }));
    expect(result.nextToolSuggestions).toEqual([]);

    await storage.close();
  });

  it('surfaces stale and partial graph truth in standard detail mode', async () => {
    const storage = await createStorage({
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      graphStatus: 'partial',
      failedFileCount: 2,
      parseFailureFiles: ['src/missing-a.ts', 'src/missing-b.ts'],
    });

    const result = await buildContextRoutingPayload(storage, {
      task: 'default',
      detailLevel: 'standard',
    });

    expect(result.status).toBe('ok');
    expect(result.confidence).toBe('reduced');
    expect(result.warnings).toEqual(expect.arrayContaining([
      'Graph truth is partial; parse failures may hide affected files or symbols.',
      'Graph truth is stale relative to the current workspace; refresh before relying on precise routing.',
    ]));
    expect(result.focusAreas).toEqual(expect.arrayContaining([
      'Parse failure: src/missing-a.ts',
      'Parse failure: src/missing-b.ts',
    ]));

    await storage.close();
  });

  it('fails visibly when a strict filter hides required suggestions', async () => {
    const storage = await createStorage();

    const result = await buildContextRoutingPayload(storage, {
      task: 'review',
      allowedTools: ['codemap_query'],
    });

    expect(result.status).toBe('invalid_input');
    expect(result.error).toEqual(expect.objectContaining({ code: 'FILTER_CONFLICT' }));
    expect(result.warnings).toEqual(expect.arrayContaining([
      'Blocked required suggestions: codemap_impact, codemap_analyze.',
    ]));

    await storage.close();
  });

  it('keeps minimal observably shorter than standard while preserving routing value', async () => {
    const storage = await createStorage({
      graphStatus: 'partial',
      failedFileCount: 1,
      parseFailureFiles: ['src/missing.ts'],
    });

    const minimal = await buildContextRoutingPayload(storage, {
      task: 'debug',
      detailLevel: 'minimal',
    });
    const standard = await buildContextRoutingPayload(storage, {
      task: 'debug',
      detailLevel: 'standard',
    });

    expect(minimal.detailLevel).toBe('minimal');
    expect(standard.detailLevel).toBe('standard');
    expect(minimal.summary).toBe(standard.summary);
    expect(minimal.rationale).toBeUndefined();
    expect(standard.rationale?.length).toBeGreaterThan(0);
    expect(JSON.stringify(minimal).length).toBeLessThan(JSON.stringify(standard).length);

    await storage.close();
  });
});
