# Phase 67: Patterns Reference

**Phase:** 67-tree-sitter-python-grammar
**Generated:** 2026-05-09

---

## 1. Files Inventory

### Files to CREATE

| # | File | Role | Closest Analog |
|---|------|------|----------------|
| C-1 | `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` | AST-based Python parser extending ParserBase | `PythonParser.ts` (same dir) + `src/parser/implementations/tree-sitter-parser.ts` (tree-sitter usage) |
| C-2 | `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | Unit tests | `PythonParser.test.ts` (same dir) |
| C-3 | `tests/fixtures/python/basic_imports.py` | Test fixture: import patterns | No analog -- new fixture dir |
| C-4 | `tests/fixtures/python/classes.py` | Test fixture: class patterns | No analog |
| C-5 | `tests/fixtures/python/functions.py` | Test fixture: function patterns | No analog |
| C-6 | `tests/fixtures/python/all_exports.py` | Test fixture: `__all__` patterns | No analog |
| C-7 | `tests/fixtures/python/comprehensive.py` | Test fixture: comparison test input | No analog |

### Files to MODIFY

| # | File | Change | Closest Analog |
|---|------|--------|----------------|
| M-1 | `package.json` | Add `tree-sitter-python@0.23.4` to dependencies | Existing `tree-sitter-typescript` entry |
| M-2 | `src/infrastructure/parser/index.ts` | Export PythonTreeSitterParser, update `createDefaultParserRegistry()` | Current PythonParser registration pattern |
| M-3 | `src/interface/types/parser.ts` | Add optional `parserUsed?: string` to `ParseResult` | No analog -- interface extension |

### Files NOT to Modify (per D-06)

| File | Reason |
|------|--------|
| `src/parser/implementations/tree-sitter-loader.ts` | TypeScript-specific. Python grammar loading handled by PythonTreeSitterParser itself |
| `src/parser/implementations/tree-sitter-parser.ts` | Existing TypeScript-hardcoded parser, reference only |
| `src/infrastructure/parser/implementations/PythonParser.ts` | Regex parser stays in codebase, not used as automatic fallback |
| `src/infrastructure/parser/registry/ParserRegistry.ts` | Extension-based routing works automatically -- no changes needed |

---

## 2. File C-1: `PythonTreeSitterParser.ts`

### Role

AST-based Python parser. First tree-sitter parser in the infrastructure layer. Extends `ParserBase` and implements `ILanguageParser` via the base class contract. Loads tree-sitter Python grammar independently (not via `tree-sitter-loader.ts` which is TypeScript-specific).

### Data Flow

```
parseFile(filePath, content)
  |
  +-- this.parser.parse(content) → tree-sitter AST (SyntaxNode tree)
  |
  +-- extractImports(root)    → ImportInfo[]
  +-- extractExports(root)    → ExportInfo[]
  +-- extractSymbols(root)    → ModuleSymbol[]
  +-- countLines(content)     → { total, code, comment, blank }
  +-- countCommentLines(root) → number (AST-based comment counting)
  |
  +-- → ParseResult { module, symbols, imports, exports, parserUsed: 'PythonTreeSitterParser' }
```

### Closest Analog: `PythonParser.ts`

The structural skeleton is identical -- both extend `ParserBase`, both implement `parseFile` / `extractImports` / `extractExports` / `extractSymbols`. The key difference: PythonTreeSitterParser uses tree-sitter AST traversal instead of regex.

### Pattern: Class Structure (from PythonParser.ts)

```typescript
// File: src/infrastructure/parser/implementations/PythonParser.ts
// [META] since:2026-03 | owner:architecture-team | stable:false
// [WHY] Python language parser - implements ILanguageParser for Python files

import { randomUUID } from 'crypto';
import type {
  ParseOptions,
  ParseResult,
} from '../../../interface/types/parser.js';
import type {
  Module,
  ModuleSymbol,
  ImportInfo,
  ExportInfo,
} from '../../../interface/types/index.js';
import { ParserBase, ParseError } from '../interfaces/ParserBase.js';

export class PythonParser extends ParserBase {
  readonly languageId = 'python' as const;
  readonly fileExtensions = ['py'];
  readonly name = 'Python Parser';

  protected supportedFeatures = new Set([
    'call-graph',
    'cross-file-analysis',
    'complexity-metrics',
  ] as const);

  protected async doInitialize(): Promise<void> { /* noop */ }
  protected async doDispose(): Promise<void> { /* noop */ }

  async parseFile(
    filePath: string,
    content: string,
    _options?: ParseOptions
  ): Promise<ParseResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    try {
      const [imports, exports, symbols] = await Promise.all([
        this.extractImports(content),
        this.extractExports(content),
        this.extractSymbols(content),
      ]);
      const lineCounts = this.countLines(content);
      const module: Module = {
        id: `mod_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
        projectId: '',
        path: filePath,
        language: 'python',
        stats: {
          lines: lineCounts.total,
          codeLines: lineCounts.code,
          commentLines: lineCounts.comment,
          blankLines: lineCounts.blank,
        },
      };
      const parseTime = Date.now() - startTime;
      return {
        filePath, language: 'python', module, symbols, imports, exports,
        dependencies: [], parseTime,
      };
    } catch (error) {
      throw new ParseError(
        `Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        filePath
      );
    }
  }
}
```

### Pattern: tree-sitter Initialization (from tree-sitter-parser.ts)

The existing `TreeSitterParser` in `src/parser/implementations/tree-sitter-parser.ts` shows how to load and use tree-sitter. Key pattern:

```typescript
// File: src/parser/implementations/tree-sitter-parser.ts
import { loadTreeSitter } from './tree-sitter-loader.js';
import type ParserType from 'tree-sitter';

export class TreeSitterParser implements IParser {
  private parser: any;
  private parserPromise: Promise<void>;

  constructor(options: ParserOptions) {
    this.parserPromise = this.initializeParser();
  }

  private async initializeParser(): Promise<void> {
    const { Parser, TypeScript } = await loadTreeSitter();
    this.parser = new Parser();
    this.parser.setLanguage(TypeScript.typescript);
  }

  async parseFile(filePath: string): Promise<ParseResult> {
    await this.parserPromise;
    const content = await fs.readFile(filePath, 'utf-8');
    const tree = this.parser.parse(content);
    // tree.rootNode is the AST root
    return {
      path: filePath,
      exports: this.extractExports(tree.rootNode, content),
      imports: this.extractImports(tree.rootNode, content),
      // ...
    };
  }
}
```

### Pattern: tree-sitter AST Traversal (from tree-sitter-parser.ts)

Extracting symbols by walking the AST:

```typescript
// File: src/parser/implementations/tree-sitter-parser.ts
private findDeclarations(node: ParserType.SyntaxNode): Array<{name: string; kind: SymbolKind; node: ParserType.SyntaxNode}> {
  const declarations: Array<{name: string; kind: SymbolKind; node: ParserType.SyntaxNode}> = [];

  if (node.type === 'class_declaration') {
    const name = node.namedChildren.find(n => n.type === 'type_identifier');
    if (name) {
      declarations.push({ name: name.text, kind: 'class', node });
    }
  }

  if (node.type === 'function_declaration') {
    const name = node.namedChildren.find(n => n.type === 'identifier');
    if (name) {
      declarations.push({ name: name.text, kind: 'function', node });
    }
  }

  // Recursive traversal
  for (const child of node.namedChildren) {
    declarations.push(...this.findDeclarations(child));
  }

  return declarations;
}
```

### Pattern: WASM Grammar Loading (from tree-sitter-loader.ts)

The dual-path loading pattern for WASM fallback:

```typescript
// File: src/parser/implementations/tree-sitter-loader.ts
async function loadWASMTreeSitter(): Promise<TreeSitterLoaderResult> {
  const Parser = await import('web-tree-sitter');
  const wasmParser = Parser.default || Parser;

  if (typeof wasmParser.init === 'function') {
    await wasmParser.init();
  }

  // Resolve .wasm path via require.resolve
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const tsWasmPath = require.resolve('tree-sitter-typescript/typescript.wasm');
  const Lang = (wasmParser as any).Language;
  const typescriptLanguage = await Lang.load(tsWasmPath);

  return {
    Parser: wasmParser,
    TypeScript: { typescript: typescriptLanguage },
  };
}
```

For Python, the same pattern applies:

```typescript
const pyWasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
const Lang = (wasmParser as any).Language;
const pythonLanguage = await Lang.load(pyWasmPath);
```

### Pattern: Native Grammar Loading (from tree-sitter-loader.ts)

```typescript
// File: src/parser/implementations/tree-sitter-loader.ts
async function loadNativeTreeSitter(): Promise<TreeSitterLoaderResult> {
  const treeSitterModule = await import('tree-sitter');
  const typescriptModule = await import('tree-sitter-typescript');
  return {
    Parser: treeSitterModule.default,
    TypeScript: typescriptModule,
  };
}
```

For Python native:

```typescript
const pythonModule = await import('tree-sitter-python');
// pythonModule.python is the language object
```

### Concrete Design: `PythonTreeSitterParser` Class Structure

```typescript
export class PythonTreeSitterParser extends ParserBase {
  readonly languageId = 'python' as const;
  readonly fileExtensions = ['py'];
  readonly name = 'Python Tree-sitter Parser';

  protected supportedFeatures = new Set([
    'decorators', 'call-graph', 'cross-file-analysis', 'complexity-metrics',
  ] as const);

  private parser: any = null;       // tree-sitter Parser instance
  private pythonLanguage: any = null; // Python grammar object
  private grammarLoaded = false;

  protected async doInitialize(): Promise<void> {
    // Load tree-sitter + Python grammar (native first, WASM fallback)
    // Set this.parser, this.pythonLanguage, this.grammarLoaded
  }

  protected async doDispose(): Promise<void> {
    this.parser = null;
    this.pythonLanguage = null;
    this.grammarLoaded = false;
  }

  async parseFile(filePath, content, options?): Promise<ParseResult> {
    this.ensureInitialized();
    if (!this.grammarLoaded) {
      throw new ParseError(
        'tree-sitter-python grammar not available. Install: npm install tree-sitter-python@0.23.4',
        filePath
      );
    }
    // Parse with tree-sitter, extract imports/exports/symbols
    // Return ParseResult with parserUsed: 'PythonTreeSitterParser'
  }
}
```

### Key Differences from PythonParser.ts

| Aspect | PythonParser (regex) | PythonTreeSitterParser (AST) |
|--------|---------------------|------------------------------|
| `doInitialize()` | noop | Load tree-sitter + Python grammar |
| `doDispose()` | noop | Cleanup parser/language refs |
| `extractImports()` | Regex on content string | Walk `import_statement`, `import_from_statement`, `future_import_statement` nodes |
| `extractExports()` | Regex for `__all__` and class/func defs | Walk `assignment` nodes for `__all__`, walk top-level defs |
| `extractSymbols()` | Regex for class/func defs (top-level only) | Recursive walk for `class_definition`, `function_definition`, `decorated_definition` |
| Nested definitions | Missed (regex `^` anchor) | Handled naturally via recursive AST traversal |
| Multi-line imports | Missed (regex per-line) | Handled natively by tree-sitter |
| Decorators | Not detected | `decorated_definition` wrapper with `decorator` children |
| Async functions | Not detected | Check `function_definition` children for `type === 'async'` |
| `parserUsed` field | Not set | `'PythonTreeSitterParser'` |

---

## 3. File C-2: `PythonTreeSitterParser.test.ts`

### Role

Unit tests for the AST-based Python parser. Follows the exact same test structure as existing parser tests.

### Closest Analog: `PythonParser.test.ts`

```typescript
// File: src/infrastructure/parser/__tests__/PythonParser.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { PythonParser } from '../implementations/PythonParser.js';

describe('PythonParser', () => {
  let parser: PythonParser;

  beforeEach(async () => {
    parser = new PythonParser();
    await parser.initialize();
  });

  it('parses imports, exports and symbols from common Python patterns', async () => {
    const content = [
      'import os as operating_system',
      'from pkg.module import helper as alias',
      '',
      'class Service(BaseService):',
      '    pass',
      '',
      'def run():',
      '    return alias()',
    ].join('\n');

    const result = await parser.parseFile('/tmp/service.py', content);

    expect(result.imports).toHaveLength(2);
    expect(result.exports.map((entry) => entry.name)).toEqual(['Service', 'run']);
    expect(result.symbols.map((entry) => entry.name)).toEqual(['Service', 'run']);
  });
});
```

### Pattern: TypeScriptParser.test.ts (more comprehensive)

```typescript
// File: src/infrastructure/parser/__tests__/TypeScriptParser.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TypeScriptParser } from '../implementations/TypeScriptParser.js';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(async () => {
    parser = new TypeScriptParser();
    await parser.initialize();
  });

  describe('parseFile', () => {
    it('should parse a simple TypeScript file', async () => {
      const content = `export class TestClass { public name: string; }`;
      const result = await parser.parseFile('/test.ts', content);
      expect(result.filePath).toBe('/test.ts');
      expect(result.language).toBe('typescript');
      expect(result.symbols.length).toBeGreaterThan(0);
    });
  });

  describe('extractImports', () => {
    it('should extract ES6 imports', async () => {
      const content = `import { foo, bar as baz } from './module';`;
      const imports = await parser.extractImports(content);
      expect(imports).toHaveLength(1);
      expect(imports[0]?.source).toBe('./module');
    });
  });

  describe('supportsFeature', () => {
    it('should support TypeScript features', () => {
      expect(parser.supportsFeature('type-inference')).toBe(true);
    });
  });
});
```

### Concrete Test Structure for PythonTreeSitterParser

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { PythonTreeSitterParser } from '../implementations/PythonTreeSitterParser.js';
import { PythonParser } from '../implementations/PythonParser.js';

describe('PythonTreeSitterParser', () => {
  let parser: PythonTreeSitterParser;

  beforeEach(async () => {
    parser = new PythonTreeSitterParser();
    await parser.initialize();
  });

  describe('parseFile', () => {
    it('should parse basic Python file', async () => { /* ... */ });
    it('should set parserUsed metadata', async () => { /* ... */ });
  });

  describe('extractImports', () => {
    it('should extract import statements', async () => { /* ... */ });
    it('should extract from...import statements', async () => { /* ... */ });
    it('should handle aliased imports', async () => { /* ... */ });
    it('should handle relative imports', async () => { /* ... */ });
    it('should handle wildcard imports', async () => { /* ... */ });
    it('should handle multi-line imports', async () => { /* ... */ });
    it('should handle future imports', async () => { /* ... */ });
  });

  describe('extractExports', () => {
    it('should extract __all__ exports', async () => { /* ... */ });
    it('should extract public class definitions as exports', async () => { /* ... */ });
    it('should extract public function definitions as exports', async () => { /* ... */ });
    it('should skip private (underscore) names', async () => { /* ... */ });
  });

  describe('extractSymbols', () => {
    it('should extract class definitions', async () => { /* ... */ });
    it('should extract class with multiple inheritance', async () => { /* ... */ });
    it('should extract function definitions', async () => { /* ... */ });
    it('should extract async functions', async () => { /* ... */ });
    it('should extract decorated definitions', async () => { /* ... */ });
    it('should extract nested class definitions', async () => { /* ... */ });
    it('should extract nested function definitions', async () => { /* ... */ });
  });

  describe('comparison test (D-18)', () => {
    it('AST parser handles nested definitions and multi-line imports that regex misses', async () => {
      const content = /* comprehensive Python fixture */;
      const astResult = await parser.parseFile('/tmp/test.py', content);

      const regexParser = new PythonParser();
      await regexParser.initialize();
      const regexResult = await regexParser.parseFile('/tmp/test.py', content);

      // AST finds nested class, regex does not
      expect(astResult.symbols.some(s => s.name === 'InnerClass')).toBe(true);
      expect(regexResult.symbols.some(s => s.name === 'InnerClass')).toBe(false);
    });
  });
});
```

---

## 4. Files C-3 to C-7: Test Fixtures

### Role

Reusable Python source files in `tests/fixtures/python/` covering specific AST features.

### No Closest Analog

The existing `tests/fixtures/` directory only contains `contract-check/` and `design-contracts/`. Python fixtures are new.

### Fixture Contents

**C-3: `tests/fixtures/python/basic_imports.py`**
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

**C-4: `tests/fixtures/python/classes.py`**
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

**C-5: `tests/fixtures/python/functions.py`**
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

**C-6: `tests/fixtures/python/all_exports.py`**
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

**C-7: `tests/fixtures/python/comprehensive.py`**
Combines all features: multi-line imports, nested classes, decorators, async, `__all__`, multiple inheritance, type annotations.

---

## 5. File M-1: `package.json`

### Role

Add `tree-sitter-python@0.23.4` to dependencies.

### Closest Analog: Existing tree-sitter dependencies

```json
// Current package.json dependencies (relevant):
{
  "dependencies": {
    "tree-sitter": "^0.21.1",
    "tree-sitter-typescript": "^0.23.2",
    "web-tree-sitter": "^0.24.0"
  }
}
```

### Change

Add to dependencies:

```json
"tree-sitter-python": "0.23.4"
```

Pinned version (not caret) because 0.23.5+ requires `tree-sitter@^0.22.1` which is incompatible with the installed `tree-sitter@0.21.1`.

---

## 6. File M-2: `src/infrastructure/parser/index.ts`

### Role

Export PythonTreeSitterParser and register it in `createDefaultParserRegistry()`.

### Closest Analog: Current index.ts

```typescript
// File: src/infrastructure/parser/index.ts
import { ParserRegistry } from './registry/ParserRegistry.js';
import { TypeScriptParser } from './implementations/TypeScriptParser.js';
import { GoParser } from './implementations/GoParser.js';
import { PythonParser } from './implementations/PythonParser.js';

export { ParserBase, ParseError } from './interfaces/ParserBase.js';
export { ParserRegistry, parserRegistry, ParserNotFoundError } from './registry/ParserRegistry.js';
export { TypeScriptParser } from './implementations/TypeScriptParser.js';
export { GoParser } from './implementations/GoParser.js';
export { PythonParser } from './implementations/PythonParser.js';

export type { /* ... */ } from '../../interface/types/parser.js';

export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new TypeScriptParser());
  registry.register(new GoParser());
  registry.register(new PythonParser());
  return registry;
}
```

### Concrete Changes

```typescript
// Add import:
import { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js';

// Add export:
export { PythonTreeSitterParser } from './implementations/PythonTreeSitterParser.js';

// Update factory (per D-10, D-11: strict error, no silent fallback):
export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new TypeScriptParser());
  registry.register(new GoParser());
  // AST-first: PythonTreeSitterParser replaces regex PythonParser
  // If tree-sitter-python is unavailable, parseFile() throws with actionable error
  registry.register(new PythonTreeSitterParser());
  // PythonParser NOT registered -- only PythonTreeSitterParser handles 'python'
  return registry;
}
```

---

## 7. File M-3: `src/interface/types/parser.ts`

### Role

Add optional `parserUsed` field to `ParseResult` interface (D-13).

### Closest Analog: Current ParseResult interface

```typescript
// File: src/interface/types/parser.ts
export interface ParseResult {
  filePath: string;
  language: LanguageId;
  module: Module;
  symbols: ModuleSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: Dependency[];
  callGraph?: CallGraphInfo;
  complexity?: ComplexityMetrics;
  parseTime: number;
  errors?: ParseError[];
}
```

### Concrete Change

Add one optional field:

```typescript
export interface ParseResult {
  filePath: string;
  language: LanguageId;
  module: Module;
  symbols: ModuleSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: Dependency[];
  callGraph?: CallGraphInfo;
  complexity?: ComplexityMetrics;
  parseTime: number;
  errors?: ParseError[];
  parserUsed?: string;  // e.g., 'PythonTreeSitterParser' or 'PythonParser'
}
```

Optional field -- does not break existing parsers (they simply won't set it).

---

## 8. ParserRegistry: No Changes Needed

### Why

`ParserRegistry.register()` uses `parser.languageId` as the key and `parser.fileExtensions` for extension mapping. PythonTreeSitterParser sets `languageId = 'python'` and `fileExtensions = ['py']` -- the same as PythonParser. When PythonTreeSitterParser is registered, it naturally replaces PythonParser in the registry (same key).

```typescript
// File: src/infrastructure/parser/registry/ParserRegistry.ts
register(parser: ILanguageParser): void {
  this.parsers.set(parser.languageId, parser);  // Overwrites existing 'python' entry
  for (const ext of parser.fileExtensions) {
    this.extensionMap.set(ext.toLowerCase(), parser.languageId);
  }
}
```

---

## 9. tree-sitter-loader.ts: No Changes Needed (per RESEARCH.md)

### Why

The research recommends a separate `loadPythonGrammar()` approach rather than extending the existing `loadTreeSitter()`. The existing loader is TypeScript-specific by design (hardcodes `tree-sitter-typescript` paths). PythonTreeSitterParser handles its own grammar loading internally in `doInitialize()`, following the same dual-path pattern (native first, WASM fallback).

This avoids:
- Changing `TreeSitterLoaderResult` return type (breaking change)
- Risking TypeScript parser regression
- Coupling Python grammar availability to TypeScript grammar loading

---

## 10. Type Reference: Key Interfaces

### ParseResult (from `src/interface/types/parser.ts`)

```typescript
export interface ParseResult {
  filePath: string;
  language: LanguageId;
  module: Module;
  symbols: ModuleSymbol[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: Dependency[];
  callGraph?: CallGraphInfo;
  complexity?: ComplexityMetrics;
  parseTime: number;
  errors?: ParseError[];
  parserUsed?: string;  // NEW in Phase 67
}
```

### ModuleSymbol (from `src/interface/types/index.ts`)

```typescript
export interface ModuleSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  location: SourceLocation;
  visibility: 'public' | 'private' | 'protected' | 'internal';
  documentation?: string;
  jsdoc?: JSDocComment;
  relatedSymbols: string[];
  decorators?: DecoratorInfo[];
  signature?: FunctionSignature;
  members?: MemberInfo[];
  type?: string;
  extends?: string[];
  implements?: string[];
}
```

### ImportInfo (from `src/interface/types/index.ts`)

```typescript
export interface ImportInfo {
  source: string;
  sourceType: 'relative' | 'absolute' | 'node_module' | 'alias';
  specifiers: ImportSpecifier[];
  isTypeOnly: boolean;
  isReExport?: boolean;
}

export interface ImportSpecifier {
  name: string;
  alias?: string;
  isTypeOnly: boolean;
}
```

### ExportInfo (from `src/interface/types/index.ts`)

```typescript
export interface ExportInfo {
  name: string;
  kind: SymbolKind;
  isDefault: boolean;
  isTypeOnly: boolean;
  origin?: string;
}
```

### DecoratorInfo (from `src/interface/types/index.ts`)

```typescript
export interface DecoratorInfo {
  name: string;
  params?: unknown;
  target: 'class' | 'method' | 'property' | 'parameter';
}
```

### FunctionSignature (from `src/interface/types/index.ts`)

```typescript
export interface FunctionSignature {
  parameters: ParameterInfo[];
  returnType: string;
  genericParams?: string[];
  async: boolean;
  calls?: CallInfo[];
  bodySnippets?: CodeSnippet[];
}
```

### ParameterInfo (from `src/interface/types/index.ts`)

```typescript
export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}
```

### ParserBase Abstract Contract (from `src/infrastructure/parser/interfaces/ParserBase.ts`)

```typescript
export abstract class ParserBase implements ILanguageParser {
  abstract readonly languageId: LanguageId;
  abstract readonly fileExtensions: string[];
  abstract readonly name: string;
  protected abstract supportedFeatures: Set<LanguageFeature>;
  protected isInitialized = false;
  protected stats = { totalParsed: 0, totalErrors: 0, totalTime: 0 };

  async initialize(): Promise<void> { await this.doInitialize(); this.isInitialized = true; }
  protected abstract doInitialize(): Promise<void>;

  async dispose(): Promise<void> { await this.doDispose(); this.isInitialized = false; }
  protected abstract doDispose(): Promise<void>;

  protected ensureInitialized(): void { /* throws if not initialized */ }
  abstract parseFile(filePath: string, content: string, options?: ParseOptions): Promise<ParseResult>;
  abstract extractImports(content: string): Promise<ImportInfo[]>;
  abstract extractExports(content: string): Promise<ExportInfo[]>;
  abstract extractSymbols(content: string): Promise<ModuleSymbol[]>;

  protected countLines(content: string): {total: number; code: number; comment: number; blank: number};
  protected createErrorResult(filePath: string, error: unknown): ParseResult;
  protected createEmptyModule(filePath: string): Module;
}
```

---

## 11. Data Flow Summary

```
                    ┌─────────────────────────────┐
                    │  createDefaultParserRegistry │
                    │  (index.ts)                  │
                    └──────────┬──────────────────┘
                               │ registers
                               v
                    ┌─────────────────────────────┐
                    │  ParserRegistry              │
                    │  key: 'python'               │
                    │  ext: '.py' → 'python'       │
                    └──────────┬──────────────────┘
                               │ getParser('python')
                               v
                    ┌─────────────────────────────┐
                    │  PythonTreeSitterParser      │
                    │  extends ParserBase          │
                    └──────────┬──────────────────┘
                               │ doInitialize()
                               v
                    ┌─────────────────────────────┐
                    │  tree-sitter Python grammar  │
                    │  (native or WASM)            │
                    └──────────┬──────────────────┘
                               │ parseFile()
                               v
                    ┌─────────────────────────────┐
                    │  tree-sitter AST             │
                    │  (SyntaxNode tree)           │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              v                v                v
     extractImports()  extractExports()  extractSymbols()
              │                │                │
              v                v                v
         ImportInfo[]     ExportInfo[]     ModuleSymbol[]
              │                │                │
              └────────────────┼────────────────┘
                               v
                         ParseResult
                    { parserUsed: 'PythonTreeSitterParser' }
```

---

## 12. Commit Sequence

| Step | Files | Verify |
|------|-------|--------|
| 1. Install grammar | `package.json`, `package-lock.json` | `npm ls tree-sitter-python` shows 0.23.4 |
| 2. Add `parserUsed` field | `src/interface/types/parser.ts` | `npx tsc --noEmit` passes |
| 3. Create parser | `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` | Compiles |
| 4. Create fixtures | `tests/fixtures/python/*.py` | Files exist |
| 5. Create tests | `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | `npx vitest run` passes |
| 6. Wire registration | `src/infrastructure/parser/index.ts` | Registry test passes |
| 7. Comparison test | Test file update | Proves AST > regex for nested/multiline |

---

*Phase 67 PATTERNS.md -- ready for PLAN.md creation.*
