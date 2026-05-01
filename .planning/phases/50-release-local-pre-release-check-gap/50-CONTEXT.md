# Phase 50: Release Local Pre-Release Check Gap - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Source:** Promoted from a user-provided v2.0 release follow-up draft.

<domain>
## Phase Boundary

Phase 50 closes a release-governance gap discovered during the v2.0 release attempt: local release validation did not run the same pre-release checks as CI publish, so release problems could pass locally and fail after tag/push.

In scope:
- Make local release flow run `npm run docs:check:pre-release` before irreversible release actions.
- Keep local/CI release validation semantics aligned.
- Update release docs/checklists if the local validation sequence changes.
- Verify both failure and passing paths.

Out of scope:
- Performing a real release, version bump, tag, push, npm publish, or GitHub Release.
- Rebuilding the release flow from scratch.
- Changing unrelated validation gates.

</domain>

<decisions>
## Implementation Decisions

### Root Cause
- **D-01:** The gap is local/CI validation mismatch. `scripts/release.sh` runs `npm run check:all`, while `check:all` expands to `typecheck && lint && test && docs:check`.
- **D-02:** `docs:check` runs `validate-docs.js + validate-ai-docs.js`; it does not run `pre-release-check.js` via `docs:check:pre-release`.

### Fix Direction
- **D-03:** Local release must run `npm run docs:check:pre-release` before any irreversible release action.
- **D-04:** Acceptable implementation choices are either adding the command explicitly to `scripts/release.sh` or adding it to a clearly documented release-specific aggregate. Do not hide release-only semantics in a generic command without docs.

### Verification
- **D-05:** Verification must include a failure scenario where pre-release checks fail locally.
- **D-06:** Verification must include the normal passing path: `docs:check`, `docs:check:pre-release`, and diff hygiene.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Release Flow
- `scripts/release.sh` — local release orchestration currently running `npm run check:all`.
- `package.json` — definitions for `check:all`, `docs:check`, and `docs:check:pre-release`.
- `scripts/pre-release-check.js` — pre-release checks that must not be CI-only.
- `.github/workflows/publish.yml` — CI publish path that already runs pre-release validation.

### Release Governance Docs
- `docs/rules/release.md` — authoritative release process and confirmation gates.
- `docs/rules/pre-release-checklist.md` — pre-release checklist and validation expectations.
- `.planning/milestones/v2.0-MILESTONE-AUDIT.md` — v2.0 release/audit context if needed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `npm run docs:check:pre-release` already exists in `package.json`.
- `scripts/pre-release-check.js` already covers version consistency, changelog sync, git tag consistency, `llms.txt` standards, and YAML index validity.
- Prior release governance work already treats release operations as L3 and requires explicit confirmation gates.

### Established Patterns
- Release flow should remain thin orchestration and delegate to existing checks.
- Release safety fixes must not perform real release operations.
- Validation changes should include failure-path evidence, not only passing checks.

### Current Gaps
- Local `scripts/release.sh` can pass `check:all` without running `docs:check:pre-release`.
- CI can still catch failures only after local release preparation has progressed too far.

</code_context>

<specifics>
## Specific Ideas

- Prefer adding an explicit `npm run docs:check:pre-release` line in `scripts/release.sh` before `npm run check:all`, because it makes release-specific validation visible.
- If adding to `check:all`, update docs to clarify that `check:all` includes release-specific validation, and consider whether that is too broad for non-release workflows.
- Add or adjust tests around release script contents or pre-release checklist expectations.

</specifics>

<deferred>
## Deferred Ideas

- Full release dry-run simulator beyond the minimum local check parity fix.
- Any real publish/tag/push operation.
- Broader release automation refactor.

</deferred>

<incident>
## v2.0.0 Release Incident Evidence (2026-05-01)

Three CI failures after local `release.sh` passed. All root causes were local/CI parity gaps.

### Failure 1: package-lock.json Missing Optional Dependencies
- **CI Error**: `npm ci` failed — `sql.js@1.14.1` and `web-tree-sitter@0.24.7` missing from lock file
- **Local Behavior**: `npm install` silently installs optional deps even when not in lock file
- **CI Behavior**: `npm ci` is strict — lock file must contain every resolved dependency
- **Fix**: Run `npm install` locally to regenerate lock file with optional deps, then commit

### Failure 2: CHANGELOG.md Missing Version Entry
- **CI Error**: `pre-release-check.js` reported `[changelog_not_synced] CHANGELOG.md missing v2.0.0 entry`
- **Local Behavior**: `release.sh` runs `check:all` which uses `docs:check`, NOT `docs:check:pre-release`
- **CI Behavior**: `publish.yml` runs `npm run docs:check:pre-release` which validates CHANGELOG sync
- **Fix**: Add v2.0.0 entry to CHANGELOG.md

### Failure 3: Type Declaration Files Excluded by .gitignore
- **CI Error**: `tsc --noEmit` failed — `Could not find declaration file for module 'sql.js'`
- **Local Behavior**: `src/types/sql.js.d.ts` exists locally → typecheck passes
- **CI Behavior**: File never committed (`.gitignore` has `*.d.ts` without `!src/types/*.d.ts` exception)
- **Fix**: Add `!src/types/*.d.ts` to `.gitignore`, commit both `sql.js.d.ts` and `web-tree-sitter.d.ts`

### Full CI vs Local Gap Table

| CI Step (`publish.yml`) | Local Step (`release.sh`) | Gap? | Caused v2.0 Failure? |
|---|---|---|---|
| `npm ci` | none (uses existing `node_modules`) | ⚠️ `npm ci` stricter than `npm install` | **YES** — lock file |
| `docs:check:pre-release` | `docs:check` only | ❌ **MISSING** | **YES** — CHANGELOG |
| `typecheck` | `typecheck` | ✅ Same | **YES** — .gitignore types |
| `lint` | `lint` | ✅ Same | No |
| `npm test` | `npm test` | ✅ Same | No |
| `test:e2e` | **NOT RUN** | ❌ **MISSING** | No (passes locally) |
| `build` | **NOT RUN** | ❌ **MISSING** | No (passes locally) |
| `validate-pack` | **NOT RUN** | ❌ **MISSING** | No (passes locally) |

</incident>

---

*Phase: 50-release-local-pre-release-check-gap*
*Context gathered: 2026-05-01*
*Incident evidence added: 2026-05-01*
