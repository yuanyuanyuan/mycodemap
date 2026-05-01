import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { detectProjectType } from '../detect.js';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'codemap-detect-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('detectProjectType', () => {
  it('detects nodejs from package.json', () => {
    const dir = createTempDir();
    writeFileSync(path.join(dir, 'package.json'), '{}', 'utf8');

    const result = detectProjectType(dir);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].type).toBe('nodejs');
    expect(result.candidates[0].markerFile).toBe('package.json');
    expect(result.recommended).toBe('nodejs');
  });

  it('detects python from pyproject.toml', () => {
    const dir = createTempDir();
    writeFileSync(path.join(dir, 'pyproject.toml'), '', 'utf8');

    const result = detectProjectType(dir);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].type).toBe('python');
    expect(result.candidates[0].markerFile).toBe('pyproject.toml');
    expect(result.recommended).toBe('python');
  });

  it('detects go from go.mod', () => {
    const dir = createTempDir();
    writeFileSync(path.join(dir, 'go.mod'), '', 'utf8');

    const result = detectProjectType(dir);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].type).toBe('go');
    expect(result.candidates[0].markerFile).toBe('go.mod');
    expect(result.recommended).toBe('go');
  });

  it('detects rust from Cargo.toml', () => {
    const dir = createTempDir();
    writeFileSync(path.join(dir, 'Cargo.toml'), '', 'utf8');

    const result = detectProjectType(dir);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].type).toBe('rust');
    expect(result.candidates[0].markerFile).toBe('Cargo.toml');
    expect(result.recommended).toBe('rust');
  });

  it('returns no candidates when no markers exist', () => {
    const dir = createTempDir();

    const result = detectProjectType(dir);

    expect(result.candidates).toEqual([]);
    expect(result.recommended).toBeNull();
  });

  it('returns all candidates and null recommendation for multiple markers', () => {
    const dir = createTempDir();
    writeFileSync(path.join(dir, 'package.json'), '{}', 'utf8');
    writeFileSync(path.join(dir, 'Cargo.toml'), '', 'utf8');

    const result = detectProjectType(dir);

    expect(result.candidates).toHaveLength(2);
    const types = result.candidates.map((c) => c.type).sort();
    expect(types).toEqual(['nodejs', 'rust']);
    expect(result.recommended).toBeNull();
  });

  it('does not read file contents (works with invalid JSON)', () => {
    const dir = createTempDir();
    writeFileSync(path.join(dir, 'package.json'), 'this is not valid json {{{', 'utf8');

    const result = detectProjectType(dir);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].type).toBe('nodejs');
    expect(result.recommended).toBe('nodejs');
  });
});
