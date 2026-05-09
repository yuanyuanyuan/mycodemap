# Phase 69: PythonTypeEnhancer - Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 8
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/parser/enhancers/PythonTypeEnhancer.ts` | service | transform | `src/parser/enhancers/TypeScriptTypeEnhancer.ts` | exact |
| `src/parser/index.ts` | utility | request-response | `src/parser/index.ts` | exact |
| `src/core/analyzer.ts` | service | batch | `src/core/analyzer.ts` | exact |
| `src/interface/types/parser.ts` | model | transform | `src/parser/interfaces/IParser.ts` | role-match |
| `src/interface/types/index.ts` | model | transform | `src/interface/types/index.ts` | exact |
| `src/core/__tests__/analyzer.test.ts` | test | batch | `src/core/__tests__/analyzer.test.ts` | exact |
| `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | test | request-response | `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` | exact |
| `tests/fixtures/python/comprehensive.py` | test | file-I/O | `tests/fixtures/python/comprehensive.py` | exact |

## Pattern Assignments

### `src/parser/enhancers/PythonTypeEnhancer.ts` (service, transform)

**Analog:** `src/parser/enhancers/TypeScriptTypeEnhancer.ts`

**Imports pattern** (`src/parser/enhancers/TypeScriptTypeEnhancer.ts:4-5`):
```typescript
import { SmartParser } from '../implementations/smart-parser.js';
import type { ParseResult, ParserOptions } from '../interfaces/IParser.js';
```

**Constructor + enabled gate** (`src/parser/enhancers/TypeScriptTypeEnhancer.ts:12-18`):
```typescript
constructor(
  private readonly rootDir: string,
  private readonly enabled: boolean = true
) {
  const options: ParserOptions = { rootDir, mode: 'tree-sitter', enhanceTypes: enabled };
  this.smartParser = new SmartParser(options);
}
```

**Batch enhancement loop** (`src/parser/enhancers/TypeScriptTypeEnhancer.ts:20-31`):
```typescript
async enhance(results: ParseResult[]): Promise<ParseResult[]> {
  if (!this.enabled) {
    return results;
  }

  const enhancedResults: ParseResult[] = [];
  for (const result of results) {
    enhancedResults.push(await this.enhanceResult(result));
  }

  return enhancedResults;
}
```

**Merge/write-back contract** (`src/parser/enhancers/TypeScriptTypeEnhancer.ts:37-48`):
```typescript
private async enhanceResult(result: ParseResult): Promise<ParseResult> {
  if (!this.isTypeScriptFile(result.path)) {
    return result;
  }

  const enhanced = await this.smartParser.parseFile(result.path);
  return {
    ...result,
    typeInfo: enhanced.typeInfo ?? result.typeInfo,
    callGraph: enhanced.callGraph ?? result.callGraph,
    complexity: enhanced.complexity ?? result.complexity,
  };
}
```

**Copy into Python version:**
- Keep the same `enhance(results) -> ParseResult[]` public contract.
- Keep per-file gating before doing expensive work.
- Only overwrite `typeInfo` when Python enrichment has concrete output; preserve existing fields otherwise.

---

### `src/parser/index.ts` (utility, request-response)

**Analog:** `src/parser/index.ts`

**Enhancer wiring pattern** (`src/parser/index.ts:53-60`):
```typescript
private readonly enhancer: TypeScriptTypeEnhancer;

constructor(private readonly options: ParserOptions) {
  this.enhancer = new TypeScriptTypeEnhancer(
    options.rootDir,
    options.enhanceTypes !== false
  );
}
```

**Post-parse enhancement seam** (`src/parser/index.ts:62-76`):
```typescript
async parseFile(filePath: string) {
  const parser = this.registry.getParserByFile(filePath);
  if (!parser) {
    throw new Error(`No parser registered for ${filePath}`);
  }

  const content = await readFileContent(filePath);
  const parsed = await parser.parseFile(filePath, content, {
    includeCallGraph: true,
    includeComplexity: true,
    includeTypeInfo: true,
  });

  const [enhanced] = await this.enhancer.enhance([toLegacyParseResult(parsed)]);
  return enhanced;
}
```

**Legacy conversion seam** (`src/parser/index.ts:89-110`):
```typescript
function toLegacyParseResult(result: RegistryParseResult): import('./interfaces/IParser.js').ParseResult {
  return {
    path: result.filePath,
    exports: result.exports,
    imports: result.imports,
    symbols: result.symbols,
    dependencies: result.imports.map((entry) => resolveImportPath(result.filePath, entry.source)),
    type: getModuleType(result.filePath),
    stats: result.module.stats,
    callGraph: result.callGraph
      ? {
          calls: result.callGraph.calls,
          recursive: result.callGraph.recursive,
          callCounts: result.callGraph.calls.reduce<Record<string, number>>((counts, call) => {
            counts[call.callee] = (counts[call.callee] ?? 0) + 1;
            return counts;
          }, {}),
        }
      : undefined,
    complexity: result.complexity,
  };
}
```

**Apply here:**
- Mirror the existing TS enhancer wiring; do not invent a Python-only parse entry.
- Extend the conversion seam to carry `typeInfo` once registry-side results expose it.

---

### `src/core/analyzer.ts` (service, batch)

**Analog:** `src/core/analyzer.ts`

**Central enhancement application** (`src/core/analyzer.ts:41-75`):
```typescript
const registry = createDefaultParserRegistry();
const tsEnhancer = new TypeScriptTypeEnhancer(rootDir, enhanceTypes);
let parseResults: ParseResult[] = [];

for (const file of files) {
  // parse via registry ...
  parseResults.push(convertRegistryResultToLegacyResult(parsed));
}

parseResults = await tsEnhancer.enhance(parseResults);
const modules = parseResults.map((result) => convertToModuleInfo(result));
tsEnhancer.dispose();
```

**Module persistence pattern** (`src/core/analyzer.ts:136-152`):
```typescript
function convertToModuleInfo(result: ParseResult): ModuleInfo {
  return {
    id: createModuleId(result.path),
    path: result.path,
    absolutePath: result.path,
    type: result.type,
    stats: result.stats,
    exports: result.exports,
    imports: result.imports,
    symbols: result.symbols,
    dependencies: Array.from(new Set(result.dependencies)),
    dependents: [],
    complexity: result.complexity,
    callGraph: result.callGraph,
    typeInfo: result.typeInfo
  };
}
```

**Registry-to-legacy propagation pattern** (`src/core/analyzer.ts:155-177`):
```typescript
function convertRegistryResultToLegacyResult(
  result: import('../interface/types/parser.js').ParseResult
): ParseResult {
  return {
    path: result.filePath,
    exports: result.exports,
    imports: result.imports,
    symbols: result.symbols,
    dependencies: result.imports.map((entry) => resolveDependencyPath(result.filePath, entry.source)),
    type: categorizeParsedFile(result.filePath),
    stats: result.module.stats,
    callGraph: result.callGraph ? { /* ... */ } : undefined,
    complexity: result.complexity,
  };
}
```

**Apply here:**
- Keep enhancement centralized in analyzer before `convertToModuleInfo`.
- Add Python enhancement beside the TS seam instead of pushing logic into parser registry internals.
- Ensure `convertRegistryResultToLegacyResult` also forwards `typeInfo`; otherwise graph persistence drops enriched data.

---

### `src/interface/types/parser.ts` (model, transform)

**Analog:** `src/parser/interfaces/IParser.ts`

**Target shape to mirror** (`src/parser/interfaces/IParser.ts:32-58`):
```typescript
export interface ParseResult {
  path: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  symbols: ModuleSymbol[];
  dependencies: string[];
  type: 'source' | 'test' | 'config' | 'type';
  stats: {
    lines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
  typeInfo?: TypeInfo;
  callGraph?: CallGraph;
  complexity?: ComplexityMetrics;
}
```

**TypeInfo field inventory** (`src/parser/interfaces/IParser.ts:63-140`):
```typescript
export interface TypeInfo {
  typeDefinitions: Array<{ /* ... */ }>;
  genericParams: Array<{ /* ... */ }>;
  crossFileRefs: Array<{ /* ... */ }>;
  unionTypes: string[];
  intersectionTypes: string[];
  typeAliases: Array<{ /* ... */ }>;
  conditionalTypes?: Array<{ /* ... */ }>;
  mappedTypes?: Array<{ /* ... */ }>;
  templateLiteralTypes?: Array<{ /* ... */ }>;
  indexedAccessTypes?: string[];
  inferredTypes?: string[];
}
```

**Current registry-side gap** (`src/interface/types/parser.ts:56-82`):
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
  parserUsed?: string;
}
```

**Apply here:**
- Add `typeInfo` to registry `ParseResult`.
- Reuse the legacy `TypeInfo` contract rather than inventing a Python-specific schema.

---

### `src/interface/types/index.ts` (model, transform)

**Analog:** `src/interface/types/index.ts`

**Function and symbol backfill surfaces** (`src/interface/types/index.ts:70-78`, `src/interface/types/index.ts:153-170`):
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

**Module-level typeInfo persistence surface** (`src/interface/types/index.ts:263-286`):
```typescript
typeInfo?: {
  typeDefinitions: Array<{
    name: string;
    kind: 'interface' | 'type' | 'enum' | 'class' | 'alias';
    members: Array<{
      name: string;
      type: string;
      optional: boolean;
    }>;
  }>;
  genericParams: Array<{ name: string; extends?: string; default?: string }>;
  crossFileRefs: Array<{ symbol: string; file: string; line: number }>;
  unionTypes: string[];
  intersectionTypes: string[];
};
```

**Apply here:**
- Reuse existing `signature`, `members`, and `type` fields for targeted Python symbol backfill.
- If Python `typeInfo` needs fields already present in legacy `TypeInfo` but missing here, extend this module-facing shape in place rather than adding a second metadata channel.

---

### `src/core/__tests__/analyzer.test.ts` (test, batch)

**Analog:** `src/core/__tests__/analyzer.test.ts`

**Temp-project setup pattern** (`src/core/__tests__/analyzer.test.ts:10-35`):
```typescript
async function createTempProject(): Promise<string> {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "codemap-analyzer-"));
  tempDirs.push(rootDir);

  await fs.mkdir(path.join(rootDir, "src"), { recursive: true });
  await fs.writeFile(
    path.join(rootDir, "src", "a.ts"),
    [/* ... */].join("\n"),
    "utf-8",
  );
  // ...
  return rootDir;
}
```

**Analyzer-facing verification pattern** (`src/core/__tests__/analyzer.test.ts:45-66`):
```typescript
const codeMap = await analyze({
  rootDir,
  mode: "tree-sitter",
  include: ["src/**/*.ts"],
});

const moduleA = codeMap.modules.find((m) => m.path.endsWith("/src/a.ts"));
const moduleB = codeMap.modules.find((m) => m.path.endsWith("/src/b.ts"));

expect(moduleA).toBeDefined();
expect(moduleB).toBeDefined();
```

**Failure-path pattern** (`src/core/__tests__/analyzer.test.ts:114-136`):
```typescript
const parseContentSpy = vi.spyOn(TreeSitterParser.prototype, "parseContent").mockImplementation(
  async function (filePath: string, content: string) {
    if (filePath.endsWith("/src/b.ts")) {
      throw new Error("simulated parse skip");
    }
    return originalParseContent.call(this, filePath, content);
  },
);

expect(codeMap.graphStatus).toBe("partial");
expect(codeMap.failedFileCount).toBe(1);
```

**Apply here:**
- Add analyzer-level proof that Python `module.typeInfo` survives end-to-end.
- Include one fail-soft case where ambiguous docstrings produce empty/missing metadata instead of guessed types.

---

### `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` (test, request-response)

**Analog:** `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts`

**Test structure + fixture loading** (`src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts:5-20`):
```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PythonTreeSitterParser } from '../implementations/PythonTreeSitterParser.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const FIXTURE_DIR = resolve(import.meta.dirname, '../../../../tests/fixtures/python');

beforeEach(async () => {
  parser = new PythonTreeSitterParser();
  await parser.initialize();
});
```

**Strict failure behavior** (`src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts:37-46`):
```typescript
const initializeSpy = vi
  .spyOn(TreeSitterParser.prototype, 'initialize')
  .mockRejectedValueOnce(new Error('grammar unavailable'));

const strictParser = new PythonTreeSitterParser();

await expect(strictParser.initialize()).rejects.toThrow(/No silent fallback to regex parser/);
```

**Fixture-based assertion pattern** (`src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts:175-206`):
```typescript
const content = await readFile(resolve(FIXTURE_DIR, 'comprehensive.py'), 'utf-8');

const astResult = await parser.parseFile('/tmp/comprehensive.py', content);

expect(astResult.symbols.some(s => s.name === 'Config')).toBe(true);
expect(astResult.symbols.some(s => s.signature?.async === true)).toBe(true);
expect(astResult.parserUsed).toBe('PythonTreeSitterParser');
```

**Apply here:**
- Reuse this file if the planner keeps Phase 69 verification close to the Python parse surface.
- Assert enriched signatures/class members against real fixture content, not synthetic strings only.

---

### `tests/fixtures/python/comprehensive.py` (test, file-I/O)

**Analog:** `tests/fixtures/python/comprehensive.py`

**Current annotation-rich fixture pattern** (`tests/fixtures/python/comprehensive.py:14-30`):
```python
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
```

**Apply here:**
- Extend this fixture rather than creating a parallel Python fixture unless the three docstring styles become too noisy in one file.
- Keep explicit annotations already present; add Google/NumPy/Sphinx docstrings as high-confidence backfill cases around the same symbols.

## Shared Patterns

### Post-Parse Enhancement Seam
**Source:** `src/parser/enhancers/TypeScriptTypeEnhancer.ts:20-48`, `src/parser/index.ts:62-76`
**Apply to:** `src/parser/enhancers/PythonTypeEnhancer.ts`, `src/parser/index.ts`, `src/core/analyzer.ts`
```typescript
const [enhanced] = await this.enhancer.enhance([toLegacyParseResult(parsed)]);
return {
  ...result,
  typeInfo: enhanced.typeInfo ?? result.typeInfo,
};
```

### Registry-to-Legacy Propagation
**Source:** `src/parser/index.ts:89-110`, `src/core/analyzer.ts:155-177`
**Apply to:** `src/interface/types/parser.ts`, `src/parser/index.ts`, `src/core/analyzer.ts`
```typescript
return {
  path: result.filePath,
  exports: result.exports,
  imports: result.imports,
  symbols: result.symbols,
  stats: result.module.stats,
  complexity: result.complexity,
};
```

### Targeted Symbol Backfill
**Source:** `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts:523-550`, `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts:601-661`, `src/interface/types/index.ts:153-170`
**Apply to:** `src/parser/enhancers/PythonTypeEnhancer.ts`, `src/interface/types/index.ts`
```typescript
const signature: FunctionSignature = {
  parameters: params,
  returnType: returnTypeNode?.text || '',
  async: isAsync,
};

return {
  name: nameText,
  kind: 'function',
  signature,
};
```

### Fail-Closed / Fail-Soft Verification
**Source:** `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts:37-46`, `src/core/__tests__/analyzer.test.ts:114-136`
**Apply to:** all new Phase 69 tests
```typescript
await expect(strictParser.initialize()).rejects.toThrow(/No silent fallback to regex parser/);
expect(codeMap.graphStatus).toBe("partial");
```

Use the same verification posture:
- parser/runtime availability failures fail closed;
- ambiguous docstring parsing fails soft by leaving metadata empty.

## No Analog Found

| File / Sub-area | Role | Data Flow | Reason |
|---|---|---|---|
| `src/parser/enhancers/PythonTypeEnhancer.ts` docstring-style parser internals | service | transform | Repo has no existing Google/NumPy/Sphinx parser; only the outer enhancer seam has a direct analog. |
| Optional dedicated test `src/parser/enhancers/__tests__/PythonTypeEnhancer.test.ts` | test | transform | Repo has TS enhancer tests only indirectly through parser/analyzer tests; closest usable patterns are `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` and `src/core/__tests__/analyzer.test.ts`. |

## Metadata

**Analog search scope:** `src/parser/`, `src/core/`, `src/interface/types/`, `src/infrastructure/parser/`, `tests/fixtures/python/`
**Files scanned:** 11
**Pattern extraction date:** 2026-05-09
