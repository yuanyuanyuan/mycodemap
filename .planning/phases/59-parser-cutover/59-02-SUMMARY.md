---
phase: 59-parser-cutover
plan: 02
subsystem: parser
tags: [parser, typescript, enhancer, discovery, multi-language]

# Dependency graph
requires:
  - phase: 59-parser-cutover
    provides: registry-backed analyzer main path and deprecated mode guard
provides:
  - Multi-language default discovery for TS/JS/Python/Go
  - TS-only post-parse enhancement seam
  - Explicit junk-directory excludes for Python/Go repos
affects: [59-03, parser, discovery]

# Tech tracking
tech-stack:
  added: []
  patterns: [typescript-only-enhancer, registry-per-file-routing, multi-language-default-discovery]

key-files:
  created:
    - src/parser/enhancers/TypeScriptTypeEnhancer.ts
  modified:
    - src/core/analyzer.ts
    - src/core/file-discovery.ts
    - src/parser/index.ts

key-decisions:
  - "TypeScript enhancement remains optional and defaults on, but only for .ts/.tsx files"
  - "Analyzer default include set now covers TS/JS/Python/Go without needing explicit user globs"
  - "Python/Go stay structural-only in Phase 59; no fake parity claims beyond registry routing"

patterns-established:
  - "Enhancer seam: structural parse first, TS-only enrichment second"
  - "Discovery safety: expand include coverage and offset it with explicit noise-directory excludes"

requirements-completed: [PAR-04]

# Metrics
duration: 1 session
completed: 2026-05-06
---

# Phase 59 Plan 02 Summary

**Default analysis now discovers TS/JS, Python, and Go on one parser path, with SmartParser reduced to a TS-only enhancement seam**

## Accomplishments

- Expanded analyzer defaults to `src/**/*.{ts,tsx,js,jsx,py,go}` so multi-language repos enter the shared parser path without custom config.
- Extended `DEFAULT_DISCOVERY_EXCLUDES` with `.venv/**`, `**/__pycache__/**`, and `vendor/**` to avoid obvious Python/Go noise.
- Added `src/parser/enhancers/TypeScriptTypeEnhancer.ts`, which reuses SmartParser-derived enrichment only for `.ts`/`.tsx` parse results.
- Wired analyzer parsing to initialize registry parsers explicitly, parse per file, then apply TS-only enhancement before global-index construction.

## Verification

- `rtk npx tsc --noEmit`
- `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts`

## Files Created/Modified

- `src/parser/enhancers/TypeScriptTypeEnhancer.ts` - TS-only post-parse type/call-graph/complexity enhancement
- `src/core/analyzer.ts` - Multi-language include defaults, registry routing, enhancer wiring
- `src/core/file-discovery.ts` - Added `.venv`, `__pycache__`, and `vendor` excludes
- `src/parser/index.ts` - Shared registry-backed compatibility parser also uses the enhancer seam

## Task Commits

None in this run. Changes remain in the workspace and were verified without creating atomic git commits.

## Deviations from Plan

None on scope. The only runtime fix beyond the written tasks was explicit parser `initialize()`/`dispose()` handling, which is required by the existing MVP3 parser contract and directly supports the same main-path goal.

## Next Phase Readiness

Ready for Plan 59-03. Public contracts and tests can now describe the real runtime truth: one registry-backed parser path plus TS-only enhancement.

---
*Phase: 59-parser-cutover*
*Completed: 2026-05-06*
