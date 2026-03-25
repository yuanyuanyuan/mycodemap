# Phase 17: Design Contract Surface - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Roadmap Phase 17 goal + v1.4 requirements + workflow/docs drift audit

<domain>
## Phase Boundary

本阶段只处理“人类设计 → AI 执行”桥接链路的第一段闭环：
1. 定义一个正式、可被人类直接编写的 design contract 输入面，至少覆盖目标、限制条件、验收标准与显式非目标；
2. 为该输入面建立 CLI-owned 的 load / validate / diagnostics seam，避免继续把自由文本猜测成需求；
3. 同步最小必需的 README / AI docs / rules / guardrail，并修复已经确认存在的 workflow docs drift。

本阶段**不**做 design-to-code mapping、**不**生成 handoff package、**不**建设 design drift verification、**不**恢复 `workflow` 的 `commit` / `ci` phase、**不**把新语义塞进 `analyze` intent。

</domain>

<decisions>
## Implementation Decisions

### Product surface
- **D-01:** 新能力优先落在独立 `design` 命令面，而不是扩写 `analyze` / `workflow`。这样可以避免直接放大当前 public contract 与 docs guardrail 的 blast radius。
- **D-02:** 默认 design contract 输入文件采用仓库根目录 `mycodemap.design.md`，并允许 CLI 显式传入文件路径覆盖。
- **D-03:** 设计输入优先采用**人类可直接编辑的 Markdown contract**，而不是要求人类先维护原始 JSON；机器可读性通过 CLI validator/diagnostics 保证。

### Contract structure
- **D-04:** v1 contract 至少要有明确的 `Goal`、`Constraints`、`Acceptance Criteria`、`Non-Goals` / `Exclusions`；可选补充 `Context`、`Open Questions`、`Notes`。
- **D-05:** 缺失必填段、重复段、空段、未知段或歧义 heading 必须返回结构化 diagnostics，不能静默忽略，更不能继续猜测。
- **D-06:** `design validate --json` 的机器输出必须保持纯结构化，warning / error 不能通过额外 prose 污染 JSON。

### Layering
- **D-07:** 类型与契约定义优先进入 `src/interface/`，保持 future handoff / mapping 能共享同一套设计输入语义。
- **D-08:** 文件发现、解析、归一化与 CLI diagnostics 先放在 `src/cli/`，复用当前 `config-loader` 的成熟 seam，而不是继续向 `src/core` 堆责任。
- **D-09:** 文档模板应成为 design contract 的 canonical authoring sample；README / AI docs 只负责入口说明与高信号示例。

### Scope control
- **D-10:** Phase 17 只负责让 design input “可写、可验、可诊断”；真正映射到 files / modules / symbols 属于 Phase 18。
- **D-11:** 修复 `docs/ai-guide/PATTERNS.md` 中的 workflow 六阶段漂移属于本阶段范围，因为错误的入口文档会直接污染新 surface 的信任基线。

### Failure handling
- **D-12:** 当默认路径 `mycodemap.design.md` 不存在且用户未显式传路径时，CLI 必须硬失败并给出可操作提示，而不是退回自由文本。
- **D-13:** 若 contract 可解析但存在 blocker 级 diagnostics，命令必须返回失败状态，避免带病进入下一阶段 planning / handoff。

### the agent's Discretion
- heading alias 的具体命名（如 `Non-Goals` vs `Exclusions`）
- diagnostics code / severity 字段命名
- Markdown section parser 的实现方式（行扫描、轻量 tokenizer 或其他无重依赖方案）
- `design validate` 之外是否先预留 `design init` / `design print-template` 的占位，但不得越界实现

</decisions>

<specifics>
## Specific Ideas

- `src/cli/index.ts` 已是当前 top-level command 注册事实源；新增 `design` 时需要同步顶层 help surface。
- `src/cli/config-loader.ts` 已证明 CLI-owned loader / normalization seam 是仓库认可模式；Phase 17 可以沿用同一路线。
- `scripts/validate-docs.js` 与对应 tests 已经承担 public contract guardrail；若不把 design surface 纳入，会重复出现“实现改了、文档没锁住”的旧问题。
- `docs/ai-guide/PATTERNS.md` 当前仍写着 `commit` / `ci` 两个 workflow 阶段，是现成的 drift 样本，适合作为本阶段的入口修复案例。
- 当前仓库没有现成 Markdown contract parser 依赖或通用 frontmatter pipeline，因此 v1 更适合先做低依赖 section parser，而不是引入重型文档栈。

</specifics>

<canonical_refs>
## Canonical References

### Milestone / Requirement
- `.planning/PROJECT.md` — v1.4 的产品边界、风险与 design-to-agent 主线
- `.planning/REQUIREMENTS.md` — `DES-01` / `DES-02` / `DES-03`
- `.planning/ROADMAP.md` — Phase 17 goal、success criteria 与 plan 拆分
- `.planning/STATE.md` — 当前 phase 状态与已确认决策

### Command Surface / Integration
- `src/cli/index.ts` — top-level command 注册事实源
- `src/cli/config-loader.ts` — CLI-owned loader / normalization seam 样板
- `src/cli/commands/workflow.ts` — 当前 workflow public description（四阶段）
- `src/orchestrator/workflow/workflow-orchestrator.ts` — workflow 运行时只执行 analysis-only phase 的事实源

### Docs / Guardrails
- `README.md` — 用户与 agent 的公共入口文档
- `AI_GUIDE.md` — AI 快速参考入口
- `CLAUDE.md` — 检索优先级与开发手册入口
- `docs/ai-guide/COMMANDS.md` — CLI surface 详情
- `docs/ai-guide/OUTPUT.md` — 输出契约事实源
- `docs/ai-guide/PATTERNS.md` — 当前 workflow stage drift 所在位置
- `docs/rules/engineering-with-codex-openai.md` — Codex 工程规则入口
- `scripts/validate-docs.js` — docs guardrail 主检查脚本
- `src/cli/__tests__/validate-docs-script.test.ts` — docs guardrail fixture tests
- `src/cli/commands/__tests__/ci-docs-sync.test.ts` — CLI docs sync guardrail tests

### Architecture / Risk References
- `.planning/codebase/CONCERNS.md` — docs coupling、path drift、planning guidance
- `src/interface/types/index.ts` — Interface Layer 类型出口样式
- `src/infrastructure/parser/` — 当前 parser 基础设施边界（语言解析，不含 design markdown contract）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `config-loader` 模式：可直接借鉴文件发现、默认路径、归一化与 actionable error 的组织方式。
- 顶层 CLI help regression：`src/cli/__tests__/index-help.test.ts` 已是新增/移除命令的标准回归入口。
- docs guardrail：`scripts/validate-docs.js` 与 CI docs sync tests 已形成“实现 ↔ 文档”双向锁。

### Established Patterns
- 新 public CLI surface 一旦变化，就必须同步 README / AI docs / rules / guardrail tests。
- 高 blast-radius 命令面倾向于用 focused Vitest + docs guardrail，而不是一次性跑大而重的新框架。
- Interface / CLI 双层拆分已经在 config surface 上验证过，适合 design contract 复用。

### Integration Points
- `src/cli/index.ts` 是 `design` 命令注册的首个接入点。
- `src/cli/commands/` 是 `design validate` 子命令的自然落点。
- `docs/product-specs/` 适合承载 canonical design contract template。
- Phase 18 会直接消费本阶段产出的 normalized design contract / diagnostics 语义。

</code_context>

<deferred>
## Deferred Ideas

- design contract → candidate files / modules / symbols 的 scope mapping —— Phase 18
- handoff summary / machine-readable handoff JSON —— Phase 19
- design drift verification、验收映射与 CI must-pass 收敛 —— Phase 20
- Figma / issue tracker / PRD 外部输入集成 —— 后续 milestone
- 把 `workflow` 恢复成多角色、多阶段工程编排 —— 明确 out of scope

</deferred>

---

*Phase: 17-design-contract-surface*
*Context gathered: 2026-03-25*
