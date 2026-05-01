---
status: passed
---

# Phase 46 Verification: Validation Router + No Ghost Commands

## Success Criteria Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Root `CLAUDE.md` validation section is a 1-screen decision tree by change type | ✅ Done — "验证决策树" section added |
| 2 | `check:architecture` and `check:unused` are either real checks or honestly removed | ✅ Done — both removed from package.json |
| 3 | No `echo` stub commands remain in `package.json` | ✅ Done — verified by `codemap doctor` and docs guardrail |
| 4 | Docs guardrail scans verify referenced `npm run` commands are not stubs | ✅ Done — `validateNpmScriptsAreReal()` added to validate-docs.js |
| 5 | `docs/rules/architecture-guardrails.md` syncs with real automation | ✅ Done — removed `check:architecture` reference, now references `deps` command |

## Test Results

- All 1122 tests pass across 118 test suites
- TypeScript compiles with zero errors
- `npm run docs:check` passes (including new npm script validation)
- `codemap doctor` reports no ghost commands

## What Was Implemented

1. **Removed echo stubs from package.json** — deleted `check:architecture` and `check:unused` scripts
2. **Updated architecture-guardrails.md** — removed `npm run check:architecture` from 快速验证 section, added note about `deps` command
3. **Extended validate-docs.js** — added `validateNpmScriptsAreReal()` that scans docs for `npm run <script>` references and verifies they exist and are not echo stubs
4. **Added validation decision tree to CLAUDE.md** — concise 1-screen table by change type
5. **Created doctor ghost command tests** — `doctor-ghost.test.ts` with fixtures for stub detection and all-clear verification

## Gaps

- None identified. Historical docs in `docs/archive/`, `docs/exec-plans/`, `docs/ideation/`, `docs/references/` are excluded from npm script validation by design.
