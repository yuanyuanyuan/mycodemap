---
phase: 46
status: complete
verified: true
verification_date: "2026-05-01"
---

# Phase 46: Validation Router + No Ghost Commands — Execution Summary

## Objective

Fix the "docs say one thing, commands do another" trust crisis.

## What Was Done

### Task 1: Remove echo stubs from package.json
- Deleted `check:architecture` and `check:unused` scripts

### Task 2: Sync architecture-guardrails.md
- Removed `npm run check:architecture` from 快速验证 section
- Added note that architecture validation is done via `deps` command

### Task 3: Extend docs guardrail with npm script verification
- Added `validateNpmScriptsAreReal()` to `scripts/validate-docs.js`
- Validates that referenced `npm run <script>` commands exist and are not echo stubs
- Skips npm lifecycle scripts (postinstall, prepare, etc.)
- Skips historical artifact directories (archive, exec-plans, ideation, references)

### Task 4: Add validation decision tree to CLAUDE.md
- Added concise 1-screen table mapping change type → validation commands → gate
- Uses script names only (no `npm run ` prefix) to respect routing-only constraint

### Task 5: Doctor ghost command tests
- Created `doctor-ghost.test.ts` with fixture-based tests
- Tests stub detection, all-clear state, missing/invalid package.json handling

## Verification Results

- All 1122 tests pass
- TypeScript compiles with zero errors
- `npm run docs:check` passes
- `codemap doctor` reports no ghost commands
