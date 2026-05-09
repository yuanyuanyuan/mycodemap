# Phase 67: Tree-sitter Python Grammar Integration - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Install `tree-sitter-python` grammar and create a Python-specific Tree-sitter parser that produces full AST-based analysis for Python files, replacing the regex-based PythonParser for the main analysis path. This phase delivers: grammar installation, loader extension, new PythonTreeSitterParser class, Registry integration, and a comparison test proving AST superiority over regex. It does NOT deliver: multi-language parser switching (Phase 68), PythonTypeEnhancer (Phase 69), or Python call-graph/complexity (Phase 70).

</domain>

<decisions>
## Implementation Decisions

### WASM Grammar Loading
- **D-01:** Use dual-path loading (native first, WASM fallback) — consistent with existing tree-sitter-loader.ts pattern for TypeScript.
- **D-02:** Install `tree-sitter-python` via npm package. The package contains both native bindings and WASM files.
- **D-03:** Extend existing `loadTreeSitter()` in `src/parser/implementations/tree-sitter-loader.ts` to also return Python grammar. Do NOT create a new generic language loader.
- **D-04:** Match current version alignment: `tree-sitter@^0.21.1` + `tree-sitter-python` compatible version. Do NOT upgrade tree-sitter core in this phase.
- **D-05:** Resolve WASM path via `require.resolve('tree-sitter-python/tree-sitter-python.wasm')` — consistent with how TypeScript WASM is resolved.

### Parser Architecture
- **D-06:** Create an independent `PythonTreeSitterParser` class. Do NOT modify the existing `TreeSitterParser` (src/parser/) or `PythonParser` (src/infrastructure/parser/).
- **D-07:** Place in `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` — alongside TypeScriptParser, PythonParser, GoParser.
- **D-08:** Register in `ParserRegistry` as `python` language when tree-sitter-python is available, replacing regex PythonParser registration. AST-first replacement strategy.
- **D-09:** Implement `ILanguageParser` interface via `ParserBase` — same as PythonParser, TypeScriptParser. Output format: Module + ModuleSymbol + ImportInfo + ExportInfo.

### Fallback Strategy (STRICTER than ROADMAP)
- **D-10:** When tree-sitter-python is NOT available, throw an explicit error. Do NOT silently degrade to regex. This is stricter than ROADMAP's "regex PythonParser 保留为 fallback 路径" — the user chose strict error over silent fallback.
- **D-11:** Regex PythonParser remains in codebase but is NOT used as automatic fallback. After tree-sitter-python proves stable, mark regex PythonParser as deprecated.
- **D-12:** Detect tree-sitter-python availability at parse time (every `parseFile()` call), not just at init. This allows runtime recovery if grammar becomes available.
- **D-13:** Add `parserUsed` metadata field to parseResult, indicating whether AST or regex parser was used. Essential for testing, debugging, and acceptance verification.

### Python AST Feature Boundary (Phase 67 scope)
- **D-14:** Phase 67 MUST handle: imports (including multi-line, nested), exports (including `__all__`), symbols, classes (including multiple inheritance), functions, decorators (`@decorator`), async functions (`async def`), nested class/function definitions.
- **D-15:** Phase 67 SHOULD handle: type annotations (`def foo(x: int) -> str`).
- **D-16:** Deferred to Phase 69/70: advanced type inference (Optional/Union/Generic), control flow analysis (try/except/with/match), complexity metrics.
- **D-17:** Use a layered implementation approach — high-priority features first (D-14), type annotations next (D-15), advanced features in later phases (D-16).

### Testing Strategy
- **D-18:** Create comparison test: same Python file parsed by both TreeSitterParser and regex PythonParser, proving AST correctly handles nested definitions and multi-line imports that regex misses. (ROADMAP Success Criteria #4)
- **D-19:** Test fixture files in `tests/fixtures/python/` — reusable Python files covering decorators, async, nested definitions, complex imports, `__all__`, multiple inheritance.
- **D-20:** Each major AST feature (decorator, async, nested, import, export) should have at least one focused test case.

### Claude's Discretion
- Exact field names for `parserUsed` metadata, as long as it clearly distinguishes AST from regex parsing.
- Exact WASM fallback error message wording, as long as it's actionable and includes remediation steps.
- Test fixture file naming convention, as long as it's consistent and discoverable.
- Whether to create a `PythonTreeSitterLoader` helper or inline the grammar loading in the parser constructor.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Authority
- `.planning/ROADMAP.md` — Phase 67 goal, PY-01/PY-02 requirements, success criteria (especially #4: comparison test)
- `.planning/REQUIREMENTS.md` — locked requirements PY-01 and PY-02
- `.planning/PROJECT.md` — milestone-level product direction for v2.4 parser-multilang-depth
- `.planning/STATE.md` — latest recorded milestone position

### Tree-sitter Infrastructure
- `src/parser/implementations/tree-sitter-loader.ts` — existing dual-path (native/WASM) loader that MUST be extended for Python grammar
- `src/parser/implementations/tree-sitter-parser.ts` — existing TypeScript-hardcoded TreeSitterParser (DO NOT MODIFY — reference only for patterns)
- `src/cli/tree-sitter-check.ts` — existing tree-sitter availability check

### Parser Registry and Base Classes
- `src/infrastructure/parser/registry/ParserRegistry.ts` — registration and routing logic that PythonTreeSitterParser plugs into
- `src/infrastructure/parser/interfaces/ParserBase.ts` — base class that PythonTreeSitterParser MUST extend
- `src/infrastructure/parser/index.ts` — module exports and `createDefaultParserRegistry()` factory

### Existing Python Parser (reference, not modify)
- `src/infrastructure/parser/implementations/PythonParser.ts` — regex-based parser; output format reference; stays in codebase as deprecated fallback
- `src/infrastructure/parser/implementations/TypeScriptParser.ts` — pattern reference for ParserBase implementation (extractImports, extractExports, extractSymbols)

### Type Enhancer Pattern
- `src/parser/enhancers/TypeScriptTypeEnhancer.ts` — post-parse enhancement seam pattern; Phase 69 will create PythonTypeEnhancer following this pattern

### Architecture and Conventions
- `.planning/codebase/STACK.md` — runtime/tooling baseline (Node.js, TypeScript, tree-sitter deps)
- `.planning/codebase/STRUCTURE.md` — file placement rules (infrastructure layer for parser implementations)
- `.planning/codebase/CONVENTIONS.md` — TypeScript, testing, and naming conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tree-sitter-loader.ts`: Already implements dual-path (native/WASM) loading with auto-fallback. Extend to return `{Parser, TypeScript, Python}` or similar.
- `ParserBase`: Provides `ensureInitialized()`, `countLines()`, stats tracking, and lifecycle management. PythonTreeSitterParser inherits all of this.
- `ParserRegistry`: Extension-based routing already works — just register PythonTreeSitterParser with `languageId = 'python'` and `fileExtensions = ['py']`.
- `TypeScriptParser`: Pattern reference for how to implement `extractImports()`, `extractExports()`, `extractSymbols()` using ParserBase conventions.

### Established Patterns
- Parser implementations live in `src/infrastructure/parser/implementations/` with `{Language}Parser.ts` naming.
- Each parser extends `ParserBase` and implements `doInitialize()`, `doDispose()`, `parseFile()`.
- Tests live in `__tests__` directories adjacent to implementation files.
- tree-sitter grammar loading uses `require.resolve()` to find npm package paths.

### Integration Points
- `src/infrastructure/parser/index.ts`: Must export `PythonTreeSitterParser` and update `createDefaultParserRegistry()`.
- `src/parser/implementations/tree-sitter-loader.ts`: Must be extended to load Python grammar alongside TypeScript.
- `ParserRegistry.register()`: PythonTreeSitterParser registered as `python` language when tree-sitter-python is available.

</code_context>

<specifics>
## Specific Ideas

- The user emphasized "修改不互相影响" (changes should not affect each other) — PythonTreeSitterParser must be completely independent from PythonParser and TreeSitterParser.
- The user chose strict error handling (no silent fallback) — this is a deliberate override of ROADMAP's fallback requirement for stricter quality gates.
- Comparison test is critical — must prove Tree-sitter AST handles nested definitions and multi-line imports that regex misses (ROADMAP Success Criteria #4).

</specifics>

<deferred>
## Deferred Ideas

- Type annotations (PEP 484) and advanced type inference → Phase 69 PythonTypeEnhancer
- Control flow analysis (try/except/with/match) → Phase 70 Python call-graph/complexity
- Multi-language parser switching mechanism → Phase 68
- Complexity metrics for Python → Phase 70

</deferred>

---

*Phase: 67-tree-sitter-python-grammar*
*Context gathered: 2026-05-09*
