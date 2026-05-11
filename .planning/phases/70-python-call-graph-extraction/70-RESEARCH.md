# Phase 70: Python Call-graph Extraction - Research

**Researched:** 2026-05-10
**Domain:** Python call-graph extraction and symbol-level graph writeback
**Confidence:** MEDIUM-HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Phase 70 is a standard first release: cover high-confidence static calls only, including direct function calls, direct instance/class method calls, `@staticmethod` / `@classmethod`, and clearly resolvable imported callees. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
- **D-02:** Complex inheritance dispatch inference is out of scope. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
- **D-04:** Dynamic features (`getattr`, monkey patching, runtime rebinding/aliasing, duck-typed dispatch) must not produce guessed edges. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
- **D-06:** Only high-confidence edges may enter shared graph truth. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
- **D-07:** Non-provable calls must remain explicit as `unresolved`, `ambiguous`, or `unsupported_dynamic`. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
- **D-09:** Canonical writeback is symbol-level caller -> callee truth; no parallel file/module-level truth path in this phase. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]

### the agent's Discretion

- Exact internal helper boundaries between parser extraction, resolution, and writeback, as long as everything flows through the shared parser/result contract. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
- Exact representation of unresolved outcomes, as long as unresolved facts remain explicit and do not silently degrade into false-positive edges. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirement

| ID | Description | Research Support |
|----|-------------|------------------|
| PY-07 | Python call-graph 提取覆盖文件内函数/方法调用与跨文件 imported callee 解析，并在 shared graph truth 中生成 dependency edges | Reuse the existing `ParseResult.callGraph -> GlobalSymbolIndexBuilder -> analyzer module output` path, but first upgrade Python extraction and Python-aware resolution so symbol-level truth is stable. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/global-index.ts][VERIFIED: src/core/analyzer.ts] |
</phase_requirements>

## Summary

Phase 70 should be planned as a narrow extension of the existing shared parser/result pipeline, not as a graph redesign. The repo already has the correct downstream seam: `ParseResult.callGraph` exists, `GlobalSymbolIndexBuilder` already consumes it, and `analyzer.ts` already forwards cross-file call results into module output. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/global-index.ts][VERIFIED: src/core/analyzer.ts]

The actual gap is upstream and Python-specific:

1. `PythonTreeSitterParser.parseFile()` currently ignores `includeCallGraph` and never emits `callGraph`. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
2. Current Python symbol extraction flattens nested functions/methods into bare names, so symbol-level method truth is not stable enough for `Class.method` / `self.method` scope. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
3. `GlobalSymbolIndexBuilder` resolves calls using TS-oriented import/path logic and simple callee strings; it has no Python-aware relative/module resolution strategy yet. [VERIFIED: src/core/global-index.ts]
4. The current `CallGraphInfo` / analyzer module output only carries `calls` and `recursive`, so explicit unresolved/ambiguous/dynamic outcomes need a minimal shared-contract extension if they are to stay visible downstream. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/interface/types/index.ts][VERIFIED: src/core/analyzer.ts]

The best Phase 70 path is therefore:

- make Python parser emit high-confidence local call facts;
- qualify Python method symbols so method edges have stable symbol anchors;
- add a minimal explicit non-edge outcome surface to the shared call-graph contract;
- teach global-index to resolve Python imported callees without broad heuristics;
- prove all of it via parser/global-index/analyzer tests, including at least one dynamic failure path.

## Repository Facts

### 1. Shared call-graph contract already exists but is thin

`src/interface/types/parser.ts` already exposes:

- `ParseOptions.includeCallGraph?: boolean`
- `ParseResult.callGraph?: CallGraphInfo`
- `CallGraphInfo.calls[] = { caller, callee, line }`
- `CallGraphInfo.recursive[]`

This is enough for positive edges, but not enough to preserve explicit unresolved outcomes required by D-07. [VERIFIED: src/interface/types/parser.ts]

### 2. Python parser owns the right seam, but call-graph is not implemented

`PythonTreeSitterParser` already:

- parses AST through `TreeSitterParser.parseSyntaxTree()`
- extracts imports / exports / symbols from AST
- supports `call-graph` in `supportedFeatures`
- returns parse results through the shared `ParseResult` surface

But `parseFile()` only returns `symbols/imports/exports/dependencies/parseTime/parserUsed`; it does not compute or attach `callGraph`. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]

### 3. Current Python symbol identity is insufficient for method-level truth

`walkNode()` recursively extracts nested `class_definition` and `function_definition`, but `extractFunctionSymbol()` always writes `kind: 'function'` with bare `nameText`. There is no class owner, qualified name, or `kind: 'method'` distinction for functions under a class body. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/interface/types/index.ts]

This creates two direct Phase 70 risks:

- two classes with `run()` collapse onto the same symbol name;
- `self.run()` cannot be written back as a stable symbol edge without recovering class context first.

### 4. Downstream cross-file seam already exists

`GlobalSymbolIndexBuilder.build()` already:

1. builds per-file symbol/import/export indexes,
2. reads `result.callGraph.calls`,
3. resolves non-local callees through imports,
4. stores `crossFileCalls`,
5. exposes those to `analyzer.ts`.

`analyzer.ts` then appends `crossFileCalls` into `module.callGraph` when any are resolved. [VERIFIED: src/core/global-index.ts][VERIFIED: src/core/analyzer.ts]

This means Phase 70 does not need a new graph pipeline; it needs Python-compatible inputs into the existing one.

### 5. Existing global-index logic is TS/JS-shaped

`GlobalSymbolIndexBuilder` currently:

- resolves import paths through `typescript.resolveModuleName()`;
- normalizes file keys by stripping TS/JS extensions only;
- resolves namespace calls by splitting `calleeName` on `.`;
- indexes local symbols by flat `sym.name`.

This is workable for imported Python function aliases, but it is not sufficient for Python module resolution and qualified method symbols unless extended deliberately. [VERIFIED: src/core/global-index.ts]

## Recommended Technical Direction

### Direction 1: Add minimal qualified symbol identity for Python methods

Use the existing `ModuleSymbol.name` field as the stable symbol key and emit qualified names for class-owned methods such as `Service.run` while keeping top-level functions as bare names. Set `kind: 'method'` for class-owned function symbols when the AST owner is a class. [VERIFIED: src/interface/types/index.ts][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]

Why this is the best fit:

- no new symbol ID system is required for Phase 70;
- `ParseResult.callGraph.calls[].caller/callee` can reuse the same stable key shape;
- `global-index` can resolve method targets by exact symbol name rather than inheritance heuristics.

### Direction 2: Treat call extraction as a parser concern, not analyzer concern

The parser already has the AST and lexical context needed to classify:

- direct local function call: `helper()`
- direct method call in class scope: `self.helper()`, `cls.helper()`
- direct class/static call: `Service.helper()`
- imported function call: `helper_alias()`
- unsupported dynamic: `getattr(obj, name)()`

Doing this later in `global-index` would lose local lexical facts such as the current class owner. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/core/global-index.ts]

### Direction 3: Extend the shared call-graph contract minimally for explicit non-edge outcomes

Recommended extension:

- keep existing `calls[]` unchanged for proven edges;
- add one optional collection for explicit unresolved outcomes, for example `issues[]` or `unresolvedCalls[]`, with a bounded status enum (`unresolved` | `ambiguous` | `unsupported_dynamic`) plus source line and observed expression.

This is the smallest way to satisfy D-07 without inventing fake edges or a Python-only side channel. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/interface/types/index.ts]

### Direction 4: Keep Python cross-file resolution strict and import-led

Only resolve cross-file callees when one of these is statically true:

- callee name matches a directly imported function or imported alias;
- namespace/member call matches an imported module/class alias plus exported/local symbol;
- `self.method()` / `cls.method()` can be rewritten to an exact local class-owned symbol;
- `Class.method()` matches a known local or imported class symbol and a known method symbol.

Do not attempt:

- inheritance walk across multiple bases;
- attribute type inference for arbitrary instance variables;
- runtime alias rebinding;
- wildcard import guessing beyond exact indexed exports already present.

This aligns with D-01, D-02, and D-04. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]

## Execution Patterns To Reuse

### Pattern 1: Focused parser tests with real AST fixtures

`src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts` already verifies imports, nested definitions, decorators, and async support through small inline snippets. Extend that pattern with explicit call-graph assertions. [VERIFIED: src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts]

### Pattern 2: Global-index tests with synthetic ParseResult fixtures

`src/core/__tests__/global-index.test.ts` already constructs small `ParseResult[]` fixtures to assert cross-file resolution behavior. That is the right seam to add Python imported-callee resolution proofs without running the full analyzer. [VERIFIED: src/core/__tests__/global-index.test.ts]

### Pattern 3: Analyzer integration tests through temp projects

`src/core/__tests__/analyzer.test.ts` already creates temp projects, runs `analyze()`, and checks module/dependency output. This is the right place to prove that Python call truth survives end-to-end into shared graph output. [VERIFIED: src/core/__tests__/analyzer.test.ts]

## Proposed Plan Shape

One execute plan is sufficient if it is split into three implementation tasks:

1. Contract + red tests
2. Python parser extraction
3. Python-aware cross-file resolution + analyzer persistence

This keeps Phase 70 within one wave while still preserving a clean verification ladder:

- parser unit tests
- global-index targeted tests
- analyzer integration tests

## Common Pitfalls

### Pitfall 1: Bare method names create false merges

If methods remain as `run` instead of `Class.run`, symbol-level writeback becomes ambiguous as soon as more than one class defines the same method. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]

### Pitfall 2: Dynamic expressions silently disappear

If unsupported dynamic calls are merely skipped, downstream consumers will read the graph as “complete enough” instead of “conservatively partial,” violating D-07. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]

### Pitfall 3: Python path resolution routed entirely through TS defaults

`typescript.resolveModuleName()` is useful for alias support, but Python files need explicit extension/module-package matching (`.py`, `/__init__.py`) or relative import fallback to resolve local modules correctly. [VERIFIED: src/core/global-index.ts]

### Pitfall 4: Overreaching into complexity or topology

The current repo already splits complexity into Phase 72 and topology/dedup into Phase 73; Phase 70 should not mix those concerns into parser or graph output changes. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md]

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Python whole-program dispatch inference | Heuristics for arbitrary attribute receivers and inheritance chains | Exact AST-owner and import-led resolution only | Matches the user’s high-confidence-only scope. [VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md] |
| A second call-graph storage path | Python-only graph channel or file-level duplicate truth | Existing `ParseResult.callGraph -> global-index -> analyzer` seam | Shared graph truth is already the accepted architecture. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/global-index.ts][VERIFIED: src/core/analyzer.ts] |
| Broad module search heuristics | Scan-all-files fuzzy name matching | Indexed import/export resolution with Python-specific path normalization | Prevents false-positive edges. [VERIFIED: src/core/global-index.ts] |

## Research Conclusion

Phase 70 is feasible without architectural churn if the plan stays disciplined:

- qualify Python method symbols;
- emit only proven local/static calls;
- preserve explicit non-edge outcomes in the shared contract;
- add Python-aware import resolution on top of the existing global-index seam;
- verify one dynamic failure path and one cross-file success path end-to-end.

That combination is the smallest implementation that can satisfy `PY-07` while remaining aligned with the locked “strict conservative, symbol-level only” phase boundary. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: .planning/phases/70-python-call-graph-extraction/70-CONTEXT.md]

