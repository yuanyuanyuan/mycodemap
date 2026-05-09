# Phase 71: Parser Legacy Cleanup - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the parser architecture debt left after Phase 59 (parser cutover) and Phase 68 (multi-language parser switching). This phase is NOT about adding new parser capabilities — it is about making the existing parser architecture internally consistent:

1. **Unify parser interfaces**: Make `ILanguageParser` the single interface; remove or deprecate legacy `IParser`.
2. **Eliminate adapter shims**: Remove `convertRegistryResultToLegacyResult` and `toLegacyParseResult` — all internal paths should speak `ILanguageParser` / `ParseResult` natively.
3. **Relocate `TreeSitterParser`**: Move the AST-based parser from `src/parser/implementations/` (legacy layer) into `src/infrastructure/parser/implementations/` and implement `ILanguageParser` via `ParserBase`.
4. **Decouple Core from Infrastructure**: Core layer should consume parser capabilities through Interface layer abstractions, not directly instantiate `createDefaultParserRegistry()`.
5. **Relocate `TypeScriptTypeEnhancer`**: Move from `src/parser/enhancers/` (legacy layer) to `src/infrastructure/parser/enhancers/` or similar, removing cross-layer coupling.

This phase does NOT deliver: new language support, new AST features, or new CLI commands. It is a pure architecture-hardening phase.
</domain>

<decisions>
## Implementation Decisions

### Interface Unification
- **D-01:** `ILanguageParser` (`src/interface/types/parser.ts`) becomes the **single canonical parser interface**. Legacy `IParser` (`src/parser/interfaces/IParser.ts`) is marked `@deprecated` and removed from active internal usage.
- **D-02:** All internal call sites (`analyzer.ts`, `RegistryBackedParser`, `TreeSitterParser`) speak `ILanguageParser` / `ParseResult` (registry shape) natively. No runtime conversion between Legacy `ParseResult` and Registry `ParseResult`.
- **D-03:** The exported public API surface (`src/parser/index.ts`) may keep `IParser`-shaped exports for external backward compatibility, but internally it must delegate through `ILanguageParser` without conversion.
- **D-04:** `CodeMap` and `AnalysisOptions` types already use registry shapes post-Phase 59. Verify and remove any remaining Legacy `ParseResult` references in `src/core/`.

### TreeSitterParser Relocation
- **D-05:** Move `src/parser/implementations/tree-sitter-parser.ts` → `src/infrastructure/parser/implementations/TreeSitterParser.ts` (or merge with `TypeScriptParser` if Phase 68 has already generalized it).
- **D-06:** The relocated parser MUST extend `ParserBase` and implement `ILanguageParser`. It reuses `tree-sitter-loader.ts` for grammar loading.
- **D-07:** `createDefaultParserRegistry()` registers the relocated `TreeSitterParser` for TypeScript/JavaScript files, replacing the regex-based `TypeScriptParser` as the default (or coexisting with explicit strategy).
- **D-08:** If Phase 68 has already generalized `TreeSitterParser` to be language-agnostic, this phase ensures it is fully wired into `ParserRegistry` and cleans up the old `src/parser/implementations/tree-sitter-parser.ts` stub.

### Adapter Elimination
- **D-09:** Remove `convertRegistryResultToLegacyResult()` from `src/core/analyzer.ts`.
- **D-10:** Remove `toLegacyParseResult()` from `src/parser/index.ts`.
- **D-11:** If any external callers still expect Legacy `ParseResult` shape, provide a thin **export-time** mapper at the public API boundary, not inside the Core flow.

### Core Layer Decoupling
- **D-12:** Introduce an Interface-layer factory or service token (e.g., `IParserResolver`) so `src/core/analyzer.ts` does not directly `import { createDefaultParserRegistry }` from `src/infrastructure/parser/index.ts`.
- **D-13:** `createDefaultParserRegistry()` remains in Infrastructure layer, but Core layer receives it via injection or a lazy factory resolved through Interface layer.
- **D-14:** If introducing a full DI container is out of scope, use a minimal **composition root** pattern: a single file in `src/composition/` (or `src/cli/commands/generate.ts`) that wires Infrastructure into Core, keeping Core free of Infrastructure imports.

### TypeScriptTypeEnhancer Relocation
- **D-15:** Move `src/parser/enhancers/TypeScriptTypeEnhancer.ts` → `src/infrastructure/parser/enhancers/TypeScriptTypeEnhancer.ts`.
- **D-16:** Update all import sites (`src/core/analyzer.ts`, `src/parser/index.ts`) to the new path.
- **D-17:** Consider extracting a shared `ITypeEnhancer<T>` interface in `src/interface/types/parser.ts` so both `TypeScriptTypeEnhancer` and future `PythonTypeEnhancer` (Phase 69) share a typed contract.

### Claude's Discretion
- Exact naming of the composition root file and the Interface-layer factory interface.
- Whether to keep regex `TypeScriptParser` as an explicit fallback registered under a different language ID (e.g., `typescript-regex`) or to remove it entirely.
- Exact deprecation timeline for `IParser` — whether to delete it in this phase or mark it `@deprecated` with a deletion target.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Parser Architecture
- `src/interface/types/parser.ts` — canonical `ILanguageParser`, `IParserRegistry`, `ParseResult` shapes
- `src/parser/interfaces/IParser.ts` — legacy `IParser`, `ParseResult`, `ParserOptions` (to be deprecated/removed)
- `src/infrastructure/parser/registry/ParserRegistry.ts` — registry implementation
- `src/infrastructure/parser/index.ts` — `createDefaultParserRegistry()`, module exports
- `src/infrastructure/parser/interfaces/ParserBase.ts` — base class for `ILanguageParser` implementations

### Legacy Parser Implementations (to be relocated or deprecated)
- `src/parser/implementations/tree-sitter-parser.ts` — AST parser in legacy layer
- `src/parser/implementations/tree-sitter-loader.ts` — grammar loader (reusable, may stay or move)
- `src/parser/index.ts` — legacy entry, `createParser()`, `RegistryBackedParser`, `toLegacyParseResult`

### Core Layer
- `src/core/analyzer.ts` — main analysis flow, contains `convertRegistryResultToLegacyResult`
- `src/core/file-discovery.ts` — discovery defaults (already multi-language from Phase 59)

### Enhancer
- `src/parser/enhancers/TypeScriptTypeEnhancer.ts` — to be relocated

### Phase Predecessors
- `.planning/phases/59-parser-cutover/59-CONTEXT.md` — original cutover decisions
- `.planning/phases/59-parser-cutover/59-RESEARCH.md` — verified code facts about legacy/new split
- `.planning/phases/59-parser-cutover/59-01-SUMMARY.md` — what 59-01 actually changed
- `.planning/phases/59-parser-cutover/59-02-SUMMARY.md` — what 59-02 actually changed
- `.planning/ROADMAP.md` — Phase 68 multi-language parser switching (may overlap; 71 is cleanup)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ParserBase`: Already enforces `ILanguageParser`. Any relocated parser inherits lifecycle + stats.
- `tree-sitter-loader.ts`: Native/WASM loading logic is reusable; only needs path adjustments if moved.
- `ParserRegistry`: Extension-based routing works; just needs the relocated parser registered.

### Integration Points
- `src/core/analyzer.ts` → `createDefaultParserRegistry()`: main coupling to break (D-12).
- `src/core/analyzer.ts` → `convertRegistryResultToLegacyResult()`: adapter to delete (D-09).
- `src/parser/index.ts` → `toLegacyParseResult()`: adapter to delete (D-10).
- `src/parser/index.ts` → `TypeScriptTypeEnhancer`: cross-layer coupling to resolve (D-15).

### Established Patterns
- Phase 59 established "registry-backed main path" — 71 hardens it by removing the legacy parallel track.
- Phase 47 established WASM fallback pattern — 71 preserves it.
- `fromInterface()` / `toInterface()` in Domain layer — 71 applies the same decoupling principle to parser layer.
</code_context>

<specifics>
## Specific Ideas

- The `RegistryBackedParser` class in `src/parser/index.ts` was a Phase 59 compatibility wrapper. Once `ILanguageParser` is the single internal interface, this class may become unnecessary or shrink to a pure public-API re-export.
- If `TreeSitterParser` is already generalized in Phase 68, Phase 71 should verify it fully replaces regex `TypeScriptParser` in the registry, and the regex version is either removed or clearly demoted.
- Consider whether `src/parser/` directory itself should be eliminated after this phase, with its remaining useful contents merged into `src/infrastructure/parser/` or `src/interface/types/`.
</specifics>

<deferred>
## Deferred Ideas

- Actual deletion of `src/parser/interfaces/IParser.ts` file (may be deferred to a later breaking-release phase if external consumers exist).
- Full dependency-injection container (out of scope; composition root is sufficient).
- New language parsers — this phase is cleanup, not expansion.
</deferred>

---

*Phase: 71-parser-legacy-cleanup*
*Context gathered: 2026-05-09*
