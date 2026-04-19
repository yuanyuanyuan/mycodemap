# CodeMap

## What This Is

CodeMap 仍是一个面向 AI / Agent 的代码地图工具。`v1.4` 已把 `design validate → design map → design handoff → design verify` 收口为正式 public collaboration chain；`Phase 25` 把 Agent-facing CLI 的机器契约真相继续收口；`post-v1.6 / Phase 26` 补齐了 opt-in symbol-level graph 与 experimental local MCP 的最小可信纵向切片；`Phase 27` 则把 repo-local rule control、hooks/CI backstop、scoped rule injection 与 executable QA 收口成可验证 contract。

2026-04-18 起，规划边界已经调整：**Docker / ArcadeDB 原型线不再属于当前版本范围**。此前 `v1.5` 的 22-24 phase 保留为历史工件，但不会继续作为 active work。`v1.6`、`post-v1.6` 与 `Phase 27` 已完成，当前没有 active milestone。

## Core Value

为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## Latest Completed Follow-up: Phase 27 repo-local rule control and hooks/CI QA hardening

**Goal:** 以主计划和 QA checklist 为准，把 repo-local rule control system 的 capability baseline、validator contract、hooks / CI backstop、scoped subagent rule injection 与 executable QA 收口为下一阶段可复用真相。

**Delivered outcome:**
- `scripts/capability-report.py` 提供 required / optional / strategy capability baseline 与 `duration_ms` 基线
- `scripts/validate-rules.py` 固定 `report-only` 与 `0/1/2/3/4` gate exit-code contract
- `.githooks/pre-commit`、`.githooks/commit-msg` 与 `.github/workflows/ci-gateway.yml` 围绕统一 validator truth 协同工作，并保留 `--no-verify` 的 CI backstop
- `scripts/rule-context.mjs`、`.claude/hooks/rule-route-advisory.js` 与 Claude/Codex workflow 的 `<rule_context>` 注入把规则路由从“希望 AI 记得”收口成可执行机制
- `scripts/qa-rule-control.sh` 与回归测试让 Phase 27 的关键路径可以重复验证，而不是停留在文档声明

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
- ✓ repo-local rule control 已具备 capability baseline、validator exit contract、hooks/CI backstop、scoped rule-context 与 executable QA —— Phase 27

### Active

- 当前没有 active milestone requirement；`Phase 27` 已完成，下一步需重新定 scope

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
- 当前 README / AI docs / rules / workflow truth 仍围绕 design chain、analysis-first CLI 与 local-first storage surface 收口

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

## Current State

- **Completed milestones / follow-ups:** `v1.0`、`v1.1`、`v1.2`、`v1.3`、`v1.4`、`post-v1.4`、`v1.6`、`post-v1.6`、`phase-27 rule-control hardening`
- **Historical closed branch:** `v1.5 Isolated ArcadeDB Server-backed Prototype`（22-24 不再继续）
- **Active milestone:** none
- **Current planning status:** `Phase 27` complete；等待新的 scope，而不是回补旧版本
- **Known remaining debt:** repo-wide ESLint warnings 仍是 warning-only 历史基线；rule-context 路由覆盖与 docs guardrail 触发范围仍有 advisory 级缝隙；未来若再改 CLI / MCP / rule-control 契约，仍需保持 docs / tests / machine output 同步

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
*Last updated: 2026-04-19 after completing and verifying Phase 27 rule-control hardening*
