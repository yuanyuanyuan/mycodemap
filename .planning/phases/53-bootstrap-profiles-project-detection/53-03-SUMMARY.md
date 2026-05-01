---
phase: "53-bootstrap-profiles-project-detection"
plan: "53-03"
subsystem: "cli/init"
tags: [bootstrap-profiles, project-detection, tests, first-run-guide]
requires:
  - "src/cli/init/detect.ts (53-01)"
  - "src/cli/init/profile-loader.ts (53-01)"
  - "src/cli/init/profile-plan.ts (53-02)"
  - "src/cli/commands/init.ts (53-02 --profile + resolveProfile flow)"
provides:
  - "src/cli/init/__tests__/detect.test.ts: 7 unit tests for marker detection"
  - "src/cli/init/__tests__/profile-loader.test.ts: 10 unit tests for profile loading + validation + path-traversal rejection"
  - "src/cli/commands/__tests__/init-profile.test.ts: 8 integration tests for --profile flag, detection refusal, multi-marker disambiguation"
  - "src/cli/first-run-guide.ts: one-line bootstrap-profile hint (D-15)"
affects:
  - "src/cli/__tests__/first-run-guide.test.ts (added 2 assertions)"
tech-stack:
  added: []
  patterns:
    - "Object.defineProperty(process.stdout, 'isTTY', { configurable: true, get })  to toggle TTY state per-test (preferred over vi.spyOn for getter-only properties)"
    - "vi.hoisted holder + vi.mock factory with vi.importActual to spy on a single named export from a module while keeping siblings real"
key-files:
  created:
    - src/cli/init/__tests__/detect.test.ts
    - src/cli/init/__tests__/profile-loader.test.ts
    - src/cli/commands/__tests__/init-profile.test.ts
  modified:
    - src/cli/first-run-guide.ts
    - src/cli/__tests__/first-run-guide.test.ts
decisions:
  - "Test path-traversal rejection by error category (rejection happens), not by exact message text — the allow-list short-circuits with '未知 profile' before the explicit '非法 profile 名称' branch can fire. Both messages prove rejection; the allow-list is the actual first defense."
  - "Pin existing-config asset status to 'skipped' (Rule-3 deviation): init.ts:62-64 short-circuits resolveProfile and never loads a profile when canonical config exists, so profile-plan emits the null-profile branch ('skipped'), not the 'already-synced' branch the plan originally specified. User-visible D-16 behavior (preserve existing config) is unaffected — the test additionally asserts the existing config is not overwritten."
  - "Mock promptForProfileSelection at the module boundary via vi.mock + vi.importActual rather than mocking node:readline/promises — keeps the test focused on the init-flow contract (multi-marker branch invokes the prompt and uses its return value) without coupling to the prompt's internal readline implementation."
metrics:
  completed: "2026-05-02"
  tasks: 4
  commits: 4
  new_tests: 25
  full_suite: "478 passed | 11 skipped (489)"
---

# Phase 53 Plan 03: Tests + First-Run-Guide Hint Summary

**One-liner:** Added 25 unit + integration tests covering Wave-1 detection / profile-loader and Wave-2 init `--profile` integration, plus the lightweight first-run-guide profile hint (D-15) — closing FRC-01..04 verification.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | detect.test.ts — 7 unit tests for marker detection | `e7e9fe4` | `src/cli/init/__tests__/detect.test.ts` |
| 2 | profile-loader.test.ts — 10 unit tests for loading + validation + traversal rejection | `da85e6a` | `src/cli/init/__tests__/profile-loader.test.ts` |
| 3 | init-profile.test.ts — 8 integration tests for `--profile` flow + TTY/non-TTY refusal + multi-marker selection | `94d3403` | `src/cli/commands/__tests__/init-profile.test.ts` |
| 4 | first-run-guide.ts — one-line bootstrap-profile hint (D-15) | `6b0bbff` | `src/cli/first-run-guide.ts`, `src/cli/__tests__/first-run-guide.test.ts` |

## What Shipped

### Test coverage

- **detect.ts** (Task 1): all 4 marker files (`package.json` → nodejs, `pyproject.toml` → python, `go.mod` → go, `Cargo.toml` → rust), 0-marker → `recommended:null`, 2-marker → `recommended:null` with both candidates returned, content-independence (invalid JSON in `package.json` still detected as nodejs since detection is `existsSync`-only per D-01).
- **profile-loader.ts** (Task 2): all 5 built-in profiles (`nodejs/python/go/rust/generic`) load + validate; `generic` confirmed as `analysis_depth: 'shallow'`; unknown names rejected; path-traversal (`../etc/passwd`) and path-separator (`foo/bar`) inputs rejected by allow-list; `resolveProfilePath` produces the expected `…/profiles/{name}.json` shape.
- **init.ts integration** (Task 3): `--yes + package.json` applies the nodejs profile (canonical config contains the TS-glob from the profile); preview mode marks the profile asset `skipped` and writes nothing; pre-existing canonical config preserves user config (asset = `skipped`, content unchanged); `--profile python` bypasses detection entirely (D-13) on a marker-less directory; non-TTY refusals fire for both 0-marker and multi-marker cases (D-04, D-12); TTY multi-marker case calls `promptForProfileSelection` exactly once and applies the chosen profile.

### First-run guide (D-15)

Added a single grey hint line between step 3 (`--help`) and the closing separator: *"提示: 运行 `mycodemap init` 时，若检测到 package.json / pyproject.toml / go.mod / Cargo.toml，将自动推荐对应项目的 bootstrap profile。"* No detection logic invoked — this is text-only per the locked decision.

## Verification Run

```
node node_modules/.bin/vitest run src/cli/init/__tests__/detect.test.ts          → 7 passed
node node_modules/.bin/vitest run src/cli/init/__tests__/profile-loader.test.ts  → 10 passed
node node_modules/.bin/vitest run src/cli/commands/__tests__/init-profile.test.ts → 8 passed
node node_modules/.bin/vitest run src/cli/__tests__/first-run-guide.test.ts      → 4 passed
node node_modules/.bin/vitest run src/cli                                        → 478 passed | 11 skipped (489)
npx tsc --noEmit                                                                 → No errors found
```

Full-suite delta: **453 → 478 passing** (+25 new tests, matches Tasks 1+2+3 additions; Task 4 changed assertions in an existing test without adding new test cases).

## Deviations from Plan

### Rule-3 deviations (auto-fixed; behavior matches code reality, not the plan's literal expected strings)

**1. [Rule 3 – Plan-vs-code mismatch] path-traversal error message**
- **Found during:** Task 2.
- **Issue:** Plan specified `expect(...).toThrow('非法 profile 名称')` for inputs like `../etc/passwd` and `foo/bar`. In `profile-loader.ts:57-62`, the allow-list check (`ALLOWED_PROFILE_NAMES.has(profileName)`) runs before the path-separator check, so any name not in the allow-list (including traversal strings) throws `'未知 profile: …'`. The `'非法 profile 名称'` branch is unreachable defense-in-depth — it would only fire if someone added a separator-containing name to the allow-list.
- **Fix:** Asserted `/未知 profile/` for those cases. The security objective (rejection) is fully verified; only the message string differs from the plan.
- **Commit:** `da85e6a`.

**2. [Rule 3 – Plan-vs-code mismatch] existing-config asset status is 'skipped' not 'already-synced'**
- **Found during:** Task 3, test `skips profile when .mycodemap/config.json already exists`.
- **Issue:** Plan expected `status: 'already-synced'`. In `init.ts:62-64`, when `hasCanonicalConfig(rootDir)` is true, `resolveProfile` short-circuits and returns `{ profile: null }` without loading any profile. `profile-plan.ts:109-118` then emits the null-profile branch (`'skipped'`) — not the `'already-synced'` branch (line 120), which requires `profile !== null` AND existing config.
- **Fix:** Asserted `status: 'skipped'` and additionally asserted that the existing config text is **not** overwritten (D-16 user-visible contract). Added an inline comment explaining the discrepancy.
- **Commit:** `94d3403`.

**3. [Rule 3 – Plan vs profile-plan merge surface] `--profile python` content assertion**
- **Found during:** Task 3, test `bypasses detection with --profile python`.
- **Issue:** Plan said *"expect `.mycodemap/config.json` contains `"py"` in extensions"*. `profile-plan.ts buildMergedConfigText` only merges `parser.include` (into `include`) and `ignore` (into `exclude`); it does **not** propagate `parser.extensions` into the canonical config. So `"py"` as a standalone token doesn't appear there, but the python `parser.include` glob `"src/**/*.py"` does.
- **Fix:** Asserted `text.toContain('src/**/*.py')` instead. Verifies the same plan intent (profile-derived python content reaches the canonical config) against the actual merge surface.
- **Commit:** `94d3403`.

These three are all "the plan was written ahead of the implementation; reality landed slightly differently in 53-02; pin the test to reality without softening the contract being verified" — none changes user-visible behavior or weakens any locked decision.

## Threat Surface Scan

No new security-relevant surface introduced. The new tests:
- create temp dirs in `tmpdir()` (T-53-08 mitigation: `afterEach` removes all `tempRoots` recursively),
- mock `process.stdout.isTTY` / `process.stdin.isTTY` via property descriptors and restore them in `afterEach` (no leak across test files),
- mock the `promptForProfileSelection` export only at the module boundary; the real `detectProjectType` and other detect.ts symbols stay live.

The first-run-guide change is text-only — no detection invocation, no fs writes beyond the existing marker file logic.

## Known Stubs

None. All assertions exercise real code paths; no placeholder content flows to UI rendering.

## Self-Check

**Created files exist on disk:**
- `src/cli/init/__tests__/detect.test.ts` — FOUND
- `src/cli/init/__tests__/profile-loader.test.ts` — FOUND
- `src/cli/commands/__tests__/init-profile.test.ts` — FOUND

**Modified files contain expected changes:**
- `src/cli/first-run-guide.ts` — FOUND (contains "bootstrap profile" hint line)
- `src/cli/__tests__/first-run-guide.test.ts` — FOUND (asserts "bootstrap profile" + "package.json")

**Commits exist in `git log`:**
- `e7e9fe4` (Task 1) — FOUND
- `da85e6a` (Task 2) — FOUND
- `94d3403` (Task 3) — FOUND
- `6b0bbff` (Task 4) — FOUND

## Self-Check: PASSED
