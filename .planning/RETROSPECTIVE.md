# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

> Archive identity note: milestone sections below are retrospective snapshots of shipped work.
> They are a lessons archive, **not** the current active planning surface; current truth lives in `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`.

## Milestone: v1.11 — release-followup-hardening

**Shipped:** 2026-04-29
**Phases:** 3 | **Plans:** 3 | **Sessions:** multiple

### What Was Built

- Codex repo-local release adapter (`SKILL.md`) that routes back to existing release authority instead of creating a competing path.
- Standalone `publish-status` CLI command for snapshot-only, read-only publish workflow follow-up.
- Three-layer readiness gate (`hard` / `warn-only` / `fallback`) replacing the old two-layer mustPass/shouldPass model.
- Standalone `readiness-gate` CLI command that exposes the gate system for independent use.

### What Worked

- Shipping release follow-ups as thin adapters (Codex skill, publish-status, readiness-gate) rather than rebuilding the release pipeline kept the authority chain intact.
- Reusing existing `ship/rules/quality-rules.ts` as the gate core engine minimized duplication.
- The `fallback` state cleanly separates "signal unavailable" from "check failed," preventing silent auto-passes when data is missing.

### What Was Inefficient

- `gsd-sdk query` surfaces remain unavailable in the current runtime, forcing manual emulation of workflow steps (init, audit, complete, cleanup).
- Phase 40 involved cross-cutting changes to `ship` internals (rules, checker, pipeline) that required careful type migration across multiple files.
- The `fallback` concept is powerful but needs explicit user education — it is neither pass nor fail.

### Patterns Established

- Release wrappers must route back to a single authority document; they must not become second-handbooks.
- Follow-up observability commands should be read-only and fail conservatively (`unavailable` / `ambiguous`) rather than guessing.
- Gate semantics should be explicit in code (`gateMode`) rather than implicit (`blocking: boolean`).

### Key Lessons

1. A thin runtime adapter is often better than a thick wrapper — authority preservation beats feature completeness.
2. When signals are unavailable, halt automation rather than defaulting to pass or fail.
3. Refactoring internal rule models to match external docs prevents semantic drift between "what the code does" and "what the docs say."

### Cost Observations

- Model mix: not captured in durable telemetry for this milestone.
- Sessions: multiple planning/execution/closeout steps across multiple days.
- Notable: most work was boundary hardening and contract clarification, not new product capability.

---

## Milestone: v1.10 — governance-debt-cleanup

**Shipped:** 2026-04-23
**Phases:** 3 | **Plans:** 3 | **Sessions:** multiple

### What Was Built

- Existing docs guardrails now detect entry-doc governance drift instead of waiting for future milestone audits to rediscover it.
- README, AI guide, validation rule, and engineering rule now share one validation quick-truth baseline.
- Planning surfaces now explicitly separate current truth from archived milestone snapshots.

### What Worked

- Fixing governance debt in the same order it appears to maintainers—entry docs → validation truth → archive identity—kept the scope sharp.
- Reusing `docs:check` / `ci check-docs-sync` avoided creating a second governance system just to police the first one.
- Adding explicit archive notes to the most-likely-opened snapshots solved identity confusion without rewriting the whole planning archive.

### What Was Inefficient

- `MILESTONES.md` historical `What's next` text is useful context but easily misread without explicit identity notes.
- Snippet-based docs guardrails remain effective but still require judgment about false-positive noise as the repository grows.
- Lifecycle automation still depends on manual closeout shaping because GSD query surfaces remain partially unreliable for milestone metadata.

### Patterns Established

- Governance hardening should land in the existing enforcement surface before adding more prose.
- Shared quick-truth sentences are a cheap and effective way to keep multiple live docs aligned.
- Archive directories need explicit identity labels whenever they coexist next to active planning files.

### Key Lessons

1. If a governance rule matters, put it behind an existing guardrail instead of trusting future audits.
2. Validation drift is easier to prevent with shared sentence-level truth than with “roughly equivalent” summaries.
3. Archive identity issues should be fixed at the navigation layer first, not by rewriting every historical artifact.

### Cost Observations

- Model mix: not captured in durable telemetry for this milestone.
- Sessions: multiple planning/execution/closeout steps in one milestone day.
- Notable: most work was boundary clarification, not new product capability.

---

## Milestone: v1.9 — release-governance-unification

**Shipped:** 2026-04-23
**Phases:** 4 | **Plans:** 4 | **Sessions:** multiple

### What Was Built

- `/release` now has an authoritative rules contract tying milestone closeout, npm version mapping, refusal cases, and two explicit confirmation gates together.
- `.claude/skills/release/SKILL.md` now acts as a thin release orchestrator that delegates to GSD closeout, `scripts/release.sh`, and GitHub Actions instead of rebuilding release logic.
- Release docs, pre-release checks, routing docs, and dry-run rehearsals now agree that `/release` is the only recommended release entry.

### What Worked

- Treating release as governance first avoided accidental npm / git side effects while still making the release path reviewable.
- The Phase 34 audit gap closure caught and removed helper-first checklist drift before milestone closeout.
- Keeping real publish out of scope made the L3 boundary explicit and testable.

### What Was Inefficient

- Historical Phase 31-33 Nyquist validation files were missing, so the final audit had to preserve that as non-blocking technical debt.
- The closeout workflow still needs manual care because its full path includes commit / tag behavior that must not be autonomous in this environment.
- Existing open debug artifacts still require an explicit acknowledge-or-resolve decision at milestone close.

### Patterns Established

- Release workflows should be documented as authority chains, not as multiple equivalent command snippets.
- A helper script may exist, but docs must describe it as post-gate mechanical execution rather than a primary human entry point.
- Milestone closeout and npm release can be bound 1:1 while still deferring the actual publish to a later explicit confirmation flow.

### Key Lessons

1. Audit should search for competing recommended paths, not just missing docs or failed checks.
2. L3 release workflows need two separate boundaries: planning closeout and publish-triggering git/npm actions.
3. Closeout can safely prepare archives without committing or tagging, but the final git boundary still needs explicit human authorization.

### Cost Observations

- Model mix: not captured in durable telemetry for this milestone.
- Sessions: multiple planning/execution/audit/closeout sessions.
- Notable: Most rework came from authority drift cleanup, not from implementing new release mechanics.

---

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
| v1.8 | multiple | 3 | Governance docs use migration-map-first, rewrite-second, discoverability-sweep-third pattern |
| v1.9 | multiple | 4 | Release governance uses authority-chain docs, thin orchestration, and explicit L3 confirmation gates |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.7 | 60 focused tests + prior Phase 27 QA | focused changed-surface coverage | no new runtime package dependency required by closeout |
| v1.8 | docs guardrail + grep-based terminology scan | docs governance surface | no new runtime or build dependency |
| v1.9 | docs guardrails + pre-release guardrail + docs-sync + audit | release governance surface | no new runtime or build dependency |

### Top Lessons (Verified Across Milestones)

1. Machine-readable CLI truth must move together with README, AI guide, and guardrail checks.
2. Planning archives are only trustworthy when `STATE.md`, `ROADMAP.md`, requirements, and phase summaries are reconciled at close.
3. Entry-doc authority split must lock destination ownership before any rewrite begins.
4. Lifecycle tooling bugs (milestone.complete query) are themselves blockers for autonomous closeout.
5. Release governance must prevent competing “recommended” paths, not only document the intended happy path.
