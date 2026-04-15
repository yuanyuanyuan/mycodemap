import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveDesignScope } from '../design-scope-resolver.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'design-contracts');

describe('design-scope-resolver', () => {
  it('resolves explicit file, module and symbol anchors with reason chains', async () => {
    const result = await resolveDesignScope({
      filePath: path.join(fixturesDir, 'mapping-basic.design.md'),
      rootDir: repoRoot,
    });

    expect(result.ok).toBe(true);
    expect(result.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'file',
          path: 'src/cli/commands/design.ts',
        }),
        expect.objectContaining({
          kind: 'module',
          path: 'src/cli/design-contract-loader.ts',
          moduleName: 'src/cli/design-contract-loader',
        }),
        expect.objectContaining({
          kind: 'symbol',
          path: 'src/cli/commands/design.ts',
          symbolName: 'runDesignValidate',
        }),
      ]),
    );

    const designFile = result.candidates.find(
      (candidate) => candidate.kind === 'file' && candidate.path === 'src/cli/commands/design.ts',
    );

    expect(designFile?.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: 'goal',
          matchedText: 'src/cli/commands/design.ts',
          evidenceType: 'path-anchor',
        }),
      ]),
    );
  });

  it('applies non-goals filtering and preserves non-empty reasons', async () => {
    const result = await resolveDesignScope({
      filePath: path.join(fixturesDir, 'mapping-basic.design.md'),
      rootDir: repoRoot,
    });

    expect(result.candidates.some((candidate) => candidate.path === 'src/cli/commands/analyze.ts')).toBe(false);
    expect(result.candidates.every((candidate) => candidate.reasons.length > 0)).toBe(true);
  });

  it('enriches candidates with dependencies, risk, confidence, testImpact and unknowns', async () => {
    const result = await resolveDesignScope({
      filePath: path.join(fixturesDir, 'mapping-basic.design.md'),
      rootDir: repoRoot,
    });

    const designCandidate = result.candidates.find(
      (candidate) => candidate.path === 'src/cli/commands/design.ts' && candidate.kind === 'file',
    );
    const typeCandidate = result.candidates.find(
      (candidate) => candidate.path === 'src/interface/types/design-mapping.ts',
    );

    expect(designCandidate).toEqual(
      expect.objectContaining({
        risk: expect.stringMatching(/^(high|medium|low)$/u),
        confidence: expect.objectContaining({
          score: expect.any(Number),
          level: expect.stringMatching(/^(high|medium|low)$/u),
        }),
      }),
    );
    expect(Array.isArray(designCandidate?.dependencies)).toBe(true);
    expect(Array.isArray(designCandidate?.testImpact)).toBe(true);
    expect(Array.isArray(designCandidate?.unknowns)).toBe(true);

    expect(typeCandidate?.testImpact).toEqual([]);
    expect(typeCandidate?.unknowns.length).toBeGreaterThan(0);
    expect(result.summary.candidateCount).toBeGreaterThan(0);
  });

  it('returns no-candidates blocker when explicit anchors resolve to nothing', async () => {
    const result = await resolveDesignScope({
      filePath: path.join(fixturesDir, 'no-match.design.md'),
      rootDir: repoRoot,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'no-candidates',
          blocker: true,
        }),
      ]),
    );
  });

  it('returns over-broad-scope blocker when candidate set exceeds reviewable size', async () => {
    const result = await resolveDesignScope({
      filePath: path.join(fixturesDir, 'over-broad.design.md'),
      rootDir: repoRoot,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'over-broad-scope',
          blocker: true,
        }),
      ]),
    );
  });

  it('returns high-risk-scope blocker for high blast-radius targets', async () => {
    const result = await resolveDesignScope({
      filePath: path.join(fixturesDir, 'high-risk.design.md'),
      rootDir: repoRoot,
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'high-risk-scope',
          blocker: true,
        }),
      ]),
    );
  });
});
