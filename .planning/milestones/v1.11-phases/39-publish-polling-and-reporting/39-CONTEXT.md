# Phase 39: Publish polling and reporting - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 39 只处理 **publish 状态的只读 follow-up observability 面**：
- 为现有 release flow 补一个独立的、只读的 publish-status follow-up 命令 / contract
- 该命令返回一次性 snapshot，而不是默认持续轮询
- 输出同时面向人类终端阅读与机器消费的 structured report
- 当 GitHub Actions run 无法被精确确认时，返回显式 non-success truth，而不是猜测“最像”的结果

本 phase 不处理：
- 把 polling/reporting 内嵌成更厚的 `/release` 主流程
- 默认长时间 watch / poll 到终态
- 真实 `npm publish`、tag、push、rerun 或其他任何写操作
- release readiness gate integration（Phase 40）

</domain>

<decisions>
## Implementation Decisions

### Entry Shape
- **D-01:** polling/reporting 作为 `/release` 之后的 **单独只读 follow-up 命令** 存在，由 `/release` 完成报告提示下一步，而不是把 `/release` 本体继续做厚。
- **D-02:** 这个 follow-up 面必须被描述为 release observability，不得成为第二条 release authority / competing entry path。

### Observation Mode
- **D-03:** 默认行为是 **一次性 snapshot**，立刻返回当前 publish 状态；不默认持续轮询。
- **D-04:** 该命令的目标是“读取 truth”，不是“替用户持续盯发布流程”。

### Reporting Contract
- **D-05:** 正式输出必须同时提供 **终端摘要** 与 **machine-readable structured report**。
- **D-06:** 结构化输出需要覆盖 publish status truth，至少能表达 success / failure / pending / unavailable / ambiguous 这类状态区分，而不是只有 prose summary。

### Truth Boundary
- **D-07:** 采用 **strict truth-first** 边界：只有在能精确确认 workflow run 时才汇报具体状态。
- **D-08:** 遇到无精确匹配 run、权限不足、API 不可达、repo 解析失败等情况时，必须显式返回 `unavailable` 或 `ambiguous`，不能退化成“猜最新一条 publish run”。

### the agent's Discretion
- follow-up 命令的具体命名、flag 命名与终端排版可以在规划阶段决定。
- structured report 的精确字段命名、JSON schema 形态和人类摘要的文案细节可以在规划阶段决定。
- 是否复用 / 抽取现有 `ship monitor` 实现细节可由规划与实现决定，但必须保持只读 snapshot 和 truth-first 边界。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 39 的目标、成功标准与 phase 边界
- `.planning/REQUIREMENTS.md` — `RELF-02`、`SAFE-01`、`SAFE-02` 的当前要求
- `.planning/STATE.md` — 当前 milestone 位置、blockers 与 release L3 风险
- `.planning/PROJECT.md` — `v1.11` 的 release-followup-hardening 背景与当前 milestone 约束
- `.planning/phases/38-codex-release-entry-surface/38-CONTEXT.md` — 继承的 single-authority / thin-adapter 边界

### Release Authority
- `docs/rules/release.md` — `/release` 的唯一权威流程；Phase 39 只能扩 observability follow-up
- `.agents/skills/release/SKILL.md` — Codex runtime adapter 的当前边界与“首期不自动轮询”事实
- `scripts/release.sh` — 机械发布 helper 的当前行为与 side effects 边界
- `.github/workflows/publish.yml` — publish workflow 的触发条件、步骤与可读取状态源

### Existing Code Surface
- `src/cli/index.ts` — 现有顶层 CLI 命令入口与 `ship` 暴露方式
- `src/cli/commands/ship/index.ts` — ship command 现有命令边界
- `src/cli/commands/ship/pipeline.ts` — 当前 publish pipeline 与 monitor 集成位置
- `src/cli/commands/ship/monitor.ts` — 现有 GitHub Actions run 匹配、状态读取与失败 job 汇总逻辑
- `src/cli/commands/ship/publisher.ts` — publish 成功后已有的 tag / release URL truth 来源
- `src/cli/commands/check.ts` — 现有 CLI “human-readable + machine-readable” 输出模式参考

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/commands/ship/monitor.ts`: 已有基于 `tagName + headSha` 的 workflow run 精确匹配、failed job 提取、workflow/release URL 聚合逻辑，可作为 Phase 39 的核心读取资产。
- `src/cli/commands/ship/publisher.ts`: 已有 `tagName`、`headSha`、`releaseUrl` 等发布后 truth，可帮助定义 report schema。
- `src/cli/commands/check.ts`: 已有“默认 machine-readable，必要时 human-readable”的 CLI contract 模式，可作为 structured report 输出参考。

### Established Patterns
- release 相关逻辑遵循 thin orchestrator / single authority：`docs/rules/release.md` 定义流程，skill 与 helper 只做适配或执行。
- CLI 已存在显式结果对象 + formatter 的模式，适合把 report schema 与 human summary 分离。
- 当前 ship monitor 采用 truth-first 的精确匹配方式，而不是按当前分支或最新 run 模糊猜测。

### Integration Points
- `/release` 的完成报告（`docs/rules/release.md` Step 8/9）是挂出 follow-up 命令的自然入口。
- `src/cli/commands/ship/pipeline.ts` 是旧 monitor 集成点；若复用既有实现，需要明确它与新 follow-up 命令的关系。
- `.github/workflows/publish.yml` 是状态 truth 的上游数据源；report contract 必须围绕这个 workflow 的只读查询展开。

</code_context>

<specifics>
## Specific Ideas

- follow-up 面应被表述为“发布后的状态读取 / 汇报”，而不是“继续执行发布流程”。
- 默认只做一次 snapshot；不要把 `Phase 39` 做成默认持续 watch 的长命令。
- 输出要同时让人类能快速看懂，也能让后续 agent / script 直接读取状态字段。
- 如果 truth 不足，就明确告诉用户 `unavailable` / `ambiguous`，不要用“最新一条看起来像”的 run 充数。

</specifics>

<deferred>
## Deferred Ideas

- 默认持续 watch / poll 到终态 —— 本 phase 明确不选这个默认行为
- release readiness gate integration —— 留给 Phase 40

</deferred>

---

*Phase: 39-publish-polling-and-reporting*
*Context gathered: 2026-04-23*
