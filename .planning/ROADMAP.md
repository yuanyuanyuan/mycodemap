# Roadmap: CodeMap

## Current Planning Surface

**Status:** Active milestone `v2.0 agent-native-foundation` (initialized 2026-04-30).

`v1.11` has been archived as a planning milestone. The active phase directories for Phase 38-40 were moved to `.planning/milestones/v1.11-phases/`, and the milestone audit / roadmap / requirements snapshots are now under `.planning/milestones/`.

## Milestones

- 🚧 **v2.0 agent-native-foundation** — Phases 41-48 (in progress)
- ✅ **v1.11 release-followup-hardening** — Phases 38-40 (shipped 2026-04-29)
- ✅ **v1.10 governance-debt-cleanup** — Phases 35-37 (shipped 2026-04-23)
- ✅ **v1.9 release-governance-unification** — Phases 31-34 (shipped 2026-04-22)
- ✅ **v1.8 entry-docs-structure-consolidation** — Phases 28-30 (shipped 2026-04-22)
- ✅ **v1.7 init-and-rule-hardening** — Phases 27, 999.1 (shipped 2026-04-18)

Earlier milestones: see `.planning/MILESTONES.md` and `.planning/milestones/`.

## Phases

<details open>
<summary>🚧 v2.0 agent-native-foundation (Phases 41-48) — IN PROGRESS</summary>

### Phase 41: Interface Contract Schema
**Goal:** Define the CLI surface as a formal machine-readable contract schema and expose runtime metadata.
**Requirements:** AGENT-01, AGENT-02, AGENT-04, AGENT-05
**Success criteria:**
1. Contract schema file exists and validates against a meta-schema
2. At least 3 core command families (`analyze`, `query`, `deps`) are defined in schema
3. `codemap --schema` (or equivalent) outputs the full contract as JSON
4. Schema can generate or validate existing commander configuration

### Phase 42: CLI-as-MCP Automatic Gateway
**Goal:** Auto-expose every schema-defined CLI command as an MCP tool with zero handwritten maintenance.
**Requirements:** AGENT-03, AGENT-06
**Success criteria:**
1. MCP server dynamically registers tools from contract schema, not hardcoded `server.ts`
2. Adding a new command to the schema automatically creates a new MCP tool on restart
3. All existing 20+ CLI commands are accessible via MCP (not just 2 experimental tools)
4. Complex nested types degrade gracefully to simple scalar mappings if schema generation fails

### Phase 43: codemap doctor
**Goal:** Create a living diagnostics command that audits the entire CodeMap ecosystem.
**Requirements:** TRUST-01, TRUST-02, TRUST-03
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
- [ ] Plan 1: Create mycodemap-repo-analyzer skill + enhance AI_ASSISTANT_SETUP.md (not yet planned)

**Design doc:** `docs/plans/2026-04-30-install-guide-and-repo-analyzer-design.md`

**Archive:** `.planning/milestones/v2.0-ROADMAP.md` (will be created at closeout)
**Requirements:** `.planning/REQUIREMENTS.md`
**Phases:** `.planning/phases/` (will be created per phase)

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

- **v2.1 ux-onboarding-enhancement** — First-Run Concierge + Bootstrap Profiles, Zero-Config Preview / Progressive Commitment. Depends on v2.0 doctor and interface contract being stable.
- **v2.2 agent-integration-completion** — Auto-Provisioned Agent Skills, MCP `verify_contract` Tool. Trivial layers on top of v2.0 interface contract schema.
- **v3.0 architecture-intelligence** — Auto-Generate design.md from codebase, Auto-Generate Architecture Remediation Patches, Self-Healing Design Contract (Drift Approval), SQLite + In-Memory Graph Migration. Heavy semantic analysis and storage refactoring; deserves a major version boundary.
- **Continuous** — Path-Scoped Governance, Live Rulebook, Governance Self-Audit. Ongoing docs governance improvements, not gated by any single release.

## Next Options

1. **Discuss Phase 41** — `$gsd-discuss-phase 41` (gather context and clarify approach)
2. **Plan Phase 41** — `$gsd-plan-phase 41` (skip discussion, plan directly)
3. **Review full requirements** — Read `.planning/REQUIREMENTS.md` for detailed acceptance criteria
4. **Adjust milestone scope** — If v2.0 feels too large, use `$gsd-insert-phase` or `$gsd-remove-phase` to rebalance

> **Deferred items mapping:** See `.planning/STATE.md` Deferred Items table for full traceability.
