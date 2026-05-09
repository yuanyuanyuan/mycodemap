# Phase 68: Multi-language Parser Switching - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Generalize the current Tree-sitter capability into a shared multi-language AST parser path that switches grammars by file extension and becomes the default registry-backed implementation for TypeScript/JavaScript and Python. This phase delivers: a shared Tree-sitter parser capability, extension-driven grammar switching, and TS/JS main-path registry cutover to that shared parser. It does NOT deliver: legacy/infrastructure layer cleanup, `ILanguageParser` unification, adapter removal, or Core/Infrastructure decoupling — those remain in Phase 71.

</domain>

<decisions>
## Implementation Decisions

### Scope and Architectural Boundary
- **D-01:** Phase 68 is **capability-first, migration-later**. Deliver shared multi-language Tree-sitter parsing now; leave directory relocation, interface unification, and adapter cleanup to Phase 71.
- **D-02:** Do not expand Phase 68 into a broad architecture-hardening phase. `ILanguageParser` unification, `toLegacyParseResult` / `convertRegistryResultToLegacyResult` removal, and Core → Infrastructure decoupling stay explicitly out of scope for this phase.
- **D-03:** Phase 68 may modify the existing Tree-sitter implementation path even though Phase 67 avoided it. That earlier isolation constraint was for Phase 67 delivery safety; Phase 68 now owns the shared parser generalization work defined in ROADMAP.

### Grammar Switching Trigger
- **D-04:** Grammar switching is driven **only by file extension auto-detection**. Do not add a user-facing or planner-facing explicit `language` override decision surface in this phase.
- **D-05:** Reuse the existing registry + extension mapping model as the outer routing contract. The shared Tree-sitter parser decides which grammar to load based on the routed file extension set.
- **D-06:** Keep the extension-driven behavior aligned with current supported languages in scope for this milestone: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, and `.py`.

### Python Fallback Semantics
- **D-07:** Preserve the Phase 67 strict gate: when Python Tree-sitter grammar is unavailable, surface an explicit error. Do **not** silently or automatically fall back to regex `PythonParser`.
- **D-08:** Phase 68 must not re-open or weaken the quality bar established in Phase 67. Multi-language switching changes parser selection mechanics, not Python failure semantics.
- **D-09:** The roadmap's original regex-fallback wording is superseded by the newer Phase 67 user-approved decision. Downstream planning should treat strict error as the locked behavior unless a future phase explicitly revisits it.

### TS/JS Main-path Cutover
- **D-10:** The shared Tree-sitter parser is not a test-only artifact. Phase 68 must wire TypeScript/JavaScript default registry routing to the shared Tree-sitter parser on the main analysis path.
- **D-11:** After Phase 68, TS/JS and Python should both be served by the same shared Tree-sitter parser capability, proving the parser is genuinely multi-language rather than parallel one-off implementations.
- **D-12:** TypeScript/JavaScript behavior must not regress relative to the existing Tree-sitter analysis quality baseline. Regression protection is part of the phase definition, not optional polish.

### Verification Expectations
- **D-13:** At least one focused test must prove the same shared parser class can successfully parse both `.ts` and `.py` files with language-appropriate AST output.
- **D-14:** Registry-level verification must prove `.ts` / `.js` route to the shared Tree-sitter parser after cutover, while `.py` continues to route through the AST parser path under the same shared capability.
- **D-15:** Verification must explicitly cover the Python grammar-missing failure path so Phase 68 does not accidentally reintroduce silent regex fallback.

### the agent's Discretion
- Exact internal naming of the shared Tree-sitter abstraction, as long as it clearly represents one multi-language capability rather than separate per-language parser classes.
- Whether the implementation generalizes the existing legacy `TreeSitterParser` directly or introduces a nearby shared helper/wrapper, as long as Phase 68 remains capability-focused and does not consume Phase 71 cleanup scope.
- Exact test fixture naming and organization, as long as the TS/JS + Python shared-parser proof is explicit and easy to audit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone and Phase Authority
- `.planning/ROADMAP.md` — Phase 68 goal and success criteria; defines shared multi-language Tree-sitter switching as the phase objective
- `.planning/REQUIREMENTS.md` — locked milestone requirements `PY-03` and `PY-04`
- `.planning/PROJECT.md` — v2.4 milestone direction and explicit boundary against reopening v2.2 / v2.3 foundations
- `.planning/STATE.md` — current milestone position and Phase 68 readiness state

### Predecessor Phase Decisions
- `.planning/phases/67-tree-sitter-python-grammar/67-CONTEXT.md` — Python grammar loading, strict no-fallback decision, and tree-sitter loader reuse constraints
- `.planning/phases/59-parser-cutover/59-CONTEXT.md` — parser registry as the main path and multi-language discovery/routing baseline
- `.planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md` — explicit separation between Phase 68 capability work and Phase 71 cleanup/migration work

### Shared Tree-sitter Implementation Surface
- `src/parser/implementations/tree-sitter-parser.ts` — current TypeScript-hardcoded Tree-sitter implementation that Phase 68 generalizes or wraps
- `src/parser/implementations/tree-sitter-loader.ts` — native/WASM loader seam reused for multi-language grammar loading
- `src/cli/tree-sitter-check.ts` — existing tree-sitter availability check surface

### Registry and Main-path Integration
- `src/infrastructure/parser/index.ts` — current registry composition; TypeScript/JavaScript and Python registration points
- `src/infrastructure/parser/registry/ParserRegistry.ts` — extension-based routing contract that remains the outer selection mechanism
- `src/core/analyzer.ts` — current registry-backed main analysis path and parse lifecycle
- `src/parser/index.ts` — legacy compatibility entry point that still delegates through registry-backed parsing

### Current Language Parser Baselines
- `src/infrastructure/parser/implementations/TypeScriptParser.ts` — current TS/JS registry default that Phase 68 replaces on the main path
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` — current AST-first Python parser and strict grammar-missing behavior
- `src/infrastructure/parser/implementations/PythonParser.ts` — regex Python parser retained in codebase but not automatic fallback
- `src/interface/types/parser.ts` — canonical `ILanguageParser` and parser result shapes that inform, but are not fully unified in, this phase

### Architecture and Conventions
- `.planning/codebase/STACK.md` — runtime/tooling baseline for tree-sitter, Node, and test environment
- `.planning/codebase/ARCHITECTURE.md` — transitional legacy + MVP3 architecture context; important for keeping Phase 68 scoped
- `.planning/codebase/CONVENTIONS.md` — source/test conventions and change-discipline constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/parser/implementations/tree-sitter-loader.ts`: already handles native-first with WASM fallback and is the right seam for shared grammar loading
- `src/infrastructure/parser/registry/ParserRegistry.ts`: already provides extension-based routing, so Phase 68 does not need a new top-level selection mechanism
- `src/core/analyzer.ts`: already consumes the registry as the main path, making TS/JS cutover primarily a registry composition change plus verification
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`: provides the current Python AST baseline and the strict grammar-unavailable failure behavior that must be preserved

### Established Patterns
- Registry-backed parsing is already the canonical active flow after Phase 59; new multi-language behavior should extend that flow rather than invent a parallel path
- Tree-sitter loading is already centralized in `tree-sitter-loader.ts`; grammar switching should build on that seam instead of introducing a second loader architecture
- The repository is still hybrid/transitional, so Phase 68 should avoid folding cleanup work from Phase 71 into this implementation phase

### Integration Points
- `src/infrastructure/parser/index.ts`: TS/JS registration must switch from regex `TypeScriptParser` to the shared Tree-sitter parser capability
- `src/parser/implementations/tree-sitter-parser.ts`: current hardcoded TypeScript language setup is the direct generalization target
- `src/core/analyzer.ts` and `src/parser/index.ts`: legacy adapters remain in place for this phase, so planning should work with them rather than trying to delete them early
- Parser tests around registry routing, TS/JS behavior, and Python AST behavior are the critical verification seam for the cutover

</code_context>

<specifics>
## Specific Ideas

- The user explicitly chose to keep Phase 68 narrow: deliver the shared parser capability and real main-path cutover, but do not spend this phase on cleanup that Phase 71 already owns.
- The user explicitly chose extension-only switching, meaning planners should not introduce configurable language override APIs unless required purely as an internal helper.
- The user explicitly reaffirmed that Python strict error semantics are more important than preserving the older roadmap's regex fallback wording.
- The user explicitly wants TS/JS cut over on the real main path, not just a proof-of-concept parser that only appears in tests.

</specifics>

<deferred>
## Deferred Ideas

- `ILanguageParser` as the single canonical parser interface
- Removing `convertRegistryResultToLegacyResult()` and `toLegacyParseResult()`
- Moving the shared Tree-sitter parser fully into `src/infrastructure/parser/implementations/`
- Core layer decoupling from direct Infrastructure parser construction
- TypeScript enhancer relocation and parser-layer cleanup

</deferred>

---

*Phase: 68-multi-language-parser-switching*
*Context gathered: 2026-05-09*
