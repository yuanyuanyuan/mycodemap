# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.8 — entry-docs-structure-consolidation

**Shipped:** 2026-04-22
**Phases:** 3 | **Plans:** 3 | **Sessions:** multiple

### What Was Built

- `AGENTS.md` / `CLAUDE.md` / `.claude/CLAUDE.md` 已稳定拆分为 constitution / router / Claude adapter。
- `Phase 28` 迁移图固定了“旧 section → destination doc”归宿，成为长期 authority baseline。
- live docs、machine-readable indexes 与 docs guardrail comments 已统一成 `CLAUDE.md = 入口路由` 的 terminology。

### What Worked

- 先做 migration map、再做 rewrite、最后做 discoverability sweep 的三段式推进，避免了 rewrite 阶段重新猜 authority split。
- docs-focused 验证（grep + docs guardrail + docs-sync）非常适合治理文档收口类 milestone。
- 把“入口文档只路由、正文只在 live docs”当成硬约束后，改动面明显更可控。

### What Was Inefficient

- `gsd-integration-checker` 在 audit 阶段超时，导致 integration audit 需要手动完成。
- `gsd-sdk query milestone.complete` 当前实现会忽略传入版本并触发 `phasesArchive([])`，无法直接完成归档。
- `roadmap.analyze` 仍把已完成 phase 标成 `roadmap_complete: false`，容易让自治工作流误判完成态。

### Patterns Established

- 治理型 docs milestone 适合采用 `migration map → rewrite → discoverability sweep` 的薄切分。
- machine-readable index（`ai-document-index.yaml`、`llms.txt`）必须与 live docs 一起同步，否则 discoverability truth 会漂移。
- repo-level authority docs 绝不能混入运行时会话 payload。

### Key Lessons

1. 入口文档收敛必须先锁 destination ownership，再开始真正重写。
2. docs guardrail 之外还需要术语扫描，才能捕捉“角色名还对不上”的 discoverability drift。
3. lifecycle 工具链本身也要纳入验证范围；归档 query 的 bug 会直接影响自治 closeout。

### Cost Observations

- Model mix: not captured in durable telemetry for this milestone.
- Sessions: multiple planning/execution/closeout sessions.
- Notable: 绝大多数工作量来自 authority split 与 discoverability consistency，而不是正文规则重写。

---

## Milestone: v1.7 — init-and-rule-hardening

**Shipped:** 2026-04-22
**Phases:** 2 | **Plans:** 11 | **Sessions:** multiple

### What Was Built

- Repo-local rule control now has capability baseline, validator exit-code contract, hooks/CI backstop, scoped rule-context injection, and executable QA.
- `mycodemap init` now reconciles canonical `.mycodemap/config.json`, workspace directories, receipts, first-run guidance, hooks, rules, and manual AI context snippets.
- Packaged CLI smoke proves `mycodemap init --yes` can install config, receipt, hooks, and rules from the npm tarball shape.
- Human and AI docs now describe `.mycodemap/config.json`, `.mycodemap/status/init-last.json`, `.mycodemap/hooks/`, and `.mycodemap/rules/` as the canonical init contract.

### What Worked

- Keeping rule-control and init convergence as concrete executable contracts made validation evidence stronger than documentation-only claims.
- Tarball smoke caught package-shape risks that source-checkout tests would miss.
- Focused test selection kept feedback fast while still covering changed init, docs, and GSD lookup behavior.

### What Was Inefficient

- Root planning truth drifted: `STATE.md`, `ROADMAP.md`, and `REQUIREMENTS.md` did not all describe the same current milestone before close.
- Phase 999.1 validation remained draft after execution and had to be reconciled during milestone close.
- Full `check:all` was blocked earlier by GSD tool-location assumptions, so focused tests and package smoke carried the final confidence.

### Patterns Established

- Init assets use an asset-level receipt model: missing / installed / migrated / already-synced / conflict / manual-action-needed / skipped.
- Packaged hooks live under `scripts/hooks/templates/` so npm tarball installs can initialize target projects without relying on source-only `.githooks/`.
- AI context integration stays manual and auditable through generated snippets rather than automatic edits to team-owned files.

### Key Lessons

1. Milestone close should start with a forensic planning-truth check whenever root `STATE.md` and roadmap analysis disagree.
2. Package smoke is mandatory for CLI commands that copy bundled assets into another repository.
3. Validation artifacts must be updated at execution close, not deferred to milestone archival.

### Cost Observations

- Model mix: not captured in durable telemetry for this milestone.
- Sessions: multiple implementation and closeout sessions.
- Notable: Context stayed manageable once large phase execution history was summarized into archives.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.7 | multiple | 2 | Moved from docs-only guardrails to executable rule/init contracts with package smoke |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.7 | 60 focused tests + prior Phase 27 QA | focused changed-surface coverage | no new runtime package dependency required by closeout |

### Top Lessons (Verified Across Milestones)

1. Machine-readable CLI truth must move together with README, AI guide, and guardrail checks.
2. Planning archives are only trustworthy when `STATE.md`, `ROADMAP.md`, requirements, and phase summaries are reconciled at close.
