import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveContractDiffScope } from '../contract-diff-scope.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'contract-check', 'invalid-project');

describe('contract-diff-scope', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('uses full scan when no explicit diff input is provided', async () => {
    const scope = await resolveContractDiffScope({
      againstPath: fixtureRoot,
      rootDir: repoRoot,
    });

    expect(scope).toEqual({
      scanMode: 'full',
      changedFiles: [],
      warnings: [],
    });
  });

  it('normalizes explicit changed files inside the against scope', async () => {
    const scope = await resolveContractDiffScope({
      againstPath: fixtureRoot,
      rootDir: repoRoot,
      changedFiles: [
        path.join(
          'tests',
          'fixtures',
          'contract-check',
          'invalid-project',
          'src',
          'core',
          'bad.ts',
        ),
      ],
    });

    expect(scope.scanMode).toBe('diff');
    expect(scope.changedFiles).toEqual(['src/core/bad.ts']);
    expect(scope.warnings).toEqual([]);
  });

  it('falls back to full scan for an invalid git base', async () => {
    const scope = await resolveContractDiffScope({
      againstPath: fixtureRoot,
      rootDir: repoRoot,
      base: 'not-a-real-base-ref',
    });

    expect(scope.scanMode).toBe('full');
    expect(scope.changedFiles).toEqual([]);
    expect(scope.warnings).toEqual([
      expect.objectContaining({
        code: 'diff-scope-fallback',
        details: expect.objectContaining({
          recommended_mode: 'warn-only',
        }),
      }),
    ]);
  });

  it('falls back when changed files are outside the against scope', async () => {
    const scope = await resolveContractDiffScope({
      againstPath: fixtureRoot,
      rootDir: repoRoot,
      changedFiles: ['src/cli/index.ts'],
    });

    expect(scope.scanMode).toBe('full');
    expect(scope.warnings).toEqual([
      expect.objectContaining({
        code: 'diff-scope-fallback',
        details: expect.objectContaining({
          recommended_mode: 'warn-only',
        }),
      }),
    ]);
  });

  it('keeps diff scan but warns when changed files exceed the hard-gate window', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'codemap-contract-diff-scope-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'diff-scope-window' }));

    const changedFiles = Array.from({ length: 11 }, (_, index) => {
      const filePath = path.join(root, 'src', `file-${index + 1}.ts`);
      writeFileSync(filePath, `export const value${index + 1} = ${index + 1};\n`);
      return filePath;
    });

    const scope = await resolveContractDiffScope({
      againstPath: root,
      rootDir: root,
      changedFiles,
    });

    expect(scope.scanMode).toBe('diff');
    expect(scope.changedFiles).toHaveLength(11);
    expect(scope.warnings).toEqual([
      expect.objectContaining({
        code: 'hard-gate-window-exceeded',
        details: expect.objectContaining({
          changed_files: 11,
          max_changed_files: 10,
          recommended_mode: 'warn-only',
        }),
      }),
    ]);
  });
});
