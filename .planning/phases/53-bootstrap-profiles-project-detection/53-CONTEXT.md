# Phase 53: Bootstrap Profiles + Project Detection - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Milestone:** v2.1 ux-onboarding-enhancement

<domain>
## Phase Boundary

Phase 53 delivers automatic project type detection plus the Bootstrap Profile system. After a user runs `mycodemap init` in a fresh project, the tool should detect the dominant project type (Node.js / Python / Go / Rust) using marker files only, recommend a built-in profile that ships with the package, and integrate the recommendation into the existing init reconciliation flow without introducing new top-level subcommands.

This phase is the foundation for the rest of v2.1: Phase 54 (Zero-Config Preview) reuses the profile fallbacks, Phase 55/56 (Agent Bootstrap + Receipt) report profile application status as part of the same `InitReceipt`, and Phase 57 (Verification) covers the detection paths.

In scope:
- Marker-only project type detection (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`).
- Built-in JSON profiles bundled inside the package (Node.js / Python / Go / Rust / generic).
- Strict schema validation of profile JSON at load time.
- Preview-by-default integration into `mycodemap init`; apply only with explicit `-y/--yes`.
- `--profile <name>` flag to bypass detection in CI / agent / non-TTY contexts.
- Profile application reported as an `InitAsset` inside the existing `InitReceipt`.
- First-run guide text update so a hint about init's profile recommendation is discoverable.

Out of scope:
- User-overridable profiles in `.mycodemap/profiles/` (deferred; v1 is built-in only).
- Inline modify / Q&A flow during interactive selection (v1 supports only accept or skip).
- Standalone `mycodemap profile detect|apply` subcommand (single-entry into init only).
- Bare `codemap` automatically running detection on first run (only the guide text changes).
- Content-sniffing or directory-structure heuristics beyond marker files (deferred).
- Generating runtime-specific assistant snippets (Phase 55).
- Reporting profile status to operator beyond receipt (Phase 56).
- End-to-end verification across temp project scenarios (Phase 57).

</domain>

<decisions>
## Implementation Decisions

### Detection Strategy

- **D-01:** Detection uses marker files only: `package.json` → Node.js, `pyproject.toml` → Python, `go.mod` → Go, `Cargo.toml` → Rust. No directory heuristics, no content sniffing. Rationale: simplest deterministic signal, cross-platform stable, low IO.
- **D-02:** When multiple markers coexist (e.g., monorepo with `package.json` + `Cargo.toml`), the detector reports all detected types and the interactive flow asks the user which to use. Non-interactive contexts must pass `--profile <name>` to disambiguate.
- **D-03:** Detection confidence is exposed to the user only when low (e.g., one ambiguous marker, or detected type without a recognized lockfile alongside it). High-confidence detections show only the recommendation, not the score.
- **D-04:** When no marker file is found, the detector refuses to continue. The error must direct the user to either add a marker file or pass `--profile <name>`. No silent fallback to `generic`.

### Profile Data Model

- **D-05:** Profile definitions are JSON static files shipped inside the package (e.g., `src/cli/profiles/nodejs.json`). Not TypeScript modules, not dynamic.
- **D-06:** Profiles are read from the package only. v1 does **not** support `.mycodemap/profiles/*.json` user overrides. Adding override support is a future-milestone decision; until then profile data is treated as a versioned governance asset.
- **D-07:** Profile JSON is strictly validated at load time. The validator runs on every read; load-time errors abort `init` with a clear diagnostic. Implementation library (zod / ajv / hand-rolled) is the planner's choice, but validation must be enforced, not optional.
- **D-08:** Profile fields are limited in v1 to three core entries:
  1. `parser` — language-specific parser configuration (paths to scan, file extensions, ignore globs scoped to parser context).
  2. `ignore` — top-level ignore patterns merged into `.mycodemap/config.json`.
  3. `analysis_depth` — recommended analysis depth (e.g., shallow / standard / deep).

  Adding fields later requires a profile schema version bump and migration path.

### Interaction Boundary

- **D-09:** Default behavior after detection is **preview only**. The user sees the recommended profile and recommended actions; nothing is written to disk. This matches the established Phase 51 init pattern.
- **D-10:** Apply requires explicit `-y/--yes` (already supported by `mycodemap init`). The same flag covers profile application — no separate apply flag.
- **D-11:** v1 supports only **accept or skip**. There is no inline `modify` Q&A flow. Users who want to tweak the recommended profile should accept first, then edit `.mycodemap/config.json` by hand. This narrows v1 surface to the FRC-04 contract via the accept/skip subset.
- **D-12:** Non-TTY environments (CI, piped stdin/stdout, non-interactive shells) must receive an explicit `--profile <name>` or `-y`. Otherwise init exits with a non-zero status and a message describing the required flag. No silent default acceptance.
- **D-13:** `--profile claude|nodejs|python|go|rust|generic` flag bypasses detection entirely and applies the named built-in profile. This is the agent / CI / scripting path. (Note: `claude` is illustrative — the real list is the set of built-in profiles. Planner decides exact registered names.)

### Trigger and Integration

- **D-14:** Detection and apply logic is **embedded into `mycodemap init` only**. No standalone `mycodemap profile` subcommand. Adding new top-level verbs increases CLI surface and duplicates init's reconciliation guarantees.
- **D-15:** Bare `codemap` first-run does not trigger detection. The existing first-run guide text (in `src/cli/first-run-guide.ts`) gets a sentence indicating that running `init` will produce a recommended profile if a project type is detected. Lightweight integration, no orchestration changes.
- **D-16:** When `.mycodemap/config.json` already exists, profile detection and recommendation are **skipped by default**. A future flag (e.g., `--re-detect`, `--force-profile`, or similar) can re-trigger detection; the planner decides the flag name. The skip path must still surface in the receipt as `already-configured` so users can discover the option.
- **D-17:** Profile application is modeled as an `InitAsset` inside the existing `InitReceipt`. Status values (`installed` / `already-synced` / `skipped` / `manual-action-needed` / `conflict`) reuse the established `InitAssetStatus` enum from `src/cli/init/reconciler.ts`. This makes profile application visible to `codemap doctor` drift detection automatically.

### Agent's Discretion

- Exact JSON schema definition (zod, ajv, hand-rolled) and where the schema lives are planner choices.
- Exact built-in profile filename layout (`src/cli/profiles/nodejs.json` vs `assets/profiles/nodejs.json`) is a planner choice.
- Exact `--re-detect` / `--force-profile` flag name and short form are planner choices.
- Confidence scoring algorithm details (what constitutes "low") are planner choices, but the rule must be deterministic given the same marker file set.
- Whether to extract detection into a separate `src/cli/init/detect.ts` module or keep inline in `reconciler.ts` is a planner choice; either is acceptable.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 53 goal and success criteria (lines 220–231).
- `.planning/REQUIREMENTS.md` — FRC-01..04 active requirements.
- `.planning/PROJECT.md` — milestone v2.1 vision and identity.
- `.planning/phases/51-post-install-agent-bootstrap-configuration/51-CONTEXT.md` — sibling phase context; Phase 53 reuses many of its decisions.

### Existing Init Implementation (reuse, do not duplicate)
- `src/cli/commands/init.ts` — current command entry; preview by default, apply with `--yes`. Phase 53 adds `--profile` and detection invocation here.
- `src/cli/init/reconciler.ts` — `InitAsset`, `InitAssetStatus`, `InitAssetOwnership`, `InitReceipt`, `InitPlan`, `createInitPlan`, `applyInitPlan`. Profile application becomes a new asset kind in the same plan.
- `src/cli/init/rules.ts` — pattern for adding a new asset family alongside existing rules generation.
- `src/cli/init/rule-templates.ts` — pattern for shipping bundled assets inside the package.
- `src/cli/init/receipt.ts` — receipt rendering; profile status appears alongside other assets.
- `src/cli/interface-contract/commands/init.ts` — schema contract; `--profile` and any detection-related flag must be registered here.
- `src/cli/first-run-guide.ts` — lightweight text-only modification target for D-15.

### Existing Tests (extend these, do not replace)
- `src/cli/commands/__tests__/init-command.test.ts` — fresh init, migration, legacy drift, idempotency.
- `src/cli/commands/__tests__/init-rules.test.ts` — example of testing a new init asset family.
- `src/cli/__tests__/first-run-guide.test.ts` — first-run guide expectations.

### Docs and Public Setup Surface (Phase 56 syncs final docs)
- `README.md` — quick start; do not change wording in this phase unless behavior changes are user-visible.
- `docs/SETUP_GUIDE.md` — human setup flow; touch only if `--profile` flag changes the recommended path.
- `docs/AI_ASSISTANT_SETUP.md` — Phase 56 will update.
- `docs/ai-guide/COMMANDS.md` — must reflect `--profile` flag if registered.
- `AI_GUIDE.md` — AI-facing CLI usage map.

### Governance Inputs
- `AGENTS.md` Section 8.1 — real-world validation rules; Phase 57 will verify, but Phase 53 tests should already use real temp directories.
- `docs/rules/testing.md` — testing rules including evidence requirements.
- `docs/rules/code-quality-redlines.md` — code quality red lines.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `InitPlan` / `InitAsset` already model "preview a thing, apply it later" semantics with detailed status. Profile application maps to a single asset (or a small group of assets — the planner decides whether the JSON merge into config.json is one asset or two).
- `InitAssetStatus` (`'missing'` | `'already-synced'` | `'migrated'` | `'installed'` | `'conflict'` | `'manual-action-needed'` | `'skipped'`) already covers all states profile application needs. No new status values.
- `InitAssetOwnership` (`'tool-owned'` | `'team-owned'` | `'user-owned'`) — the merged `.mycodemap/config.json` is `tool-owned`, so the existing rules apply.
- Existing init tests already use temp directories and real filesystem assertions — ready model for Phase 53 tests.

### Established Patterns

- Preview is default; `-y/--yes` applies. Phase 53 must not break this.
- Tool-owned files under `.mycodemap/` may be written by init. Profile application targets `.mycodemap/config.json`, which is already tool-owned.
- Drift is reported, not silently overwritten. The `already-configured` skip path (D-16) follows this rule.
- Receipt is the operator-facing truth source. Profile application going through the receipt is consistent with this rule.

### Integration Points

- **Detection module:** new file `src/cli/init/detect.ts` is the natural home; it reads marker files, returns `{ type, confidence, evidence }`. Planner can also embed in `reconciler.ts`, but a separate module is cleaner for testing.
- **Profile loader:** new module (e.g., `src/cli/init/profile-loader.ts`) reads JSON, validates against schema, returns parsed profile object.
- **Profile assets:** new directory like `src/cli/profiles/` with `nodejs.json`, `python.json`, `go.json`, `rust.json`, `generic.json`. Planner picks exact path.
- **Schema definition:** location is a planner choice; co-located with profile-loader is reasonable.
- **Init command:** adds `--profile <name>` to `InitCommandOptions` and threads it through to `createInitPlan`.
- **Interface contract:** `src/cli/interface-contract/commands/init.ts` registers `--profile` so MCP and `--schema` see it.
- **First-run guide:** `src/cli/first-run-guide.ts` text-only update; no detection invocation here.

### Current Gaps

- No project type detection logic anywhere in the codebase. Phase 53 introduces it from scratch.
- No profile abstraction or bundled profile assets. Phase 53 introduces the JSON files and loader.
- `init` accepts `--yes` and `--json` (the latter inconsistently per Phase 51 context); Phase 53 adds `--profile`.
- First-run guide currently shows a fixed three-step welcome; no language about profile recommendation.

</code_context>

<specifics>
## Specific Ideas

- Profile JSON file naming: `nodejs.json`, `python.json`, `go.json`, `rust.json`, `generic.json` (lowercase, single-word keys aligned with detection output).
- Detection output type sketch (planner refines):
  ```ts
  interface DetectionResult {
    candidates: Array<{ type: ProjectType; markerFile: string; confidence: 'high' | 'low' }>;
    recommended: ProjectType | null; // null when no markers found
  }
  ```
- Multi-marker UI in interactive mode: numbered list of candidates ("1) nodejs (package.json)  2) rust (Cargo.toml)") with single-character or numeric input. Planner picks library or hand-rolls.
- Non-zero exit codes for refusal paths (D-04 and D-12): planner decides whether to use `1` (generic), or a phase-specific code.
- For `--profile generic`, the bundled `generic.json` should provide the safest minimal defaults that work on any project; this is the natural CI / agent fallback.
- Mention in receipt for skipped detection (D-16): asset status `skipped` with note `"existing .mycodemap/config.json detected; pass --re-detect (or equivalent) to override"`.

</specifics>

<deferred>
## Deferred Ideas

- User-overridable profiles in `.mycodemap/profiles/` → future v2.x milestone; v1 keeps profile data as a versioned governance asset.
- Inline modify Q&A flow → future milestone or permanently dropped; v1 only accept/skip.
- Standalone `mycodemap profile detect|apply` subcommand → permanently out of scope; single-entry into init is part of the design.
- Content sniffing (read first N bytes of detected entry files) and directory-structure heuristics → future milestone if marker-only detection proves insufficient.
- Bare `codemap` automatic detection / preview on first run → permanently out of scope; only the guide text changes.
- Profile schema version bump and migration path → not needed in v1; the profile schema is greenfield.
- Confidence scoring algorithm tuning beyond `high` / `low` binary → future iteration.
- Auto-rewriting `.mycodemap/config.json` for projects already configured → covered by the future `--re-detect` flag work.

</deferred>

---

*Phase: 53-bootstrap-profiles-project-detection*
*Context gathered: 2026-05-01*
*Mode: discuss (default)*
