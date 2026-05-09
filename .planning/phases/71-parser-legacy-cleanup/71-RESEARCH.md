# Phase 71: Parser Legacy Cleanup - Research

**Researched:** 2026-05-09
**Status:** Ready for planning

<research_question>
## What do we need to know to plan this phase well?

What exact files, functions, and types still carry legacy parser debt after Phase 59/68, and what is the precise cut sequence to remove adapters, unify interfaces, and decouple layers without breaking the active analysis flow?
</research_question>

<repo_facts>
## Verified Code Facts

### Legacy `IParser` interface still has active internal consumers
- `src/parser/interfaces/IParser.ts:182-207` defines `IParser` with `parseFile(filePath): Promise<ParseResult>` (no `content` param).
- `src/parser/implementations/tree-sitter-parser.ts:20` — `TreeSitterParser implements IParser`.
- `src/parser/index.ts:49` — `RegistryBackedParser implements IParser`.
- `src/core/analyzer.ts:7` — imports `ParseResult` from `../parser/interfaces/IParser.js` (Legacy shape).

### Adapter functions exist in the hot path
- `src/core/analyzer.ts:155-178` — `convertRegistryResultToLegacyResult()` converts `ILanguageParser` `ParseResult` → Legacy `ParseResult` on every parsed file.
- `src/parser/index.ts:89-110` — `toLegacyParseResult()` converts registry `ParseResult` → Legacy `ParseResult`.
- Both adapters map `filePath` → `path`, `imports` → `dependencies`, and add `callCounts` computation.

### Core layer directly imports Infrastructure factory
- `src/core/analyzer.ts:5` — `import { createDefaultParserRegistry } from '../infrastructure/parser/index.js'`.
- `src/parser/index.ts:12` — `import { createDefaultParserRegistry } from '../infrastructure/parser/index.js'`.
- This means Core and Legacy layers both know the concrete Infrastructure factory.

### TreeSitterParser is in legacy layer, not registered
- `src/parser/implementations/tree-sitter-parser.ts` — implements `IParser`, NOT `ILanguageParser`.
- `src/infrastructure/parser/index.ts:39-52` — `createDefaultParserRegistry()` registers regex `TypeScriptParser`, `GoParser`, `PythonParser`. No `TreeSitterParser` registered.
- `src/infrastructure/parser/implementations/TypeScriptParser.ts:28-33` — explicitly regex-based.

### TypeScriptTypeEnhancer lives in legacy layer but is consumed by Core
- `src/parser/enhancers/TypeScriptTypeEnhancer.ts` — located in `src/parser/` (legacy layer).
- `src/core/analyzer.ts:9` — imports it.
- `src/parser/index.ts:15` — imports it.

### `src/parser/index.ts` has 560+ lines of mixed concerns
- Lines 1-36: `createParser()` factory + mode validation.
- Lines 49-87: `RegistryBackedParser` — compatibility wrapper.
- Lines 89-110: `toLegacyParseResult()` adapter.
- Lines 120-563: Standalone TS parsing helpers (`parseFile`, `extractImports`, etc.) that duplicate `TypeScriptParser` logic.

### No external callers of Legacy `IParser` in `src/` outside `src/parser/`
- `mycodemap query -s "IParser"` confirms only `src/parser/` and `src/core/analyzer.ts` reference it.
- `src/server/` uses `AnalyzeRequest` types, not `IParser` directly.
</repo_facts>

<planning_implications>
## Planning Implications

### 1. The cleanup can be done in three waves
- **Wave 1 (71-01):** Unify internal types — make Core speak `ILanguageParser`/`ParseResult` natively, delete adapters.
- **Wave 2 (71-02):** Relocate `TreeSitterParser` to Infrastructure, register it, and decide regex parser fate.
- **Wave 3 (71-03):** Decouple Core→Infrastructure direct import + relocate `TypeScriptTypeEnhancer`.

### 2. `src/parser/index.ts` should be aggressively reduced
After Wave 1-2, `src/parser/index.ts` should contain only:
- `createParser()` as a thin public re-export (if needed for backward compat)
- Optional Legacy `IParser` export with `@deprecated`
The 500+ lines of TS parsing helpers are duplicated by `TypeScriptParser` and should be removed.

### 3. The Core→Infrastructure decoupling is the highest-risk change
`analyzer.ts` is the central analysis orchestrator. Changing how it receives the registry must be done with a stable fallback (e.g., keep the direct import as a deprecated default while introducing the composition-root pattern).

### 4. Phase 71 must not regress Phase 59/68 behavior
All existing tests for deprecated-mode rejection, multi-language discovery, and WASM fallback must continue to pass. This is a structural refactor, not a behavioral change.
</planning_implications>

<recommended_plan_shape>
## Recommended Plan Shape

### 71-01-PLAN: Internal Type Unification
- Replace Core's `ParseResult` import from Legacy → Registry shape.
- Delete `convertRegistryResultToLegacyResult()` from `analyzer.ts`.
- Delete `toLegacyParseResult()` from `src/parser/index.ts`.
- Update `RegistryBackedParser` to return registry `ParseResult` directly (or remove it if unnecessary).
- Verify no active runtime code references Legacy `ParseResult` shape internally.

### 71-02-PLAN: TreeSitterParser Relocation and Registry Integration
- Move `tree-sitter-parser.ts` to `src/infrastructure/parser/implementations/TreeSitterParser.ts`.
- Make it extend `ParserBase` and implement `ILanguageParser`.
- Register it in `createDefaultParserRegistry()` for TS/JS files.
- Decide regex `TypeScriptParser` fate (fallback under different ID, or removal).
- Update `tree-sitter-loader.ts` path references if moved.

### 71-03-PLAN: Layer Decoupling and Enhancer Relocation
- Create `src/interface/types/parser-resolver.ts` or similar abstraction (Interface layer).
- Create composition root in `src/cli/commands/generate.ts` (or `src/composition.ts`) that wires `createDefaultParserRegistry()` into `analyze()`.
- Update `analyzer.ts` to accept parser resolver via parameter/options instead of direct import.
- Move `TypeScriptTypeEnhancer` to `src/infrastructure/parser/enhancers/`.
- Update all import sites and verify no cross-layer imports remain.
</recommended_plan_shape>

<validation_architecture>
## Validation Architecture

### Success-path checks
- `mycodemap generate` on a TS repo produces identical output (modulo removed `actualMode` banner, already done in Phase 59).
- `mycodemap generate` on a Python/Go repo still routes through registry.
- `TreeSitterParser` is exercised in at least one integration test.

### Failure-path checks
- No `rtk rg` hits for `convertRegistryResultToLegacyResult` or `toLegacyParseResult` in active runtime files.
- No `import.*createDefaultParserRegistry` in `src/core/analyzer.ts`.
- No `import.*TypeScriptTypeEnhancer.*from.*parser/enhancers` (legacy path) in Core or Infrastructure.

### Verification commands
- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts`
- `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__`
- `rtk rg "convertRegistryResultToLegacyResult|toLegacyParseResult" src/`
- `rtk rg "createDefaultParserRegistry" src/core/`
</validation_architecture>

<open_risks>
## Risks To Watch During Execution

- `src/cli-new/index.ts` or other CLI entry points may depend on `createParser()` returning a specific shape. Any change to `createParser()` signature needs coordinated CLI updates.
- `src/server/handlers/AnalysisHandler.ts` references parser mode types but does not yet execute analysis. Its type surface should align with the unified interface.
- If `TypeScriptParser` regex implementation is removed, any test fixtures that relied on its specific output quirks may need updating.
- The `tree-sitter-loader.ts` file may have relative path assumptions that break when moved to a new directory.
</open_risks>

## RESEARCH COMPLETE
