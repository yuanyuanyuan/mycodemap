# Phase 47: WASM-First Build Foundation - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** Infrastructure phase — minimal context

<domain>
## Phase Boundary

Eliminate the #1 install drop-off — native dependency compilation failures. `tree-sitter` WASM fallback must load when native compilation fails. `better-sqlite3` / `node:sqlite` fallback path must work without build tools. `npm install codemap` must succeed without `python`, `make`, `gcc`. `--native` flag or config must force native binary usage. `codemap benchmark` must compare WASM vs Native. Target: <1s startup penalty for WASM mode on 10K-file repo.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

### Key Constraints
- Phase 45 already implemented `wasm-fallback.ts` with detection + env var activation (`CODEMAP_USE_WASM_*`)
- Phase 45 already implemented `check-native-deps.ts` doctor checker
- Native deps used in: `src/parser/implementations/tree-sitter-parser.ts`, `src/infrastructure/storage/adapters/SQLiteStorage.ts`
- `web-tree-sitter` and `node:sqlite` / `sql.js` are the WASM fallback candidates

### Decision: Env-var gated fallback
The `CODEMAP_USE_WASM_TREE_SITTER` and `CODEMAP_USE_WASM_BETTER_SQLITE3` env vars set by Phase 45's `checkAndActivateWasmFallback` need to be **read** by the actual module import sites. This means creating thin wrapper modules that check the env var and import the right implementation.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/output/wasm-fallback.ts` — Phase 45: detection + env var activation
- `src/cli/doctor/check-native-deps.ts` — Phase 43: native dep health check
- `src/cli/tree-sitter-check.ts` — existing tree-sitter availability check

### Integration Points
- `src/parser/implementations/tree-sitter-parser.ts` — imports `tree-sitter`
- `src/infrastructure/storage/adapters/SQLiteStorage.ts` — imports `better-sqlite3`
- `src/cli/index.ts` — CLI entry, needs `--native` flag registration

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
