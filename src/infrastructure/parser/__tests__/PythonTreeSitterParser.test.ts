// [META] since:2026-05-09 | owner:cli-team | stable:false
// [WHY] PythonTreeSitterParser unit tests — AST-based Python parser
// ============================================

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PythonTreeSitterParser } from '../implementations/PythonTreeSitterParser.js';
import { PythonParser } from '../implementations/PythonParser.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TreeSitterParser } from '../implementations/TreeSitterParser.js';

const FIXTURE_DIR = resolve(import.meta.dirname, '../../../../tests/fixtures/python');

describe('PythonTreeSitterParser', () => {
  let parser: PythonTreeSitterParser;

  beforeEach(async () => {
    parser = new PythonTreeSitterParser();
    await parser.initialize();
  });

  describe('parseFile', () => {
    it('should parse a basic Python file', async () => {
      const content = 'import os\nclass Foo:\n    pass\ndef bar():\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.filePath).toBe('/tmp/test.py');
      expect(result.language).toBe('python');
      expect(result.parserUsed).toBe('PythonTreeSitterParser');
      expect(result.parseTime).toBeGreaterThanOrEqual(0);
    });

    it('should set parserUsed metadata to PythonTreeSitterParser', async () => {
      const result = await parser.parseFile('/tmp/test.py', 'x = 1\n');
      expect(result.parserUsed).toBe('PythonTreeSitterParser');
    });

    it('fails closed when tree-sitter grammar is unavailable', async () => {
      const initializeSpy = vi
        .spyOn(TreeSitterParser.prototype, 'initialize')
        .mockRejectedValueOnce(new Error('grammar unavailable'));

      const strictParser = new PythonTreeSitterParser();

      await expect(strictParser.initialize()).rejects.toThrow(/No silent fallback to regex parser/);

      initializeSpy.mockRestore();
    });
  });

  describe('extractImports', () => {
    it('should extract import statements', async () => {
      const content = 'import os\nimport sys\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports.length).toBeGreaterThanOrEqual(2);
      expect(result.imports.map(i => i.source)).toContain('os');
      expect(result.imports.map(i => i.source)).toContain('sys');
    });

    it('should extract from...import statements', async () => {
      const content = 'from pkg.module import helper\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports.length).toBeGreaterThanOrEqual(1);
      expect(result.imports[0]?.source).toBe('pkg.module');
      expect(result.imports[0]?.specifiers[0]?.name).toBe('helper');
    });

    it('should handle aliased imports', async () => {
      const content = 'import os as operating_system\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports[0]?.specifiers[0]?.alias).toBe('operating_system');
    });

    it('should handle relative imports', async () => {
      const content = 'from .relative import x\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports[0]?.sourceType).toBe('relative');
    });

    it('should handle wildcard imports', async () => {
      const content = 'from os import *\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports[0]?.specifiers[0]?.name).toBe('*');
    });

    it('should handle multi-line imports', async () => {
      const content = 'from typing import (\n    List,\n    Optional,\n    Dict,\n)\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports.length).toBeGreaterThanOrEqual(1);
      expect(result.imports[0]?.specifiers.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle future imports', async () => {
      const content = 'from __future__ import annotations\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.imports.length).toBeGreaterThanOrEqual(1);
      expect(result.imports.some(i => i.source === '__future__')).toBe(true);
    });
  });

  describe('extractExports', () => {
    it('should extract __all__ exports', async () => {
      const content = "__all__ = ['Service', 'run']\nclass Service:\n    pass\ndef run():\n    pass\n";
      const result = await parser.parseFile('/tmp/test.py', content);
      const exportNames = result.exports.map(e => e.name);
      expect(exportNames).toContain('Service');
      expect(exportNames).toContain('run');
    });

    it('should extract public class definitions as exports when no __all__', async () => {
      const content = 'class Service:\n    pass\nclass _Private:\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.exports.map(e => e.name)).toContain('Service');
      expect(result.exports.map(e => e.name)).not.toContain('_Private');
    });

    it('should extract public function definitions as exports when no __all__', async () => {
      const content = 'def run():\n    pass\ndef _private():\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.exports.map(e => e.name)).toContain('run');
      expect(result.exports.map(e => e.name)).not.toContain('_private');
    });
  });

  describe('extractSymbols', () => {
    it('should extract class definitions', async () => {
      const content = 'class Foo:\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.symbols.some(s => s.name === 'Foo' && s.kind === 'class')).toBe(true);
    });

    it('should extract class with multiple inheritance', async () => {
      const content = 'class Foo(Bar, Baz):\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      const foo = result.symbols.find(s => s.name === 'Foo');
      expect(foo?.extends).toContain('Bar');
      expect(foo?.extends).toContain('Baz');
    });

    it('should extract function definitions', async () => {
      const content = 'def hello():\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.symbols.some(s => s.name === 'hello' && s.kind === 'function')).toBe(true);
    });

    it('should extract async functions', async () => {
      const content = 'async def fetch():\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      const fn = result.symbols.find(s => s.name === 'fetch');
      expect(fn?.signature?.async).toBe(true);
    });

    it('should extract decorated definitions', async () => {
      const content = '@decorator\ndef foo():\n    pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      const fn = result.symbols.find(s => s.name === 'foo');
      expect(fn?.decorators).toBeDefined();
      expect(fn?.decorators?.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract nested class definitions', async () => {
      const content = 'class Outer:\n    class Inner:\n        pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.symbols.some(s => s.name === 'Outer')).toBe(true);
      expect(result.symbols.some(s => s.name === 'Inner')).toBe(true);
    });

    it('should extract nested function definitions', async () => {
      const content = 'def outer():\n    def inner():\n        pass\n';
      const result = await parser.parseFile('/tmp/test.py', content);
      expect(result.symbols.some(s => s.name === 'outer')).toBe(true);
      expect(result.symbols.some(s => s.name === 'inner')).toBe(true);
    });
  });

  describe('comparison test (D-18)', () => {
    it('AST parser handles nested definitions and multi-line imports that regex misses', async () => {
      const content = await readFile(resolve(FIXTURE_DIR, 'comprehensive.py'), 'utf-8');

      const astResult = await parser.parseFile('/tmp/comprehensive.py', content);

      const regexParser = new PythonParser();
      await regexParser.initialize();
      const regexResult = await regexParser.parseFile('/tmp/comprehensive.py', content);

      // AST finds nested class Config (inside UserService), regex does not (regex uses ^ anchor)
      expect(astResult.symbols.some(s => s.name === 'Config')).toBe(true);
      expect(regexResult.symbols.some(s => s.name === 'Config')).toBe(false);

      // AST finds nested function validate (inside create_user), regex does not
      expect(astResult.symbols.some(s => s.name === 'validate')).toBe(true);
      expect(regexResult.symbols.some(s => s.name === 'validate')).toBe(false);

      // AST detects decorators (@dataclass, @staticmethod)
      expect(astResult.symbols.some(s => s.decorators && s.decorators.length > 0)).toBe(true);

      // AST detects async functions (fetch_all, sync_users)
      expect(astResult.symbols.some(s => s.signature?.async === true)).toBe(true);

      // parserUsed is set on AST result
      expect(astResult.parserUsed).toBe('PythonTreeSitterParser');

      // AST finds top-level symbols too (parity with regex)
      expect(astResult.symbols.some(s => s.name === 'UserService')).toBe(true);
      expect(astResult.symbols.some(s => s.name === 'create_user')).toBe(true);
      expect(astResult.symbols.some(s => s.name === 'AdminRole')).toBe(true);
    });
  });
});
