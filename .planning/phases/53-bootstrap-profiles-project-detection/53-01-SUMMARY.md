---
phase: "53-bootstrap-profiles-project-detection"
plan: "53-01"
subsystem: "cli/init"
tags: [bootstrap-profiles, project-detection, zod, init]
requires: []
provides:
  - "marker-only project type detection (detectProjectType)"
  - "zod-validated bootstrap profile loader (loadProfile)"
  - "5 built-in profile JSON files (nodejs/python/go/rust/generic)"
  - "ANALYSIS_DEPTH_TO_MODE mapping (shallow->fast, standard->hybrid, deep->smart)"
affects:
  - "src/cli/init/ (new modules; no behavior change to existing init flow yet)"
tech_stack:
  added:
    - "(none — zod already installed; node:readline/promises already used)"
  patterns:
    - "fileURLToPath(new URL('../../../', import.meta.url)) for package-root resolution (mirrors hooks.ts)"
    - "z.infer<typeof schema> for type+runtime parity (mirrors interface-contract/schema.ts)"
    - "node:readline/promises for interactive numeric prompts (mirrors ship/pipeline.ts)"
key_files:
  created:
    - "src/cli/init/detect.ts"
    - "src/cli/init/profile-loader.ts"
    - "src/cli/init/profiles/nodejs.json"
    - "src/cli/init/profiles/python.json"
    - "src/cli/init/profiles/go.json"
    - "src/cli/init/profiles/rust.json"
    - "src/cli/init/profiles/generic.json"
  modified: []
decisions:
  - "Co-locate profile JSON under src/cli/init/profiles/ (planner-discretion choice from D-05; matches rule-templates.ts asset bundling pattern)"
  - "Multi-marker → recommended:null forces caller-side disambiguation (D-02)"
  - "ANALYSIS_DEPTH_TO_MODE mapping lives in profile-loader.ts (not in JSON) so the source enum and the mapping stay co-located"
  - "Allow-list profile names + reject path-separator/.. tokens in resolveProfilePath to mitigate T-53-01 path traversal"
  - "ZodError flattened to single human-readable line per RESEARCH pitfall 3 (mitigates T-53-04 by using profile name not full filesystem path in primary message body)"
metrics:
  duration: "single session 2026-05-01"
  completed: "2026-05-01"
---

# Phase 53 Plan 53-01: Bootstrap Profiles Detection Foundation Summary

**One-liner:** Marker-only project type detection plus zod-validated loader and five built-in JSON profiles, forming the data layer that all downstream Phase 53 init integration depends on.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | detect.ts — marker-only project type detection | `ab214c2` | `src/cli/init/detect.ts` |
| 2 | profile-loader.ts — zod schema + profile loading | `fa7527d` | `src/cli/init/profile-loader.ts` |
| 3 | 5 built-in profile JSON files | `f639aad` (pre-existing, byte-identical) | `src/cli/init/profiles/{nodejs,python,go,rust,generic}.json` |

## Implementation Notes

### Task 1: detect.ts
- Exports: `ProjectType`, `DetectionCandidate`, `DetectionResult`, `detectProjectType`, `promptForProfileSelection`.
- Marker map (frozen) covers `package.json` → nodejs, `pyproject.toml` → python, `go.mod` → go, `Cargo.toml` → rust.
- `detectProjectType` is synchronous, uses only `existsSync` (no content sniffing per D-01), returns `recommended:null` for 0-marker (D-04 caller-refusal contract) and 2+ marker (D-02 disambiguation contract) cases.
- `promptForProfileSelection` uses `node:readline/promises` with `try/finally` to guarantee `readline.close()`. Throws `Error('无效选择')` on bad input (CLI entry handles exit code; module is `process.exit`-free).

### Task 2: profile-loader.ts
- Schema has exactly the 3 D-08 fields: `parser{include,extensions}` (each `min(1)`), `ignore` (string array, may be empty), `analysis_depth` (enum `shallow|standard|deep`).
- `ALLOWED_PROFILE_NAMES = {nodejs,python,go,rust,generic}` — first defense against T-53-01 path traversal.
- `resolveProfilePath` rejects `/`, `\`, `..` after the allow-list check (defense in depth even though allow-list already blocks them).
- `loadProfile` distinguishes ENOENT, JSON-parse, and ZodError into three distinct re-thrown error messages, each prefixed with `[profileName]` for diagnostic clarity.
- `ANALYSIS_DEPTH_TO_MODE` mapping exported here for plan 53-02's `profile-plan.ts` (shallow→fast, standard→hybrid, deep→smart per RESEARCH RESOLVED Q2).
- `fileURLToPath(new URL('../../../', import.meta.url))` resolves package root (ESM-safe; mirrors hooks.ts).

### Task 3: 5 profile JSON files
- Already on disk and tracked when I started this plan (committed in `f639aad` from a prior orchestrator run on this worktree base). My Write of byte-identical content per the plan spec produced no diff against HEAD.
- All 5 files pass `bootstrapProfileSchema` validation — verified inline via the plan's automated `node -e ...` zod parse check (all 5 reported `OK`).
- `generic.json` uses `analysis_depth: "shallow"` (conservative fallback for explicit `--profile generic`).
- Tabs/trailing-comma verified clean (each parsed by `JSON.parse`).

## Verification Run

Inline schema validation (per Task 3 plan verify command):
```
OK nodejs
OK python
OK go
OK rust
OK generic
```

TypeScript: `npx tsc --noEmit` produced no errors for `detect.ts` or `profile-loader.ts` (filtered grep returned empty).

## Deviations from Plan

None — plan executed exactly as written for all 3 tasks. No Rule 1/2/3 auto-fixes were needed.

**Pre-existing worktree state observation (not a deviation by this executor):** The worktree base at agent start (`26b2c8d`) already had two extra commits (`657c5ad`, `f639aad`) labeled `53-02` but containing the 53-01 Task 3 JSON files plus 53-02 work (`profile-plan.ts`, reconciler wiring). I did not author those commits. The 53-01 Task 3 deliverables they contain are byte-identical to this plan's spec. The orchestrator should be aware that 53-02 work is already partially merged into this worktree branch when integrating waves.

## Threat Surface Scan

No new security-relevant surface introduced beyond what the plan's `<threat_model>` already covers (T-53-01 path traversal, T-53-02 malformed JSON DoS, T-53-04 path leak — all mitigated as described).

## Known Stubs

None. All exports are fully implemented; no placeholder values flow to UI rendering.

## Self-Check

Created files exist on disk:
- `src/cli/init/detect.ts` — FOUND
- `src/cli/init/profile-loader.ts` — FOUND
- `src/cli/init/profiles/nodejs.json` — FOUND
- `src/cli/init/profiles/python.json` — FOUND
- `src/cli/init/profiles/go.json` — FOUND
- `src/cli/init/profiles/rust.json` — FOUND
- `src/cli/init/profiles/generic.json` — FOUND

Commits exist in `git log`:
- `ab214c2` (Task 1) — FOUND
- `fa7527d` (Task 2) — FOUND
- `f639aad` (Task 3 deliverables, pre-existing) — FOUND

## Self-Check: PASSED
