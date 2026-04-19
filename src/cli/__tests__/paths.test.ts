import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveOutputDir } from '../paths.js';

function createTempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), 'codemap-paths-'));
}

describe('paths', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('prefers configured output even when legacy .codemap exists', () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    mkdirSync(path.join(rootDir, '.codemap'));
    writeFileSync(
      path.join(rootDir, 'mycodemap.config.json'),
      JSON.stringify({ output: '.mycodemap' }, null, 2)
    );

    const resolved = resolveOutputDir(undefined, rootDir);

    expect(resolved.outputDir).toBe(path.join(rootDir, '.mycodemap'));
    expect(resolved.isLegacy).toBe(false);
    expect(resolved.dataPath).toBe(path.join(rootDir, '.mycodemap', 'codemap.json'));
  });

  it('falls back to legacy .codemap when no config prefers a new path', () => {
    const rootDir = createTempRoot();
    tempRoots.push(rootDir);

    mkdirSync(path.join(rootDir, '.codemap'));

    const resolved = resolveOutputDir(undefined, rootDir);

    expect(resolved.outputDir).toBe(path.join(rootDir, '.codemap'));
    expect(resolved.isLegacy).toBe(true);
    expect(resolved.dataPath).toBe(path.join(rootDir, '.codemap', 'codemap.json'));
  });
});
