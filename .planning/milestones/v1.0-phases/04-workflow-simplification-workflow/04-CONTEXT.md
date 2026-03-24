# Phase 4: Workflow Simplification（Workflow 阶段模型简化） - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Source:** Roadmap goal + Phase 3 收口结果 + workflow codebase audit

<domain>
## Phase Boundary

本阶段只处理 `workflow` 的阶段模型收敛：把当前 workflow 从混合开发流改成纯分析流，只保留 `find → read → link → show`，并同步 CLI 文案、可视化输出、README 与 AI 命令文档。  
本阶段**不**重构 `analyze` 四意图契约本身、**不**把 `ship` 的质量检查迁移到 `ci`、也**不**收口共享文件排除模块；这些分别留给 Phase 5 / Phase 6。

</domain>

<decisions>
## Implementation Decisions

### Public truth source
- **D-01:** `workflow` 的公开阶段真相以 `src/orchestrator/workflow/types.ts`、`src/orchestrator/workflow/templates.ts`、`src/cli/commands/workflow.ts` 和真实 CLI 输出为准。
- **D-02:** `workflow` 仍可保留模板，但模板不再改变阶段顺序；差异只体现在阈值和说明上。

### Scope control
- **D-03:** `implementation`、`commit`、运行 CI 这类越界动作不能再出现在 workflow phase 中；需要检查质量或发布时，改走 `mycodemap ci` / `mycodemap ship`。
- **D-04:** 为降低 blast radius，保留 `PhaseAction = analyze|ci|manual` 类型壳，但默认工作流与所有内置模板都必须只生成四个分析阶段。

### Verification
- **D-05:** 本阶段的最小验证集合固定为 workflow 相关测试、`workflow --help`、`workflow status`、`workflow visualize`、`workflow template apply`。
- **D-06:** 由于 README 和 `docs/ai-guide/COMMANDS.md` 之前仍写 legacy 6 阶段，本阶段必须补文档和测试事实，而不是只改内部实现。

</decisions>

<specifics>
## Specific Ideas

- 当前代码主路径已经部分切到四阶段，但 README 仍把 workflow 画成 `reference → impact → risk → implementation → commit → ci`，说明“实现已变、文档未变”的漂移正在发生。
- `src/orchestrator/workflow/__tests__/types.test.ts`、`phase-checkpoint.test.ts`、`workflow-persistence.test.ts` 仍存在旧阶段示例；它们虽然能跑绿，但会继续把错误事实写回代码库。
- `workflow template apply` 现在应显示 `find → read → link → show`，而不是 bugfix 模板跳过阶段。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase 4 目标、成功标准、`04-01` / `04-02` 拆分
- `.planning/REQUIREMENTS.md` — `FLOW-01`、`FLOW-02`
- `.planning/milestones/v1.0-phases/03-analyze-contract-analyze/03-VERIFICATION.md` — Phase 3 已把 `analyze` 收口到四意图，为 workflow 四阶段提供前提
- `src/orchestrator/workflow/types.ts` — workflow phase 单一类型源
- `src/orchestrator/workflow/workflow-context.ts` — 初始阶段默认值
- `src/orchestrator/workflow/templates.ts` — 模板统一生成阶段定义
- `src/orchestrator/workflow/visualizer.ts` — ASCII 可视化与进度显示
- `src/cli/commands/workflow.ts` — workflow CLI 文案和 next steps
- `README.md`、`docs/ai-guide/COMMANDS.md` — 面向用户/AI 的命令说明

</canonical_refs>

<deferred>
## Deferred Ideas

- `ship` 质量检查复用 `ci` 子命令 —— Phase 5
- 共享 `.gitignore` 感知排除模块 —— Phase 6
- docs guardrail 把 workflow 四阶段与 CI 新子命令固定下来 —— Phase 6

</deferred>

---

*Phase: 04-workflow-simplification-workflow*
*Context gathered: 2026-03-24*
