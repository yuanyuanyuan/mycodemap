# Phase 67 Research: Tree-sitter Python Grammar Integration

**Date:** 2026-05-09
**Status:** Complete -- ready for PLAN.md

---

## 1. Package Installation: `tree-sitter-python`

### Version Compatibility

| Package | Installed | Compatible Range |
|---------|-----------|-----------------|
| `tree-sitter` | `0.21.1` | (base) |
| `tree-sitter-typescript` | `0.23.2` | `peerDeps: { tree-sitter: '^0.21.0' }` |
| `tree-sitter-python` | **`0.23.4`** | `peerDeps: { tree-sitter: '^0.21.1' }` |

**Decision:** Install `tree-sitter-python@0.23.4`. This is the latest version whose peer dependency (`^0.21.1`) matches the installed `tree-sitter@0.21.1`. Versions `>=0.23.5` require `^0.22.1` which is incompatible.

### Package Contents (verified by extracting tarball)

```
tree-sitter-python@0.23.4/
  bindings/node/          # Native binding loader (node-gyp-build)
  prebuilds/
    darwin-arm64/tree-sitter-python.node
    darwin-x64/tree-sitter-python.node
    linux-arm64/tree-sitter-python.node
    linux-x64/tree-sitter-python.node
    win32-arm64/tree-sitter-python.node
    win32-x64/tree-sitter-python.node
  tree-sitter-python.wasm # WASM grammar (for web-tree-sitter)
  src/node-types.json     # AST node type definitions
```

**Key finding:** Both native `.node` prebuilds AND `.wasm` are shipped in the npm package. No separate WASM build step needed.

### Install Command

```bash
npm install tree-sitter-python@0.23.4
```

This goes into `dependencies` alongside `tree-sitter` and `tree-sitter-typescript`.

---

## 2. Existing tree-sitter-loader.ts Architecture

**File:** `src/parser/implementations/tree-sitter-loader.ts`

### How It Works

```
loadTreeSitter()
  ├─ env CODEMAP_USE_WASM_TREE_SITTER='1'?
  │   └─ YES → loadWASMTreeSitter()
  │   └─ NO  → loadNativeTreeSitter()
  │              ├─ SUCCESS → return
  │              └─ FAIL → loadWASMTreeSitter() (auto-fallback with warning)
  │                         ├─ SUCCESS → return
  │                         └─ FAIL → throw ActionableError
```

### Return Shape

```typescript
interface TreeSitterLoaderResult {
  Parser: any;                    // tree-sitter Parser class (native or WASM)
  TypeScript: { typescript: any }; // TypeScript language grammar
}
```

### What Must Change

The current return shape only includes `TypeScript`. It needs to also return `Python`.

**Option A (recommended):** Extend `TreeSitterLoaderResult` to include Python:

```typescript
interface TreeSitterLoaderResult {
  Parser: any;
  TypeScript: { typescript: any };
  Python?: { python: any };  // Optional -- loaded on demand
}
```

**Option B:** Create a separate `loadPythonGrammar()` function that reuses the same dual-path pattern. This avoids changing the TypeScript loading path.

**Recommended: Option B** -- the loader is TypeScript-specific by design (it hardcodes `tree-sitter-typescript` paths). A separate `loadPythonGrammar()` keeps the change surgical and avoids risking TypeScript parser regression. D-03 says "extend existing loadTreeSitter()" but D-06 says "DO NOT modify existing parsers." A separate loader function respects both: it reuses the pattern without changing the existing function's return type or behavior.

### Native Loading Pattern (from `loadNativeTreeSitter()`)

```typescript
async function loadNativeTreeSitter(): Promise<TreeSitterLoaderResult> {
  const treeSitterModule = await import('tree-sitter');
  const typescriptModule = await import('tree-sitter-typescript');
  return {
    Parser: treeSitterModule.default,
    TypeScript: typescriptModule,  // exports { typescript, tsx }
  };
}
```

For Python native loading, the same pattern applies:

```typescript
const pythonModule = await import('tree-sitter-python');
// pythonModule.python is the language object
```

### WASM Loading Pattern (from `loadWASMTreeSitter()`)

```typescript
const wasmParser = (await import('web-tree-sitter')).default;
await wasmParser.init();

// Resolve .wasm path via require.resolve
const tsWasmPath = require.resolve('tree-sitter-typescript/typescript.wasm');
const Lang = (wasmParser as any).Language;
const typescriptLanguage = await Lang.load(tsWasmPath);
```

For Python WASM loading, the same pattern applies:

```typescript
const pyWasmPath = require.resolve('tree-sitter-python/tree-sitter-python.wasm');
const pythonLanguage = await Lang.load(pyWasmPath);
```

---

## 3. Python Tree-sitter AST Node Types

### Imports

| Python Construct | Tree-sitter Node | Key Fields/Children |
|-----------------|-----------------|---------------------|
| `import os` | `import_statement` | `name`: [dotted_name("os")] |
| `import os as operating_system` | `import_statement` | `name`: [aliased_import(name=dotted_name("os"), alias=identifier("operating_system"))] |
| `from pkg.module import helper` | `import_from_statement` | `module_name`: dotted_name("pkg.module"), `name`: [dotted_name("helper")] |
| `from pkg import helper as alias` | `import_from_statement` | `module_name`: dotted_name("pkg"), `name`: [aliased_import(name=dotted_name("helper"), alias=identifier("alias"))] |
| `from .relative import x` | `import_from_statement` | `module_name`: relative_import([import_prefix("."), dotted_name("relative")]), `name`: [dotted_name("x")] |
| `from .. import x` | `import_from_statement` | `module_name`: relative_import([import_prefix("..")]), `name`: [dotted_name("x")] |
| `from pkg import *` | `import_from_statement` | `module_name`: dotted_name("pkg"), children: [wildcard_import] |
| `from __future__ import annotations` | `future_import_statement` | `name`: [dotted_name("annotations")] |

**Key differences from regex PythonParser:**
- Multi-line imports are parsed correctly (tree-sitter handles whitespace/newlines natively).
- `aliased_import` has explicit `name` and `alias` fields -- no need for string splitting.
- `relative_import` is a distinct node with `import_prefix` (dots) and optional `dotted_name`.
- `wildcard_import` is a distinct node -- no need to detect `*` in string.
- `future_import_statement` is a separate node type.

### Exports (`__all__`)

`__all__` is NOT a special node type. It's a regular `assignment` where:
- `left`: `identifier` with text `__all__`
- `right`: `list` containing `string` nodes

```python
__all__ = ['Service', 'run']
# AST: assignment(left=identifier("__all__"), right=list([string("Service"), string("run")]))
```

Detection logic: scan for `assignment` nodes where `left.text === '__all__'` and `right` is a `list`, then extract string contents from list children.

### Classes

| Python Construct | Tree-sitter Node | Key Fields |
|-----------------|-----------------|------------|
| `class Foo:` | `class_definition` | `name`: identifier("Foo"), `body`: block |
| `class Foo(Bar):` | `class_definition` | `name`: identifier("Foo"), `superclasses`: argument_list([identifier("Bar")]) |
| `class Foo(Bar, Baz):` | `class_definition` | `name`: identifier("Foo"), `superclasses`: argument_list([identifier("Bar"), identifier("Baz")]) -- multiple inheritance |
| `@decorator\nclass Foo:` | `decorated_definition` | `definition`: class_definition(...), `children`: [decorator(expression)] |

**Multiple inheritance:** The `superclasses` field is an `argument_list` containing multiple `identifier` or `attribute` children. Iterate over `argument_list.namedChildren` to get each base class.

**Decorators:** `decorated_definition` wraps `class_definition` or `function_definition`. The `children` field contains `decorator` nodes. Each `decorator` has one `expression` child (can be `identifier`, `call`, `attribute`).

### Functions

| Python Construct | Tree-sitter Node | Key Fields |
|-----------------|-----------------|------------|
| `def foo():` | `function_definition` | `name`: identifier("foo"), `parameters`: parameters([]), `body`: block |
| `def foo(x, y):` | `function_definition` | `name`: identifier("foo"), `parameters`: parameters([identifier("x"), identifier("y")]) |
| `def foo(x: int):` | `function_definition` | `parameters`: parameters([typed_parameter(identifier("x"), type)]) |
| `def foo(x=5):` | `function_definition` | `parameters`: parameters([default_parameter(identifier("x"), value)]) |
| `def foo(x: int = 5):` | `function_definition` | `parameters`: parameters([typed_default_parameter(identifier("x"), type, value)]) |
| `def foo() -> str:` | `function_definition` | `name`: identifier("foo"), `return_type`: type |
| `async def foo():` | `function_definition` | Same fields, but has `async` keyword child (check `node.children` for `type === 'async'`) |
| `@decorator\ndef foo():` | `decorated_definition` | `definition`: function_definition(...), `children`: [decorator(expression)] |

**Async detection:** Check if `function_definition` has a child with `type === 'async'` (anonymous keyword node).

**Parameter types:**
- `identifier` -- plain parameter: `def foo(x):`
- `typed_parameter` -- typed: `def foo(x: int):` -- has `type` field
- `default_parameter` -- with default: `def foo(x=5):` -- has `name` and `value` fields
- `typed_default_parameter` -- typed + default: `def foo(x: int = 5):` -- has `name`, `type`, `value` fields

### Nested Definitions

Tree-sitter naturally handles nesting through the AST structure. A `class_definition`'s `body` is a `block` that can contain `function_definition`, `class_definition`, or `decorated_definition` children. **Recursive traversal is required** to extract nested symbols.

### Comments

`comment` nodes are direct children of the module (`module`) or appear within blocks. They are `named: true` leaf nodes. For line counting, traverse all `comment` nodes and track their line ranges.

---

## 4. Pattern Analysis: How TypeScriptParser/PythonParser/GoParser Work

### Common Pattern (ParserBase implementations)

All three parsers follow the same structure:

```typescript
export class XxxParser extends ParserBase {
  readonly languageId = 'xxx' as const;
  readonly fileExtensions = ['xxx'];
  readonly name = 'Xxx Parser';
  protected supportedFeatures = new Set([...]);

  protected async doInitialize(): Promise<void> { /* noop or init */ }
  protected async doDispose(): Promise<void> { /* noop or cleanup */ }

  async parseFile(filePath, content, options?): Promise<ParseResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    const [imports, exports, symbols] = await Promise.all([
      this.extractImports(content),
      this.extractExports(content),
      this.extractSymbols(content),
    ]);
    const lineCounts = this.countLines(content);
    const module: Module = { id, projectId: '', path, language, stats };
    return { filePath, language, module, symbols, imports, exports, dependencies: [], parseTime };
  }

  async extractImports(content): Promise<ImportInfo[]> { /* regex-based */ }
  async extractExports(content): Promise<ExportInfo[]> { /* regex-based */ }
  async extractSymbols(content): Promise<ModuleSymbol[]> { /* regex-based */ }
}
```

### Key Differences for PythonTreeSitterParser

The existing parsers (PythonParser, TypeScriptParser, GoParser) are all **regex-based** -- they take `content: string` and use regex to extract information. `PythonTreeSitterParser` will be the **first AST-based parser** in the infrastructure layer.

**Implications:**
1. `doInitialize()` must load the tree-sitter grammar (native or WASM).
2. `extractImports/Exports/Symbols()` will use tree-sitter AST traversal instead of regex.
3. The parser needs to hold a tree-sitter `Parser` instance as a class field.
4. `doDispose()` may need to clean up the parser instance.

### ParseResult Shape

```typescript
interface ParseResult {
  filePath: string;
  language: LanguageId;         // 'python'
  module: Module;               // { id, projectId, path, language, stats }
  symbols: ModuleSymbol[];      // { id, name, kind, location, visibility, relatedSymbols, ... }
  imports: ImportInfo[];        // { source, sourceType, specifiers, isTypeOnly }
  exports: ExportInfo[];        // { name, kind, isDefault, isTypeOnly }
  dependencies: Dependency[];   // { id, sourceId, targetId, type }
  callGraph?: CallGraphInfo;    // Phase 70
  complexity?: ComplexityMetrics; // Phase 70
  parseTime: number;
  errors?: ParseError[];
}
```

---

## 5. Test Patterns

### Existing Test Structure

Tests live in `__tests__/` directories adjacent to implementation files:
- `src/infrastructure/parser/__tests__/PythonParser.test.ts`
- `src/infrastructure/parser/__tests__/TypeScriptParser.test.ts`
- `src/infrastructure/parser/__tests__/GoParser.test.ts`
- `src/infrastructure/parser/__tests__/ParserRegistry.test.ts`

### Test Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('PythonTreeSitterParser', () => {
  let parser: PythonTreeSitterParser;

  beforeEach(async () => {
    parser = new PythonTreeSitterParser();
    await parser.initialize();
  });

  it('parses imports, exports and symbols from common Python patterns', async () => {
    const content = `...`;  // Python source
    const result = await parser.parseFile('/tmp/service.py', content);
    expect(result.imports).toHaveLength(N);
    expect(result.exports.map(e => e.name)).toEqual([...]);
    expect(result.symbols.map(e => e.name)).toEqual([...]);
  });
});
```

### Required Test Fixtures (D-19)

Location: `tests/fixtures/python/`

| Fixture File | Covers |
|-------------|--------|
| `basic_imports.py` | import, from...import, aliased imports, relative imports, wildcard |
| `classes.py` | class definition, multiple inheritance, nested classes |
| `functions.py` | regular, async, decorators, nested functions, type annotations |
| `all_exports.py` | `__all__` assignment, default exports |
| `comprehensive.py` | All features combined -- used for comparison test |

### Comparison Test (D-18, ROADMAP Success Criteria #4)

```typescript
it('AST parser handles nested definitions and multi-line imports that regex misses', async () => {
  const content = `...`; // Python with nested classes, multi-line imports
  const astResult = await pythonTreeSitterParser.parseFile('/tmp/test.py', content);
  const regexResult = await pythonParser.parseFile('/tmp/test.py', content);

  // AST finds nested class, regex does not
  expect(astResult.symbols.some(s => s.name === 'InnerClass')).toBe(true);
  // AST handles multi-line import, regex may not
  expect(astResult.imports.some(i => i.source === 'some.module')).toBe(true);
});
```

---

## 6. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| WASM grammar fails to load at runtime | High | D-10: explicit error with actionable remediation message. No silent fallback. |
| Native prebuild incompatible with Node.js version | Medium | WASM fallback path exists (same pattern as TypeScript). |
| Python grammar node types differ from expectations | Medium | Verified node-types.json above. Test each construct individually. |
| `require.resolve('tree-sitter-python/tree-sitter-python.wasm')` fails | Medium | Same fallback pattern as TypeScript WASM: try `import.meta.resolve`, then `dirname(fileURLToPath(...))`. |
| tree-sitter-python@0.23.4 has bugs in specific Python constructs | Low | Pinned version. Can upgrade within `^0.21.1` range if needed (0.23.3 also compatible). |
| `decorated_definition` wrapping changes symbol extraction logic | Low | Well-documented grammar. The `definition` field always contains the actual class/function. |
| Async detection via `async` keyword child is fragile | Low | `async` is an anonymous node (`named: false`). Must check `node.children` not `node.namedChildren`. |

---

## 7. Implementation Architecture Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` | New AST-based Python parser (extends ParserBase) |
| `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | Unit tests |
| `tests/fixtures/python/*.py` | Test fixture files |

### Files to Modify

| File | Change |
|------|--------|
| `package.json` | Add `tree-sitter-python@0.23.4` to dependencies |
| `src/infrastructure/parser/index.ts` | Export `PythonTreeSitterParser`, update `createDefaultParserRegistry()` |
| `src/infrastructure/parser/registry/ParserRegistry.ts` | No change needed -- extension-based routing works automatically |

### Files NOT to Modify (D-06)

| File | Reason |
|------|--------|
| `src/parser/implementations/tree-sitter-parser.ts` | Existing TypeScript-hardcoded parser, reference only |
| `src/parser/implementations/tree-sitter-loader.ts` | Existing TypeScript-specific loader. Python grammar loading handled by PythonTreeSitterParser itself |
| `src/infrastructure/parser/implementations/PythonParser.ts` | Regex parser stays as deprecated fallback, not used by default |

### PythonTreeSitterParser Class Structure

```
PythonTreeSitterParser extends ParserBase
  ├── languageId: 'python'
  ├── fileExtensions: ['py']
  ├── name: 'Python Tree-sitter Parser'
  ├── supportedFeatures: Set(['decorators', 'call-graph', 'cross-file-analysis', 'complexity-metrics'])
  ├── private parser: any              // tree-sitter Parser instance
  ├── private Python: any              // Python language grammar
  ├── doInitialize()                   // Load tree-sitter + Python grammar (native/WASM)
  ├── doDispose()                      // Cleanup
  ├── parseFile()                      // Parse file using tree-sitter AST
  ├── extractImports(root, content)    // Walk import_statement, import_from_statement, future_import_statement
  ├── extractExports(root, content)    // Walk __all__ assignment, then public class/function defs
  ├── extractSymbols(root, content)    // Recursive walk for class_definition, function_definition, decorated_definition
  ├── extractDecorators(node)          // Extract decorator info from decorated_definition
  ├── extractParameters(node)          // Extract parameter info from parameters node
  ├── isAsync(node)                    // Check for async keyword child
  ├── isNestedDefinition(node)         // Check if definition is inside another class/function body
  └── countCommentLines(root)          // Walk comment nodes for stats
```

### Registration Strategy (D-08)

In `createDefaultParserRegistry()`:

```typescript
export function createDefaultParserRegistry(): ParserRegistry {
  const registry = new ParserRegistry();
  registry.register(new TypeScriptParser());
  registry.register(new GoParser());

  // AST-first: try PythonTreeSitterParser, fall back to regex PythonParser
  try {
    const pythonTSParser = new PythonTreeSitterParser();
    registry.register(pythonTSParser);
  } catch {
    // tree-sitter-python not available, register regex fallback
    registry.register(new PythonParser());
  }

  return registry;
}
```

**Note:** D-10 says "throw explicit error when tree-sitter-python not available" but D-08 says "register as python parser replacing regex PythonParser." The registration in `createDefaultParserRegistry()` should register the AST parser. If tree-sitter-python is unavailable at initialization time, the error should be thrown at `doInitialize()` or at `parseFile()` time (D-12: detect at parse time). The factory should always register PythonTreeSitterParser and let the error surface at parse time.

**Revised strategy:**

```typescript
registry.register(new PythonTreeSitterParser());
// PythonParser NOT registered -- only PythonTreeSitterParser handles 'python'
// If tree-sitter-python is unavailable, parseFile() throws with actionable error
```

This is consistent with D-10 (strict error, no silent fallback) and D-11 (regex PythonParser stays in codebase but is NOT used as automatic fallback).

---

## 8. `parserUsed` Metadata (D-13)

The `ParseResult` interface does not currently have a `parserUsed` field. Two approaches:

**Option A:** Add optional `parserUsed?: string` to `ParseResult` interface in `src/interface/types/parser.ts`.

**Option B:** Add `errors` array entry with `severity: 'info'` containing parser identification.

**Recommended: Option A** -- cleaner, more explicit, and useful for testing/debugging. The field should be optional to avoid breaking existing parsers.

```typescript
// In ParseResult interface:
parserUsed?: string;  // e.g., 'PythonTreeSitterParser' or 'PythonParser'
```

---

## 9. AST Extraction Logic (Detailed)

### extractImports

```
Walk root.namedChildren:
  ├─ import_statement
  │   └─ For each child in node.childForFieldName('name'):
  │       ├─ dotted_name → specifier: { name: dotted_name.text }
  │       └─ aliased_import → specifier: { name: name.text, alias: alias.text }
  │   └─ sourceType: 'absolute' (not starting with '.')
  │
  ├─ import_from_statement
  │   ├─ module_name:
  │   │   ├─ dotted_name → source: dotted_name.text, sourceType: 'absolute'
  │   │   └─ relative_import → source: full text, sourceType: 'relative'
  │   ├─ name field:
  │   │   ├─ dotted_name → specifier: { name: text }
  │   │   ├─ aliased_import → specifier: { name, alias }
  │   │   └─ wildcard_import → specifier: { name: '*' }
  │   └─ children: [wildcard_import] → specifier: { name: '*' }
  │
  └─ future_import_statement
      └─ name field: same as import_from_statement name field
      └─ sourceType: 'absolute', source: '__future__'
```

### extractExports

```
1. Scan for assignment where left.text === '__all__' and right is list
   └─ Extract string contents from list children → ExportInfo with kind='variable'

2. If no __all__, scan for top-level definitions:
   ├─ class_definition (not starting with '_') → ExportInfo(kind='class')
   ├─ function_definition (not starting with '_') → ExportInfo(kind='function')
   ├─ decorated_definition → unwrap and check inner definition
   └─ expression_statement containing assignment → ExportInfo(kind='variable')
```

### extractSymbols (Recursive)

```
function walkNode(node, depth=0):
  results = []

  if node.type === 'class_definition':
    name = node.childForFieldName('name').text
    superclasses = node.childForFieldName('superclasses')
    extends = superclasses?.namedChildren.map(c => c.text) || []
    decorators = extractDecorators(node.parent if decorated_definition)
    results.push(ModuleSymbol({
      name, kind: 'class', extends,
      visibility: name.startsWith('_') ? 'private' : 'public',
      decorators, location: { line: node.startPosition.row + 1 }
    }))
    // Recurse into body for nested definitions
    body = node.childForFieldName('body')
    if body: results.push(...walkNode(body, depth+1))

  if node.type === 'function_definition':
    name = node.childForFieldName('name').text
    parameters = node.childForFieldName('parameters')
    returnType = node.childForFieldName('return_type')?.text
    isAsync = node.children.some(c => c.type === 'async')
    decorators = extractDecorators(node.parent if decorated_definition)
    results.push(ModuleSymbol({
      name, kind: 'function',
      signature: { parameters: [...], returnType, async: isAsync },
      visibility: name.startsWith('_') ? 'private' : 'public',
      decorators, location: { line: node.startPosition.row + 1 }
    }))
    // Recurse into body for nested definitions
    body = node.childForFieldName('body')
    if body: results.push(...walkNode(body, depth+1))

  if node.type === 'decorated_definition':
    // The decorators are children, the definition is in the 'definition' field
    definition = node.childForFieldName('definition')
    // Walk the definition (will handle class/function)
    results.push(...walkNode(definition, depth))
    // Note: decorators are extracted from node.children.filter(c => c.type === 'decorator')

  // Recurse into other nodes
  for child in node.namedChildren:
    if child.type not in ['class_definition', 'function_definition', 'decorated_definition']:
      results.push(...walkNode(child, depth))

  return results
```

---

## 10. Context Decisions Checklist

| Decision | Research Finding | Status |
|----------|-----------------|--------|
| D-01: Dual-path loading | Native prebuilds + WASM both shipped in package. Loader pattern verified. | Ready |
| D-02: npm install | `tree-sitter-python@0.23.4` compatible with `tree-sitter@0.21.1` | Ready |
| D-03: Extend loader | Recommending separate `loadPythonGrammar()` to avoid modifying existing function | Ready |
| D-04: Version alignment | 0.23.4 is the latest compatible version | Ready |
| D-05: WASM path | `require.resolve('tree-sitter-python/tree-sitter-python.wasm')` -- same pattern as TypeScript | Ready |
| D-06: Independent class | New file, no modification to existing parsers | Ready |
| D-07: File placement | `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` | Ready |
| D-08: Registry integration | Register as `python` language, replace regex PythonParser in factory | Ready |
| D-09: ParserBase interface | Same pattern as TypeScriptParser/PythonParser/GoParser | Ready |
| D-10: Strict error | Throw at parseFile() time if grammar not loaded | Ready |
| D-11: Deprecated fallback | PythonParser stays in codebase, not auto-registered | Ready |
| D-12: Parse-time detection | Grammar loading in doInitialize(), error in parseFile() if not loaded | Ready |
| D-13: parserUsed metadata | Add optional field to ParseResult | Ready |
| D-14: Must handle | All constructs mapped to tree-sitter node types | Ready |
| D-15: Type annotations | `typed_parameter`, `typed_default_parameter`, `return_type` fields available | Ready |
| D-18: Comparison test | Test structure defined | Ready |
| D-19: Fixture files | 5 fixture files planned in `tests/fixtures/python/` | Ready |
| D-20: Per-feature tests | Each feature has mapped node types and test approach | Ready |

---

## 11. Quick Reference: Python Tree-sitter Node Type Map

```
import os                        → import_statement
import os as o                   → import_statement (aliased_import)
from os import path              → import_from_statement
from os import path as p         → import_from_statement (aliased_import)
from . import x                  → import_from_statement (relative_import)
from .foo import x               → import_from_statement (relative_import)
from os import *                 → import_from_statement (wildcard_import)
from __future__ import annotations → future_import_statement

class Foo:                       → class_definition
class Foo(Bar, Baz):             → class_definition (superclasses)
@decorator\nclass Foo:           → decorated_definition → class_definition
async def foo():                 → function_definition (async child)
def foo(x: int) -> str:         → function_definition (typed_parameter, return_type)
def foo(x=5):                    → function_definition (default_parameter)
def foo(x: int = 5):            → function_definition (typed_default_parameter)
@decorator\ndef foo():           → decorated_definition → function_definition

__all__ = ['a', 'b']            → assignment (left=identifier, right=list)
# comment                        → comment
```

---

*Research complete. Ready for PLAN.md creation.*
