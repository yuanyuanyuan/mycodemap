# CodeMap

## What This Is

CodeMap 仍是一个面向 AI / Agent 的代码地图工具。`v1.4` 已把 `design validate → design map → design handoff → design verify` 收口为正式 public collaboration chain；`post-v1.4` follow-up 又进一步证伪了“ArcadeDB 可以直接作为当前 local-first storage surface 替代品”这个薄弱前提。当前 active planning 已切到 `v1.5`，但只允许验证一个 isolated server-backed prototype，而不是把 remote backend 偷渡进 shipped runtime。

仓库仍是 brownfield：legacy CLI / workflow / analyzer 管线与 MVP3 分层架构并存。因此任何 ArcadeDB 后续都必须优先保护已 shipped 的 public contract、docs truth 与 storage 边界；如果真实 server smoke、auth/TLS 或 setup friction 站不住脚，就应该尽早停在 prototype，而不是继续扩大 blast radius。

## Core Value

为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## Latest Shipped Milestone: v1.4 设计契约与 Agent Handoff

**Goal:** 把 CodeMap 从“AI-first 代码分析工具”推进到“人类设计 → AI 执行”的桥接基础设施，但不把产品扩成通用项目管理器、自动执行器或公共 HTTP 平台。

**Delivered outcome:**
- 人类可以通过 design contract 明确定义目标、约束、验收标准与 non-goals
- CodeMap 可以输出 candidate scope、dependencies、risk、unknowns、tests，并生成 human/json handoff
- `design verify` 已把 acceptance criteria 映射为 checklist / drift report，full-chain ready/blocker evidence 已闭环
- README、AI docs、rules、guardrail tests 与 workflow truth 已同步收口

## Latest Completed Follow-up: post-v1.4 ArcadeDB Node feasibility follow-up

**Goal:** 在不污染当前 storage public surface 与已交付 design chain 的前提下，先验证 ArcadeDB 官方 Node 支持面、实验路径、blast radius 与 Go/No-Go。

**Delivered outcome:**
- 已明确 ArcadeDB 在 Node.js 下“官方支持什么 / 不支持什么”，并排除 embedded 作为当前 repo 的 Node runtime 路径
- 已交付不污染现有 public storage surface 的最小实验路径，而不是直接承诺 backend 实现
- 已量化若推进为正式 backend 需要改动的配置、CLI、schema、docs 与 fallback blast radius
- 已输出可复核的 validation / benchmark strategy 与 Go/No-Go 建议，主结论为 direct replacement `NO-GO`

## Current Milestone: v1.5 Isolated ArcadeDB Server-backed Prototype

**Goal:** 验证一个不进入 shipped runtime 的 isolated ArcadeDB server-backed prototype 能否完成真实 live smoke，并在不改写当前 storage public surface 的前提下收集 `handshake latency`、`query latency`、`setup complexity` 与 approval evidence。

**Target features:**
- 基于真实 ArcadeDB server 的 isolated live smoke gate
- 成功 smoke 后的 `handshake latency` / `query latency` / `setup complexity` evidence pack
- `remote config` / `auth` / `TLS` / `lifecycle` / `docs` blast radius 的显式审批输入
- evidence-backed `continue / pause / close` 决策包，而不是含糊的“理论可行”

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
- ✓ 已基于官方支持面完成 ArcadeDB Node feasibility、blast radius 与 Go/No-Go 决策，并锁定 direct replacement `NO-GO` / isolated follow-up `CONDITIONAL` —— post-v1.4 / Phase 21

### Active

- [ ] 真实 ArcadeDB server live smoke 必须在 isolated harness / prototype seam 下跑通，并记录 env / auth / TLS 前置条件 —— v1.5 / Phase 22
- [ ] latency 证据只能在 live smoke 成功后记录，最少包含 `handshake latency`、`query latency`、`setup complexity` —— v1.5 / Phase 23
- [ ] prototype 只能存在于 isolated experiment surface，不得提前改 `storage.type`、公开 schema 或 shipped runtime contract —— v1.5 / Phase 23
- [ ] `remote config` / `auth` / `TLS` / `lifecycle` / `docs` blast radius 必须先量化并显式审批，不能被包装成 adapter 细节 —— v1.5 / Phase 23
- [ ] milestone 必须以 evidence-backed `continue / pause / close` 决策收尾，而不是留下“理论上可行”的模糊结论 —— v1.5 / Phase 24

### Out of Scope

- 把 `storage.type = arcadedb` 重新打开为 shipped 任务 —— direct replacement 已被 `post-v1.4` `NO-GO` 否定
- 在没有真实 live smoke 的前提下给出 benchmark / performance claims —— 会把占位数字伪装成证据
- 将 isolated experiment script 演变为 shipped runtime integration —— 会提前污染当前 storage public surface
- 为 prototype 顺手公开 `mycodemap server` / HTTP API 产品面 —— 与当前 milestone 的价值验证不等价
- 借 prototype 修改 `workflow` 已收口的 analysis-only 语义 —— 会把 backend 试验偷渡成 workflow 扩张

## Context

- `SEED-001` 已记录未来 isolated prototype 的触发条件；用户现已批准按该方向正式开新 milestone，而不是继续维持“无 active milestone”状态
- `Phase 21` 只留下一个条件性继续路径：isolated server-backed prototype；它没有为 `storage.type = arcadedb` 提供任何 shipped 级背书
- 当前 README / AI_GUIDE / rules / workflow truth 仍围绕 design chain 与 local-first storage surface 收口；新 milestone 不能反向破坏这些既有边界
- `scripts/experiments/arcadedb-http-smoke.mjs` 已提供 isolated smoke seam，但尚未对真实 ArcadeDB server 成功执行 live smoke
- `Phase 22` 必须失败优先：若没有可达 server、凭证、TLS/auth 前提或 setup 成本过高，应尽早停止，而不是推进到“先接到产品里再看看”

## Constraints

- **Decision Integrity**: `Phase 21` 的 `NO-GO for direct replacement / CONDITIONAL for isolated follow-up` 结论不可被重写成“默认继续实现”
- **Prototype Isolation**: 任何 prototype 代码、脚本或文档都必须保持在 isolated experiment surface，不能直接改写 shipped runtime/config contract
- **Evidence Gate**: 没有真实 live smoke，就不能记录 benchmark，也不能声称已经证明 ArcadeDB 值得产品化
- **Approval Surface**: `remote config`、`auth`、`TLS`、`lifecycle`、`docs/runtime guidance` 都是产品面变化，不是内部实现细节
- **Docs Truth**: 若 milestone 结论进入更正式的后续路线，README、AI docs、rules 与验证规则必须同步
- **Architecture Reality**: legacy 与 MVP3 并存 —— 任何 server-backed 方向都要先量化 blast radius，再讨论实现

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `v1.4` 以 `Phase 17 → 18 → 19 → 20` 完成并归档 | 该主线已经通过 milestone audit，不应继续停留在 active planning surface | Shipped 2026-03-26 |
| `Phase 21` 从 backlog `1000` 升级为正式后续 phase | 用户已确认它不是 backlog，而是顺序排在 `Phase 20` 之后的确定 phase | Approved |
| ArcadeDB follow-up 先做官方 Node feasibility，而不是先写适配器 | 这样能避免把错误支持面或高成本实验路径包装成既定实现 | Completed 2026-03-28 |
| `post-v1.4` follow-up 以 direct replacement `NO-GO` 收尾 | milestone audit 已确认 requirements 满足，但 live smoke 仍需新 milestone 显式处理 | Archived 2026-03-28 |
| `SEED-001` 只保留“isolated server-backed prototype”这条条件性继续路径 | 这样能防止团队重新回到“先写 adapter 再证明”的旧错误 | Planted 2026-03-28 |
| 启动 `v1.5` 只验证 isolated prototype，而不默认进入 shipped backend | 用户已批准按建议继续，但边界仍需保持 evidence-first 与 prototype-only | Active 2026-03-30 |

## Current State

- **Completed milestones / follow-ups:** `v1.0 AI-first 重构`、`v1.1 插件扩展点产品化`、`v1.2 图数据库后端生产化`、`v1.3 Kùzu-only 收敛与高信号债务清理`、`v1.4 设计契约与 Agent Handoff`、`post-v1.4 ArcadeDB Node feasibility follow-up`
- **Milestone archive:** `.planning/MILESTONES.md`, `.planning/milestones/v1.4-ROADMAP.md`, `.planning/milestones/v1.4-REQUIREMENTS.md`, `.planning/milestones/v1.4-MILESTONE-AUDIT.md`, `.planning/milestones/post-v1.4-ROADMAP.md`, `.planning/milestones/post-v1.4-REQUIREMENTS.md`, `.planning/milestones/post-v1.4-MILESTONE-AUDIT.md`
- **Active milestone:** `v1.5 Isolated ArcadeDB Server-backed Prototype`
- **Current planning status:** `Phase 22` 尚未开始；下一步是先完成 discuss / plan，并把真实 server live smoke 作为第一阻断门
- **Known remaining debt:** repo-wide ESLint warnings 仍是 warning-only 历史基线；hybrid architecture 仍带来 implementation seam 成本；`Phase 17` 的 Nyquist debt 仍是非阻断遗留；若 `v1.5` 失败，也必须把 failure evidence 写清楚，防止以后再次在错误前提上重开

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
*Last updated: 2026-03-30 after starting v1.5 milestone*
