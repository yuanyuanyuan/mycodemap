---
phase: 67-tree-sitter-python-grammar
plan: TREE-SITTER-PYTHON
type: feature
wave: 4
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - src/interface/types/parser.ts
  - src/infrastructure/parser/implementations/PythonTreeSitterParser.ts
  - src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts
  - src/infrastructure/parser/index.ts
  - tests/fixtures/python/*.py
autonomous: true
requirements: [PY-01, PY-02]
---

# Phase 67 PLAN: Tree-sitter Python Grammar Integration

**Phase:** 67-tree-sitter-python-grammar
**Created:** 2026-05-09
**Status:** Ready for execution

---

## Goal

Install `tree-sitter-python@0.23.4` WASM grammar and create `PythonTreeSitterParser` that produces full AST-based analysis for Python files, replacing regex-based `PythonParser` as the default `python` language handler in the parser registry.

## Requirements Traceability

| Requirement | Covered By |
|-------------|------------|
| PY-01: tree-sitter-python WASM grammar installed and loadable, no regex dependency | Tasks T1, T3 |
| PY-02: Python Tree-sitter parser extracts imports, exports, symbols, classes, functions, decorators, async, nested structures | Tasks T3, T4, T5, T6 |

## Success Criteria (from ROADMAP)

1. `npm ls tree-sitter-python` shows `0.23.4`
2. `PythonTreeSitterParser.parseFile()` returns valid `ParseResult` with `parserUsed: 'PythonTreeSitterParser'`
3. AST parser correctly handles: decorators, async functions, nested definitions, multi-line imports, `__all__`, multiple inheritance
4. Comparison test: same Python file parsed by both AST and regex parsers, proving AST handles nested definitions and multi-line imports that regex misses

## must_haves

1. `tree-sitter-python@0.23.4` in `package.json` dependencies
2. `PythonTreeSitterParser` class extending `ParserBase` at `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`
3. Grammar loaded via dual-path (native first, WASM fallback) in `doInitialize()`
4. Strict error (no silent fallback) when tree-sitter-python unavailable at parse time (D-10, D-12)
5. `parserUsed` field on `ParseResult` interface (D-13)
6. Registry wires `PythonTreeSitterParser` as `python` handler, `PythonParser` NOT registered (D-08, D-11)
7. Comparison test proving AST superiority over regex for nested/multiline constructs (D-18)
8. All tests pass (`npx vitest run`)

---

## threat_model

**Threats:**
- **Supply chain**: `tree-sitter-python@0.23.4` npm package integrity. Mitigated by pinned version (not caret), package-lock.json integrity check.
- **Runtime availability**: WASM grammar may fail to load in restricted environments. Mitigated by D-10 (explicit error with actionable remediation message, no silent fallback).
- **Breaking change**: Adding `parserUsed` field to `ParseResult` is optional (`parserUsed?: string`), so existing parsers are unaffected.
- **No secrets involved**: All changes are source code and dependency declarations.
- **Severity**: Low. No high-severity threats identified.

---

## Wave 1: Foundation (parallel)

### Task T1: Install tree-sitter-python dependency

**Wave:** 1
**Files modified:** `package.json`, `package-lock.json`
**autonomous:** true

<read_first>
- `/data/codemap/package.json`
</read_first>

<action>
Run `npm install tree-sitter-python@0.23.4` to add the dependency. This adds `"tree-sitter-python": "0.23.4"` to the `dependencies` section of `package.json` and updates `package-lock.json`. The version is pinned (not caret) because `>=0.23.5` requires `tree-sitter@^0.22.1` which is incompatible with the installed `tree-sitter@0.21.1`.
</action>

<acceptance_criteria>
- `package.json` dependencies contains `"tree-sitter-python": "0.23.4"`
- `npm ls tree-sitter-python` exits 0 and shows `tree-sitter-python@0.23.4`
- `package-lock.json` is updated
</acceptance_criteria>

---

### Task T2: Add parserUsed field to ParseResult

**Wave:** 1
**Files modified:** `src/interface/types/parser.ts`
**autonomous:** true

<read_first>
- `/data/codemap/src/interface/types/parser.ts` (lines 56-80, the `ParseResult` interface)
</read_first>

<action>
Add an optional `parserUsed` field to the `ParseResult` interface in `src/interface/types/parser.ts`. Insert after the `errors` field (line 79):

```typescript
  /** 使用的解析器名称 (e.g., 'PythonTreeSitterParser' or 'PythonParser') */
  parserUsed?: string;
```

The field is optional (`?`) so existing parsers that do not set it are unaffected.
</action>

<acceptance_criteria>
- `src/interface/types/parser.ts` contains `parserUsed?: string;` inside the `ParseResult` interface
- `npx tsc --noEmit` exits 0 (no type errors introduced)
</acceptance_criteria>

---

## Wave 2: Parser Implementation (depends on Wave 1)

### Task T3: Create PythonTreeSitterParser class

**Wave:** 2
**Depends on:** T1, T2
**Files created:** `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`
**Files modified:** (none in this task)
**autonomous:** true

<read_first>
- `/data/codemap/src/infrastructure/parser/implementations/PythonParser.ts` (structural skeleton reference)
- `/data/codemap/src/infrastructure/parser/interfaces/ParserBase.ts` (base class contract)
- `/data/codemap/src/parser/implementations/tree-sitter-loader.ts` (dual-path loading pattern)
- `/data/codemap/src/parser/implementations/tree-sitter-parser.ts` (AST traversal pattern)
- `/data/codemap/src/interface/types/parser.ts` (ParseResult, ParseOptions)
- `/data/codemap/src/interface/types/index.ts` (Module, ModuleSymbol, ImportInfo, ExportInfo, DecoratorInfo, FunctionSignature, ParameterInfo)
- `/data/codemap/.planning/phases/67-tree-sitter-python-grammar/67-RESEARCH.md` (Section 9: AST extraction logic)
</read_first>

<action>
**Note on D-03:** D-03 originally specified extending `tree-sitter-loader.ts`, but RESEARCH.md Option B (self-contained loading in PythonTreeSitterParser) was adopted per D-06 to avoid modifying existing parser infrastructure. The loader pattern is reused but not the shared function.

Create `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` with the following structure:

```typescript
// [META] since:2026-05 | owner:architecture-team | stable:false
// [WHY] AST-based Python parser using tree-sitter-python grammar
// Phase 67: replaces regex PythonParser as default python handler

import { randomUUID } from 'crypto';
import type { ParseOptions, ParseResult } from '../../../interface/types/parser.js';
import type { Module, ModuleSymbol, ImportInfo, ExportInfo, DecoratorInfo, FunctionSignature, ParameterInfo } from '../../../interface/types/index.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

export class PythonTreeSitterParser extends ParserBase {
  readonly languageId = 'python' as const;
  readonly fileExtensions = ['py'];
  readonly name = 'Python Tree-sitter Parser';

  protected supportedFeatures = new Set([
    'decorators', 'call-graph', 'cross-file-analysis', 'complexity-metrics',
  ] as const);

  private parser: any = null;
  private pythonLanguage: any = null;
  private grammarLoaded = false;

  protected async doInitialize(): Promise<void> {
    await this.loadGrammar();
  }

  protected async doDispose(): Promise<void> {
    this.parser = null;
    this.pythonLanguage = null;
    this.grammarLoaded = false;
  }

  private async loadGrammar(): Promise<void> {
    // Dual-path: native first, WASM fallback (same pattern as tree-sitter-loader.ts)
    // Try native:
    try {
      const treeSitterModule = await import('tree-sitter');
      const pythonModule = await import('tree-sitter-python');
      this.parser = new (treeSitterModule.default)();
      this.pythonLanguage = (pythonModule as any).python || (pythonModule as any).default?.python;
      if (this.pythonLanguage) {
        this.parser.setLanguage(this.pythonLanguage);
        this.grammarLoaded = true;
        return;
      }
    } catch { /* native failed, try WASM */ }

    // WASM fallback:
    try {
      const Parser = await import('web-tree-sitter');
      const wasmParser = Parser.default || Parser;
      if (typeof wasmParser.init === 'function') await wasmParser.init();

      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const pyWasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
      const Lang = (wasmParser as any).Language;
      this.pythonLanguage = await Lang.load(pyWasmPath);
      this.parser = new (wasmParser as any)();
      this.parser.setLanguage(this.pythonLanguage);
      this.grammarLoaded = true;
    } catch (error) {
      // D-10: strict error, no silent fallback
      this.grammarLoaded = false;
      // Store error for parseFile() to throw
      throw new ParseError(
        `tree-sitter-python grammar not available. Install: npm install tree-sitter-python@0.23.4. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async parseFile(filePath: string, content: string, _options?: ParseOptions): Promise<ParseResult> {
    this.ensureInitialized();
    // D-12: detect at parse time
    if (!this.grammarLoaded || !this.parser) {
      throw new ParseError(
        'tree-sitter-python grammar not available. Install: npm install tree-sitter-python@0.23.4',
        filePath
      );
    }

    const startTime = Date.now();
    try {
      const tree = this.parser.parse(content);
      const root = tree.rootNode;

      const [imports, exports, symbols] = await Promise.all([
        this.extractImports(root),
        this.extractExports(root),
        this.extractSymbols(root),
      ]);

      const lineCounts = this.countCommentLines(root, content);
      const module: Module = {
        id: `mod_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        projectId: '',
        path: filePath,
        language: 'python',
        stats: lineCounts,
      };

      const parseTime = Date.now() - startTime;
      return {
        filePath,
        language: 'python',
        module,
        symbols,
        imports,
        exports,
        dependencies: [],
        parseTime,
        parserUsed: 'PythonTreeSitterParser',
      };
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }

  // extractImports: walk import_statement, import_from_statement, future_import_statement
  // extractExports: walk __all__ assignment, then public class/function defs
  // extractSymbols: recursive walk for class_definition, function_definition, decorated_definition
  // extractDecorators: extract from decorated_definition wrapper
  // extractParameters: extract from parameters node (identifier, typed_parameter, default_parameter, typed_default_parameter)
  // isAsync: check function_definition children for type === 'async'
  // isNestedDefinition: check if parent is class_definition or function_definition body
  // countCommentLines: walk comment nodes + use countLines from base
}
```

Key implementation details (from RESEARCH.md Section 9):
- `extractImports(root)`: Walk `root.namedChildren` for `import_statement`, `import_from_statement`, `future_import_statement`. Handle `aliased_import`, `relative_import`, `wildcard_import`.
- `extractExports(root)`: Scan for `assignment` where `left.text === '__all__'` and `right` is `list`. If no `__all__`, scan top-level `class_definition`/`function_definition` not starting with `_`.
- `extractSymbols(root)`: Recursive walk. For `class_definition`: extract name, superclasses from `argument_list`. For `function_definition`: extract name, parameters, async detection, return_type. For `decorated_definition`: unwrap to inner definition, extract decorators from children.
- `extractDecorators(node)`: From `decorated_definition` parent, get `decorator` children. Each decorator's `expression` child can be `identifier`, `call`, or `attribute`.
- `extractParameters(node)`: From `parameters` node, iterate namedChildren. Handle `identifier`, `typed_parameter`, `default_parameter`, `typed_default_parameter`.
- `isAsync(node)`: Check `node.children` (not namedChildren) for `type === 'async'`.
- Use `node.childForFieldName('name')`, `node.childForFieldName('body')`, `node.childForFieldName('superclasses')`, `node.childForFieldName('parameters')`, `node.childForFieldName('return_type')`, `node.childForFieldName('definition')` for field access.
</action>

<acceptance_criteria>
- File `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` exists
- File contains `export class PythonTreeSitterParser extends ParserBase`
- File contains `readonly languageId = 'python' as const`
- File contains `readonly fileExtensions = ['py']`
- File contains `parserUsed: 'PythonTreeSitterParser'`
- File contains `tree-sitter-python grammar not available` error message
- File contains `import('tree-sitter-python')` (native loading)
- File contains `require.resolve('tree-sitter-python/tree-sitter-python.wasm')` (WASM loading)
- File contains method `extractImports`
- File contains method `extractExports`
- File contains method `extractSymbols`
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

## Wave 3: Integration and Testing (depends on Wave 2)

### Task T4: Create test fixture files

**Wave:** 3
**Depends on:** T3
**Files created:**
- `tests/fixtures/python/basic_imports.py`
- `tests/fixtures/python/classes.py`
- `tests/fixtures/python/functions.py`
- `tests/fixtures/python/all_exports.py`
- `tests/fixtures/python/comprehensive.py`
**autonomous:** true

<read_first>
- `/data/codemap/.planning/phases/67-tree-sitter-python-grammar/67-PATTERNS.md` (Section 4: Fixture contents)
</read_first>

<action>
Create the `tests/fixtures/python/` directory and 5 fixture files:

**`tests/fixtures/python/basic_imports.py`:**
```python
import os
import os as operating_system
from pkg.module import helper
from pkg import helper as alias
from .relative import x
from .. import y
from os import *
from __future__ import annotations
```

**`tests/fixtures/python/classes.py`:**
```python
class Foo:
    pass

class Foo(Bar):
    pass

class Foo(Bar, Baz):
    pass

@decorator
class DecoratedClass:
    pass

class Outer:
    class Inner:
        pass
    def method(self):
        pass
```

**`tests/fixtures/python/functions.py`:**
```python
def regular():
    pass

async def async_func():
    pass

@decorator
def decorated():
    pass

def typed(x: int) -> str:
    return str(x)

def defaulted(x=5):
    pass

def outer():
    def inner():
        pass
    return inner
```

**`tests/fixtures/python/all_exports.py`:**
```python
__all__ = ['Service', 'run', 'helper']

class Service:
    pass

def run():
    pass

def helper():
    pass

def _private():
    pass
```

**`tests/fixtures/python/comprehensive.py`:**
```python
"""Comprehensive Python fixture for Phase 67 comparison test."""
import os
import sys as system
from typing import List, Optional
from . import utils
from ..models import User, Role

__all__ = ['UserService', 'create_user', 'AdminRole']

class BaseService:
    def init(self):
        pass

@dataclass
class UserService(BaseService):
    """User management service."""

    @staticmethod
    def create(name: str, role: Optional[str] = None) -> 'UserService':
        return UserService()

    class Config:
        max_retries = 3

    async def fetch_all(self) -> List[User]:
        return []

def create_user(name: str) -> UserService:
    """Create a new user."""
    def validate(n: str) -> bool:
        return len(n) > 0
    if validate(name):
        return UserService.create(name)
    raise ValueError("Invalid name")

class AdminRole(Role):
    pass

async def sync_users() -> None:
    pass
```
</action>

<acceptance_criteria>
- `tests/fixtures/python/basic_imports.py` exists and contains `import os`, `from pkg.module import helper`, `from .relative import x`, `from __future__ import annotations`
- `tests/fixtures/python/classes.py` exists and contains `class Foo(Bar, Baz):`, `class Outer:`, `class Inner:`, `@decorator`
- `tests/fixtures/python/functions.py` exists and contains `async def async_func():`, `@decorator`, `def typed(x: int) -> str:`, `def inner():`
- `tests/fixtures/python/all_exports.py` exists and contains `__all__ = ['Service', 'run', 'helper']`, `def _private():`
- `tests/fixtures/python/comprehensive.py` exists and contains all features: multi-line imports, nested classes, decorators, async, `__all__`, multiple inheritance, type annotations, nested functions
</acceptance_criteria>

---

### Task T5: Create PythonTreeSitterParser unit tests

**Wave:** 3
**Depends on:** T3, T4
**Files created:** `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts`
**autonomous:** true

<read_first>
- `/data/codemap/src/infrastructure/parser/__tests__/PythonParser.test.ts` (test pattern reference)
- `/data/codemap/src/infrastructure/parser/__tests__/TypeScriptParser.test.ts` (more comprehensive test pattern)
- `/data/codemap/src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` (the class under test)
- `/data/codemap/src/infrastructure/parser/implementations/PythonParser.ts` (for comparison test)
- `/data/codemap/.planning/phases/67-tree-sitter-python-grammar/67-PATTERNS.md` (Section 3: test structure)
</read_first>

<action>
Create `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` with the following test structure:

```typescript
// [META] since:2026-05 | owner:architecture-team | stable:false
// [WHY] PythonTreeSitterParser unit tests - Phase 67

import { beforeEach, describe, expect, it } from 'vitest';
import { PythonTreeSitterParser } from '../implementations/PythonTreeSitterParser.js';
import { PythonParser } from '../implementations/PythonParser.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

      // AST finds nested class Inner, regex does not (regex uses ^ anchor)
      expect(astResult.symbols.some(s => s.name === 'Inner')).toBe(true);
      expect(regexResult.symbols.some(s => s.name === 'Inner')).toBe(false);

      // AST handles multi-line imports, regex may not
      // AST should find more specifiers from typing import
      const astTypingImport = astResult.imports.find(i => i.source === 'typing');
      const regexTypingImport = regexResult.imports.find(i => i.source === 'typing');
      expect(astTypingImport?.specifiers.length).toBeGreaterThanOrEqual(
        regexTypingImport?.specifiers.length ?? 0
      );

      // AST detects decorators
      expect(astResult.symbols.some(s => s.decorators && s.decorators.length > 0)).toBe(true);

      // AST detects async
      expect(astResult.symbols.some(s => s.signature?.async === true)).toBe(true);

      // parserUsed is set
      expect(astResult.parserUsed).toBe('PythonTreeSitterParser');
    });
  });
});
```
</action>

<acceptance_criteria>
- File `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` exists
- File contains `describe('PythonTreeSitterParser'`
- File contains `describe('comparison test (D-18)'`
- File contains `astResult.parserUsed` assertion
- File contains `Inner` comparison (AST finds it, regex does not)
- File contains `async` detection test
- File contains `decorator` extraction test
- File contains `multiple inheritance` test (`extends` contains `Bar` and `Baz`)
- File contains `multi-line imports` test
- File imports `PythonParser` for comparison test
- `npx vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` exits 0
</acceptance_criteria>

---

### Task T6: Wire PythonTreeSitterParser into registry

**Wave:** 3
**Depends on:** T3
**Files modified:** `src/infrastructure/parser/index.ts`
**autonomous:** true

<read_first>
- `/data/codemap/src/infrastructure/parser/index.ts` (current state)
</read_first>

<action>
Modify `src/infrastructure/parser/index.ts`:

1. Add import at line 10 (after GoParser import):
```typescript
import { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js';
```

2. Add export at line 21 (after GoParser export):
```typescript
export { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js';
```

3. In `createDefaultParserRegistry()` function, replace `registry.register(new PythonParser())` with:
```typescript
  // AST-first: PythonTreeSitterParser replaces regex PythonParser (D-08, D-11)
  // If tree-sitter-python is unavailable, parseFile() throws with actionable error (D-10)
  registry.register(new PythonTreeSitterParser());
```

The `PythonParser` import and export lines remain (D-11: stays in codebase as deprecated fallback), but it is no longer registered in the factory.
</action>

<acceptance_criteria>
- `src/infrastructure/parser/index.ts` contains `import { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js'`
- `src/infrastructure/parser/index.ts` contains `export { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js'`
- `src/infrastructure/parser/index.ts` contains `registry.register(new PythonTreeSitterParser())`
- `src/infrastructure/parser/index.ts` does NOT contain `registry.register(new PythonParser())`
- `src/infrastructure/parser/index.ts` still contains `import { PythonParser }` and `export { PythonParser }` (kept for backward compat)
- `npx tsc --noEmit` exits 0
</acceptance_criteria>

---

## Wave 4: Verification

### Task T7: Full verification pass

**Wave:** 4
**Depends on:** T1, T2, T3, T4, T5, T6
**autonomous:** true

<read_first>
- `/data/codemap/src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`
- `/data/codemap/src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts`
- `/data/codemap/src/infrastructure/parser/index.ts`
- `/data/codemap/src/interface/types/parser.ts`
- `/data/codemap/package.json`
</read_first>

<action>
Run the full verification sequence:

1. `rtk npx tsc --noEmit` — type-check passes
2. `rtk npx vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` — all PythonTreeSitterParser tests pass
3. `rtk npx vitest run` — full test suite passes (no regressions)
4. Verify `package.json` has `tree-sitter-python@0.23.4`
5. Verify comparison test output: AST finds `Inner` (nested class), regex does not
</action>

<acceptance_criteria>
- `npx tsc --noEmit` exits 0
- `npx vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` exits 0 with all tests passing
- `npx vitest run` exits 0 (full suite, no regressions)
- `package.json` contains `"tree-sitter-python": "0.23.4"`
</acceptance_criteria>

---

## Verification Criteria

| # | Criterion | Command |
|---|-----------|---------|
| V-1 | Type check passes | `npx tsc --noEmit` |
| V-2 | PythonTreeSitterParser tests pass | `npx vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` |
| V-3 | Full test suite passes | `npx vitest run` |
| V-4 | Dependency installed | `npm ls tree-sitter-python` shows 0.23.4 |
| V-5 | Comparison test proves AST > regex | Test output shows AST finds InnerClass, regex does not |
| V-6 | parserUsed field populated | `grep parserUsed src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` returns match |

---

## Commit Sequence

| Step | Files | Message |
|------|-------|---------|
| 1 | `package.json`, `package-lock.json` | `feat(deps): add tree-sitter-python@0.23.4` |
| 2 | `src/interface/types/parser.ts` | `feat(parser): add optional parserUsed field to ParseResult` |
| 3 | `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` | `feat(parser): add PythonTreeSitterParser with AST-based Python analysis` |
| 4 | `tests/fixtures/python/*.py` | `test(fixtures): add Python test fixtures for Phase 67` |
| 5 | `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | `test(parser): add PythonTreeSitterParser unit and comparison tests` |
| 6 | `src/infrastructure/parser/index.ts` | `feat(parser): wire PythonTreeSitterParser as default python handler` |
