// ============================================
// FastParser Unit Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { FastParser } from '../implementations/fast-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test files
const testDir = path.join(__dirname, 'fixtures');
const testFile = path.join(testDir, 'test-parser.ts');

describe('FastParser', () => {
  let parser: FastParser;

  beforeEach(async () => {
    // Create test directory and files
    await fs.mkdir(testDir, { recursive: true });

    // Create a test TypeScript file
    const testContent = `
// This is a comment

export class TestClass {
  public name: string;
  private value: number;

  constructor(name: string) {
    this.name = name;
    this.value = 0;
  }

  public getValue(): number {
    return this.value;
  }
}

export interface TestInterface {
  id: number;
  title: string;
}

export type TestType = string | number;

export enum TestEnum {
  A = 1,
  B = 2
}

export function testFunction(a: number, b: number): number {
  return a + b;
}

export const testConst = 'test';

import { Something } from 'some-module';
import DefaultExport from './local-module';

export { TestClass, TestInterface };
`;
    await fs.writeFile(testFile, testContent, 'utf-8');

    parser = new FastParser({});
  });

  describe('constructor', () => {
    it('should create a parser instance', () => {
      expect(parser).toBeDefined();
      expect(parser.name).toBe('fast-parser');
      expect(parser.mode).toBe('fast');
    });
  });

  describe('parseFile', () => {
    it('should parse a TypeScript file', async () => {
      const result = await parser.parseFile(testFile);

      expect(result).toBeDefined();
      expect(result.path).toBe(testFile);
      expect(result.type).toBe('source');
    });

    it('should extract exports', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.exports.length).toBeGreaterThan(0);
      const exportNames = result.exports.map(e => e.name);
      expect(exportNames).toContain('TestClass');
      expect(exportNames).toContain('TestInterface');
      expect(exportNames).toContain('TestType');
      expect(exportNames).toContain('TestEnum');
      expect(exportNames).toContain('testFunction');
    });

    it('should extract imports', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.imports.length).toBeGreaterThan(0);
      const sources = result.imports.map(i => i.source);
      expect(sources).toContain('some-module');
      expect(sources).toContain('./local-module');
    });

    it('should extract symbols', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.symbols.length).toBeGreaterThan(0);
      const symbolNames = result.symbols.map(s => s.name);
      expect(symbolNames).toContain('TestClass');
      expect(symbolNames).toContain('testFunction');
    });

    it('should calculate dependencies', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.dependencies).toContain('some-module');
      expect(result.dependencies).not.toContain('./local-module');
    });

    it('should calculate file stats', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.stats).toBeDefined();
      expect(result.stats.lines).toBeGreaterThan(0);
      expect(result.stats.codeLines).toBeGreaterThan(0);
      expect(result.stats.commentLines).toBe(1); // One comment line
    });
  });

  describe('parseFiles', () => {
    it('should parse multiple files', async () => {
      const results = await parser.parseFiles([testFile, testFile]);

      expect(results.length).toBe(2);
      expect(results[0].path).toBe(testFile);
      expect(results[1].path).toBe(testFile);
    });

    it('should handle non-existent files gracefully', async () => {
      const results = await parser.parseFiles([testFile, '/non/existent/file.ts']);

      // Should still return results for valid files, skip invalid ones
      expect(results.length).toBe(1);
      expect(results[0].path).toBe(testFile);
    });
  });

  describe('module type detection', () => {
    it('should identify test files', async () => {
      const testFilePath = path.join(testDir, 'test-parser.test.ts');
      await fs.writeFile(testFilePath, 'export const test = 1;', 'utf-8');

      const result = await parser.parseFile(testFilePath);
      expect(result.type).toBe('test');

      await fs.unlink(testFilePath);
    });

    it('should identify config files', async () => {
      const configFilePath = path.join(testDir, 'tsconfig.json');
      await fs.writeFile(configFilePath, '{}', 'utf-8');

      const result = await parser.parseFile(configFilePath);
      expect(result.type).toBe('config');

      await fs.unlink(configFilePath);
    });

    it('should identify type definition files', async () => {
      const typeFilePath = path.join(testDir, 'test.d.ts');
      await fs.writeFile(typeFilePath, 'declare const test: number;', 'utf-8');

      const result = await parser.parseFile(typeFilePath);
      expect(result.type).toBe('type');

      await fs.unlink(typeFilePath);
    });
  });

  describe('dispose', () => {
    it('should dispose without errors', () => {
      expect(() => parser.dispose()).not.toThrow();
    });
  });
});

// Cleanup
afterAll(async () => {
  try {
    await fs.unlink(testFile);
    await fs.rmdir(testDir);
  } catch {
    // Ignore cleanup errors
  }
});
