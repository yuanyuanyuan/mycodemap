# CodeMap

## What This Is

CodeMap 仍是一个面向 AI / Agent 的代码地图工具，但下一轮不该继续停留在“只给 AI 看代码”。从“人类负责设计、AI agent 负责写代码”的角度看，当前最缺的不是更多零散分析命令，而是把**人类批准的设计意图**稳定翻译成**AI 可执行的实现边界、风险提示与验证清单**。

当前仓库仍是 brownfield：legacy CLI / workflow / analyzer 管线与 MVP3 分层架构并存。因此任何新能力都必须优先保证 public contract、设计输入契约和 docs guardrail 一致，而不是把 CodeMap 扩成失焦的通用执行平台。

## Core Value

人类负责设计决策，AI 在明确设计契约和代码上下文约束下稳定产出实现范围与验证边界。

## Latest Shipped Milestone: v1.3 Kùzu-only 收敛与高信号债务清理

**Goal:** 在不重新打开 HTTP API 产品面的前提下，移除 `neo4j` 正式支持，把 graph storage 收敛到 Kùzu-only 主线，并清理影响产品可信度的高信号 unfinished / tech debt / docs drift。

**Delivered outcome:**
- 从 config / schema / runtime / tests / docs 中移除 `neo4j` 正式产品面，并为历史配置提供清晰迁移诊断
- 收口 `analyze` / `workflow` / `server` 边界上的未完成点，减少“文档说已收口、源码仍像过渡态”的漂移
- 清偿 `plugin-loader`、`parser`、`global-index`、`AnalysisHandler` 与 docs sync automation 的高信号技术债

## Current Planned Milestone: v1.4 设计契约与 Agent Handoff

**Goal:** 把 CodeMap 从“AI-first 代码分析工具”推进到“人类设计 → AI 执行”的桥接基础设施，但不把产品扩成通用项目管理器、自动执行器或公共 HTTP 平台。

**Expected outcome:**
- 人类可以用明确、可验证的 design contract 描述目标、约束、验收标准与非目标
- CodeMap 能把 design contract 与现有代码图对齐，输出 candidate scope、依赖、风险、unknowns 与测试影响
- AI agent 能消费一份稳定的 handoff package，而不是靠自由提示词猜实现意图
- docs / guardrail / workflow 说明与真实实现保持同步，避免 AI 在错误操作说明上继续放大偏差

## Requirements

### Validated

- ✓ 代码库已经能生成代码地图和结构化分析结果 —— existing
- ✓ 代码库已经提供 `query` / `deps` / `cycles` / `complexity` / `impact` / `analyze` / `export` / `ci` 等核心分析能力 —— existing
- ✓ 代码库已经具备 AI-first 入口文档与机器可读优先的输出定位 —— v1.0 / Phase 1
- ✓ `analyze` 公共契约已收口为 `find` / `read` / `link` / `show` 四意图 —— v1.0 / Phase 3
- ✓ `workflow` CLI help 与运行时实现当前是 analysis-only 四阶段，不再把 `commit` / `ci` 当作真实 phase —— v1.0 / runtime validated
- ✓ `ship` 的 must-pass 检查已复用 `ci` gate checks —— v1.0 / Phase 5
- ✓ 插件系统已经拥有正式配置入口、runtime 接入与 `pluginReport` diagnostics —— v1.1 / Phases 07-09
- ✓ graph storage 正式产品面已收敛为 `filesystem` / `memory` / `kuzudb` / `auto`，历史 `neo4j` 配置走显式迁移诊断 —— v1.2-v1.3
- ✓ docs sync 自动检查已进入 CI / must-pass 路径 —— v1.3 / Phase 16

### Active

- [ ] 人类可通过受文档约束的 design contract 定义 feature goal、constraints、acceptance criteria 与 explicit exclusions
- [ ] CodeMap 可把 design contract 与代码图对齐，输出 candidate files/modules、dependencies、test impact、risk 与 unknowns
- [ ] 系统可生成同时面向人类审核和机器消费的 handoff package，并保留 assumptions / approvals / open questions
- [ ] design / workflow / docs drift 可被 guardrail 明确检出，而不是依赖口头约定或历史记忆

### Out of Scope

- 自动写代码后直接 commit / ship / 发布 —— 当前里程碑先解决“设计契约 + 交接物”，不把 CodeMap 扩成 autonomous executor
- 设计编辑器、Figma 实时同步或需求管理看板 —— 这会把产品重心从代码地图拖向设计工具链
- 重新公开 `mycodemap server` / 独立 HTTP API 产品面 —— 与当前设计到执行桥接主线无关
- 一次性重开 `neo4j` 支持或优先做 Kùzu-native 查询优化 —— 属于其他候选 milestone
- 泛化多角色 PM / ticket / sprint orchestration —— 当前先聚焦“设计输入 → agent handoff”闭环

## Context

- 当前 README / AI_GUIDE 明确：AI / Agent 是主要消费者，人类负责配置、维护与按需阅读输出；但还没有把“人类设计工件”定义成正式输入面。
- `workflow` 的 CLI help 与运行时已经是 analysis-only 四阶段，但 `docs/ai-guide/PATTERNS.md` 仍保留 `commit` / `ci` 两个阶段，说明 docs sync coverage 仍有缺口。
- 仓库仍是 hybrid architecture：`src/cli/`、`src/core/`、`src/parser/`、`src/orchestrator/` 与 `src/{interface,infrastructure,domain,server,cli-new}` 并存，新增能力不能假设已经完成单路迁移。
- `src/cli/index.ts`、`src/cli/commands/analyze.ts`、`src/cli/commands/workflow.ts` 与 `scripts/validate-docs.js` 仍是高爆炸半径入口；把新语义继续塞进旧 public surface 成本很高。
- 文档护栏很强，但也意味着任何 public contract 变化都要同步 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*`、`docs/rules/*` 与相关测试。
- 现有产品强项是“代码上下文”和“结构化分析”；下一轮最优扩展方向是把这些能力上接 design contract，而不是横向再堆工具箱命令。

## Constraints

- **Product Boundary**: CodeMap 仍是 AI-first 代码地图工具 —— 新能力必须服务于设计到执行桥接，而不是演变成通用工程平台
- **Human Ownership**: 设计决策、范围批准、验收口径必须由人类确认 —— AI 只能消费已批准契约，不能把猜测伪装成设计
- **Public Contract Stability**: `analyze` 四意图与 `workflow` 四阶段不能被随意扩写 —— 如需新能力，优先使用单一 purpose-built surface
- **Docs Sync**: `README.md`、`AI_GUIDE.md`、`docs/ai-guide/PATTERNS.md`、`docs/rules/*`、guardrail tests 必须同步
- **Architecture**: legacy 与 MVP3 并存 —— 新抽象优先落在 `src/interface` / `src/domain` / `src/infrastructure`，避免继续向 `src/core` 堆责任
- **Output Discipline**: 输出必须同时支持 human review 和 machine consumption —— 不能只产自然语言摘要，也不能只产无解释 JSON
- **Path Consistency**: `.mycodemap/`、`.codemap/storage`、workflow persistence 仍存在路径历史包袱 —— 新产物路径必须显式决策，避免继续漂移

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `v1.4` 选择“设计契约与 Agent Handoff”作为下一主线 | 它比 `API-01`、`OPT-01`、泛化 `WKF-01` 更直接服务“人类设计、AI 编码”的目标 | — Pending |
| 新能力优先采用单一 purpose-built handoff surface，而不是继续扩写 `analyze` / `workflow` | 现有 public surface 和 docs guardrail 耦合已经很重，继续叠语义会放大漂移 | — Pending |
| 人类继续是设计 owner，AI 只消费已批准的 design contract | 不把需求猜测混入实现，可降低 hallucination 和 scope drift | — Pending |
| `workflow` 保持 analysis-only 四阶段，新 handoff 能力建立在其上游/旁路 | 避免把 `commit` / `ci` 阶段偷偷塞回 workflow，重开既有边界争议 | — Pending |
| 现存 workflow docs drift 视为 v1.4 的入口问题，而不是“以后再说”的小修补 | 如果操作说明不可信，design-to-agent bridge 会在错误基础上继续放大偏差 | — Pending |

## Current State

- **Shipped milestones:** `v1.0 AI-first 重构`、`v1.1 插件扩展点产品化`、`v1.2 图数据库后端生产化`、`v1.3 Kùzu-only 收敛与高信号债务清理`
- **Milestone archive:** `.planning/MILESTONES.md`, `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.2-ROADMAP.md`, `.planning/milestones/v1.3-ROADMAP.md`
- **Current milestone:** `v1.4 设计契约与 Agent Handoff`（in progress, `Phase 17` accepted）
- **Current status:** `Phase 17` 已完成 execute + verify-work；下一步是为 `Phase 18` 收集 context 并进入 discuss / planning，而不是继续停留在 design contract surface
- **Known remaining debt:** repo-wide ESLint warnings 仍是 warning-only 历史基线；hybrid architecture 仍带来 implementation seam 成本；backlog 中 `1000` 的存储路线评估需要与 v1.4 主线持续隔离，避免污染 progress 路由

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
*Last updated: 2026-03-25 after defining v1.4 milestone*
