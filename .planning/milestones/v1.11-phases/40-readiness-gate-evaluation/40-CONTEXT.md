# Phase 40: Readiness gate evaluation - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 40 评估 release readiness 是否适合接入 CI 或 pre-release gate，并把 hard gate / warn-only / fallback 边界写成可验证 contract。

本 phase 处理：
- 统一发布检查体系的三层 gate 语义（hard / warn-only / fallback）
- 定义 gate 触发位置与集成方式
- 明确信号不可用时 fallback 到人工确认的边界
- 将现有 `ship/rules/quality-rules.ts` 的 `blocking: boolean` 重构为显式三层语义

本 phase 不处理：
- 真实 npm publish、tag、push 或 GitHub Release
- 重建发布脚本或 GitHub Actions 发布逻辑
- 把 readiness 未经评估直接升成 hard gate
- Kimi runtime parity 或其他非 Claude runtime 扩展

</domain>

<decisions>
## Implementation Decisions

### Gate 强度分层
- **D-01:** 把现有 `blocking: boolean` 升级为 `gateMode: 'hard' | 'warn-only' | 'fallback'` 三层语义。
- **D-02:** 统一整个发布检查体系，重构现有 `ship/rules/quality-rules.ts` 以使用新语义。
- **D-03:** `hard` gate：失败即阻断发布流程（对应现有 mustPass / blocking=true）。
- **D-04:** `warn-only` gate：输出警告但不阻断，降低置信度但允许继续（对应现有 shouldPass / blocking=false）。
- **D-05:** `fallback` gate：当依赖信号不可用时，不自动 pass 也不 fail，而是输出显式 `fallback` 状态并附带 `reason`，中止自动流程等待人工判断。

### Gate 触发位置与集成
- **D-06:** readiness gate 作为独立 CLI 命令存在，重构 `ship/rules/quality-rules.ts` 为其核心规则引擎。
- **D-07:** `ship` 命令调用新的 gate 系统；`/release` 流程在步骤②中调用该命令。
- **D-08:** 统一入口，减少 ship quality rules 与 readiness gate 之间的重复。

### the agent's Discretion
- 新命令的具体命名和 CLI flag 设计
- 现有 mustPass/shouldPass 规则向三层语义的精确映射
- CLI 输出的终端排版和 structured report 字段命名
- 是否需要保留旧 `blocking` 字段的兼容层或一次性迁移
- 重构后的 `QualityRule` interface 具体字段命名

</decisions>

<canonical_refs>
## Canonical References

### Phase Scope
- `.planning/ROADMAP.md` — Phase 40 目标、成功标准与 phase 边界
- `.planning/REQUIREMENTS.md` — `RELF-03`、`SAFE-03`
- `.planning/STATE.md` — 当前 milestone 状态与 release L3 风险
- `.planning/PROJECT.md` — v1.11 release-followup-hardening 背景

### Prior Phase Context
- `.planning/phases/38-codex-release-entry-surface/38-CONTEXT.md` — release authority 边界与 thin-adapter 原则
- `.planning/phases/39-publish-polling-and-reporting/39-CONTEXT.md` — follow-up observability 边界与 truth-first 原则

### Release Authority
- `docs/rules/release.md` — /release 的唯一权威流程；Phase 40 只能增强 readiness 检查，不能替代
- `.agents/skills/release/SKILL.md` — Codex runtime adapter 边界
- `scripts/release.sh` — 机械发布 helper
- `.github/workflows/publish.yml` — publish workflow

### Existing Code Surface
- `src/cli/commands/ship/rules/quality-rules.ts` — 现有 mustPass/shouldPass 规则集，待重构为三层语义
- `src/cli/commands/ship/index.ts` — ship command 入口
- `src/cli/commands/ci.ts` — assessRiskAction、threshold 逻辑与 gate 检查 helper
- `src/cli/commands/__tests__/ci-gate-checks.test.ts` — gate check 测试
- `src/cli/commands/ship/__tests__/quality-rules.test.ts` — quality rules 测试
- `src/cli/index.ts` — 顶层 CLI 命令注册入口
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/commands/ship/rules/quality-rules.ts`: 已有 mustPass/shouldPass 双层结构和 `runChecks` 编排器，是重构为三层语义的最自然起点。包含 4 个 mustPass 规则和 3 个 shouldPass 规则。
- `src/cli/commands/ci.ts`: 已有 `assessRiskAction`、threshold 比较（默认 0.7）和 `unavailable signals` 降级路径，可作为 fallback 模式的参考实现。
- `src/cli/commands/ship/monitor.ts`: 已有 truth-first 的精确匹配逻辑，可借鉴到 gate 的 truth 表达。

### Established Patterns
- ship rules 使用 `QualityRule` interface（name, check, message, blocking），重构需要扩展或替换 `blocking` 字段。
- CLI 已存在显式结果对象 + formatter 分离模式，适合把 gate result 与 human summary 分离。
- release 相关逻辑遵循 thin orchestrator：`docs/rules/release.md` 定义流程，skill/helper 只做适配。
- `ci assess-risk` 已有 score/level/factors 的结构化输出，可作为 gate structured report 的参考。

### Integration Points
- `src/cli/commands/ship/index.ts` 是挂出新 gate 命令或重构现有 ship 行为的自然入口。
- `/release` 流程步骤②（`docs/rules/release.md`）是 readiness gate 被调用的官方位置。
- `src/cli/index.ts` 是顶层 CLI 注册点，若新增独立命令需要在此注册。
- `src/cli/commands/ship/pipeline.ts` 是 ship 的现有 pipeline 集成点，gate 结果可在此被消费。
</code_context>

<specifics>
## Specific Ideas

- 新增 `gateMode: 'hard' | 'warn-only' | 'fallback'` enum 替换 `blocking: boolean`。
- fallback 模式的行为：当 gate 依赖的外部信号不可用时，返回显式 `fallback` 状态并附带 `reason`，中止自动发布流程但不标记为失败。
- 新命令应复用现有 ship rules 的检查逻辑，但通过三层语义重新分类。
- `/release` 流程中，gate 运行结果需要被明确展示在 Confirmation Gate #1 之前。
- 重构后的 gate 系统应同时支持 human-readable terminal summary 和 machine-readable structured output（参考 `publish-status` 的双形态输出）。
</specifics>

<deferred>
## Deferred Ideas

- Kimi runtime parity — 已在 Phase 38 defer
- 默认持续 watch / poll publish 状态 — 已在 Phase 39 defer
- 真实 `/release v1.9` 执行 — 仍在 L3 边界外
- GitHub Actions 层面的 pre-publish job — 若 CLI gate 证明稳定后可后续扩展
- 将 gate 扩展为通用 CI 门禁（不限于 release）— 超出本 phase 的 release-followup 范围

</deferred>

---

*Phase: 40-readiness-gate-evaluation*
*Context gathered: 2026-04-29*
