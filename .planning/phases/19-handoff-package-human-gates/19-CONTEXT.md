# Phase 19: Handoff Package & Human Gates - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Roadmap Phase 19 goal + HOF requirements + Phase 17/18 carry-forward decisions + codebase scout

<domain>
## Phase Boundary

本阶段只处理“design contract / mapping truth → handoff package”的第三段闭环：
1. 基于已通过 `design validate` 与 `design map` 的输入，生成一份同时面向人类审核与机器消费的 handoff package；
2. 在 handoff artifact 中显式追踪 approvals、assumptions 与 open questions，避免后续 agent 执行时语义漂移；
3. 把 handoff 能力接入稳定的 public CLI surface，但**不**扩写 `analyze` public intent、**不**恢复 `workflow` 的 `commit` / `ci` phase，也**不**提前越界到 Phase 20 的 design drift verification / end-to-end docs closure。

本阶段**不**做 design-vs-implementation drift report、**不**把 docs / CI 的完整 handoff 闭环一次性做完、**不**让 `Phase 21` 抢占 `v1.4` 主线路径。

</domain>

<decisions>
## Implementation Decisions

### Product surface
- **D-01:** handoff 能力继续挂在独立 `design` seam 下，采用 purpose-built 的 `design handoff` surface；不新增 top-level `handoff` 命令，也不把新语义塞进 `analyze` / `workflow`。
- **D-02:** Phase 19 只能消费通过 `design validate` 与 `design map` 的事实源；若 design contract blocker 或 mapping blocker 仍存在，handoff 不得从自由文本或失败 scope 上继续猜测生成。
- **D-03:** human-readable summary 与 machine-readable JSON 必须来自同一份 canonical handoff truth；不能维护两套会逐渐漂移的独立构建逻辑。

### Artifact package
- **D-04:** 默认持久化输出路径复用 `resolveOutputDir()`，落在 `.mycodemap/handoffs/`（或用户显式 `--output` 指定的目录），文件名由 design contract stem 决定，生成 `{stem}.handoff.md` 与 `{stem}.handoff.json` 两个 sidecar artifact。
- **D-05:** CLI human mode 负责输出简短 review summary 与 artifact 路径；`--json` 模式必须保持纯 JSON，不得混入 prose，同时仍反映同一份 handoff truth。
- **D-06:** human summary 至少包含：目标、范围 / touched files、supporting files / tests、non-goals、risks、validation checklist、assumptions、open questions 与 approval gate 状态。

### Human gates & traceability
- **D-07:** handoff generation 在 mapping success 时可以生成 artifact，但不能自动把 unresolved gaps 视为“已批准”；artifact 必须显式给出 `readyForExecution` / approval gate 状态。
- **D-08:** 明确 design contract 段落与已确认 mapping 事实才可进入 approved decisions；来自 `Open Questions`、mapping `unknowns`、或未被显式设计约束覆盖的推导项，必须分别进入 `openQuestions` / `assumptions`，不得静默提升为批准结论。
- **D-09:** 每个 approval / assumption / open question 都必须带 provenance，至少能追溯到 design section、mapping candidate path、或相关 diagnostic，方便 downstream agent 与 reviewer 反查来源。

### Integration & scope control
- **D-10:** 默认 path / flag 设计优先复用现有 CLI output helper 与 file-writing pattern，不再新造一套隐藏目录语义，避免重演 `.mycodemap` / `.codemap` 式 path drift。
- **D-11:** 只同步 `design handoff` 直接相关的最小 public docs 与 docs guardrail；完整 handoff + drift + e2e narrative 留给 Phase 20。
- **D-12:** `workflow` 仍保持 analysis-only 四阶段；handoff 是 workflow 上游 / 旁路的 purpose-built artifact，不是 workflow 新 phase。

### the agent's Discretion
- `DesignHandoff*` 类型与 diagnostics 的精确字段命名
- markdown summary 的具体 heading / 排版顺序
- `--output` 之外是否需要 `--write` / `--dry-run` 等附加 flag
- `readyForExecution` 的细粒度判定规则（前提是不违反“未审 unresolved gaps 不得默认为 ready”）

</decisions>

<specifics>
## Specific Ideas

- 推荐最小工作流从 `design validate → design map → design handoff` 串起，而不是跳过 mapping 直接手写 handoff。
- 机器 JSON 中应显式暴露 `touchedFiles`、`constraints`、`tests`、`approvals`、`assumptions`、`openQuestions`，避免下一阶段 agent 再回头解析 markdown prose。
- markdown summary 不需要把 Phase 18 的全部 reason chain 原样复制，但至少要让 reviewer 看懂 scope、risks、validation checklist 与 why-not-ready。
- `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` 已允许 `Open Questions`；Phase 19 应把这部分显式抬升为 handoff trace item，而不是忽略。
- 当前没有新的产品参考竞品约束；按 conservative、traceability-first 的默认路线推进即可。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / Requirement
- `.planning/PROJECT.md` — v1.4 产品边界、purpose-built handoff surface 与 human ownership 约束
- `.planning/REQUIREMENTS.md` — `HOF-01` / `HOF-02` / `HOF-03` / `HOF-04`
- `.planning/ROADMAP.md` — Phase 19 goal、success criteria 与 19-01/02/03 拆分
- `.planning/STATE.md` — 当前 phase 状态、主线顺序与已确认决策

### Prior Phase Decisions
- `.planning/phases/17-design-contract-surface/17-CONTEXT.md` — design input surface、failure-first 与 layering 前置决策
- `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md` — mapping output、blocker 语义、human/machine duality 的上游决定
- `.planning/phases/18-design-to-code-mapping/18-UAT.md` — `design map` 的 help/human/json/blocker/docs surface 已验收的事实
- `.planning/phases/18-design-to-code-mapping/18-03-SUMMARY.md` — Phase 18 docs boundary：只做最小 sync，不提前越界到 handoff/drift 叙事

### Design / Mapping Truth
- `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` — design contract canonical authoring sample，包含 `Open Questions`
- `src/interface/types/design-contract.ts` — design input sections 与 diagnostics shape
- `src/interface/types/design-mapping.ts` — Phase 18 mapping truth 与 future handoff flow 的共享上游契约
- `src/cli/design-contract-loader.ts` — validated design contract 的事实源
- `src/cli/design-scope-resolver.ts` — candidate scope、risk、test impact、unknowns 的事实源
- `src/cli/commands/design.ts` — `design validate` / `design map` 现有 public seam

### Output / Path Conventions
- `src/cli/paths.ts` — 默认 output dir 与 path helper 事实源
- `src/cli/commands/generate.ts` — 生成式命令的输出目录与 file-writing pattern
- `src/cli/commands/report.ts` — 生成 artifact 并打印 output path 的 CLI precedent
- `docs/ai-guide/OUTPUT.md` — machine-readable output contract 的文档事实源
- `docs/ai-guide/COMMANDS.md` — public CLI surface 文档事实源

### Architecture / Guardrails
- `.planning/codebase/CONVENTIONS.md` — `--json` / human output / docs sync 规则
- `.planning/codebase/STRUCTURE.md` — 新类型、CLI command、docs guardrail 的落点
- `.planning/codebase/CONCERNS.md` — high blast-radius entry points、output path drift、docs coupling 风险
- `scripts/validate-docs.js` — public command docs guardrail 主检查脚本
- `src/cli/__tests__/validate-docs-script.test.ts` — docs drift fixture tests
- `src/cli/commands/__tests__/ci-docs-sync.test.ts` — CLI docs sync must-pass guardrail

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/design-contract-loader.ts`：已经提供 validated / normalized design input，Phase 19 不需要重做 contract parsing。
- `src/cli/design-scope-resolver.ts`：已经给出 candidate paths、dependencies、testImpact、risk、unknowns，是 handoff 的直接上游 truth。
- `src/cli/paths.ts`：已经统一 `.mycodemap` / `.codemap` 输出路径决策，是 handoff artifact path 的自然 helper。
- `src/cli/commands/generate.ts` 与 `src/cli/commands/report.ts`：已有“写文件 + 打印 output path”的 CLI pattern，可直接复用。

### Established Patterns
- 分析型 / design-driven CLI surface 一律要求 `--json` 纯结构化输出，同时保留清晰的人类可读输出。
- 任何 public command 新增或输出契约变更，都必须同步 README / AI docs / rules / docs guardrail。
- 新抽象优先在 `src/interface/types/` 定义正式 contract，再在 `src/cli/` 实现低 blast-radius orchestration seam。

### Integration Points
- `src/cli/commands/design.ts` 是新增 `design handoff` 的最自然入口。
- `src/interface/types/index.ts` 是 handoff contract 的统一导出点。
- 建议新增 `src/cli/design-handoff-builder.ts`（必要时拆 `renderer`）作为 canonical handoff truth builder。
- `.mycodemap/handoffs/` 是与现有生成型输出最一致的默认 artifact 落点。

</code_context>

<deferred>
## Deferred Ideas

- design-vs-implementation drift report 与 acceptance execution loop —— `Phase 20`
- handoff / drift / docs / CI 的完整闭环叙事与 end-to-end example —— `Phase 20`
- 如果未来确实需要显式“approve handoff” mutation command，再单独评估是否作为后续 phase 拆出
- Figma / issue tracker / PR system 等外部设计输入集成 —— future milestone

</deferred>

---

*Phase: 19-handoff-package-human-gates*
*Context gathered: 2026-03-25*
