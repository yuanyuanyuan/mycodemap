import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { scanFileComplexity, scanComplexity } from '../complexity-scanner.js';

const tempRoots: string[] = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

function createTempDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'codemap-complexity-'));
  tempRoots.push(root);
  return root;
}

describe('scanFileComplexity', () => {
  it('returns correct score and functions count for a simple TS file', () => {
    const rootDir = createTempDir();
    const filePath = path.join(rootDir, 'simple.ts');
    // cyclomatic = 2 (1 base + 1 if-branch)
    writeFileSync(filePath, 'function foo(x: number) { if (x > 0) { return 1; } return 2; }', 'utf8');

    const result = scanFileComplexity(filePath, rootDir);
    expect(result).not.toBeNull();
    expect(result!.file).toBe('simple.ts');
    expect(result!.score).toBeGreaterThanOrEqual(2);
    expect(result!.functions).toBeGreaterThanOrEqual(1);
  });

  it('returns null for a .py file (extension filter)', () => {
    const rootDir = createTempDir();
    const filePath = path.join(rootDir, 'script.py');
    writeFileSync(filePath, 'def foo(): pass', 'utf8');

    const result = scanFileComplexity(filePath, rootDir);
    expect(result).toBeNull();
  });

  it('returns null for a .go file (extension filter)', () => {
    const rootDir = createTempDir();
    const filePath = path.join(rootDir, 'main.go');
    writeFileSync(filePath, 'package main\nfunc main() {}', 'utf8');

    const result = scanFileComplexity(filePath, rootDir);
    expect(result).toBeNull();
  });

  it('returns null for malformed JS (syntax error)', () => {
    const rootDir = createTempDir();
    const filePath = path.join(rootDir, 'broken.js');
    writeFileSync(filePath, 'function foo() { if ( { return; }', 'utf8');

    const result = scanFileComplexity(filePath, rootDir);
    expect(result).toBeNull();
  });

  it('returns null for non-existent file', () => {
    const rootDir = createTempDir();
    const filePath = path.join(rootDir, 'missing.ts');

    const result = scanFileComplexity(filePath, rootDir);
    expect(result).toBeNull();
  });
});

describe('scanComplexity', () => {
  it('returns sorted top-5 hotspots by score descending', () => {
    const rootDir = createTempDir();
    mkdirSync(path.join(rootDir, 'src'), { recursive: true });

    // Low complexity file
    writeFileSync(
      path.join(rootDir, 'src', 'low.ts'),
      'function low() { return 1; }',
      'utf8',
    );

    // Medium complexity file
    writeFileSync(
      path.join(rootDir, 'src', 'medium.ts'),
      'function med(x: number) { if (x > 0) { return 1; } if (x < -1) { return -1; } return 0; }',
      'utf8',
    );

    // High complexity file
    writeFileSync(
      path.join(rootDir, 'src', 'high.ts'),
      [
        'function high(a: boolean, b: boolean, c: boolean, d: boolean) {',
        '  if (a) { return 1; }',
        '  if (b) { return 2; }',
        '  if (c) { return 3; }',
        '  if (d) { return 4; }',
        '  return 0;',
        '}',
      ].join('\n'),
      'utf8',
    );

    const files = [
      path.join(rootDir, 'src', 'low.ts'),
      path.join(rootDir, 'src', 'medium.ts'),
      path.join(rootDir, 'src', 'high.ts'),
    ];

    const hotspots = scanComplexity(files, rootDir);
    expect(hotspots.length).toBe(3);
    // Sorted descending by score
    for (let i = 1; i < hotspots.length; i++) {
      expect(hotspots[i - 1].score).toBeGreaterThanOrEqual(hotspots[i].score);
    }
    // Highest should be 'high.ts'
    expect(hotspots[0].file).toContain('high');
  });

  it('filters out non-JS/TS files and returns correct hotspots', () => {
    const rootDir = createTempDir();

    writeFileSync(path.join(rootDir, 'app.ts'), 'function app() { if (x) { return 1; } return 0; }', 'utf8');
    writeFileSync(path.join(rootDir, 'main.py'), 'def main(): pass', 'utf8');
    writeFileSync(path.join(rootDir, 'main.go'), 'package main', 'utf8');

    const files = [
      path.join(rootDir, 'app.ts'),
      path.join(rootDir, 'main.py'),
      path.join(rootDir, 'main.go'),
    ];

    const hotspots = scanComplexity(files, rootDir);
    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].file).toBe('app.ts');
  });

  it('returns empty array when no JS/TS files exist', () => {
    const rootDir = createTempDir();
    writeFileSync(path.join(rootDir, 'main.py'), 'def main(): pass', 'utf8');
    writeFileSync(path.join(rootDir, 'main.rs'), 'fn main() {}', 'utf8');

    const files = [
      path.join(rootDir, 'main.py'),
      path.join(rootDir, 'main.rs'),
    ];

    const hotspots = scanComplexity(files, rootDir);
    expect(hotspots).toEqual([]);
  });

  it('caps results at top-5 when more than 5 JS files exist', () => {
    const rootDir = createTempDir();

    // Create 8 JS files with varying complexity
    for (let i = 0; i < 8; i++) {
      const branches = ' if (x) {} '.repeat(i + 1);
      writeFileSync(
        path.join(rootDir, `file${i}.js`),
        `function f${i}() {${branches}}`,
        'utf8',
      );
    }

    const files = Array.from({ length: 8 }, (_, i) =>
      path.join(rootDir, `file${i}.js`),
    );

    const hotspots = scanComplexity(files, rootDir);
    expect(hotspots).toHaveLength(5);
    // Verify sorted descending
    for (let i = 1; i < hotspots.length; i++) {
      expect(hotspots[i - 1].score).toBeGreaterThanOrEqual(hotspots[i].score);
    }
  });
});
