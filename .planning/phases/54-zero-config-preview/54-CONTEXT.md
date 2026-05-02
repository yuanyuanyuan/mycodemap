# Phase 54: Zero-Config Preview - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 54 delivers a `codemap preview` command that lets new users see CodeMap value immediately without writing any configuration file. It is a lightweight wrapper over the existing `generate` command, using Phase 53's Bootstrap Profiles as fallback configuration when no `mycodemap.config.json` exists.

After preview, users can run `codemap preview --save` to persist the inferred config and upgrade to a full generate — this is the progressive commitment path from "zero-config exploration" to "configured project."

This phase is the core UX turning point of v2.1: it transforms CodeMap from "install then configure" to "install and instantly see value."

In scope:
- New `codemap preview` CLI command registered in commander and interface contract.
- Zero-config execution: when no `mycodemap.config.json` exists, use Phase 53's `detectProjectType()` + Bootstrap Profile as fallback config.
- Lightweight analysis: reuse generate's core logic but skip symbol-level analysis, graph persistence, and full dependency graph construction.
- Concise summary output: file count, module count, direct dependencies (from marker files), and top-5 complexity hotspots (via escomplex).
- `--save` flag: write merged profile config to `.mycodemap/config.json` and run full generate.
- Output follows v2.0 AI-First Default Output paradigm: JSON by default, `--human` / TTY auto-detection renders tables/colors.
- Non-TTY / no-marker fallback: generic profile provides minimal defaults so preview always runs.
- Interface contract registration for `preview` command (MCP auto-exposure).
- End-of-output hint text: "Run codemap preview --save to save this config."

Out of scope:
- Interactive modify / Q&A during preview (v1 is accept-or-skip only; same as Phase 53 D-11).
- `--discard` flag (preview is inherently non-destructive; no flag needed).
- Symbol-level analysis or full dependency graph in preview output (belongs to `codemap generate`).
- Directory-structure heuristics beyond what Phase 53 profiles provide.
- Generating agent bootstrap assets (Phase 55).
- Init receipt reporting (Phase 56).
- End-to-end verification across temp project scenarios (Phase 57).

</domain>

<decisions>
## Implementation Decisions

### Preview Command Relationship to Generate

- **D-01:** `codemap preview` is a **lightweight wrapper over generate's core logic**, not a standalone analysis path. It reuses generate's file discovery, module counting, and analysis infrastructure but skips heavy steps (symbol-level, graph persistence, full dependency graph). Rationale: shared code means zero maintenance divergence; users can seamlessly upgrade from preview to generate.
- **D-02:** Preview **skips symbol-level analysis, graph persistence to `.mycodemap/`, and full dependency graph construction**. It retains file discovery, module statistics, direct dependency extraction, and escomplex-based complexity scoring. This keeps preview fast (<2s target on typical projects) while providing enough value to hook the user.
- **D-03:** `codemap preview --save` **writes the merged profile config to `.mycodemap/config.json` and then runs full generate**. This is the progressive commitment path: preview → save → full analysis. The user goes from zero-config exploration to a fully configured project in one step.

### Zero-Config Project Structure Inference

- **D-04:** When no `mycodemap.config.json` exists, preview **reuses Phase 53's `detectProjectType()` + Bootstrap Profile** as the fallback config. No additional directory heuristics or content sniffing. Rationale: Phase 53 already provides language-specific parser config, ignore patterns, and analysis depth — reusing it avoids duplication and keeps preview consistent with init's behavior.
- **D-05:** When `detectProjectType()` finds **no marker files**, preview **falls back to the `generic` profile** (Phase 53's built-in minimal profile). Unlike `init` (which refuses per D-04), preview's goal is to always provide immediate value. The generic profile provides safe minimal defaults that work on any project.
- **D-06:** When `.mycodemap/config.json` **already exists**, preview uses it directly (no profile detection, no override). This matches Phase 53 D-16's established pattern.

### Preview Output Format and Content

- **D-07:** Output follows **v2.0 AI-First Default Output paradigm**: JSON by default on stdout, `--human` flag or TTY auto-detection renders human-readable tables/colors. Progress events go to stderr as NDJSON. Rationale: consistency with the rest of the CLI surface; agent users can `jq` the output.
- **D-08:** Preview summary contains exactly four sections (per ZCP-03):
  1. **File count** — total source files discovered (filtered by profile ignore patterns).
  2. **Module count** — distinct modules/directories identified.
  3. **Direct dependencies** — extracted from marker files (`package.json` dependencies, `go.mod` requires, `Cargo.toml` dependencies, `pyproject.toml` dependencies). Not source-code import analysis.
  4. **Complexity hotspots** — top-5 files by cyclomatic complexity, computed via `typhonjs-escomplex` (already in package.json). File-level analysis only; no function-level breakdown.
- **D-09:** "Key dependencies" (ZCP-03) means **direct dependencies from marker files**, not source-code import relationships. Rationale: marker-file dependencies are deterministic, require no parsing, and show the project's technology stack clearly.

### --save Progressive Commitment Interaction

- **D-10:** After preview output, display a **single-line hint text** at the end: "Run `codemap preview --save` to save this config." No interactive prompt, no blocking input wait. Rationale: preview is a non-destructive, non-blocking command; a text hint is the lightest touch that still guides the user.
- **D-11:** There is **no `--discard` flag**. Preview is inherently non-destructive (writes nothing by default), so `--discard` would be a no-op. The `--save` flag is the only action modifier. This keeps the CLI surface minimal.
- **D-12:** When `--save` is used, the output should confirm what was saved (config path) and that full generate has been triggered. This matches the receipt pattern from init.

### Claude's Discretion

- Exact `preview` command file structure (single file `src/cli/commands/preview.ts` vs splitting into preview + preview-runner) is a planner choice.
- Whether to extract a shared "lightweight analysis" function from generate or call generate with flags that disable heavy steps is a planner choice.
- Exact hint text wording is a planner choice; it just needs to mention `--save`.
- Whether `--save` runs generate synchronously (blocking) or fires-and-forgets is a planner choice; synchronous is recommended for predictability.
- Exact JSON output schema (field names, nesting) is a planner choice; it just needs to cover the four sections from D-08.
- Whether `preview` registers its own interface contract command file or shares with generate is a planner choice.
- Error handling details for escomplex failures (individual file parse errors) are planner choices; preview should not abort on a single file failure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 54 goal and success criteria (ZCP-01..04).
- `.planning/REQUIREMENTS.md` — ZCP-01..04 active requirements.
- `.planning/PROJECT.md` — milestone v2.1 vision and identity.

### Phase 53 Context (MUST read — preview reuses its detection and profile infrastructure)
- `.planning/phases/53-bootstrap-profiles-project-detection/53-CONTEXT.md` — all D-01..D-17 decisions; preview depends on D-01 (detection), D-05..D-08 (profile data model), D-16 (skip when config exists).
- `src/cli/init/detect.ts` — `detectProjectType()`, `DetectionResult`, `ProjectType` types. Preview calls this directly.
- `src/cli/init/profile-loader.ts` — `loadProfile()`, `BootstrapProfile` type. Preview uses this to get fallback config.
- `src/cli/init/profile-plan.ts` — `ProfilePlan`, `createProfilePlan()`. Preview reuses the config merge logic for `--save`.
- `src/cli/profiles/` — five built-in JSON profiles (nodejs, python, go, rust, generic).

### Existing Generate Implementation (preview wraps this)
- `src/cli/commands/generate.ts` — current generate command; preview reuses its analysis core.
- `src/core/analyzer.ts` — `analyze()` function used by generate.
- `src/cli/config-loader.ts` — `loadCodemapConfig()`; preview needs a way to provide profile-derived config when no file exists.
- `src/core/file-discovery.ts` — `discoverProjectFiles()`; used by generate and potentially by preview for file counting.

### Output Infrastructure (v2.0 AI-First paradigm)
- `src/cli/output/index.ts` — `resolveOutputMode()`, `renderOutput()`, `createProgressEmitter()`.
- `src/cli/output/apply-suggestion.ts` — `tryApplySuggestion()` for failure-to-action protocol.
- `src/cli/commands/doctor.ts` / `src/cli/commands/benchmark.ts` — examples of commands using the shared output infrastructure.

### Interface Contract (MCP auto-exposure)
- `src/cli/interface-contract/commands/init.ts` — example of a contract definition with flags.
- `src/cli/interface-contract/index.ts` — `getFullContract()`; preview must register here.
- `src/server/mcp/schema-adapter.ts` — MCP auto-registration from contract schema.

### Init Infrastructure (preview --save reuses config write path)
- `src/cli/init/reconciler.ts` — `InitAsset`, `InitAssetStatus`, `InitReceipt`, `createInitPlan`, `applyInitPlan`.
- `src/cli/init/profile-plan.ts` — `createProfilePlan()`, `applyProfilePlan()`; preview `--save` reuses the config merge + write path.
- `src/cli/commands/init.ts` — command registration pattern for `--profile`, `--json`, `--yes` flags.

### Testing Patterns
- `src/cli/commands/__tests__/init-command.test.ts` — temp directory + real filesystem pattern.
- `src/cli/commands/__tests__/init-profile.test.ts` — profile integration test pattern.

### Governance
- `AGENTS.md` Section 8.1 — real-world validation rules.
- `docs/rules/testing.md` — testing rules including evidence requirements.
- `docs/rules/code-quality-redlines.md` — code quality red lines.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`detectProjectType()`** (`src/cli/init/detect.ts`): Returns `DetectionResult` with candidates and recommended type. Preview calls this directly for zero-config project detection.
- **`loadProfile()`** (`src/cli/init/profile-loader.ts`): Reads and validates built-in JSON profiles via zod. Preview uses this to get fallback parser/ignore/analysis_depth config.
- **`createProfilePlan()` / `applyProfilePlan()`** (`src/cli/init/profile-plan.ts`): Creates the merged config and writes it. Preview `--save` reuses this for config persistence.
- **`analyze()`** (`src/core/analyzer.ts`): Core analysis function used by generate. Preview reuses for file/module counting and analysis.
- **`discoverProjectFiles()`** (`src/core/file-discovery.ts`): File discovery with globby. Preview reuses for file counting.
- **`resolveOutputMode()` / `renderOutput()`** (`src/cli/output/index.ts`): Shared output infrastructure. Preview uses for JSON/default + --human/TTY detection.
- **`typhonjs-escomplex`**: Already in package.json; provides cyclomatic complexity analysis without tree-sitter dependency.

### Established Patterns

- **Preview-by-default, apply-with-flag**: Init uses `-y/--yes` to apply; preview uses `--save`. Same philosophy, different flag name because preview and init are separate commands.
- **AI-First Default Output**: JSON on stdout by default, `--human` or TTY auto-detection for human output. All v2.0 commands follow this.
- **Interface Contract registration**: Every public command registers in `src/cli/interface-contract/` for MCP auto-exposure and `--schema` output.
- **Profile as fallback config**: Phase 53 established that Bootstrap Profiles serve as zero-config defaults. Preview extends this from `init` to `generate`.
- **Receipt as truth source**: Init uses `InitReceipt` to report status. Preview `--save` should produce a similar confirmation.

### Integration Points

- **New command registration**: `src/cli/index.ts` — add `previewCommand` import and `.command('preview')` registration.
- **New contract definition**: `src/cli/interface-contract/commands/preview.ts` — define `preview` contract with `--save`, `--human`, `--json` flags.
- **Config bridge**: Preview needs a way to pass profile-derived config to generate's analysis core when no `mycodemap.config.json` exists. This may require a new function in `config-loader.ts` or a "virtual config" parameter in the analysis path.
- **Save path**: `--save` writes via `applyProfilePlan()` (same as init's profile apply) then invokes `generateCommand`.
- **First-run guide**: `src/cli/first-run-guide.ts` may need a minor update to mention `codemap preview` as a zero-config starting point (in addition to the existing `init` mention from Phase 53 D-15).

### Current Gaps

- No `codemap preview` command exists — Phase 54 introduces it from scratch.
- `generate` currently requires `mycodemap.config.json` to exist (or falls back to hardcoded defaults). Preview needs a clean way to inject profile-derived config without creating a config file first.
- No "lightweight analysis" mode in generate — preview needs to either add flags to generate or extract a shared analysis function.
- `typhonjs-escomplex` is in the dependency tree but not used for top-level file complexity scoring in the current CLI. Preview introduces this as a new analysis path.

</code_context>

<specifics>
## Specific Ideas

- Preview output JSON schema sketch (planner refines):
  ```json
  {
    "projectType": "nodejs",
    "profile": "nodejs",
    "files": { "total": 142, "byExtension": { ".ts": 98, ".js": 44 } },
    "modules": { "count": 12, "top": ["src/core", "src/cli", "src/domain"] },
    "dependencies": { "direct": ["express", "commander", "chalk"], "count": 23 },
    "complexity": { "hotspots": [
      { "file": "src/cli/commands/analyze.ts", "score": 47, "functions": 23 },
      { "file": "src/orchestrator/tool-orchestrator.ts", "score": 38, "functions": 15 }
    ]},
    "hint": "Run codemap preview --save to save this config."
  }
  ```
- `--save` confirmation output sketch:
  ```
  ✓ Config saved to .mycodemap/config.json (profile: nodejs)
  ✓ Running codemap generate...
  [generate output follows]
  ```
- Hint text format: `ℹ Run 'codemap preview --save' to save this config and generate a full code map.`
- For the `generic` profile fallback (D-05), the hint should add: `ℹ No project type detected — using generic defaults. Pass --profile <name> for language-specific analysis.`
- Interface contract for `preview` should include `--profile` flag (same semantics as init's `--profile`) for explicit profile selection, and `--save` boolean flag.

</specifics>

<deferred>
## Deferred Ideas

- Interactive modify / Q&A during preview → future milestone or permanently dropped; v1 is accept-or-skip only.
- `--discard` flag → permanently out of scope; preview is inherently non-destructive.
- Source-code import dependency graph in preview output → future milestone; v1 only shows marker-file dependencies.
- Directory-structure heuristics (detecting src/, lib/, test/ beyond what profiles provide) → future milestone if profile-based inference proves insufficient.
- Function-level complexity breakdown → future milestone; v1 only shows file-level hotspots.
- Progress bar / spinner during preview analysis → planner discretion; ora is already available in the project.
- Preview caching / incremental results → future milestone; v1 does a fresh analysis every time.

</deferred>

---

*Phase: 54-zero-config-preview*
*Context gathered: 2026-05-02*
*Mode: discuss (default)*
