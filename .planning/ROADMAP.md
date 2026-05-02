# Roadmap: CodeMap

## Current Planning Surface

**Status:** Active milestone `v2.1 ux-onboarding-enhancement` (2026-05-01). Phases 50-52 remain as independent unscheduled follow-ups.

v2.0 milestone archive (roadmap + requirements + audit) is at `.planning/milestones/v2.0-*`.

## Milestones

- ○ **v2.1 ux-onboarding-enhancement** — Phases 53-58 (defining requirements)
- ✅ **v2.0 agent-native-foundation** — Phases 40.1-49 (shipped 2026-05-01)
- ✅ **v1.11 release-followup-hardening** — Phases 38-40 (shipped 2026-04-29)
- ✅ **v1.10 governance-debt-cleanup** — Phases 35-37 (shipped 2026-04-23)
- ✅ **v1.9 release-governance-unification** — Phases 31-34 (shipped 2026-04-22)
- ✅ **v1.8 entry-docs-structure-consolidation** — Phases 28-30 (shipped 2026-04-22)
- ✅ **v1.7 init-and-rule-hardening** — Phases 27, 999.1 (shipped 2026-04-18)

Earlier milestones: see `.planning/MILESTONES.md` and `.planning/milestones/`.

## Phases

<details>
<summary>✅ v2.0 agent-native-foundation (Phases 40.1-49) — SHIPPED 2026-05-01</summary>

### Phase 40.1: Real-World Validation Guardrails
**Goal:** Add mandatory real-world validation rules to testing docs, pre-release checklist, AGENTS.md, CLAUDE.md, and CI guardrails. All tests must include real test cases with evidence from actual execution.
**Depends on:** None
**Requirements:** VAL-01 (真实场景验证规则)
**Plans:** 2 plans
**Wave 1** *(no dependencies)*
- [x] 40.1-01-PLAN.md — 文档层修改（AGENTS.md, CLAUDE.md, testing.md, pre-release-checklist.md）
**Wave 2** *(blocked on Wave 1 completion)*
- [x] 40.1-02-PLAN.md — 自动化层（pre-commit, CI workflow）

**Cross-cutting constraints:** AGENTS.md Section 8.1 真实场景验证阈值（Plan 01 声明，Plan 02 引用）
**Success criteria:**
1. `docs/rules/testing.md` contains real-world validation rules with evidence requirements
2. `docs/rules/pre-release-checklist.md` contains check item #12 for real-world validation
3. `AGENTS.md` Section 8 strengthened with real-world validation requirements
4. `CLAUDE.md` contains route pointer to testing rules
5. `.github/workflows/ci-gateway.yml` runs real-validation check
6. `.githooks/pre-commit` enforces evidence presence

### Phase 41: Interface Contract Schema
**Status:** Completed 2026-04-30
**Goal:** Define the CLI surface as a formal machine-readable contract schema and expose runtime metadata.
**Requirements:** AGENT-01, AGENT-02, AGENT-04, AGENT-05
**Plans:** 1 plan
- [x] 41-01 — Schema types, meta-schema, 3 core command families (`analyze`, `query`, `deps`), `--schema` CLI flag, commander config validation

**Success criteria:**
1. Contract schema file exists and validates against a meta-schema
2. At least 3 core command families (`analyze`, `query`, `deps`) are defined in schema
3. `codemap --schema` (or equivalent) outputs the full contract as JSON
4. Schema can generate or validate existing commander configuration

### Phase 42: CLI-as-MCP Automatic Gateway
**Status:** Completed 2026-04-30
**Goal:** Auto-expose every schema-defined CLI command as an MCP tool with zero handwritten maintenance.
**Requirements:** AGENT-03, AGENT-06
**Plans:** 1 plan
- [x] 42-01 — Schema-to-MCP adapter (`schema-adapter.ts`), dynamic tool registration, flag-to-zod mapping, output shape JSON Schema conversion, graceful degradation for nested types

**Success criteria:**
1. MCP server dynamically registers tools from contract schema, not hardcoded `server.ts`
2. Adding a new command to the schema automatically creates a new MCP tool on restart
3. All existing 20+ CLI commands are accessible via MCP (not just 2 experimental tools)
4. Complex nested types degrade gracefully to simple scalar mappings if schema generation fails

### Phase 43: codemap doctor
**Goal:** Create a living diagnostics command that audits the entire CodeMap ecosystem.
**Requirements:** TRUST-01, TRUST-02, TRUST-03
**Plans:** 1 plan
Plans:
- [x] 43-01-PLAN.md — Diagnostic types, 4 checker modules, orchestrator, formatter, CLI registration, and tests

**Success criteria:**
1. `codemap doctor` command exists and runs without errors
2. Detects ghost commands (`echo` stubs in `package.json`)
3. Detects native dependency health (`tree-sitter`, `better-sqlite3` load status)
4. Detects `.mycodemap/` workspace drift against receipts
5. Emits both human-readable report and machine-readable JSON (`--json`)
6. Categorizes diagnostics: install / config / runtime / agent

### Phase 44: AI-First Default Output
**Goal:** Flip the output paradigm — structured JSON by default, human rendering on demand.
**Requirements:** AGENT-07, AGENT-08, AGENT-09
**Plans:** 1 plan
Plans:
- [x] 44-01-PLAN.md — Output mode infrastructure, migrate 3 core commands (analyze, query, deps), refactor doctor to shared infrastructure

**Success criteria:**
1. All commands emit JSON/NDJSON on stdout by default
2. `--human` flag pipes output through built-in table/color renderer
3. TTY auto-detection preserves current interactive behavior (no breaking change for humans)
4. Progress events go to stderr as structured NDJSON lines
5. `codemap analyze | jq '.findings[] | select(.severity=="high")'` works out of the box

### Phase 45: Failure-to-Action Protocol
**Goal:** Turn every error into a structured, recoverable state transition.
**Requirements:** TRUST-04
**Success criteria:**
1. Errors return `{attempted, rootCause, remediationPlan, confidence, nextCommand}`
2. Native dependency failures auto-suggest `--wasm-fallback` or prebuilt binary URL
3. Agents can attempt remediation without human intervention (using `nextCommand`)
4. Confidence scoring on suggestions prevents cascading failures
5. No auto-execution without explicit `--apply-suggestion`

### Phase 46: Validation Router + No Ghost Commands
**Goal:** Fix the "docs say one thing, commands do another" trust crisis.
**Requirements:** TRUST-05, TRUST-06, TRUST-07
**Success criteria:**
1. Root `CLAUDE.md` validation section is a 1-screen decision tree by change type
2. `check:architecture` and `check:unused` are either real checks or honestly removed
3. No `echo` stub commands remain in `package.json`
4. Docs guardrail scans verify referenced `npm run` commands are not stubs
5. `docs/rules/architecture-guardrails.md` syncs with real automation

### Phase 47: WASM-First Build Foundation
**Goal:** Eliminate the #1 install drop-off — native dependency compilation failures.
**Requirements:** INST-01, INST-02, INST-03
**Success criteria:**
1. `tree-sitter` WASM fallback loads when native compilation fails
2. `better-sqlite3` / `node:sqlite` fallback path works without build tools
3. `npm install codemap` succeeds on a fresh CI image / laptop without `python`, `make`, `gcc`
4. `--native` flag or config forces native binary usage for performance-sensitive users
5. `codemap benchmark` can compare WASM vs Native on a target repo
6. Target: <1s startup penalty for WASM mode on 10K-file repo

### Phase 48: AI CLI Install Guide + repo-analyzer Skill
**Goal:** 增强 mycodemap 的 AI CLI 安装引导体验，并新增基于 repo-analyzer 的深度架构分析技能。
**Depends on:** —
**Plans:**
- [x] Plan 1: Create mycodemap-repo-analyzer skill + enhance AI_ASSISTANT_SETUP.md (completed 2026-05-01)

**Design doc:** `docs/plans/2026-04-30-install-guide-and-repo-analyzer-design.md`

**Archive:** `.planning/milestones/v2.0-ROADMAP.md`
**Requirements:** `.planning/milestones/v2.0-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v2.0-MILESTONE-AUDIT.md`
**Phases:** `.planning/phases/`

### Phase 49: Integration Wiring
**Status:** Completed 2026-05-01
**Goal:** 修复 v2.0 audit 中 4 个 critical blockers，使已实现的代码真正工作。纯接线修复，不新增功能。
**Depends on:** Phase 41-48
**Plans:** 2 plans
- [x] 49-01 — Loader & Error Handler Wiring（validateTreeSitter loader-aware 改造、tryApplySuggestion 接入、global flags 消费）
- [x] 49-02 — Contract Schema Core Commands（doctor、benchmark、init 加入 contract schema）

**Success criteria:**
1. `codemap generate --wasm-fallback` 在 tree-sitter 不可用时成功使用 WASM fallback
2. `codemap generate --apply-suggestion` 在出错时尝试执行 nextCommand
3. `codemap --schema` 输出包含 doctor、benchmark、init 的完整契约
4. 所有修改保持现有命令行为不变

</details>

<details open>
<summary>○ Unscheduled release follow-up (Phase 50) — NOT PLANNED</summary>

### Phase 50: Release Local Pre-Release Check Gap
**Status:** Not planned
**Goal:** Close the local/CI release validation gap found during the v2.0 release attempt: `scripts/release.sh` must run the same pre-release checks locally that CI publish runs later, so changelog/version/tag/llms/index issues fail before tag or push.
**Depends on:** Phase 34, Phase 40, Phase 49
**Requirements:** Release governance; local/CI validation parity; pre-release check coverage
**Plans:** Not planned yet

**Success criteria:**
1. Local release flow runs `npm run docs:check:pre-release` before any irreversible release action.
2. The chosen implementation avoids hiding the check inside an unrelated broad script unless docs and release flow make that behavior explicit.
3. Verification demonstrates a local failure scenario when pre-release checks fail.
4. Verification demonstrates the normal passing path with `docs:check`, `docs:check:pre-release`, and diff hygiene.
5. Release docs or checklist are updated if the local validation sequence changes.

</details>

<details open>
<summary>○ Unscheduled post-install initialization follow-up (Phase 51) — NOT PLANNED</summary>

### Phase 51: Post-Install Agent Bootstrap Configuration
**Status:** Not planned
**Goal:** Make `mycodemap init` the reliable post-install bootstrap for new user projects: after the package is installed, it should converge `.mycodemap/` config, hooks, rules, agent-context snippets, and verification guidance so Claude/Codex users can connect initialized assets without hand-assembling setup instructions.
**Depends on:** Phase 40.1, Phase 43, Phase 46, Phase 48, Phase 49
**Requirements:** Post-install onboarding; init reconciliation; agent context bootstrap
**Plans:** Not planned yet

**Success criteria:**
1. `mycodemap init` generates or updates a new-user bootstrap package under `.mycodemap/` that includes canonical config, hooks, rules, status receipt, and agent-context snippets for Claude/Codex-style assistants.
2. The generated rules/context assets include copy-pasteable Claude/Codex/generic assistant snippets that tell users how to reference `.mycodemap/` assets without hand-assembling setup instructions.
3. `init` keeps team-owned `CLAUDE.md` / `AGENTS.md` safe by default: no silent rewrites; receipt output clearly reports `manual-action-needed`, copy-paste snippets, already-synced detection, and conflicts.
4. CLI contract, help, docs, and setup guides all describe the same post-install flow: install → `mycodemap init` preview/apply → `mycodemap doctor` → generate/index → connect agent context.
5. Verification covers a fresh temp project, an idempotent rerun, a drift/conflict case, and at least one real subprocess flow proving the generated agent rules/snippets are present and discoverable.

</details>

<details open>
<summary>○ Unscheduled compliance follow-up (Phase 52) — NOT PLANNED</summary>

### Phase 52: CodeMap CLI Priority Harness Guard
**Status:** Not planned
**Goal:** Turn the CodeMap CLI-first retrieval rule from a soft instruction into an observable harness guardrail across Claude/Codex sessions: tighten the rule text, add router discoverability, introduce a report-only guard or auditor, and verify failure / compliant / allowed-fallback scenarios.
**Depends on:** Phase 40.1, Phase 43, Phase 46, Phase 49, Phase 51
**Requirements:** Governance follow-up; agent harness control; CodeMap CLI compliance
**Plans:** Not planned yet

**Success criteria:**
1. `AGENTS.md` Section 6 defines a machine-checkable CodeMap CLI priority gate for code search, project analysis, and impact analysis.
2. `docs/rules/harness.md` documents the report-only to blocking escalation path for CLI-priority enforcement.
3. Claude/Codex router docs point agents to the CLI priority gate without duplicating policy text.
4. A report-only guard or auditor detects first-use `rg` / `grep` / `find` search in code paths before `mycodemap query|analyze|deps|impact`, while allowing documented fallback cases.
5. Verification covers one failure scenario, one compliant scenario, and one allowed fallback scenario using real filesystem + subprocess evidence.

</details>

<details open>
<summary>○ v2.1 ux-onboarding-enhancement (Phases 53-58) — PLANNING</summary>

### Phase 53: Bootstrap Profiles + Project Detection
**Status:** Complete (verifier PASS 2026-05-02; 4/4 success criteria, D-01..D-17 all verified)
**Goal:** Establish project type auto-detection and Bootstrap Profile system so first-time users get sensible defaults without manual configuration.
**Depends on:** None
**Requirements:** FRC-01, FRC-02, FRC-03, FRC-04
**Plans:** 3 plans in 2 waves

**Wave 1** *(no dependencies)*
- [x] 53-01-PLAN.md — Core detection + profile infrastructure (detect.ts, profile-loader.ts, 5 profile JSON files)
- [x] 53-02-PLAN.md — Profile plan integration (profile-plan.ts, reconciler.ts, init.ts --profile, interface contract)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 53-03-PLAN.md — Tests + first-run guide (detect.test.ts, profile-loader.test.ts, init-profile.test.ts, first-run-guide.ts update)

**Success criteria:**
1. `codemap` first run auto-detects project type (Node.js, Python, Go, Rust, generic)
2. Each project type has a defined Bootstrap Profile with parser config, ignore patterns, analysis depth defaults
3. Interactive mode allows user to review, accept, or skip recommended profile (modify deferred to future phase)
4. Profile definitions are stored as data files, not hardcoded in source

### Phase 54: Zero-Config Preview
**Status:** Complete (2026-05-02)
**Goal:** Let users see CodeMap value immediately without writing any configuration file.
**Depends on:** Phase 53 (profile system provides fallback defaults)
**Requirements:** ZCP-01, ZCP-02, ZCP-03, ZCP-04
**Plans:** 2 plans in 2 waves

**Wave 1** *(no dependencies)*
- [x] 54-01-PLAN.md — Service modules: dependency extractor + complexity scanner + smol-toml install

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 54-02-PLAN.md — Preview command + renderer + interface contract + CLI registration + tests

**Success criteria:**
1. `codemap preview` runs without `mycodemap.config.json` in an empty or fresh project
2. Auto-detects project type via Phase 53 detection and Bootstrap Profile as fallback config
3. Outputs concise summary: file count, module count, key dependencies, complexity hotspots
4. After preview, shows hint text to run `--save` to save config (no `--discard` flag per D-11)

### Phase 55: Agent Bootstrap Assets
**Status:** Complete (2026-05-02)
**Goal:** Generate assistant bootstrap assets during `mycodemap init` for both main agents (Claude/Codex parent sessions) and subagent retrieval infrastructure. Main agents consume static entry docs (CLAUDE.md / AGENTS.md); subagents consume retrievable contracts via Phase 58.
**Depends on:** None
**Requirements:** ABT-01, ABT-02, ABT-05, INI-01
**Plans:** 2 plans in 1 wave

**Wave 1** *(no dependencies)*
- [x] 55-01-PLAN.md — Manifest extractors (package.json/pyproject.toml/go.mod/Cargo.toml) + env-contract seed generation
- [x] 55-02-PLAN.md — Assistant bootstrap asset generator (4 per-runtime files under .mycodemap/assistants/)

**Success criteria:**
1. `mycodemap init` creates `.mycodemap/env-contract.json` — initial Project Environment Contract with bootstrap-profile-sourced items (project type, test command, build output, CLI entry).
2. `mycodemap init` creates `.mycodemap/assistants/` with per-platform assets:
   - `claude-context.md` — suggested content for project-root `CLAUDE.md` (main agent)
   - `agents-context.md` — suggested content for project-root `AGENTS.md` (main agent)
   - `claude-hook-example.json` — Claude Code `SubagentStart` hook config example (subagent retrieval guidance)
   - `codex-agent-example.toml` — Codex agent `developer_instructions` retrieval prompt template (subagent retrieval guidance)
3. `--profile claude|codex|generic` selects which platform adapter configs to generate; default generates all.
4. `mycodemap init --json` returns real machine-readable `InitReceipt` JSON reporting both main-agent context suggestions and subagent retrieval assets.

### Phase 56: Init Receipt + Next Steps
**Status:** Executing (verification pending)
**Goal:** Complete the init experience with clear receipt reporting that distinguishes main-agent setup from subagent setup, safe team-owned file handling, and synchronized documentation.
**Depends on:** Phase 55 (assets must exist before receipt can reference them)
**Requirements:** ABT-03, ABT-04, INI-02, INI-03
**Plans:** 3 plans

**Wave 1** *(no dependencies)*
- [x] 56-01-PLAN.md — Receipt enhancement: two-section layout, personalized next steps, sync detection
**Wave 2** *(blocked on Wave 1 completion)*
- [x] 56-02-PLAN.md — Tests: receipt classification, sync detection, personalized next steps coverage
- [x] 56-03-PLAN.md — Doc sync: README, SETUP_GUIDE, AI_ASSISTANT_SETUP unified flow

**Cross-cutting constraints:** Team-owned files never auto-rewritten (Plan 01 declares, Plans 02-03 reference); max 3 next steps (D-08)

**Success criteria:**
1. Init receipt displays **two sections**:
   - **Main Agent**: Reports `claude-context.md` / `agents-context.md` paths; instructs user to review and manually merge into project-root `CLAUDE.md` / `AGENTS.md` (does NOT auto-rewrite).
   - **Subagent**: Reports `env-contract.json` generation status and adapter config examples (`claude-hook-example.json`, `codex-agent-example.toml`); instructs user to copy configs into platform settings (`.claude/settings.json`, `.codex/agents/`).
2. Receipt explicitly reports agent context connection status: generated snippets, manual references needed, already-synced detection.
3. After init, displays personalized next steps based on receipt (not fixed three-step welcome).
4. Setup docs (README, SETUP_GUIDE, AI_ASSISTANT_SETUP) describe unified flow: install → init → doctor → generate → connect agent (main agent via entry docs, subagent via retrieval).

### Phase 57: Verification
**Status:** Not started
**Goal:** End-to-end validation of the onboarding experience across real project scenarios.
**Depends on:** Phase 53-56
**Requirements:** VER-01, VER-02, VER-03
**Plans:** Not planned yet

**Success criteria:**
1. Real temp project verification: empty directory, Node.js project, and project with existing old config all pass
2. Idempotency: repeated `mycodemap init` stably outputs `already-synced` status without false conflicts
3. At least one verification path invokes the built CLI through a subprocess, not only in-process TypeScript

### Phase 58: Subagent Environment Contract Retrieval
**Status:** Not started
**Goal:** At the project layer (not the platform layer), automatically discover project-specific environment contracts scattered across hooks, entry docs, package scripts, and rule-control helpers, and make them retrievable by sub-agents via CLI or MCP. Covers RTK shell wrapping, `[TAG] scope: message`, the real Vitest entry/commands, and rule-context verification expectations — retrieved by agent types that need them, not injected by the platform.
**Depends on:** Phase 55, Phase 56, Phase 57
**Requirements:** ABT-01, ABT-02, ABT-03, VER-03, SDC-01, SDC-02, SDC-03, SDC-04, SDC-05
**Plans:** Not planned yet

**Design doc:** `.planning/phases/58-subagent-environment-contract-injection/58-DESIGN.md`

**Why the platform doesn't do this:**
- Claude Code intentionally isolates sub-agents (`omitClaudeMd: true`); model-level prepend degrades to ~5% coverage under context pressure. `SubagentStart` hook `additionalContext` appends to user context and gets dropped during compaction. `PreToolUse` `updatedInput` for Agent tool is silently dropped (issue #39814).
- Codex unconditionally injects `SPAWN_AGENT_DEVELOPER_INSTRUCTIONS` but does not discover project-specific conventions. `developer_instructions` has known bugs on Windows (#19399) and project-level custom roles (#14579).
- Both platforms treat project-level contract injection as **out of scope** for generic infrastructure; it belongs at the project/tooling layer. Phase 58 provides retrieval capability instead of relying on unreliable injection mechanisms.

**Success criteria:**
1. A single canonical Project Environment Contract exists (`.mycodemap/env-contract.json`) with tagged items (`execution`/`commit`/`retrieval`/`validation`/`style`), source traceability, and conflict detection.
2. Contract retrieval is **agent-type-sensitive**: `mycodemap env-contract --for <type>` returns filtered items; Explore gets `retrieval`+`validation` only; Edit/Worker gets `execution`+`commit`+`style`+`validation`; Plan gets `validation`+`retrieval`; Verify gets `execution`+`validation`.
3. Claude, Codex, and generic assistant bootstrap assets receive **retrieval guidance** (how to query the contract) instead of duplicated drifting prompt snippets. No `.mycodemap/prompt-snippets/` directory is generated.
4. `mycodemap env-contract --as-hook-config` generates Claude Code `SubagentStart` hook examples; `mycodemap env-contract --as-codex-agent` generates Codex `developer_instructions` retrieval prompt templates.
5. `mycodemap doctor` detects contract drift against source files and reports conflicts (warn-only, not blocking); `mycodemap init` generates contract assets and platform adapter config examples.
6. MCP server exposes `codemap_env_contract` tool for run-time query by sub-agents.
7. Automated tests cover: source-file discovery, category filtering, conflict detection, drift detection, and missing-critical-contract failure.
8. Real sub-agent verification runs through `claude -p` **and** `codex exec` in isolated temp repos, capturing evidence that the sub-agent **retrieved** the contract via Bash/MCP and applied the rules (RTK, commit-format, Vitest-entry).
9. Negative case: a sub-agent **without retrieving** the contract fails or produces incorrect actions (commit rejected by hook, wrong test command, bare shell without rtk).
10. Test evidence includes: command transcript, sub-agent query command/output artifact, and clean working-tree or scoped diff hygiene check.

</details>

<details>
<summary>✅ v1.11 release-followup-hardening (Phases 38-40) — SHIPPED 2026-04-29</summary>

- [x] Phase 38: Codex release entry surface (1/1 plans) — completed 2026-04-23
- [x] Phase 39: Publish polling and reporting (1/1 plans) — completed 2026-04-23
- [x] Phase 40: Readiness gate evaluation (1/1 plans) — completed 2026-04-29

**Archive:** `.planning/milestones/v1.11-ROADMAP.md`
**Requirements:** `.planning/milestones/v1.11-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.11-MILESTONE-AUDIT.md`
**Phases:** `.planning/milestones/v1.11-phases/`

</details>

<details>
<summary>✅ v1.10 governance-debt-cleanup (Phases 35-37) — SHIPPED 2026-04-23</summary>

- [x] Phase 35: Governance drift guardrails (1/1 plans) — completed 2026-04-23
- [x] Phase 36: Validation trust alignment (1/1 plans) — completed 2026-04-23
- [x] Phase 37: Archive identity cleanup (1/1 plans) — completed 2026-04-23

**Archive:** `.planning/milestones/v1.10-ROADMAP.md`
**Requirements:** `.planning/milestones/v1.10-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.10-MILESTONE-AUDIT.md`
**Phases:** `.planning/milestones/v1.10-phases/`

</details>

<details>
<summary>✅ v1.9 release-governance-unification (Phases 31-34) — SHIPPED 2026-04-22</summary>

- [x] Phase 31: Release governance contract (1/1 plans) — completed 2026-04-22
- [x] Phase 32: Release thin orchestrator skill (1/1 plans) — completed 2026-04-22
- [x] Phase 33: Release validation and dry-run readiness (1/1 plans) — completed 2026-04-22
- [x] Phase 34: Release authority gap closure (1/1 plans) — completed 2026-04-22

**Archive:** `.planning/milestones/v1.9-ROADMAP.md`
**Requirements:** `.planning/milestones/v1.9-REQUIREMENTS.md`
**Audit:** `.planning/milestones/v1.9-MILESTONE-AUDIT.md`
**Phases:** `.planning/milestones/v1.9-phases/`

</details>

## Future Milestones (Preview)

These are scoped but not yet initialized. Requirements and roadmaps will be created when each milestone starts.

- **v2.2 agent-integration-completion** — Auto-Provisioned Agent Skills, MCP `verify_contract` Tool. Trivial layers on top of v2.0 interface contract schema.
- **v3.0 architecture-intelligence** — Auto-Generate design.md from codebase, Auto-Generate Architecture Remediation Patches, Self-Healing Design Contract (Drift Approval), SQLite + In-Memory Graph Migration. Heavy semantic analysis and storage refactoring; deserves a major version boundary.
- **Continuous** — Path-Scoped Governance, Live Rulebook, Governance Self-Audit. Ongoing docs governance improvements, not gated by any single release.

## Next Options

v2.1 is now active with 6 phases (53-58) and 24 requirements. To start execution:

1. **`/gsd-discuss-phase 53`** — gather context and clarify approach for Phase 53
2. **`/gsd-plan-phase 53`** — skip discussion, plan directly
3. **Review v2.1 requirements** — `.planning/REQUIREMENTS.md`

> **Phase 50-52** remain independent unscheduled follow-ups. See `.planning/phases/50-*/`, `51-*/`, `52-*/` for gathered context.

> **Deferred items mapping:** See `.planning/STATE.md` Deferred Items table for full traceability.
