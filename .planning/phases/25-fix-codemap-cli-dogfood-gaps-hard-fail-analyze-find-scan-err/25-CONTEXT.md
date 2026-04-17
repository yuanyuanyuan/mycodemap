# Phase 25: CodeMap CLI dogfood reliability hardening - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Source:** PRD Express Path (`docs/eatdogfood-reports/2026-04-17-eatdogfood-agent-experience.md`)

<domain>
## Phase Boundary

本阶段聚焦 **CodeMap CLI 面向 AI / Agent 的可靠性与机器消费契约**。目标不是新增大功能，而是把 2026-04-17 dogfood 报告里已经暴露出来的“看起来成功、实则不可靠”的 CLI 行为收敛成可验证、可诊断、可文档化的契约。

因此本阶段只允许交付：
1. 与 dogfood 报告直接对应的 CLI 行为修复或契约澄清；
2. 机器可读输出、显式失败/警告信号、参数语义一致性的补强；
3. 为受影响命令补齐最小验证与必要文档同步依据。

本阶段**不**推进 ArcadeDB prototype、**不**把 `rtk` 纳入产品依赖、**不**顺手重构整个 analyze 架构、**不**扩写与报告无直接关系的 shipped surface。

</domain>

<decisions>
## Implementation Decisions

### Failure Signaling Is Product Surface
- `analyze -i find` 在底层扫描链路失败时，不能再把失败伪装成可信的 0 结果；机器消费方必须能从 stdout JSON 区分真实 0 命中、部分失败与硬失败。
- 仅在 stderr 打印错误不足以构成 Agent 可依赖契约；需要有结构化 failure / warning / partialFailure 信号。

### CLI Contract Consistency Matters
- 这次规划必须审视 dogfood 报告中列出的 Agent 体验断点：`--json` 支持不统一、`complexity <file>` 忽略目标文件、`check` / `ci assess-risk` 静默通过、`analyze -i find` 对显式路径低置信度、`workflow start` 缺少机器可读输出。
- 若这些问题不能在同一 phase 内高质量落地，planner 必须显式提出拆分方案，而不是默默丢项。

### Scanner Boundaries Must Match Config-Aware Paths
- `analyze` 涉及的 include / exclude、TypeScript 解析与配置感知边界，不能偏离 `generate` / `query` 已经证明可用的扫描策略。
- 当用户给出显式文件路径时，CLI 不应再把它当作模糊关键词处理并返回误导性的超低 confidence。

### Docs Sync Is Conditional but Explicit
- 如果本阶段改变了 CLI 输出契约、默认推荐路径或 AI 使用方式，必须同步 `AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`；如果不改，也必须在交付中明确写出“不需要更新”的原因。

### the agent's Discretion
- 可以自行决定这些问题应该合并为一个实现包还是拆成多个 plan，但每个 plan 都必须能回溯到 dogfood 报告中的具体失败模式。
- 可以在 `query` / `analyze` / `complexity` / `ci` / `workflow` 等相关命令之间选择最小变更路径，但不得用“降级到人工判断”替代机器可读修复。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap / state
- `.planning/ROADMAP.md` — Phase 25 的正式目标、成功标准与与其他 milestone 的边界
- `.planning/STATE.md` — 当前 milestone 状态与 Phase 25 的历史挂载点
- `.planning/REQUIREMENTS.md` — 项目级 requirements 基线

### Dogfood evidence
- `docs/eatdogfood-reports/2026-04-17-eatdogfood-agent-experience.md` — 本次 PRD express path 的直接输入，定义 Agent 视角问题与建议
- `docs/exec-plans/completed/2026-04-17-eatdogfood-codemap-cli.md` — 已被 roadmap 绑定为 Phase 25 依赖的首份 dogfood 基线

### Contract / docs
- `AI_GUIDE.md` — 当前 AI 推荐入口与命令定位
- `docs/ai-guide/COMMANDS.md` — CLI 命令面、参数与推荐用法
- `docs/ai-guide/OUTPUT.md` — 输出契约与机器消费说明
- `.planning/codebase/CONVENTIONS.md` — 仓库内关于机器可读输出与文档同步的既有约定

### Config / implementation anchors
- `mycodemap.config.json` — include / exclude / output 目录的实际配置边界
- `src/cli/commands/analyze.ts` — `analyze` 统一入口与 intent 路由
- `src/cli/commands/query.ts` — 当前稳定查询路径
- `src/cli/commands/complexity.ts` — `complexity <file>` 行为来源
- `src/cli/commands/check.ts` — 契约检查输出与状态表达
- `src/cli/commands/ci.ts` — `ci assess-risk` 输出路径
- `src/cli/commands/workflow.ts` — `workflow start` 行为与输出格式

</canonical_refs>

<specifics>
## Specific Ideas

- 优先把“误导 Agent 的失败模式”排在前面：`analyze -i find` 静默失败、结构化输出缺少失败信号、路径输入被误判、参数语义与行为不一致。
- 评估是否需要统一补齐 `history --symbol`、`ci assess-risk`、`workflow start` 的机器可读输出，避免调用方为不同命令维护不同解析器。
- `complexity` 若接受文件参数，就应只返回目标文件的复杂度；否则必须改变 CLI 契约文案，不能保留误导性参数语义。
- `check` / `ci assess-risk` 若结果为通过、跳过或未执行，stdout 里应存在明确状态字段或摘要，而不是要求调用方从 exit code 与空输出猜测。
- 如果本 phase 发现 scope 已超出单 phase 的保真度上限，应优先建议拆成子 phase，而不是压缩成含混计划。

</specifics>

<deferred>
## Deferred Ideas

- `analyze` 全面重构为唯一统一入口、以及对独立 `query` / `deps` / `impact` / `complexity` 命令的产品面收敛
- 与 `rtk` 相关的 shell 输出优化、过滤器信任与运行时包装体验
- 与 ArcadeDB prototype（Phase 22-24）相关的任何实验、验证或文档动作

</deferred>

---

*Phase: 25-fix-codemap-cli-dogfood-gaps-hard-fail-analyze-find-scan-err*
*Context gathered: 2026-04-17 via PRD Express Path*
