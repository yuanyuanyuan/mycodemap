---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: milestone
current_phase: 55
current_phase_name: Agent Bootstrap Assets
current_plan: —
status: phase_complete
last_updated: "2026-05-02T16:30:00.000Z"
last_activity: 2026-05-02
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 7
  completed_plans: 5
  percent: 50
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-30)

**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Current Focus:** v2.1 ux-onboarding-enhancement — Phase 55 complete, ready for Phase 56.

## Position

**Milestone:** v2.1 — ux-onboarding-enhancement
**Current Phase:** 55
**Current Phase Name:** Agent Bootstrap Assets
**Current Plan:** —
**Total Phases:** 6 scoped (53-58)
**Total Plans in Milestone:** 7 planned (5 complete)
**Status:** Phase 55 complete — manifest extractors + env-contract seed + assistant bootstrap assets verified
**Progress:** [█████░░░░░] 50% phase completion (3/6); Phase 53-55 complete
**Last Activity:** 2026-05-02
**Last Activity Description:** Phase 55 executed — 2 plans in 1 wave, 28 tests pass, 1204 total suite pass. Created manifest-extractors.ts, env-contract-plan.ts, assistant-plan.ts with full test coverage.

## Decisions Made

| Date | Summary | Rationale |
|------|---------|-----------|
| 2026-04-30 | `v2.0 agent-native-foundation` started | User directive: consolidate unimplemented ideation features into v2.0 milestone |
| 2026-04-30 | v2.0 scope filtered to 7 phases | 19 raw ideas from 4 ideation docs are too many for one milestone; selected by highest confidence × leverage |
| 2026-04-30 | Phase numbering continues from 40 | No `--reset-phase-numbers` requested; v2.0 uses Phase 41-47 |
| 2026-04-30 | Auto-Generate design.md / Remediation / Self-Healing deferred | Requires semantic analysis beyond import graphs; fits v2.1+ "Architecture Intelligence" milestone |
| 2026-04-30 | SQLite-only storage migration deferred | KùzuDB still functional; better-sqlite3 already in package.json; full migration deserves standalone milestone |
| 2026-04-30 | First-Run Concierge / Zero-Config Preview deferred | UX enhancements depend on doctor and interface contract being in place first |
| 2026-04-30 | Auto-Provisioned Agent Skills deferred | Trivial once interface contract exists; thin layer on top of schema-driven generation |
| 2026-04-30 | Path-Scoped Governance / Live Rulebook / Governance Self-Audit deferred | Docs governance deepens continuously; not blocked by v2.0 shipping |

## Blockers

- No active blockers.

## Deferred Items (from previous milestones, still valid)

| Category | Item | Status |
|----------|------|--------|
| debug | mycodemap-install-runtime-deps | awaiting_human_verify |
| release | actual npm/GitHub release for v1.9.0 | out_of_scope_until_explicit_release_command |

## Deferred Items (new for v2.0, assigned to future milestones)

| Category | Item | Target Milestone |
|----------|------|------------------|
| ux | First-Run Concierge + Bootstrap Profiles | v2.1 ux-onboarding-enhancement |
| ux | Zero-Config Preview / Progressive Commitment | v2.1 ux-onboarding-enhancement |
| ux | F-1: Phase 53 legacy-config receipt cosmetic message gap (functional D-16 honored; receipt detail "未检测到项目类型标记" misleading) | v2.1 cleanup follow-up |
| agent-integration | Auto-Provisioned Agent Skills | v2.2 agent-integration-completion |
| agent-integration | MCP `verify_contract` Tool | v2.2 agent-integration-completion |
| architecture-intelligence | Auto-Generate design.md from codebase | v3.0 architecture-intelligence |
| architecture-intelligence | Auto-Generate Architecture Remediation Patches | v3.0 architecture-intelligence |
| architecture-intelligence | Self-Healing Design Contract (Drift Approval) | v3.0 architecture-intelligence |
| storage | SQLite + In-Memory Graph Migration (complete Kùzu removal) | v3.0 architecture-intelligence |
| governance | Path-Scoped Governance (`.claude/rules/` with `paths:`) | Continuous / v2.3+ |
| governance | Live Rulebook + Archive Demotion automation | Continuous / v2.3+ |
| governance | Governance Self-Audit + Generated Shared Tables | Continuous / v2.3+ |

## Accumulated Context

### Roadmap Evolution

- 2026-04-29: `v1.11` closed as planning milestone; Phase 38-40 archived to `.planning/milestones/v1.11-phases/`
- 2026-04-30: `v2.0 agent-native-foundation` initialized from ideation artifacts; Phase 41-47 scoped
- 2026-04-30: Phase 48 added: AI CLI Install Guide + repo-analyzer Skill
- 2026-04-30: Phase 41 completed — Interface Contract Schema (`src/cli/interface-contract/`, 16 tests)
- 2026-04-30: Phase 42 completed — CLI-as-MCP Automatic Gateway (`src/server/mcp/schema-adapter.ts`, 36 tests)
- 2026-05-01: Phase 41/42 planning artifacts backfilled — STATE.md, REQUIREMENTS.md, ROADMAP.md synchronized
- 2026-05-01: Phase 50 added: Release Local Pre-Release Check Gap — promote the v2.0 release validation gap into the active follow-up queue
- 2026-05-01: Phase 50 context gathered — locked scope around local/CI pre-release validation parity without running real release operations
- 2026-05-01: Phase 51 added: Post-Install Agent Bootstrap Configuration — keep `mycodemap init` post-install bootstrap separate from runtime compliance enforcement
- 2026-05-01: Phase 51 context gathered — locked scope around init-managed config, hooks, rules, agent snippets, receipt visibility, and real temp-project verification
- 2026-05-01: Phase 52 added: CodeMap CLI Priority Harness Guard — split runtime/session CLI-first compliance guard out from init bootstrap so the two can be planned independently
- 2026-05-01: Phase 52 context gathered — locked scope around report-only session compliance detection, fallback cases, and Claude/Codex auditability
- 2026-05-01: Phase 53 context gathered — locked scope around marker-only project type detection (D-01..D-04), built-in JSON profiles with strict schema validation (D-05..D-08), preview-default + accept/skip-only interaction (D-09..D-13), and `mycodemap init`-embedded single entry point (D-14..D-17)
- 2026-05-01: Phase 53 planned — 3 plans in 2 waves: 53-01 (core detection + profile infrastructure), 53-02 (profile plan integration into init), 53-03 (tests + first-run guide). Research completed with zod validation, readline prompting, and RulesPlan/HookPlan pattern reuse. Verification passed with 2 documentation blockers resolved (VALIDATION.md created, RESEARCH.md open questions resolved, ROADMAP.md success criteria aligned with D-11).
- 2026-05-02: Phase 58 added: Subagent Environment Contract Injection — make delegated-agent prompts carry RTK, commit-format, Vitest-entry, and rule-context contract up front; require real Claude/Codex sub-agent verification evidence.
- 2026-05-02: Phase 53 closed — verifier PASS verdict (4/4 success criteria, D-01..D-17 all verified). Closure path: BLOCKER B-1 (commander --profile) + F-2 (dist profile JSONs) fixed in 1866672; binary-level smoke test added in 0e2a95a; F-1 (cosmetic legacy-config receipt message) deferred to v2.1 cleanup follow-up.
- 2026-05-02: Phase 54 context gathered — Zero-Config Preview. preview is a lightweight wrapper over generate, using Phase 53 detection + profile as fallback config. Output: JSON default + --human/TTY, escomplex top-5 hotspots, direct deps from marker files. --save writes config + runs generate. No --discard. End-of-output hint text.
- 2026-05-02: Phase 55 completed — Agent Bootstrap Assets. 2 plans in 1 wave, parallel execution. Created manifest-extractors.ts (reads package.json/pyproject.toml/go.mod/Cargo.toml), env-contract-plan.ts (EnvContractSeed as InitAsset with installed/preview/already-synced/conflict states), assistant-plan.ts (4 per-runtime files: claude-context.md, agents-context.md, claude-hook-example.json, codex-agent-example.toml). 28 tests pass, full suite 1204 pass. All D-05..D-12 decisions honored. Requirements ABT-01, ABT-02, ABT-05 verified.

### Verified Existing Capabilities (carried forward)

- `design validate → design map → design handoff → design verify` 已作为正式协作链路 shipped
- `Phase 25` 已收口 `analyze find` diagnostics truth、相邻 CLI JSON status contract
- `Phase 26` 已收口 opt-in symbol-level generate、partial graph truth 与 experimental local MCP query / impact
- `Phase 27` 已收口 repo-local rule control、hooks / CI backstop、scoped rule-context
- `Phase 999.1` 已收口 canonical `.mycodemap/config.json`、receipt-led init reconciler
- `v1.8` 已收敛入口文档为 constitution / router / adapter
- `v1.9` 已统一 `/release` 发布治理流程与 milestone ↔ npm release 绑定
- `v1.10` 已补齐 governance drift detection、validation truth 与 archive/live identity
- `v1.11` 已为 Codex 补齐 release entry、publish-status follow-up、readiness-gate 三层语义
- **Current gaps:** `--json` is bolt-on and inconsistent; native dep install is #1 drop-off; ghost commands erode trust; errors are dead ends not state transitions

### Risks To Watch

- Interface Contract schema design must not over-engineer; start with 3-4 core commands and expand
- MCP Gateway must handle complex nested types gracefully; fallback to simple scalar types if schema generation fails
- AI-First Default is a breaking change; preserve TTY auto-detection so interactive users see no difference
- WASM-first must not regress performance for large repos without native opt-in path
- doctor must not become a dumping ground; categorize diagnostics (install / config / runtime / agent)
- Do not let v2.0 scope creep back into storage migration or deep semantic analysis
- Release operations remain L3: do not run `npm version`, create tags, or push without explicit `/release v{X.Y}`

---
*State initialized: 2026-04-30 for Milestone v2.0*

- Phase 40.1 added: Real-World Validation Guardrails — 添加真实场景验证规则到测试规范、发布检查清单、AGENTS.md、CLAUDE.md 和 CI 护栏
- Phase 40.1 context gathered (2026-04-30): 硬约束+CI护栏双保险、启发式grep pre-commit + [证据]标签CI、分层豁免41/42、元信息层文档增强
