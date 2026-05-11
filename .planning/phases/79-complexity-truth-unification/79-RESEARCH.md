# Phase 79: Complexity Truth Unification - Research

**Researched:** 2026-05-11
**Domain:** canonical complexity truth across active parser flows and downstream readers
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 / D-02 / D-03:** `src/core/ast-complexity-analyzer.ts` must become the canonical complexity seam, while downstream consumers continue reading shared parser/module/symbol truth where it already exists. Python's Phase 72 persisted truth is preserved; only its source is unified. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]
- **D-04 / D-05:** Missing canonical truth cannot silently degrade into estimates or placeholder numbers; any transitional fallback must be explicit and test-backed, and at least one regression proof must show an old parallel seam no longer drifts silently. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]
- **D-06 / D-07:** Existing function/method detail identity and current consumer read contracts must stay stable, especially the shared symbol/qualified-name behavior already established for Python. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]
- **D-08 / D-09:** The phase scope is limited to active parser flows, analyzer truth handoff, storage/read paths, and the current `complexity` CLI. Preview/plugin/helper cleanup is deferred unless it blocks the canonical-path claim. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]

### the agent's Discretion

- Exact adapter shape for language-specific complexity strategies inside the canonical seam, as long as all active paths converge on one source of truth. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]
- Exact migration behavior for any temporary non-canonical warning path, as long as it is explicit and test-backed. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]
- Exact regression-test placement, as long as deprecated complexity seams are proven not to drift silently. [VERIFIED: .planning/phases/79-complexity-truth-unification/79-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POL-01 | TS/JS/Python/Go 主路径与 downstream surfaces 中的 complexity metrics 都来自统一 canonical analyzer，而不是多套并行实现 | Existing code already exposes all active complexity touchpoints; the missing work is to converge them on one shared seam and remove silent estimate paths. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/infrastructure/parser/implementations/TreeSitterParser.ts][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/infrastructure/parser/implementations/GoParser.ts][VERIFIED: src/cli/commands/complexity.ts] |
</phase_requirements>

## Summary

Phase 79 should not be planned as “rewrite complexity everywhere.” The repo already has the right downstream contract shape: parser outputs can carry `ParseResult.complexity`, analyzer persists that to shared `ModuleInfo.complexity`, Python already backfills symbol-level complexity, and the `complexity` CLI already prefers persisted truth in part of its read path. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/analyzer.ts][VERIFIED: src/cli/commands/complexity.ts][VERIFIED: .planning/phases/72-python-complexity-truth/72-CONTEXT.md]

The real problem is source drift:

1. `TreeSitterParser` computes complexity with a regex/branch-counter implementation unrelated to `ast-complexity-analyzer.ts`. [VERIFIED: src/infrastructure/parser/implementations/TreeSitterParser.ts]
2. `PythonTreeSitterParser` computes its own AST complexity inline and writes symbol-level truth independently. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
3. `GoParser` declares `complexity-metrics` support but does not return any complexity from `parseFile()`, so downstream readers can fall back to estimates or emptiness. [VERIFIED: src/infrastructure/parser/implementations/GoParser.ts]
4. `complexity.ts` still contains two non-canonical behaviors: module-level estimation when persisted truth is absent, and AST recompute fallback when file detail is requested but shared function details are missing. [VERIFIED: src/cli/commands/complexity.ts]
5. The deprecated legacy `smart-parser` still carries its own complexity implementation, which means old compatibility callers can continue to drift unless Phase 79 either delegates it to the canonical seam or marks it explicitly non-canonical. [VERIFIED: src/parser/implementations/smart-parser.ts][VERIFIED: src/parser/index.ts]

The best Phase 79 path is therefore:

- keep one shared contract (`ParseResult.complexity` / `ModuleInfo.complexity` / existing Python symbol writeback);
- turn `src/core/ast-complexity-analyzer.ts` into the only complexity entrypoint for active runtimes, using language-aware adapters behind that seam where needed;
- wire each active parser to that seam;
- remove silent estimate/recompute behavior from downstream readers;
- prove with focused tests that the old parser-local and CLI-local calculations can no longer silently diverge.

## Repository Facts

### 1. Active runtime already centralizes parsing through the registry-backed parser flow

`analyze()` requires a parser registry and always asks the selected parser for `includeComplexity: true`. Deprecated parser modes (`fast`, `smart`, `hybrid`) are rejected on the active runtime path. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/parser/index.ts]

This means Phase 79 does **not** need to redesign runtime routing; it only needs to change what the active parsers do when complexity is requested.

### 2. Shared downstream truth contract already exists

`ParseResult.complexity` is the parser-facing handoff, and `convertToModuleInfo()` in `analyzer.ts` already transfers that complexity into shared module truth. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/analyzer.ts]

Phase 79 should reuse this contract rather than introduce a second complexity output channel.

### 3. `ast-complexity-analyzer.ts` is currently canonical in name only

The file exports only file-path-based TS AST analysis (`analyzeFileComplexity`, `analyzeMultipleFiles`) and is currently tied to `typescript.createSourceFile(...)`. [VERIFIED: src/core/ast-complexity-analyzer.ts]

To satisfy D-01 across TS/JS/Python/Go, this file must become a language-aware canonical seam, likely by:

- keeping the current TS/JS AST strategy as one adapter;
- adding content/language entrypoints so active parsers can call it without writing temp files;
- colocating Python/Go strategies under the same module or delegating to helpers called only through that module.

### 4. Active parser complexity seams are currently parallel and inconsistent

- `TreeSitterParser.calculateComplexity()` is a regex-based branch counter. [VERIFIED: src/infrastructure/parser/implementations/TreeSitterParser.ts]
- `PythonTreeSitterParser.calculateComplexity()` and `calculateComplexityFromAST()` are Python-specific local logic. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
- `ParserBase.calculateComplexity()` returns placeholder `1/1/100` truth, which is acceptable as a base stub but must never be mistaken for canonical output on an active path. [VERIFIED: src/infrastructure/parser/interfaces/ParserBase.ts]
- `GoParser.parseFile()` currently never attaches complexity even when the caller requests it. [VERIFIED: src/infrastructure/parser/implementations/GoParser.ts]

### 5. The CLI still synthesizes non-canonical output

`getModuleComplexity()` estimates complexity from function count and LOC when `module.complexity` is absent. [VERIFIED: src/cli/commands/complexity.ts]

For file-scoped detail output, `complexityCommand()` also recomputes AST complexity when persisted function detail is missing. [VERIFIED: src/cli/commands/complexity.ts]

These are the exact silent-drift behaviors D-04 and D-05 are trying to eliminate.

### 6. Phase 72 already locked the Python consumer contract

Phase 72 explicitly chose shared module + symbol persistence and the existing `complexity` CLI as the proof path. [VERIFIED: .planning/phases/72-python-complexity-truth/72-CONTEXT.md][VERIFIED: .planning/phases/72-python-complexity-truth/72-01-SUMMARY.md]

Phase 79 must preserve this read contract while replacing the source seam.

## Recommended Technical Direction

### Direction 1: Make `ast-complexity-analyzer.ts` the only public complexity entrypoint

Do not scatter “shared helper” functions across parsers. Keep one canonical module and let it expose a language-aware API such as:

- `analyzeComplexityForFile(filePath)` for existing TS/JS file-based callers;
- `analyzeComplexityFromContent({ language, filePath, content, symbols? })` for active parsers;
- optional typed per-language adapters that are private to the module.

This preserves D-01 while avoiding a fake unification where multiple parser-local calculators still exist.

### Direction 2: Treat active parser output as writeback adapters, not independent calculators

Each active parser should translate its parse context into the canonical analyzer API and then write the returned result into `ParseResult.complexity`. Python should continue symbol-level backfill using canonical function details, not a parallel formula. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: .planning/phases/72-python-complexity-truth/72-CONTEXT.md]

This keeps the existing downstream contract stable and narrows the unification work to parser-level adapters.

### Direction 3: Remove silent CLI estimation and replace it with explicit non-canonical behavior

The lowest-risk behavior is:

- if shared persisted truth exists, read it;
- if an active-path module lacks canonical truth, surface an explicit warning or actionable failure;
- never emit synthesized “estimated” complexity as if it were canonical.

This is especially important in project-wide output, where today missing complexity can silently collapse into function-count heuristics. [VERIFIED: src/cli/commands/complexity.ts]

### Direction 4: Handle the deprecated legacy seam deliberately

`smart-parser` is not an active runtime path, but it still exists and still computes its own complexity. [VERIFIED: src/parser/implementations/smart-parser.ts]

The cleanest options are:

1. make `smart-parser` delegate to the canonical analyzer for compatibility callers; or
2. leave it deprecated but add a regression proof that it cannot silently affect the active parser flow and that any direct caller sees explicit non-canonical/deprecated guidance.

Given D-05, the plan should include one explicit proof for this seam instead of ignoring it.

## Proposed Plan Shape

One execute plan is sufficient if split into three tasks:

1. **Shared contract + red drift tests** — lock the canonical analyzer API and encode failing tests for parser drift and CLI silent fallback.
2. **Active parser convergence** — route TS/JS/Python/Go complexity production through the canonical analyzer and preserve Python symbol-level writeback.
3. **Consumer + legacy cleanup** — remove CLI estimate drift, explicitly handle missing canonical truth, and prove the deprecated legacy seam no longer silently diverges.

This sequencing keeps the highest-risk behavior changes last, after the canonical write path is already proven.

## Common Pitfalls

### Pitfall 1: “Unifying” by moving shared math into helpers but keeping parser-local entrypoints

If each parser still owns its own public complexity logic, drift can come back immediately. D-01 is about one canonical seam, not just code dedup.

### Pitfall 2: Breaking Phase 72’s Python read contract

Python already proved shared persisted truth and CLI consumption. Regressing to parser-only detail or AST-only CLI recompute would break shipped behavior. [VERIFIED: .planning/phases/72-python-complexity-truth/72-01-SUMMARY.md]

### Pitfall 3: Letting `ParserBase` placeholder truth leak into active outputs

`1/1/100` is acceptable as a stub implementation base, but not as canonical complexity. Any plan that leaves active languages on that path would violate D-04. [VERIFIED: src/infrastructure/parser/interfaces/ParserBase.ts]

### Pitfall 4: Removing estimates without a migration story

If consumers lose complexity entirely when old `.mycodemap` data is missing canonical truth, the user experience becomes opaque. The plan should require explicit actionable messaging or regeneration guidance instead of silent omission.

## Recommended Plan Focus

The strongest Phase 79 plan is narrow:

- touch only the canonical analyzer, active parsers, shared analyzer handoff, CLI consumer, and legacy drift proof;
- keep preview/plugin/helper surfaces deferred;
- test for “same source, same output” rather than trying to redesign complexity scoring theory.

That satisfies `POL-01` without reopening broader parser or architecture work.
