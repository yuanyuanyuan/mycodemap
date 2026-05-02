---
phase: "54-zero-config-preview"
plan: "01"
subsystem: "cli/preview"
tags: [dependency-extraction, complexity-scoring, escomplex, smol-toml, marker-files]
requires: []
provides:
  - "marker-file dependency extraction from package.json, go.mod, Cargo.toml, pyproject.toml"
  - "escomplex file-level cyclomatic complexity scanner with top-5 hotspot selection"
  - "smol-toml dependency for TOML parsing"
affects:
  - "src/cli/preview/ (new modules)"
  - "package.json (new dependency: smol-toml)"
tech_stack:
  added:
    - "smol-toml ^1.6.1 (TOML parsing for Cargo.toml and pyproject.toml)"
  patterns:
    - "Dynamic import for ESM-only TOML parser (smol-toml)"
    - "Per-file try-catch returning null on failure (escomplex scan pattern)"
    - "Extension allowlist for JS/TS file filtering (JS_TS_EXTENSIONS Set)"
key_files:
  created:
    - "src/cli/preview/dependency-extractor.ts"
    - "src/cli/preview/complexity-scanner.ts"
    - "src/cli/preview/__tests__/dependency-extractor.test.ts"
    - "src/cli/preview/__tests__/complexity-scanner.test.ts"
  modified:
    - "package.json (added smol-toml)"
    - "package-lock.json (lockfile update)"
decisions:
  - "smol-toml chosen over @iarna/toml for lighter footprint and ESM-native design (per RESEARCH.md)"
  - "Both dependencies and devDependencies included from package.json (per RESEARCH open question 2 RESOLVED)"
  - "Indirect go.mod deps included since they represent all required modules (per plan test case e)"
  - "escomplex imported as default CJS export; TypeScript ESM interop handles the binding"
  - "scanComplexity is synchronous since escomplex.analyzeModule and readFileSync are both sync"
metrics:
  duration: "~10 min"
  completed: "2026-05-02"
---

# Phase 54 Plan 01: Preview Service Modules Summary

**One-liner:** Marker-file dependency extraction (package.json/go.mod/Cargo.toml/pyproject.toml via smol-toml) plus escomplex file-level cyclomatic complexity scanner, forming the two new analysis paths that Plan 02 will wire into the preview command.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install smol-toml + create dependency-extractor.ts + test | `f93c73b` | `package.json`, `src/cli/preview/dependency-extractor.ts`, `src/cli/preview/__tests__/dependency-extractor.test.ts` |
| 2 | Create complexity-scanner.ts + test | `c217690` | `src/cli/preview/complexity-scanner.ts`, `src/cli/preview/__tests__/complexity-scanner.test.ts` |

## Verification Results

- `npx vitest run src/cli/preview/__tests__/` — 22 tests, 0 failures (13 dependency + 9 complexity)
- `npx tsc --noEmit` — no TypeScript errors
- `grep -r "process.exit" src/cli/preview/` — empty (no process.exit in service modules)

## Key Exports

**dependency-extractor.ts:**
- `extractNodeDeps(rootDir: string): string[]` — package.json dependencies + devDependencies
- `extractGoDeps(rootDir: string): string[]` — go.mod require blocks + single-line requires
- `extractRustDeps(rootDir: string): Promise<string[]>` — Cargo.toml [dependencies] + [dev-dependencies]
- `extractPythonDeps(rootDir: string): Promise<string[]>` — pyproject.toml PEP 621 + Poetry formats
- `extractDependencies(rootDir: string): Promise<DependencyExtractionResult>` — combined + deduplicated

**complexity-scanner.ts:**
- `scanFileComplexity(filePath: string, rootDir: string): ComplexityHotspot | null` — per-file escomplex scoring
- `scanComplexity(files: string[], rootDir: string): ComplexityHotspot[]` — top-5 sorted by score descending
- `ComplexityHotspot` interface: `{ file: string, score: number, functions: number }`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

No stubs. All functions are fully implemented with real logic and tested.

## Threat Flags

No new threat surface beyond what the plan's threat model already covers. T-54-01 (JSON.parse safety) mitigated by Object.keys(). T-54-02 (escomplex DoS) mitigated by per-file try-catch. T-54-03 (info disclosure) accepted as in-model.

## Self-Check: PASSED

- [x] dependency-extractor.ts: FOUND
- [x] complexity-scanner.ts: FOUND
- [x] dependency-extractor.test.ts: FOUND
- [x] complexity-scanner.test.ts: FOUND
- [x] 54-01-SUMMARY.md: FOUND
- [x] Commit f93c73b: FOUND
- [x] Commit c217690: FOUND
