import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestLinker } from '../test-linker.js';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('TestLinker', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'testlinker-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should use default rootDir', () => {
      const linker = new TestLinker();
      expect(linker).toBeDefined();
    });

    it('should accept custom rootDir', () => {
      const linker = new TestLinker({ rootDir: '/custom/path' });
      expect(linker).toBeDefined();
    });

    it('should accept custom framework', () => {
      const linker = new TestLinker({ framework: 'jest' });
      expect(linker).toBeDefined();
    });
  });

  describe('resolveTestFile', () => {
    it('should return null for non-existent source file', async () => {
      const linker = new TestLinker({ rootDir: tempDir });
      const result = await linker.resolveTestFile('non-existent.ts');
      expect(result).toBeNull();
    });

    it('should find test file with .test.ts extension', async () => {
      mkdirSync(join(tempDir, 'src'), { recursive: true });
      writeFileSync(join(tempDir, 'src', 'utils.ts'), 'export const foo = 1;');
      writeFileSync(join(tempDir, 'src', 'utils.test.ts'), 'test("foo", () => {});');

      const linker = new TestLinker({ rootDir: tempDir });
      const result = await linker.resolveTestFile(join(tempDir, 'src', 'utils.ts'));

      expect(result).toContain('utils.test.ts');
    });

    it('should find test file with .spec.ts extension', async () => {
      mkdirSync(join(tempDir, 'src'), { recursive: true });
      writeFileSync(join(tempDir, 'src', 'helper.ts'), 'export const bar = 2;');
      writeFileSync(join(tempDir, 'src', 'helper.spec.ts'), 'describe("bar", () => {});');

      const linker = new TestLinker({ rootDir: tempDir });
      const result = await linker.resolveTestFile(join(tempDir, 'src', 'helper.ts'));

      expect(result).toContain('helper.spec.ts');
    });
  });

  describe('resolveTestFiles', () => {
    it('should resolve multiple source files', async () => {
      mkdirSync(join(tempDir, 'src'), { recursive: true });
      writeFileSync(join(tempDir, 'src', 'a.ts'), 'export const a = 1;');
      writeFileSync(join(tempDir, 'src', 'b.ts'), 'export const b = 2;');

      const linker = new TestLinker({ rootDir: tempDir });
      const results = await linker.resolveTestFiles([
        join(tempDir, 'src', 'a.ts'),
        join(tempDir, 'src', 'b.ts'),
      ]);

      expect(results).toHaveLength(2);
    });
  });
});
