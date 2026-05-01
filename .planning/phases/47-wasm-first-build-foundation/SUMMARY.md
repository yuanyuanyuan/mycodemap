---
phase: 47-wasm-first-build-foundation
status: completed
completed_at: 2026-05-01
plans_completed: 3
---

# Phase 47 Summary: WASM-First Build Foundation

## Objective

Eliminate the #1 install drop-off — native dependency compilation failures. Bridge Phase 45's `checkAndActivateWasmFallback()` (which sets `CODEMAP_USE_WASM_*` env vars) with actual import sites, so `npm install codemap` succeeds without `python`, `make`, `gcc`.

## Plan vs. Implementation Alignment

### Plan 47-01: WASM-First Native Dependency Wrappers

| Task | Status | Notes |
|------|--------|-------|
| tree-sitter-loader.ts | Completed | Env-var gated loader with native/WASM/auto-fallback paths |
| sqlite-loader.ts | Completed | Env-var gated loader with better-sqlite3/node:sqlite/sql.js paths |
| tree-sitter-parser.ts async init | Completed | Constructor kicks off `parserPromise`, `parseFile()` awaits it |
| SQLiteStorage.ts delegation | Completed | `loadSQLiteModule()` delegates to `loadSQLite()` |
| `--native` CLI flag | Completed | Forces native binary usage, disables WASM fallback |

### Plan 47-02: Optional Dependencies and Install-Time Configuration

| Task | Status | Notes |
|------|--------|-------|
| `optionalDependencies` in package.json | Completed | `web-tree-sitter@^0.24.0`, `sql.js@^1.12.0` |
| `engines.node >=20.0.0` | Completed | Specified in package.json |
| README.md WASM documentation | Completed | Documented WASM-first install experience and `--native` flag |

### Plan 47-03: Benchmark Command and Verification Tests

| Task | Status | Notes |
|------|--------|-------|
| `codemap benchmark` command | Completed | Compares WASM vs Native with `--target`, `--mode`, `--iterations`, `--json` |
| WASM fallback tests | Completed | 7 tests in `wasm-fallback.test.ts` covering all loader paths |
| Type declarations | Completed | `src/types/web-tree-sitter.d.ts`, `src/types/sql.js.d.ts` |

## New Files (5)

| File | Purpose | Lines |
|------|---------|-------|
| `src/parser/implementations/tree-sitter-loader.ts` | Env-var gated tree-sitter loader (native vs web-tree-sitter WASM) | 127 |
| `src/infrastructure/storage/adapters/sqlite-loader.ts` | Env-var gated SQLite loader (better-sqlite3 vs node:sqlite/sql.js) | 247 |
| `src/cli/commands/benchmark.ts` | `codemap benchmark` — WASM vs Native performance comparison | 201 |
| `src/types/web-tree-sitter.d.ts` | Type declarations for web-tree-sitter | — |
| `src/types/sql.js.d.ts` | Type declarations for sql.js | — |
| `src/cli/__tests__/wasm-fallback.test.ts` | 7 tests for loader fallback paths | ~130 |

## Modified Files (4)

| File | Change |
|------|--------|
| `src/parser/implementations/tree-sitter-parser.ts` | Replaced static imports with async `tree-sitter-loader` init pattern |
| `src/infrastructure/storage/adapters/SQLiteStorage.ts` | `loadSQLiteModule()` delegates to `loadSQLite()` from sqlite-loader |
| `src/cli/index.ts` | Added `--native` flag + `benchmark` command registration |
| `package.json` | Added `optionalDependencies` and `engines.node` |
| `README.md` | Added WASM-first install documentation |

## Key Design Decisions

- **Loader priority:** Native first → WASM fallback auto-activation → ActionableError with remediation
- **SQLite WASM preference:** `node:sqlite` (Node.js 22+, zero install) preferred over `sql.js`
- **Tree-sitter WASM:** web-tree-sitter with explicit `.init()` and language `.wasm` file loading
- **Auto-fallback with warning:** When native fails but WASM succeeds, a console.warn informs the user
- **`--native` flag:** Sets `CODEMAP_USE_WASM_*=0` before any command runs, forcing native path
- **Benchmark threshold:** <1000ms startup penalty for WASM mode on 10K-file repos

## Verification Results

- **TypeScript typecheck:** Pass
- **Tests:** 1129/1129 pass (includes 13 WASM-specific tests)
- **Commit:** `3c1af3e`

## Architecture

```
Env vars (set by Phase 45 checkAndActivateWasmFallback)
    │
    ▼
src/parser/implementations/tree-sitter-loader.ts
    ├── Native path: import('tree-sitter') + import('tree-sitter-typescript')
    └── WASM path: import('web-tree-sitter') + Language.load(tsWasmPath)
    │
src/infrastructure/storage/adapters/sqlite-loader.ts
    ├── Native path: require('better-sqlite3')
    ├── WASM path (Node 22+): require('node:sqlite') → DatabaseSync wrapper
    └── WASM path (fallback): import('sql.js') → sql.js wrapper
    │
src/cli/commands/benchmark.ts
    └── Measures cold startup, parser init, storage init, first file parse
```

## Commits

- `3c1af3e` [FEATURE] wasm-first-build-foundation: native-to-WASM fallback wrappers
- `47375ad` docs(47): add .continue-here.md handoff — Phase 47 complete

## Gaps / Deferred

None. All 3 plans completed successfully.
