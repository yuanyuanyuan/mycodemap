# Phase 29: Rewrite the three entry docs to constitution / router / adapter roles - Context

**Gathered:** 2026-04-22  
**Status:** Ready for planning  
**Source:** `Phase 28` migration map + current entry-doc audit + autonomous smart discuss defaults

<domain>
## Phase Boundary

本 phase 直接重写三份入口文档：`AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`。  
目标是把它们分别收敛为：

- `AGENTS.md` = constitution
- 根 `CLAUDE.md` = pure router
- `.claude/CLAUDE.md` = thin Claude adapter

本 phase 同时允许对**已锁定 destination** 做最小补写，以接住从入口文档迁出的执行协议与文档 authoring 细节；但不做全仓 discoverability sweep，那属于 Phase 30。

</domain>

<decisions>
## Implementation Decisions

### Entry-doc role contract
- `AGENTS.md` 只保留仓库级治理协议、证据协议、任务分级、改动边界、验证/交付底线，以及一条 RTK 原则级约束。
- 根 `CLAUDE.md` 只保留角色说明、加载顺序、问题到 live docs 的路由表、以及“规则该改哪份真相文档”的提示。
- `.claude/CLAUDE.md` 只保留 Claude 自动读取行为、authority chain 与 adapter 非目标说明，不再承载通用工程政策。

### Compression / migration strategy
- 不在入口文档保留压缩版执行回路、命令清单、验证命令、commit 策略、任务模板或交付 checklist。
- 若目标文档已持有真相，则入口文档只做 link / route；不再复写 prose 摘要。
- `AGENTS.md` 的详细 docs-sync 触发表、AI 友好文档规范、RTK 速查表必须迁出或压缩，不得继续占据宪法层。

### Destination supplements allowed in this phase
- `docs/rules/engineering-with-codex-openai.md` 需要补齐：入口文档角色说明、任务初始化最小模板、AI 友好文档 authoring / doc-sync 细则。
- `docs/rules/validation.md`、`RTK.md`、`AI_GUIDE.md` 若已有真相则本 phase 不重写，只在 Phase 30 统一做 discoverability 同步。
- `Phase 28` 迁移图继续作为 source-of-truth；所有 rewrite 决策都要能回溯到该工件。

### the agent's Discretion
- 根 `CLAUDE.md` 使用“按问题路由表”还是“按文档角色表”为主，由实现阶段在不突破 pure-router 边界的前提下决定。
- `.claude/CLAUDE.md` 的文案可尽量薄，但必须明确“本文件不再定义第二套规则”。

</decisions>

<specifics>
## Specific Ideas

- 根 `CLAUDE.md` 的目标不是“更短的手册”，而是“只有路由，没有正文”。
- `.claude/CLAUDE.md` 应该显式告诉 Claude：先遵循 `AGENTS.md`，再用根 `CLAUDE.md` 找下一份 live doc。
- `docs/rules/engineering-with-codex-openai.md` 已经是 moved operational content 的正确落点，因此本 phase 只做 targeted supplement，不新建规则层。

</specifics>

<canonical_refs>
## Canonical References

- `.planning/phases/28-entry-doc-authority-and-destination-map/28-ENTRY-DOC-MIGRATION-MAP.md`
- `.planning/phases/28-entry-doc-authority-and-destination-map/28-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.claude/CLAUDE.md`
- `docs/rules/engineering-with-codex-openai.md`
- `docs/rules/validation.md`
- `RTK.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/rules/README.md` 已有“改哪类文件先读哪份规则”的路由索引
- `docs/rules/validation.md` 已有验证顺序与 rule-system defaults
- `docs/rules/engineering-with-codex-openai.md` 已有工程执行协议与最小交付清单
- `RTK.md` 已是 RTK 速查真相

### Established Patterns
- 入口文档应短小、只做 authority / routing；细节下沉到 `docs/rules/*`、`AI_GUIDE.md`、`ARCHITECTURE.md`
- 规则正文应只在一个 live doc 中维护；入口文档不再保留第二份摘要

### Integration Points
- 本 phase 会直接修改 `AGENTS.md`、`CLAUDE.md`、`.claude/CLAUDE.md`
- 本 phase 允许最小补写 `docs/rules/engineering-with-codex-openai.md`
- Phase 30 将负责同步 `README.md`、`AI_GUIDE.md`、`ARCHITECTURE.md`、`ai-document-index.yaml`、`llms.txt` 等 discoverability surfaces

</code_context>

<deferred>
## Deferred Ideas

- 全局 discoverability sweep 与 “执行手册” 残留引用清理留到 Phase 30
- 入口文档重复 drift 自动检测与任何新治理中间层继续 deferred

</deferred>
