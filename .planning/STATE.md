---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: 设计契约与 Agent Handoff
current_phase: 17
current_phase_name: Design Contract Surface
current_plan: none
status: planned
last_updated: "2026-03-25T03:07:31+08:00"
last_activity: 2026-03-25
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 12
  completed_plans: 0
  percent: 0
---

# Session State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-25)

**Core Value:** 人类负责设计决策，AI 在明确设计契约和代码上下文约束下稳定产出实现范围与验证边界。
**Current Focus:** 先建立 design contract surface 并修复 workflow docs drift，再进入 agent handoff generation

## Position

**Milestone:** v1.4 设计契约与 Agent Handoff
**Current Phase:** 17
**Current Phase Name:** Design Contract Surface
**Current Plan:** None
**Total Phases:** 4
**Total Plans in Milestone:** 12
**Status:** Planned
**Progress:** 0%
**Last Activity:** 2026-03-25
**Last Activity Description:** Reframed root planning from post-v1.3 shipped state to a v1.4 milestone focused on design-to-agent handoff

## Decisions

- 2026-03-25: 由于 `gsd-tools init new-project` 返回 `project_exists: true`，本次不再把仓库当作新项目初始化，而是沿用现有 `.planning` 结构重定义下一里程碑。
- 2026-03-25: 下一轮主线选择 `v1.4 设计契约与 Agent Handoff`，优先级高于 `API-01`、`OPT-01` 与泛化 `WKF-01`。
- 2026-03-25: 继续沿用 `interactive + standard + parallel + balanced` 的 planning config，不额外改动 `.planning/config.json`。
- 2026-03-25: 新能力优先走 purpose-built handoff surface，不通过扩写 `analyze` intent 或恢复 `workflow` 的 `commit` / `ci` phase 偷渡实现。
- 2026-03-25: `docs/ai-guide/PATTERNS.md` 仍保留 workflow 六阶段描述，视为 v1.4 的入口问题，必须在 Phase 17 优先修复。
- 2026-03-25: 人类继续是设计 owner；AI 只消费已批准的 design contract 与 handoff artifact。

## Blockers

- None. `v1.4` scope 已定义，可直接进入 `Phase 17` planning。

## Accumulated Context

### Roadmap Evolution

- 2026-03-24: 完成 `.planning/codebase/` 首轮映射，并以 brownfield 方式初始化项目规划
- 2026-03-24: 完成 `v1.0 AI-first 重构`，固定 analyze / workflow / ci / ship / docs guardrail 的公开边界
- 2026-03-24: 完成 `v1.1 插件扩展点产品化`，将插件配置、runtime、diagnostics 与 docs guardrail 固化为正式产品面
- 2026-03-24: 完成 `v1.2 图数据库后端生产化` 与 `v1.3 Kùzu-only 收敛与高信号债务清理`
- 2026-03-25: 从“AI-first 代码分析”进一步收敛出下一主线：design contract → scope mapping → handoff package → design drift verification

### Verified Existing Capabilities

- 当前公共 CLI help surface 已收紧为 `init/generate/query/deps/cycles/complexity/impact/analyze/ci/workflow/export/ship`
- `analyze` 公共契约已固定为 `find/read/link/show`
- `workflow` CLI help 与运行时实现当前为 analysis-only 四阶段
- 插件系统拥有正式配置入口、runtime 接入与 `pluginReport` 结构化诊断
- graph storage 正式产品面已收敛为 `filesystem` / `memory` / `kuzudb` / `auto`
- docs sync 自动检查已进入 CI Gateway 和 `ci check-docs-sync`
- `Server Layer` 继续保持 internal-only，不等于公共 `mycodemap server` 命令
- README / AI 文档已明确 AI/Agent 是主要消费者，但尚未把 design contract 定义为正式输入面

### Risks To Watch

- `docs/ai-guide/PATTERNS.md` 仍存在 workflow 六阶段漂移，说明 docs sync coverage 并未完全闭环
- 如果 v1.4 把新语义直接塞进 `src/cli/index.ts` / `analyze` / `workflow`，会立即放大 blast radius 与文档耦合成本
- 如果没有明确的 design contract schema，AI 仍会把自由文本猜测成需求，导致 scope drift
- 如果 handoff output 只面向人类或只面向机器，都会破坏“人类设计 + AI 执行”的协作闭环

## Session Log

- 2026-03-25: 读取 `gsd-new-project` workflow、模板与现有 `.planning` 文档，确认当前仓库已初始化
- 2026-03-25: 通过 README / AI_GUIDE / codebase map / workflow implementation 重新评估当前产品边界
- 2026-03-25: 发现 `docs/ai-guide/PATTERNS.md` 与真实 workflow 四阶段存在漂移，并将其写入 v1.4 requirements / roadmap
- 2026-03-25: 完成 Phase 999.1（KuzuDB 作为主要存储）的 discuss-phase，创建 CONTEXT.md 和 DISCUSSION-LOG.md，捕获5个关键架构决策
