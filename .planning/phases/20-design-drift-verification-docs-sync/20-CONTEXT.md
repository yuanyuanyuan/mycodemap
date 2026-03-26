# Phase 20: Design Drift Verification & Docs Sync - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning
**Source:** Roadmap Phase 20 goal + `VAL-04` / `DOC-07` / `VAL-05` requirements + Phase 17/18/19 carry-forward decisions + codebase scout

<domain>
## Phase Boundary

本阶段收口 `v1.4` 的第四段闭环：
1. 把 design contract 中的 `Acceptance Criteria` 变成实现后可执行的 verification checklist 与 design-vs-implementation drift report；
2. 用已验证的 design / mapping / handoff truth 检查实现是否仍在批准范围内，而不是只在实现前做 review；
3. 把 README、AI docs、rules、guardrail tests 与 CI 说明统一到真实链路 `design validate → design map → design handoff → design verify` 上。

本阶段**不**新增 autonomous execution surface、**不**重开 `workflow` 的非分析阶段、**不**把 `analyze` public intent 扩回大杂烩、**不**实现显式 approval mutation command、**不**让 `Phase 21` 抢占当前主线。

</domain>

<decisions>
## Implementation Decisions

### Verification surface
- **D-01:** verification 继续挂在 purpose-built `design` seam 下，推荐采用独立 `design verify`（或等价 verify 子命令）承接 Phase 20；不把 post-implementation drift 检查塞回 `handoff`、`workflow` 或 `ci` phase 语义。
- **D-02:** verification 入口必须同时输出 machine-readable checklist / drift structure 与简短 human summary；不能只剩 exit code，也不能退回 prose-only 审核说明。
- **D-03:** 如果 handoff artifact 缺失、过时，或 mapping truth 本身仍是 blocker，verification 必须显式返回 diagnostics / review-needed 状态，而不是从自由文本重新猜 scope。

### Drift truth & acceptance mapping
- **D-04:** `Acceptance Criteria` 是唯一 checklist canon；每条 criteria 都要映射成具备状态和证据引用的 verification item，而不是人工重写一份“差不多”的检查清单。
- **D-05:** drift report 至少区分 `satisfied`、`needs-review`、`violated/blocked` 三类状态；除了未满足的 acceptance items，还要暴露超出批准范围的实现触点或文档声明。
- **D-06:** `design handoff` 的 reviewed scope 继续作为“计划内 vs 漂移”的边界；实现中额外 touched files / claims 不能事后自动洗白为“其实也算范围内”。

### Docs / guardrail closure
- **D-07:** Phase 20 的 docs sync 是完整闭环，不再沿用 Phase 18/19 的“只做最小 sync”策略；README、AI_GUIDE、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`、`docs/ai-guide/PATTERNS.md`、相关 `docs/rules/*`、guardrail scripts/tests 与 CI 入口都要反映 verify 链路。
- **D-08:** `workflow` 仍保持 analysis-only `find → read → link → show`；verification 是 design-sidecar 能力，不得在任何文档或护栏里被重新叙述为 workflow 的 `commit` / `ci` phase。

### Failure rehearsal & milestone evidence
- **D-09:** 端到端证据采用 repo-local、fixture-driven 路线：至少一条 ready-path success fixture，加上三类失败预演：缺失 design sections、scope blocker（no-match / over-broad / high-risk）、handoff/docs/command contract drift。
- **D-10:** milestone audit 证据必须来自真实命令链和产物，而不是人工口述；需要能证明“人类设计 → validate → map → handoff → verify → docs/CI guardrail”在成功和失败路径都可复现。

### the agent's Discretion
- verification output 的精确字段命名、markdown heading 顺序与 artifact 呈现形式
- evidence refs 的细粒度（文件、测试、diagnostic、artifact path 的组合方式）
- drift report 是 inline 输出还是 sidecar artifact，只要不违背现有 path/output discipline

</decisions>

<specifics>
## Specific Ideas

- 应补一份“零未决项” fixture，避免继续复用 `handoff-basic.design.md`；该夹具当前仍会走 non-blocking `review-required` 路径，不适合作为 ready-path 闭环示例。
- verification checklist 应直接派生自 `Acceptance Criteria` bullets，而不是在 README 或测试里手写第二份不受约束的检查清单。
- docs/CI guardrail 应把 `design validate → design map → design handoff → design verify` 视为真实设计链路，并继续显式阻断把 `workflow` 写回多阶段工程编排的文档漂移。
- 当前没有额外竞品、外部系统或 UI 叙事约束；按 conservative、fixture-first、traceability-first 路线推进即可。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone / Requirement
- `.planning/PROJECT.md` — `v1.4` 产品边界、human ownership、docs sync 与 purpose-built surface 约束
- `.planning/REQUIREMENTS.md` — `VAL-04` / `DOC-07` / `VAL-05` 的正式验收要求
- `.planning/ROADMAP.md` — Phase 20 goal、success criteria 与 `20-01/02/03` 拆分
- `.planning/STATE.md` — 当前 phase 状态、主线顺序与 follow-up `Phase 21` 边界

### Prior Phase Decisions & Evidence
- `.planning/phases/17-design-contract-surface/17-CONTEXT.md` — design input surface、workflow boundary 与 docs drift 前置决策
- `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md` — mapping blockers、structured output 与 failure-first 原则
- `.planning/phases/19-handoff-package-human-gates/19-CONTEXT.md` — handoff truth、artifact path、review-needed gate 与 docs boundary
- `.planning/phases/18-design-to-code-mapping/18-UAT.md` — `design map` success/blocker/docs surface 已验收的事实
- `.planning/phases/19-handoff-package-human-gates/19-UAT.md` — `design handoff` help/human/json/gate/docs surface 已验收；并记录 ready-path fixture gap
- `.planning/phases/19-handoff-package-human-gates/19-03-SUMMARY.md` — handoff 继续挂在 `design` seam、不新增 top-level surface 的总结

### Design / Mapping / Handoff Truth
- `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md` — design contract canonical authoring sample，定义 `Acceptance Criteria` / `Open Questions`
- `src/interface/types/design-contract.ts` — design section ids 与 diagnostics shape
- `src/interface/types/design-handoff.ts` — handoff traceability、`readyForExecution` 与 diagnostics contract
- `src/cli/design-contract-loader.ts` — validated / normalized design input 的事实源
- `src/cli/design-scope-resolver.ts` — candidate scope、risk、test impact、unknowns 的事实源
- `src/cli/design-handoff-builder.ts` — canonical handoff truth builder、review-needed / blocked semantics
- `src/cli/commands/design.ts` — `design validate` / `design map` / `design handoff` 的现有 public seam

### Docs / Guardrail Truth
- `README.md` — 用户入口、design workflow 示例与 workflow boundary 说明
- `AI_GUIDE.md` — AI 速查入口与 design/handoff output 摘要
- `docs/ai-guide/COMMANDS.md` — public CLI 命令事实源
- `docs/ai-guide/OUTPUT.md` — machine-readable output contract 事实源
- `docs/ai-guide/PATTERNS.md` — design-driven flow 与 analysis-only workflow 叙事
- `docs/rules/engineering-with-codex-openai.md` — CLI 护栏与 CI gate 基线
- `docs/rules/validation.md` — 最小验证顺序、失败模式与 must-pass 命令
- `scripts/validate-docs.js` — docs guardrail 主检查脚本
- `src/cli/__tests__/validate-docs-script.test.ts` — docs drift fixture tests
- `src/cli/commands/__tests__/ci-docs-sync.test.ts` — CLI docs sync helper tests
- `.github/workflows/ci-gateway.yml` — 当前 CI must-pass 验证链

### Codebase Conventions
- `.planning/codebase/CONVENTIONS.md` — `--json` / human output / docs sync / layering 规则
- `.planning/codebase/STRUCTURE.md` — 新 command、contract、guardrail 与 tests 的落点
- `.planning/codebase/CONCERNS.md` — high blast-radius entry points、docs coupling、path drift 风险
- `.planning/codebase/TESTING.md` — fixture / temp-dir / focused regression 测试模式
- `.planning/codebase/INTEGRATIONS.md` — docs guardrail 与 CI integration 现状

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/cli/design-contract-loader.ts`：已经把 Markdown contract 归一化成可消费结构，可直接复用 `Acceptance Criteria` / `Open Questions` 原始事实。
- `src/cli/design-scope-resolver.ts`：已经产出 scope candidates、risk、test impact 与 blocker diagnostics，是 drift report 的上游范围真相。
- `src/cli/design-handoff-builder.ts`：已经把 approvals、assumptions、openQuestions 与 `readyForExecution` 固定成 canonical handoff truth，可作为 verification 的 review boundary。
- `src/cli/commands/design.ts`：现有 `design` seam 已承载 validate/map/handoff，是新增 verify surface 的最自然入口。
- `scripts/validate-docs.js`、`src/cli/__tests__/validate-docs-script.test.ts`、`src/cli/commands/__tests__/ci-docs-sync.test.ts`：现成 docs/CI guardrail 管道与 fixture harness，可直接扩展。

### Established Patterns
- public design workflow 优先走独立 `design` sidecar surface，不回灌到 `analyze` / `workflow` 的核心 contract。
- 分析型命令默认要求 `--json` 纯结构化输出，同时保留简短 human-readable summary 或 artifact path。
- 任何 public contract 变化都必须同步 README、AI docs、rules、guardrail scripts/tests 与 CI 说明。
- 仓库偏好 focused Vitest regression + fixture / temp-dir 失败预演，而不是只写手动 narrative。

### Integration Points
- `src/interface/types/` 适合新增 verify/checklist/drift report contract。
- `src/cli/` 适合新增 verification builder / renderer，并由 `src/cli/commands/design.ts` 暴露 CLI 入口。
- `scripts/validate-docs.js` 与现有 docs tests 是 verify narrative 与 workflow boundary 的主护栏扩展点。
- `.github/workflows/ci-gateway.yml` 与 `ci check-docs-sync` 仍是 must-pass docs closure 入口；若 verify 成为公开链路，相关验证需要在这里闭环。

</code_context>

<deferred>
## Deferred Ideas

- 显式的 handoff approval / sign-off mutation command 或持久化审批账本 —— future phase
- 把 verify 结果直接接到 autonomous executor / `ship` / workflow mutation —— 不属于当前 `v1.4` 边界
- 外部设计输入集成（Figma / issue tracker / PR system）—— future milestone
- ArcadeDB 可行性评估与存储路线决策 —— `Phase 21`

</deferred>

---

*Phase: 20-design-drift-verification-docs-sync*
*Context gathered: 2026-03-26*
