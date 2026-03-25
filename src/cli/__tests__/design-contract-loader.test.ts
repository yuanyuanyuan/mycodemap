import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  hasBlockingDesignContractDiagnostics,
  loadDesignContract,
} from '../design-contract-loader.js';
import { DEFAULT_DESIGN_CONTRACT_PATH } from '../design-contract-schema.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'design-contracts');

describe('design-contract-loader', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('loads a valid design contract from an explicit path', async () => {
    const filePath = path.join(fixturesDir, 'valid-basic.design.md');
    const result = await loadDesignContract({ filePath });

    expect(result.ok).toBe(true);
    expect(result.exists).toBe(true);
    expect(result.contract.metadata.title).toContain('Design validate command');
    expect(result.contract.missingRequiredSections).toEqual([]);
    expect(result.contract.orderedSections.map((section) => section.id)).toEqual([
      'goal',
      'constraints',
      'acceptanceCriteria',
      'nonGoals',
      'context',
    ]);
  });

  it('uses the default file name when filePath is omitted', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-design-contract-'));
    tempRoots.push(root);

    cpSync(
      path.join(fixturesDir, 'valid-basic.design.md'),
      path.join(root, DEFAULT_DESIGN_CONTRACT_PATH),
    );

    const result = await loadDesignContract({ rootDir: root });

    expect(result.ok).toBe(true);
    expect(result.filePath).toBe(path.join(root, DEFAULT_DESIGN_CONTRACT_PATH));
  });

  it('reports a missing required section as a blocking diagnostic', async () => {
    const filePath = path.join(fixturesDir, 'missing-acceptance.design.md');
    const result = await loadDesignContract({ filePath });

    expect(result.ok).toBe(false);
    expect(result.contract.missingRequiredSections).toContain('acceptanceCriteria');
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-section',
          section: 'acceptanceCriteria',
          severity: 'error',
        }),
      ]),
    );
    expect(hasBlockingDesignContractDiagnostics(result.diagnostics)).toBe(true);
  });

  it('captures duplicate, empty and unknown sections', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-design-contract-'));
    tempRoots.push(root);

    const contractPath = path.join(root, DEFAULT_DESIGN_CONTRACT_PATH);
    writeFileSync(
      contractPath,
      [
        '# Design Contract: Invalid example',
        '',
        '## Goal',
        '- one goal',
        '',
        '## Goal',
        '- duplicate goal',
        '',
        '## Constraints',
        '',
        '## Acceptance Criteria',
        '- criterion',
        '',
        '## Non-Goals',
        '- not now',
        '',
        '## Surprise',
        '- unknown heading',
      ].join('\n'),
    );

    const result = await loadDesignContract({ filePath: contractPath });
    const diagnosticCodes = result.diagnostics.map((diagnostic) => diagnostic.code);

    expect(diagnosticCodes).toContain('duplicate-section');
    expect(diagnosticCodes).toContain('empty-section');
    expect(diagnosticCodes).toContain('unknown-section');
  });

  it('returns file-not-found diagnostics when the default file is missing', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-design-contract-'));
    tempRoots.push(root);

    const result = await loadDesignContract({ rootDir: root });

    expect(result.exists).toBe(false);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'file-not-found', severity: 'error' }),
      ]),
    );
  });
});
