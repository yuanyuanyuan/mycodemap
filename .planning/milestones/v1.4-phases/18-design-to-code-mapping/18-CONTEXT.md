# Phase 18: Design-to-Code Mapping - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning
**Source:** Roadmap Phase 18 goal + v1.4 requirements + Phase 17 carry-forward decisions + codebase scout

<domain>
## Phase Boundary

本阶段只处理“design contract → code scope mapping”的第二段闭环：
1. 基于已验证的 design contract，输出 candidate files / modules / symbols 与可审计的原因链；
2. 补齐 dependencies、test impact、risk、confidence 与 unknowns 元数据，使结果足以支持人类 review；
3. 对 no-match、over-broad 与 high-risk 范围给出显式阻断，并要求人类补充 design，而不是继续假装可以规划。

本阶段**不**生成 Phase 19 的 handoff package、**不**实现 Phase 20 的 drift verification / docs sync / CI guardrail、**不**扩写 `analyze` public intent、**不**恢复 `workflow` 的 `commit` / `ci` phase、**不**让 Phase 21 抢占当前主线路径。

</domain>

<decisions>
## Implementation Decisions

### Mapping surface
- **D-01:** mapping 能力继续走 purpose-built 的 design / handoff 旁路，不新增 `analyze` public intent，也不改写 `workflow` 四阶段语义。
- **D-02:** `Phase 18` 的 scope resolver 可以**内部复用**现有 `query` / `analyze` / `impact` / `test-linker` 能力，但对外必须围绕 design contract 组织统一输出，不能把旧命令结果原样拼贴成“映射结果”。
- **D-03:** Phase 17 产出的 normalized design contract 仍是唯一输入真相；映射阶段不得回退到自由文本猜测，也不得绕过 `Goal` / `Constraints` / `Acceptance Criteria` / `Non-Goals` 语义。

### Matching heuristics
- **D-04:** candidate 识别采用“boundary-first 多信号”策略：先消费 design contract 中的显式 scope anchors（目标、约束、验收、非目标里的关键词 / 模块名 / 路径边界），再用 code map 搜索、依赖关系与结构分析补足 files / modules / symbols。
- **D-05:** 每个 candidate 都必须附带 reason chain，至少说明命中来自哪个 design section、哪个关键词或路径线索，以及哪条代码图证据支撑；只给文件清单视为未完成。
- **D-06:** `Non-Goals` / exclusions 必须参与 negative filtering；被 design contract 明确排除的模块或 surface，不能因为模糊关键词再次进入 candidate set。

### Output contract
- **D-07:** Phase 18 输出以 machine-readable structure 为主，同时保留简短 human-readable summary 方便 review；但不提前升级成 Phase 19 的完整 handoff package。
- **D-08:** 每个 candidate 或 candidate group 至少产出 `dependencies`、`test impact`、`risk`、`confidence`、`unknowns` 五类元数据；其中 `test impact` 优先复用现有 `test-linker`，而不是新造一套人工映射。
- **D-09:** `confidence` 必须与证据密度绑定：显式 path / module anchor + dependency corroboration 应高于纯关键词模糊命中；低证据命中只能保守降级，不能伪装成高置信 scope。

### Failure handling
- **D-10:** no-match、over-broad、high-risk 统一视为 blocker 级 mapping failure，返回“需要人类补充设计”的明确 diagnostics，而不是继续进入 plan / handoff。
- **D-11:** over-broad 默认按保守策略判定：若 candidates 同时跨越多个无关子系统、主要命中高 blast-radius 入口，或超过人类可审查的候选集合规模，则直接阻断并要求补充更具体的 scope anchors。
- **D-12:** high-risk 评估优先关注 `src/cli/index.ts`、`src/cli/commands/analyze.ts`、`src/orchestrator/workflow/workflow-orchestrator.ts` 等高 blast-radius 入口；除非 design contract 明确点名，否则命中这些文件应默认升级为人工确认。
- **D-13:** 至少保留 3 类 fixture / validation path：success、no-match、over-broad / high-risk；沿用 Phase 17 已验证的“显式失败比隐式猜测更重要”原则。

### the agent's Discretion
- multi-signal ranking 的具体权重与 score 公式
- over-broad 的精确 numeric threshold（前提是不违背保守阻断原则）
- mapping artifact 的最终路径、字段命名与 CLI 展示细节（前提是不越界到 Phase 19 handoff surface）
- reason chain 的展示格式（列表、树、trace 数组等）

</decisions>

<specifics>
## Specific Ideas

- `mycodemap.design.md` 与其 normalized sections 继续作为 mapping 的起点；不要再把自由提示词当成正式 design 输入。
- `Phase 18` 的成功结果应该让 reviewer 能看见“为什么是这些文件 / 模块 / 符号”，而不是只看见搜索命中列表。
- `Phase 17` 已经有成功 / 缺失必填段 fixture；`Phase 18` 应按同样思路补 `scope` 成功与失败夹具，而不是只覆盖 happy path。
- 当前没有额外用户参考产品或竞品要求；按 conservative、review-first 的标准路线推进即可。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / Requirement
- `.planning/PROJECT.md` — v1.4 产品边界、输出纪律与 purpose-built surface 约束
- `.planning/REQUIREMENTS.md` — `MAP-01` / `MAP-02` / `MAP-03` 的正式验收要求
- `.planning/ROADMAP.md` — Phase 18 goal、success criteria 与 18-01/02/03 计划拆分
- `.planning/STATE.md` — 当前 phase 状态、主线顺序与已确认决策

### Prior Phase Decisions
- `.planning/phases/17-design-contract-surface/17-CONTEXT.md` — Phase 17 锁定的 design surface、layering 与 failure-handling 前置决策
- `.planning/phases/17-design-contract-surface/17-02-SUMMARY.md` — `design validate`、fixtures、顶层 help surface 已经落地的事实摘要
- `.planning/phases/17-design-contract-surface/17-VALIDATION.md` — Phase 17 的 fixture / smoke validation 约束，可复用到 Phase 18 失败预演

### Design Input Truth
- `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` — design contract 的 canonical authoring sample
- `src/interface/types/design-contract.ts` — design contract 正式类型、sections 与 diagnostics shape
- `src/cli/design-contract-loader.ts` — normalized design contract、blocking diagnostics 与 section parser 事实源
- `src/cli/commands/design.ts` — `design validate` CLI surface 与 JSON output seam
- `tests/fixtures/design-contracts/valid-basic.design.md` — success-path design fixture
- `tests/fixtures/design-contracts/missing-acceptance.design.md` — blocker failure precedent

### Mapping Building Blocks
- `src/cli/commands/query.ts` — 现有 search / symbol / deps 查询能力
- `src/cli/commands/analyze.ts` — `find/read/link/show` 聚合、confidence 组装、risk/test enrichment 事实源
- `src/cli/commands/impact.ts` — impact/dependent 范围分析事实源
- `src/orchestrator/test-linker.ts` — test impact 解析与 source→test mapping seam

### Architecture / Risk Guidance
- `.planning/codebase/CONVENTIONS.md` — CLI/output/type discipline 与 docs sync 习惯用法
- `.planning/codebase/STRUCTURE.md` — 新代码与测试应落在哪些目录
- `.planning/codebase/ARCHITECTURE.md` — hybrid architecture 与 layered boundary 背景
- `.planning/codebase/CONCERNS.md` — 高 blast-radius 入口、docs coupling 与 failure modes
- `docs/ai-guide/COMMANDS.md` — 当前 CLI public surface 说明
- `docs/ai-guide/OUTPUT.md` — machine-readable output 契约事实源

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/design-contract-loader.ts`：已经把 Markdown contract 归一化成可消费结构，Phase 18 不需要重复做 design parsing。
- `src/cli/commands/analyze.ts`：现成聚合 `find/read/link/show`，并已组装 `confidence`、`risk`、`location` 与 test enrichment，可作为 scope resolver 的分析基座。
- `src/cli/commands/impact.ts`：已能输出 direct / transitive dependent 范围，适合补足 candidate 的 dependency / blast-radius 说明。
- `src/orchestrator/test-linker.ts`：已提供 source→test 关联能力，是 `test impact` 的自然复用点。
- `src/cli/__tests__/index-help.test.ts` 与 Phase 17 的 design tests：说明仓库偏好 focused regression + fixture 验证，而不是一次性上重型 E2E。

### Established Patterns
- 新 public surface 一旦变化，就要同步 docs / guardrail tests；因此 Phase 18 应尽量复用已有 public contract，而不是扩大 CLI 爆炸半径。
- 当前仓库接受 machine-readable 输出优先，但仍要求 human review 可读；这正好约束 mapping result 走“结构化主、摘要辅”的路径。
- legacy CLI 与 MVP3 layered architecture 并存；新 mapping 抽象应优先放在 `src/interface/` / `src/domain/` / `src/infrastructure/`，避免继续向 `src/core/` 堆责任。

### Integration Points
- `src/cli/commands/design.ts` 或其邻近 seam 是最自然的 design-driven 入口延展点。
- `src/interface/types/design-contract.ts` 是 future mapping / handoff 共享输入语义的上游契约点。
- `src/cli/commands/analyze.ts`、`src/cli/commands/query.ts`、`src/cli/commands/impact.ts` 是构建 mapping evidence chain 的现成内部积木。
- `tests/fixtures/design-contracts/` 与 `src/cli/commands/__tests__/` / `src/cli/__tests__/` 是新增 success / failure fixtures 的自然落点。

</code_context>

<deferred>
## Deferred Ideas

- 完整 human-readable summary + machine-readable handoff artifact —— Phase 19
- approvals / assumptions / open questions 持久化追踪 —— Phase 19
- design acceptance → verification checklist / drift report —— Phase 20
- docs / CI guardrail 对 new mapping / handoff surface 的完整同步 —— Phase 20
- 外部设计输入集成（Figma / issue tracker / PR system）—— 后续 milestone

</deferred>

---

*Phase: 18-design-to-code-mapping*
*Context gathered: 2026-03-25*
