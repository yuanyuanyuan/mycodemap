# CodeMap

## What This Is

CodeMap 仍是一个面向 AI / Agent 的代码地图工具。`v1.4` 已把 `design validate → design map → design handoff → design verify` 收口为正式 public collaboration chain；`v1.6` 把 Agent-facing CLI 的机器契约真相继续收口；`post-v1.6` 补齐了 opt-in symbol-level graph 与 experimental local MCP 的最小可信纵向切片；`v1.7` 则把 repo-local rule control 与 `mycodemap init` 项目级 AI 基础设施收敛成可验证 contract。

2026-04-18 起，规划边界已经调整：**Docker / ArcadeDB 原型线不再属于当前版本范围**。此前 `v1.5` 的 22-24 phase 保留为历史工件，但不会继续作为 active work。当前 active milestone 为空，下一步必须用 fresh requirements 重新定 scope。

## Core Value

为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## Latest Completed Milestone: v1.7 init-and-rule-hardening

**Goal:** Close repo-local rule-control hardening and make `mycodemap init` a project-level AI infrastructure state reconciler.

**Delivered outcome:**
- Phase 27 shipped repo-local capability baseline, validator contract, hooks/CI backstop, scoped rule-context injection, and executable QA.
- Phase 999.1 shipped canonical `.mycodemap/config.json`, reconciliation preview, machine-readable receipt, hook/rule packaging, manual AI context snippets, docs guardrails, and tarball smoke evidence.
- Open artifacts were acknowledged at close and recorded as deferred rather than hidden.

## Historical Closed Branch: v1.5 Isolated ArcadeDB Server-backed Prototype

**Status:** Closed on 2026-04-18 by user direction

**Closure rule:**
- 不需要 Docker
- 不需要 ArcadeDB
- `Phase 22-24` 不再继续处理
- 如未来真的要重开类似方向，必须以全新 milestone 重新定 scope，而不是恢复旧 blocker

## Requirements

### Validated

- ✓ 代码库已经能生成代码地图和结构化分析结果 —— existing
- ✓ 代码库已经提供 `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` / `export` / `ci` 等核心分析能力 —— existing
- ✓ `analyze` 公共契约已收口为 `find` / `read` / `link` / `show` 四意图 —— v1.0 / Phase 3
- ✓ `workflow` CLI help 与运行时实现当前是 analysis-only 四阶段，不再把 `commit` / `ci` 当作真实 phase —— v1.0 / runtime validated
- ✓ 插件系统已经拥有正式配置入口、runtime 接入与 `pluginReport` diagnostics —— v1.1 / Phases 07-09
- ✓ graph storage 正式产品面已收敛为 `filesystem` / `memory` / `kuzudb` / `auto`，历史 `neo4j` 配置走显式迁移诊断 —— v1.2-v1.3
- ✓ docs sync 自动检查已进入 CI / must-pass 路径 —— v1.3 / Phase 16
- ✓ 人类可通过受文档约束的 design contract 定义 feature goal、constraints、acceptance criteria 与 explicit exclusions —— v1.4 / Phase 17
- ✓ CodeMap 可把 design contract 与代码图对齐，输出 candidate files/modules、dependencies、test impact、risk 与 unknowns —— v1.4 / Phase 18
- ✓ 系统可生成同时面向人类审核和机器消费的 handoff package，并保留 assumptions / approvals / open questions —— v1.4 / Phase 19
- ✓ design / workflow / docs drift 可被 guardrail 明确检出，且 `design verify` 已把 acceptance criteria 映射为 checklist / drift report —— v1.4 / Phase 20
- ✓ `analyze find` 现在能在 stdout 中区分 success / `partialFailure` / failure truth，而不是静默返回可信空结果 —— v1.6 / Phase 25
- ✓ 相邻 dogfood CLI 契约（`complexity` / `ci assess-risk` / `workflow start`）与 AI docs truth 已同步收口 —— v1.6 / Phase 25
- ✓ `generate --symbol-level` 现在能持久化 symbol-level graph truth，并在退化场景保留 `partial` / failure metadata —— post-v1.6 / Phase 26
- ✓ experimental local MCP 已能基于 symbol graph 暴露 `codemap_query` / `codemap_impact`，同时保持 `stdout` protocol purity —— post-v1.6 / Phase 26
- ✓ repo-local rule control 已具备 capability baseline、validator exit contract、hooks/CI backstop、scoped rule-context 与 executable QA —— v1.7 / Phase 27
- ✓ `mycodemap init` 已升级为项目级 AI 基础设施状态收敛器，覆盖 `.mycodemap/config.json`、receipt、hooks、rules、docs 与 package smoke —— v1.7 / Phase 999.1

### Active

- (none — next milestone not selected yet)

### Out of Scope

- 恢复 `Phase 22-24` 作为当前版本待办
- 重新引入 Docker / ArcadeDB 作为默认下一步
- 把 `rtk` 扩写成 CodeMap 产品能力
- 借 Phase 25 顺手把所有 CLI 命令一次性统一成单一旗标 / schema 体系

## Context

- `Phase 25` 源于 2026-04-17 eatdogfood 报告，是一条独立于 ArcadeDB 原型线的新版本收口工作
- 2026-04-18 用户明确决定：旧版本遗漏不再继续，因此 active planning 不能再把 22-24 当 blocker
- `Phase 26` 作为 `post-v1.6` follow-up，验证了 symbol-level graph / partial truth / experimental MCP 的首期链路
- `Phase 27` 进一步把 repo-local rule-control contract、hooks / CI backstop 与 subagent rule injection 收口成可重复验证的工程事实
- `Phase 999.1` 把 `mycodemap init` 从根目录配置文件创建器升级为 `.mycodemap/` 工作区、receipt、hooks、rules 与 package smoke 的状态收敛器
- 当前 README / AI docs / rules / workflow truth 仍围绕 design chain、analysis-first CLI、local-first storage surface 与 `.mycodemap/` init contract 收口

## Constraints

- **Machine Truth First**: 只要 CLI 命令会被 Agent 消费，stdout 必须表达可机读真相
- **Docs Truth**: 输出契约变化必须同步 AI docs 与 guardrail
- **Scope Integrity**: 已关闭的历史分支不能被自动当成当前版本待办
- **Wrapper Boundary**: `rtk` 只是执行包装层，不属于 CodeMap 产品面

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `v1.4` 以 `Phase 17 → 18 → 19 → 20` 完成并归档 | 设计链主线已经闭环，不应继续停留在 active planning surface | Shipped 2026-03-26 |
| `Phase 21` 以 direct replacement `NO-GO` 收尾 | 避免把错误的 storage 假设包装成实现前提 | Archived 2026-03-28 |
| `v1.5` Docker / ArcadeDB 原型线关闭 | 用户明确表示不再继续该方向，也不需要补旧遗漏 | Closed 2026-04-18 |
| `Phase 25` 起算为 `v1.6` | 该 phase 属于新的 CLI reliability / docs truth 版本线，而不是旧原型线尾巴 | Completed 2026-04-18 |
| `Phase 26` 作为 `post-v1.6` 薄切片完成 | 该 phase 验证的是 symbol graph / MCP 分发层最小价值，不应回写成 `v1.5` continuation | Completed 2026-04-19 |
| `Phase 27` 作为 repo-local rule-control hardening 完成 | 该 phase 把规则系统从文档假设推进到 capability、validator、hooks/CI、workflow injection、QA 一体化可验证 contract | Completed 2026-04-19 |
| `v1.7` closed Phase 27 + Phase 999.1 | 把 repo-local rule-control contract 与 `mycodemap init` 项目基础设施收敛合并为一个已归档里程碑 | Shipped 2026-04-22 |

## Current State

- **Completed milestones / follow-ups:** `v1.0`、`v1.1`、`v1.2`、`v1.3`、`v1.4`、`post-v1.4`、`v1.6`、`post-v1.6`、`v1.7 init-and-rule-hardening`
- **Historical closed branch:** `v1.5 Isolated ArcadeDB Server-backed Prototype`（22-24 不再继续）
- **Active milestone:** none selected yet（next milestone should start from fresh requirements）
- **Current planning status:** `v1.7` archived; Phase 27 and Phase 999.1 are complete; do not backfill old `Phase 22-24`
- **Known remaining debt:** 2 deferred open artifacts are recorded in `STATE.md`; repo-wide ESLint warnings remain warning-only historical baseline; rule-context routing and docs guardrail trigger coverage remain advisory expansion opportunities

## Next Milestone Candidates

- Freshly scope the next product milestone with `$gsd-new-milestone /data/codemap`.
- Decide whether the deferred install-runtime debug session needs release-side verification.
- Keep dormant ArcadeDB server-backed prototype seed out of active work unless a future milestone explicitly selects it.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition**:
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone**:
1. 审查 `What This Is` / `Core Value` 是否仍准确
2. 将已交付 requirement 移入 Validated
3. 将下一轮候选目标移入 Active 或 Out of Scope
4. 更新 Current State / Context / Key Decisions

---
*Last updated: 2026-04-22 after archiving v1.7 init-and-rule-hardening milestone*
