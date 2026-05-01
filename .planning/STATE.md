---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: agent-native-foundation
current_phase: 47 — executing
current_phase_name: wasm-first-build-foundation
current_plan: —
status: executing
last_updated: "2026-05-01T03:34:14.069Z"
last_activity: 2026-05-01
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 7
  completed_plans: 7
  percent: 78
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-30)

**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Current Focus:** Milestone v2.0 — agent-native-foundation. Define interface contract, close MCP gap, fix trust crisis, eliminate install friction.

## Position

**Milestone:** v2.0 — agent-native-foundation
**Current Phase:** 47 — executing
**Current Phase Name:** wasm-first-build-foundation
**Current Plan:** —
**Total Phases:** 8 planned
**Total Plans in Milestone:** 6
**Status:** Executing plans
**Progress:** [███████░░░] 75%
**Last Activity:** 2026-05-01
**Last Activity Description:** Phase 46 (Validation Router + No Ghost Commands) completed. Removed echo stubs, synced docs, added npm script guardrail, added validation decision tree to CLAUDE.md.

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

- No active blocker at milestone start.
- Phase 41 awaits `$gsd-discuss-phase 41` or `$gsd-plan-phase 41`.

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
- **Current gaps:** CLI surface is hand-maintained dual track (CLI + MCP); `--json` is bolt-on and inconsistent; native dep install is #1 drop-off; ghost commands erode trust; errors are dead ends not state transitions

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
