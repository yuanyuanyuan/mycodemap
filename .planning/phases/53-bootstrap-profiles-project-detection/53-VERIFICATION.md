---
phase: "53-bootstrap-profiles-project-detection"
verified: 2026-05-02T00:35:00Z
status: gaps_found
score: 3/4 success criteria verified
verdict: PARTIAL
re_verification:
  previous_status: none
  notes: "Initial verification pass."
gaps:
  - truth: "User-visible `codemap init --profile <name>` flag works (D-13 bypass)"
    status: failed
    reason: "Commander.js registration in src/cli/index.ts:123-128 does NOT register `--profile`. Real CLI invocation `codemap init --profile python` fails with `error: unknown option '--profile'`. Only the interface-contract metadata and the in-process function `executeInitCommand` accept the option; the user-facing binary rejects it."
    artifacts:
      - path: "src/cli/index.ts"
        issue: "Lines 123-128 only register `-y, --yes` and `--interactive`; missing `.option('--profile <name>', ...)`"
    missing:
      - "Add `.option('--profile <name>', '跳过检测，直接应用指定内置 profile')` to the commander `init` registration in src/cli/index.ts"
      - "Add a regression test that drives the binary entry (or commander program) end-to-end so contract drift is caught — current tests call `executeInitCommand` directly and miss this gap"
  - truth: "Built dist artifacts can run on a fresh checkout (profile JSONs reachable)"
    status: partial
    reason: "`tsc` does not copy `src/cli/init/profiles/*.json` into `dist/`. Today this happens to work because `profile-loader.resolvePackageRoot()` resolves to the package root and reads from `src/`, so a published npm package would still have the JSONs alongside dist. Fragile if the build pipeline ever switches to a `files` field that excludes `src/`."
    artifacts:
      - path: "dist/cli/init/profiles/"
        issue: "Directory absent after `npm run build`; profile loader points to ../../../src/cli/init/profiles/"
    missing:
      - "Either add a build step to copy *.json into dist, OR confirm that package.json `files` ships the `src/cli/init/profiles/` tree (NOTE: not actionable for phase closure if the publish path is verified — flag for follow-up)"
human_verification:
  - test: "Run `npm publish --dry-run` and confirm `src/cli/init/profiles/*.json` is in the tarball"
    expected: "5 profile JSONs are listed in the tarball contents"
    why_human: "Publish pipeline / packaging policy decision; verifier should not run npm publish"
  - test: "After fixing the commander gap, run `node dist/cli/index.js init --profile python --yes` in a marker-less temp dir and confirm `bootstrap profile [installed]` with python globs in `.mycodemap/config.json`"
    expected: "Asset installed; config contains `**/*.py`"
    why_human: "End-to-end CLI smoke test post-fix"
---

# Phase 53: Bootstrap Profiles + Project Detection — Verification Report

**Phase Goal:** Establish project type auto-detection and Bootstrap Profile system so first-time users get sensible defaults without manual configuration.

**Verdict:** PARTIAL — Code, data layer, integration logic, and tests are correctly delivered, but the user-facing `--profile` flag is not registered in the commander entry, breaking D-13 in the real CLI.

**Verified:** 2026-05-02
**Re-verification:** No — initial verification.

---

## Verdict

**PARTIAL** — One BLOCKER (user-visible `--profile` flag unwired in commander) plus one WARNING (dist build doesn't copy profile JSONs; works only because loader reads from `src/`). All four success criteria are functionally implemented in the code modules, and the test suite passes (478 passed | 11 skipped); however SC-3's "user can review/accept/skip via CLI" path has a real gap because the bypass flag is unreachable via the binary.

---

## Success Criteria Evaluation

| # | Criterion | Verdict | Evidence | Rationale |
|---|-----------|---------|----------|-----------|
| 1 | First-run auto-detects project type (nodejs/python/go/rust/generic) | ✓ | `src/cli/init/detect.ts:24-29, 40-57`; `src/cli/commands/init.ts:66-79`; smoke run on `package.json` → `应用 profile: nodejs` | Marker-only detection works for all 4 markers; `generic` is reachable explicitly via `--profile generic` (intentional per locked decisions; not a fallback) |
| 2 | Each project type has a defined Bootstrap Profile (parser + ignore + analysis_depth) | ✓ | `src/cli/init/profiles/{nodejs,python,go,rust,generic}.json` — all 5 contain `parser{include,extensions}`, `ignore`, `analysis_depth`. Validated by `bootstrapProfileSchema` in `profile-loader.ts:11-18` | All 5 profiles valid against zod schema; tests in `profile-loader.test.ts` confirm all load |
| 3 | Interactive mode allows user to review, accept, or skip recommended profile (modify deferred) | △ | Logic correct in `profile-plan.ts:139-150` (preview = skipped + 推荐 message; apply = installed); `init.ts:resolveProfile` honors `--profile` bypass internally. **BUT:** commander entry at `src/cli/index.ts:123-128` does NOT register `--profile`, so `codemap init --profile python` fails at runtime with `error: unknown option '--profile'`. | Preview/apply binary mode works (smoke-tested OK). Multi-marker prompt works (covered by tests). The BLOCKER is the missing commander option registration — D-13 bypass is unreachable from the real CLI |
| 4 | Profiles stored as data files, not hardcoded TS | ✓ | `ls src/cli/init/profiles/*.json` → 5 JSON files; `profile-loader.ts:79-111` reads JSON and parses via zod | No hardcoded profile objects in TS source |

**Score:** 3/4 ✓, 1 △

---

## Locked Decisions Evaluation (D-01 .. D-17)

| ID | Decision | Status | Evidence |
|----|----------|--------|----------|
| D-01 | Marker-only detection (no content sniffing) | verified | `detect.ts:43` uses only `existsSync`; tests confirm content-independence |
| D-02 | Multi-marker → return all candidates, recommended:null | verified | `detect.ts:55-56`; `detect.test.ts` covers 2-marker case |
| D-03 | Confidence enum `high\|low` | verified | `detect.ts:14-17`; all current markers emit `high` |
| D-04 | 0-marker → no fallback; refuse with hint | verified | `init.ts:68-71` throws `NO_MARKER_HINT` |
| D-05 | Co-locate profile JSON under `src/cli/init/profiles/` | verified | Files present; loader resolves there |
| D-06 | Five built-in profiles | verified | nodejs, python, go, rust, generic — all present |
| D-07 | Strict zod validation | verified | `profile-loader.ts:11-18`; `parse` + `ZodError` flatten branch |
| D-08 | Schema = exactly 3 fields (parser, ignore, analysis_depth) | verified | Schema literal matches |
| D-09 | analysis_depth → mode mapping (shallow/standard/deep → fast/hybrid/smart) | verified | `profile-loader.ts:40-44`; also re-implemented in `profile-plan.ts:46-58` (minor duplication, not a defect) |
| D-10 | Path-traversal hardening (allow-list + separator check) | verified | `profile-loader.ts:56-63`; tests confirm rejection (with documented Rule-3 deviation: error message is `'未知 profile'` because allow-list short-circuits before separator check; security objective met) |
| D-11 | Preview-default + accept(--yes)/skip-only interaction | verified | `init.ts:27-33` (mode resolution); `profile-plan.ts:139-150` (preview emits skipped+message, no writes); preview smoke confirmed nothing written to `.mycodemap/config.json` |
| D-12 | Non-TTY refusal for multi-marker | verified | `init.ts:82-87`; covered by `init-profile.test.ts` |
| D-13 | `--profile <name>` flag bypasses detection | not-met (BLOCKER) | `init.ts:53-58` honors it programmatically AND interface-contract registers it AND tests pass via `executeInitCommand`, BUT commander entry `src/cli/index.ts:123-128` does NOT register the option. `codemap init --profile python` fails: `error: unknown option '--profile'`. |
| D-14 | `mycodemap init`-embedded single entry point (no separate command) | verified | No new `bootstrap` subcommand; lives entirely inside `init` |
| D-15 | First-run-guide hint (text-only, no detection) | verified | `first-run-guide.ts` contains the hint line; smoke output shows it; `first-run-guide.test.ts` covers it |
| D-16 | Existing canonical config preserved (no overwrite) | verified | `init.ts:62-64` short-circuits via `hasCanonicalConfig`; smoke test on legacy `mycodemap.config.json` confirmed file unchanged. Receipt asset emits `'skipped'` with the misleading "未检测到项目类型标记" message — this is **F-1** (cosmetic, see below) |
| D-17 | Disambiguation rules (1 marker auto, 2+ prompt or refuse) | verified | `init.ts:73-95`; `init-profile.test.ts` covers all branches |

**Summary:** 16 verified, 1 not-met (D-13 — BLOCKER for user-visible behavior).

---

## Code Health Gates

| Gate | Result |
|------|--------|
| `node node_modules/.bin/vitest run src/cli` | **478 passed | 11 skipped (489)** — exactly matches SUMMARY claim |
| `npx tsc --noEmit` | **No errors found** |
| `npm run build` | clean (tsc only); **does NOT copy `src/cli/init/profiles/*.json` into `dist/`** — see follow-up F-2 |
| Smoke test: fresh `package.json` + `init --yes` (rebuilt dist) | ✓ `bootstrap profile [installed]`, config contains `src/**/*.{ts,tsx,js,jsx,mjs,cjs}` |
| Smoke test: preview mode (no `--yes`) | ✓ `bootstrap profile [skipped]` with "推荐 profile: nodejs", **no `.mycodemap/config.json` written** |
| Smoke test: legacy root `mycodemap.config.json` + marker | ✓ Legacy config preserved untouched; receipt shows `bootstrap profile [skipped]` with the F-1 misleading message |
| Smoke test: marker-less dir + `--profile python` (binary path) | ✗ **`error: unknown option '--profile'`** — commander rejects the flag |

---

## Known Follow-ups (F-series)

These do NOT block phase closure but should be filed for cleanup:

- **F-1 (cosmetic, confirmed)**: When the user has a legacy root `mycodemap.config.json` and a project marker, `init.ts:hasCanonicalConfig` short-circuits with `profile: null`, so `profile-plan.ts:109-118` emits the null-profile branch with detail *"未检测到项目类型标记；跳过 bootstrap profile 推荐"* — but a marker IS detectable. Functional behavior is correct (D-16 honored, legacy config preserved). Only the receipt detail text is misleading. Suggested fix: thread the resolveProfile decision into the plan so the existing-config branch fires `'already-synced'` even when resolveProfile returned null due to legacy config. Not covered by any current test (init-profile.test.ts test "skips profile when canonical config exists" only exercises the `.mycodemap/config.json` path, not the legacy root path).
- **F-2 (build packaging)**: `tsc` does not copy `src/cli/init/profiles/*.json` into `dist/`. Today the loader resolves to `src/cli/init/profiles/` from the package root, so npm-published packages still work as long as the `files` field includes `src/cli/init/profiles/` (or no exclusion). Recommend either a build step to copy `*.json` into `dist/cli/init/profiles/` and adjust the loader, OR explicit `files` whitelist in package.json with a publish smoke test. (Verifier flagged for human verification.)
- **F-3 (Plan 53-03 deviation 1, intentional)**: path-traversal throws `'未知 profile'` not `'非法 profile 名称'` (allow-list short-circuit). Documented in 53-03 SUMMARY; security objective fully met. No action required.
- **F-4 (Plan 53-03 deviation 2, intentional)**: existing-config asset status is `'skipped'` not `'already-synced'` — same root cause as F-1.
- **F-5 (Plan 53-03 deviation 3, intentional)**: `parser.extensions` not propagated to canonical config (`buildMergedConfigText` only merges `include`+`ignore`, not `extensions`). May or may not be desired — current canonical config schema lacks an `extensions` field, so this is technically correct. Worth confirming with product intent.

---

## BLOCKER Detail (must-fix before close)

**B-1: `--profile` flag missing from commander registration**

- **Location**: `src/cli/index.ts:123-128`
- **Symptom**: `codemap init --profile <name>` → `error: unknown option '--profile'` (exit 1)
- **Why tests didn't catch it**: All 8 init-profile tests call `executeInitCommand({ profile: '...' })` directly, bypassing the commander layer
- **Fix**: Add `.option('--profile <name>', '跳过检测，直接应用指定内置 profile')` between lines 127 and 128
- **Suggested regression test**: Spawn the built binary or invoke the commander program parse, asserting `--profile python` does not produce the unknown-option error

---

## Recommendation

**fix-then-close.**

Reasoning:
- The phase delivers 16 of 17 locked decisions and 3 of 4 success criteria functionally correct.
- The data layer (detect, profile-loader, profile JSONs), integration (profile-plan, reconciler wiring), and tests (25 new tests, suite green) are all real, substantive, and wired.
- The single BLOCKER (B-1) is a one-line fix in `src/cli/index.ts` plus a regression test. Given that D-13 is a locked phase-level decision and one of the phase's headline ergonomics promises, shipping without it would render `--profile` unreachable for actual end users — exactly the trap goal-backward verification is designed to catch.
- F-1 / F-2 are non-blocking cleanups for v2.1 polish.

**Suggested closure path:**
1. Apply B-1 commander fix + add a binary-level smoke test
2. Re-run `vitest run src/cli` and a manual `node dist/cli/index.js init --profile python` in a temp dir
3. Re-verify (this document → status: passed) and close phase

---

_Verified: 2026-05-02_
_Verifier: Claude (gsd-verifier)_
