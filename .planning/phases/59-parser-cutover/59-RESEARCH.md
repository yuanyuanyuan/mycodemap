# Phase 59: Parser Cutover - Research

**Researched:** 2026-05-06
**Status:** Ready for planning

<research_question>
## What do we need to know to plan this phase well?

How to collapse the active parser flow onto one Tree-sitter-based main path without breaking current CLI/config/server contracts, while preserving the already-shipped WASM fallback and leaving multi-language parser debt outside Phase 59 scope.

</research_question>

<repo_facts>
## Verified Code Facts

### Active parser truth is still split across legacy fast/smart paths
- `src/parser/index.ts` still exports `createParser(options)` that returns `FastParser` for `mode === 'fast'` and `SmartParser` otherwise.
- `src/core/analyzer.ts` still defaults `mode = 'hybrid'`, uses `HYBRID_THRESHOLD = 50`, computes `actualMode`, and returns `actualMode` in the `CodeMap`.
- `src/generator/index.ts` still renders human-facing output from `codeMap.actualMode`.

### ParserRegistry already exists, but is not the active orchestrator
- `src/infrastructure/parser/index.ts` already exposes `createDefaultParserRegistry()` and registers `TypeScriptParser`, `GoParser`, and `PythonParser`.
- `src/infrastructure/parser/registry/ParserRegistry.ts` already supports `getParserByFile(filePath)` and extension-based routing.
- This means Phase 59 is primarily a cutover and contract-cleanup phase, not a greenfield parser architecture phase.

### Current “fast” implementation is already tree-sitter-shaped, but legacy naming is misleading
- `src/parser/implementations/fast-parser.ts` is documented as a Tree-sitter parser, even though the current implementation is largely simplified extraction logic.
- `src/parser/implementations/tree-sitter-loader.ts` already implements native-first with automatic WASM fallback and emits ActionableError-style remediation on total failure.
- This strongly suggests Phase 59 should keep the loader contract and move orchestration truth, not re-open fallback architecture.

### Public contracts still expose deprecated parser modes
- `src/interface/config/index.ts` still types config `mode` as `'fast' | 'smart' | 'hybrid'`.
- `src/interface/types/index.ts` still exposes `AnalysisOptions.mode` as `'fast' | 'smart' | 'hybrid'` and `CodeMap.actualMode?: 'fast' | 'smart'`.
- `src/cli/index.ts` and `src/cli-new/index.ts` still register `-m/--mode` help text with `fast|smart|hybrid`.
- `src/server/routes/api.ts` and `src/server/handlers/AnalysisHandler.ts` still expose `'fast' | 'smart'` request/response types.

### Multi-language default discovery is not yet aligned with roadmap decisions
- `src/core/analyzer.ts` still defaults `include = ['src/**/*.ts']`.
- `src/core/file-discovery.ts` excludes only Node/TS-centric patterns; Python/Go noise folders such as `.venv/**`, `__pycache__/**`, and `vendor/**` are not yet part of defaults.

</repo_facts>

<planning_implications>
## Planning Implications

### 1. Phase 59 should cut over orchestration first, then widen routing, then prove fallback/doc truth
The roadmap’s 3-plan split is sound:
- `59-01`: remove legacy orchestration truth (`hybrid`, `actualMode`, direct Fast/Smart branching)
- `59-02`: route TS/JS, Python, and Go through the same main path and zero-config discovery defaults
- `59-03`: protect runtime truth with fallback/deprecated-mode tests and docs/runtime sync

### 2. Deprecated-mode handling must land as a boundary contract, not just a type cleanup
Because CLI, config, server route, and handler surfaces all still advertise the old values, a half-migration would create silent drift. The plan needs one explicit task that:
- rejects `fast` / `smart` / `hybrid`
- emits a structured actionable error
- updates help text and type surfaces together

### 3. TypeScript enhancement should be planned as a seam, not a full rewrite
The context decision says SmartParser shrinks into `TypeScriptTypeEnhancer`, but the repo does not yet expose that seam. Phase 59 planning should therefore:
- first establish where enhancement plugs into parser orchestration
- keep Python/Go on structural parsing only
- avoid broad “rewrite SmartParser internals” scope unless directly required to cut the main path over

### 4. WASM fallback is already a reusable asset
`tree-sitter-loader.ts` already has the desired native-first, WASM-fallback behavior plus actionable remediation. Phase 59 should test and document that path rather than redesign it.

### 5. The highest regression risk is truth drift across runtime, docs, and output shape
The risky cases are:
- CLI help still mentions deprecated modes after runtime rejects them
- `CodeMap.actualMode` disappears in analyzer but generator/docs still reference it
- discovery defaults claim multi-language support but default include/exclude still miss Python/Go realities

</planning_implications>

<recommended_plan_shape>
## Recommended Plan Shape

### 59-01-PLAN
Focus on parser orchestrator truth:
- make `ParserRegistry` + `createDefaultParserRegistry()` the active main path
- turn `createParser()` into a compatibility wrapper
- remove `HYBRID_THRESHOLD` / `actualMode`
- introduce `DEPRECATED_PARSER_MODE` actionable rejection path

### 59-02-PLAN
Focus on multi-language routing:
- ensure analyzer/discovery default include patterns cover TS/JS/Python/Go
- route TS/JS, Python, and Go through registry-based parser selection
- introduce the TS-only enhancement seam without blocking Python/Go MVP debt

### 59-03-PLAN
Focus on proof and sync:
- add tests for deprecated-mode failures and actionable remediation
- add tests or verification for native failure → WASM fallback path
- update docs/help/runtime truth so no surface still claims fast/smart/hybrid as active behavior

</recommended_plan_shape>

<validation_architecture>
## Validation Architecture

### Success-path checks
- `mycodemap generate` default flow no longer computes or prints `actualMode`
- TS/JS, Python, and Go fixtures all enter the same parser orchestration path
- native tree-sitter load failure still activates the existing WASM fallback path or emits actionable failure if both loaders fail

### Failure-path checks
- CLI `-m fast`, `-m smart`, `-m hybrid` return `DEPRECATED_PARSER_MODE`
- config `parser.mode` old values are rejected with remediation
- stale docs/help text mentioning active `fast|smart|hybrid` mode are removed or updated

### Lightweight verification commands to require in plans
- targeted unit/integration tests around analyzer/config/CLI parser-mode contract
- `rtk rg` checks for removed `HYBRID_THRESHOLD`, `actualMode`, and old help text
- fallback-path verification against `tree-sitter-loader.ts` behavior

</validation_architecture>

<open_risks>
## Risks To Watch During Execution

- `src/parser/interfaces/IParser.ts` still encodes `ParserMode = 'fast' | 'smart'`; changing only one type layer will leave incompatible compile surfaces.
- `src/cli-new/index.ts` is still a thin compatibility shell; it can easily drift from `src/cli/index.ts` if help text or mode validation is updated in only one place.
- `src/server/handlers/AnalysisHandler.ts` currently returns `501` unsupported for analysis, but its request/response types still expose parser modes. Planning should treat this as contract cleanup, not active runtime routing.
- Python/Go support in registry parsers is intentionally MVP-level; plans should avoid promising deep type/call-graph parity.

</open_risks>

## RESEARCH COMPLETE
