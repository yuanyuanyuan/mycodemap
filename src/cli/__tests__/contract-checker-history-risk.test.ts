import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { FileHistoryAnalysisResult } from '../../interface/types/history-risk.js';
import { runContractCheck } from '../contract-checker.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const designFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'design-contracts');
const contractCheckFixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'contract-check');

function createHistoryResult(
  files: readonly string[],
  level: 'high' | 'unavailable' = 'high',
): FileHistoryAnalysisResult {
  return {
    requestedFiles: [...files],
    files: files.map((file) => ({
      file,
      risk: {
        level,
        score: level === 'unavailable' ? null : 0.82,
        gravity: level === 'unavailable' ? null : 0.7,
        heat: level === 'unavailable'
          ? null
          : {
              freq30d: 8,
              lastType: 'BUGFIX',
              lastDate: '2026-04-15T00:00:00.000Z',
              stability: false,
            },
        impact: level === 'unavailable' ? null : 0.5,
        riskFactors: level === 'unavailable' ? ['no-history'] : ['risk-enriched'],
      },
      timeline: [],
      diagnostics: {
        status: level === 'unavailable' ? 'unavailable' : 'ok',
        confidence: level === 'unavailable' ? 'unavailable' : 'high',
        freshness: level === 'unavailable' ? 'unknown' : 'fresh',
        source: level === 'unavailable' ? 'unavailable' : 'git-live',
        reasons: level === 'unavailable' ? ['no history available'] : ['history materialized'],
        analyzedAt: level === 'unavailable' ? null : '2026-04-15T00:00:00.000Z',
        scopeMode: 'full',
        requestedFiles: 1,
        analyzedFiles: level === 'unavailable' ? 0 : 1,
        requiresPrecompute: false,
      },
    })),
    aggregatedRisk: {
      level,
      score: level === 'unavailable' ? null : 0.82,
      gravity: level === 'unavailable' ? null : 0.7,
      heat: level === 'unavailable'
        ? null
        : {
            freq30d: 8,
            lastType: 'BUGFIX',
            lastDate: '2026-04-15T00:00:00.000Z',
            stability: false,
          },
      impact: level === 'unavailable' ? null : 0.5,
      riskFactors: level === 'unavailable' ? ['no-history'] : ['risk-enriched'],
    },
    diagnostics: {
      status: level === 'unavailable' ? 'unavailable' : 'ok',
      confidence: level === 'unavailable' ? 'unavailable' : 'high',
      freshness: level === 'unavailable' ? 'unknown' : 'fresh',
      source: level === 'unavailable' ? 'unavailable' : 'git-live',
      reasons: level === 'unavailable' ? ['no history available'] : ['history materialized'],
      analyzedAt: level === 'unavailable' ? null : '2026-04-15T00:00:00.000Z',
      scopeMode: 'full',
      requestedFiles: files.length,
      analyzedFiles: level === 'unavailable' ? 0 : files.length,
      requiresPrecompute: false,
    },
  };
}

describe('contract-checker history risk enrichment', () => {
  it('enriches violations in one batched history query without changing severity summary', async () => {
    const analyzeFilesMock = vi.fn(async (files: readonly string[]) => createHistoryResult(files));

    const result = await runContractCheck({
      contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
      againstPath: path.join(contractCheckFixturesDir, 'invalid-project'),
      rootDir: repoRoot,
      historyRiskService: {
        analyzeFiles: analyzeFilesMock,
      },
    });

    expect(analyzeFilesMock).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual(expect.objectContaining({
      total_violations: 3,
      error_count: 2,
      warn_count: 1,
    }));
    expect(result.violations.every((violation) => violation.risk?.level === 'high')).toBe(true);
    expect(result.history).toEqual(expect.objectContaining({
      status: 'ok',
      enriched_file_count: analyzeFilesMock.mock.calls[0]?.[0].length,
    }));
  });

  it('keeps violations and emits unavailable warning when history signals are missing', async () => {
    const analyzeFilesMock = vi.fn(async (files: readonly string[]) => createHistoryResult(files, 'unavailable'));

    const result = await runContractCheck({
      contractPath: path.join(designFixturesDir, 'valid-frontmatter.design.md'),
      againstPath: path.join(contractCheckFixturesDir, 'invalid-project'),
      rootDir: repoRoot,
      historyRiskService: {
        analyzeFiles: analyzeFilesMock,
      },
    });

    expect(result.summary.total_violations).toBe(3);
    expect(result.violations).toHaveLength(3);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'history-risk-unavailable',
        }),
      ]),
    );
    expect(result.history).toEqual(expect.objectContaining({
      status: 'unavailable',
      unavailable_count: analyzeFilesMock.mock.calls[0]?.[0].length,
    }));
  });
});
