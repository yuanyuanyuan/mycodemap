// ============================================
// SmartParser Unit Tests
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { SmartParser } from '../implementations/smart-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test files
const testDir = path.join(__dirname, 'fixtures-smart');
const testFile = path.join(testDir, 'test-smart.ts');

describe('SmartParser', () => {
  let parser: SmartParser;

  beforeEach(async () => {
    // Create test directory and files
    await fs.mkdir(testDir, { recursive: true });

    // Create a test TypeScript file with complex code
    const testContent = `
export class TestClass {
  public name: string;
  private value: number;

  constructor(name: string) {
    this.name = name;
    this.value = 0;
  }

  public getValue(): number {
    if (this.value > 10) {
      return this.value * 2;
    } else {
      return this.value;
    }
  }
}

export interface TestInterface {
  id: number;
  title: string;
  optional?: boolean;
}

export type TestType = string | number;

export enum TestEnum {
  A = 1,
  B = 2
}

export function testFunction(a: number, b: number): number {
  if (a > b) {
    return a;
  } else if (b > a) {
    return b;
  }
  return 0;
}

export function complexFunction(x: number): number {
  let result = 0;
  for (let i = 0; i < x; i++) {
    if (i % 2 === 0) {
      result += i;
    } else {
      result -= i;
    }
  }
  return result;
}

const testConst = 'test';

import { Something } from 'some-module';
import DefaultExport from './local-module';

export { TestClass, TestInterface };
`;
    await fs.writeFile(testFile, testContent, 'utf-8');

    parser = new SmartParser({});
  });

  describe('constructor', () => {
    it('should create a parser instance', () => {
      expect(parser).toBeDefined();
      expect(parser.name).toBe('smart-parser');
      expect(parser.mode).toBe('smart');
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
    });

    it('should extract imports', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.imports.length).toBeGreaterThan(0);
      const sources = result.imports.map(i => i.source);
      expect(sources).toContain('some-module');
    });

    it('should extract symbols', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.symbols.length).toBeGreaterThan(0);
      const symbolNames = result.symbols.map(s => s.name);
      expect(symbolNames).toContain('TestClass');
      expect(symbolNames).toContain('testFunction');
    });

    it('should extract type information', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.typeInfo).toBeDefined();
      expect(result.typeInfo.typeDefinitions.length).toBeGreaterThan(0);
    });

    it('should extract call graph', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.callGraph).toBeDefined();
    });

    it('should calculate complexity metrics', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.complexity).toBeDefined();
      expect(result.complexity.cyclomatic).toBeGreaterThan(0);
    });

    it('should calculate file stats', async () => {
      const result = await parser.parseFile(testFile);

      expect(result.stats).toBeDefined();
      expect(result.stats.lines).toBeGreaterThan(0);
      expect(result.stats.codeLines).toBeGreaterThan(0);
    });
  });

  describe('parseFiles', () => {
    it('should parse multiple files', async () => {
      const results = await parser.parseFiles([testFile, testFile]);

      expect(results.length).toBe(2);
    });

    it('should handle non-existent files gracefully', async () => {
      const results = await parser.parseFiles([testFile, '/non/existent/file.ts']);

      // Should still return results for valid files, skip invalid ones
      expect(results.length).toBe(1);
      expect(results[0].path).toBe(testFile);
    });
  });

  describe('complexity calculation', () => {
    it('should calculate higher complexity for functions with more branches', async () => {
      const result = await parser.parseFile(testFile);

      // complexFunction has a loop and conditionals, should have higher complexity
      const complexFunc = result.complexity.details.functions.find(
        f => f.name === 'complexFunction'
      );
      expect(complexFunc).toBeDefined();
      expect(complexFunc!.cyclomatic).toBeGreaterThan(1);
    });

    it('should calculate cognitive complexity', async () => {
      const result = await parser.parseFile(testFile);

      const hasCognitive = result.complexity.details.functions.some(
        f => f.cognitive !== undefined
      );
      expect(hasCognitive).toBe(true);
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
