# Phase 28: Entry-doc authority and destination map - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Source:** Canonical requirements doc + current entry-doc audit

<domain>
## Phase Boundary

本 phase 只负责为 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md` 建立 section 级迁移图，并锁定每一类被移出内容应该落到哪份现有 live 文档。

本 phase 不直接把三份入口文档全部重写完成；它先产出后续 Phase 29/30 需要遵循的 authority split、destination ownership、discoverability guardrail 与迁移方法。  
本 phase 也不引入新的治理中间层、自审系统、重复检测自动化或 ghost commands 全量修复。

</domain>

<decisions>
## Implementation Decisions

### Entry-doc role split
- **D-01:** `AGENTS.md` 保留仓库级宪法内容：作用域与优先级、文档职责分层、任务分级、证据协议、检索优先级、改动边界、验证底线、交付底线。操作清单、工具专属适配、长命令列表和产品命令速查都必须离开。
- **D-02:** 根 `CLAUDE.md` 收敛为纯路由页。允许保留：一句话角色声明、加载顺序、去哪读下一份文档、必要的导航型路径表。不得保留：执行回路模板、验证命令块、默认值、dogfood 命令、交付 checklist。
- **D-03:** `.claude/CLAUDE.md` 收敛为 Claude 专属 adapter。允许保留：Claude 自动读取/装配差异、与根 `AGENTS.md` / 根 `CLAUDE.md` 的关系说明。不得保留：TDD、commit、验证政策、快速命令、任务模板、第二套执行手册。

### Destination ownership
- **D-04:** 验证顺序、默认 post-edit 检查、repo-local rule gate 语义、rule-system 默认值等操作性内容归 `docs/rules/validation.md`；`.claude/rule-system.config.json` 继续作为默认值的 machine truth。
- **D-05:** 执行回路、Plan/Build/Verify 表达、TDD/commit/verification 行为、任务初始化模板、交付 checklist 等工程执行协议归 `docs/rules/engineering-with-codex-openai.md`；`AGENTS.md` 只保留仓库级底线和触发条件。
- **D-06:** CodeMap CLI dogfood、工具发现、命令速查、产品使用提示归 `AI_GUIDE.md` 与 `docs/ai-guide/*`；这些内容不再停留在入口文档。
- **D-07:** “改某类文件先读哪份规则”这一导航问题优先归 `docs/rules/README.md`；根 `CLAUDE.md` 可以指向它，但不应重复规则正文。
- **D-08:** RTK 命令速查与 shell 包装细节归 `RTK.md`；`AGENTS.md` 如需保留，只保留一句原则级约束，不再保留长表格。

### Section-mapping method
- **D-09:** Phase 28 的交付物必须显式列出 `source file + source section + destination file + why`，不能只写“迁回 live docs”这类抽象描述。
- **D-10:** 若目标文档已经包含所需真相，则后续 phase 直接映射到现有段落；只有在 discoverability 真有缺口时，才补写目标文档，而不是机械复制一遍。

### Discoverability guardrails
- **D-11:** `docs/rules/README.md` 与 `AI_GUIDE.md` 的后续调整只能是导航增强，不能重新长成第二套规则正文。
- **D-12:** `docs/rules/README.md` 负责回答“规则去哪读”；`AI_GUIDE.md` 负责回答“产品/工具怎么用”；两者角色不得混写。

### Current migration targets already visible
- **D-13:** 根 `CLAUDE.md` 当前的 `执行回路`、`修改后必须执行`、`Rule-system 默认值`、`CodeMap CLI Dogfood`、`交付清单` 都是明确的迁移对象；`加载顺序` 保留，`路径路由` 只在压缩成纯导航时允许保留。
- **D-14:** `.claude/CLAUDE.md` 当前的 `强制执行规则`、`禁止行为`、`Commit 策略`、`快速参考`、`任务初始化模板` 都必须离开 adapter。

### the agent's Discretion
- 根 `CLAUDE.md` 最终采用“路径表 / 场景表 / 最小导航清单”哪一种表现形式，由 planner 在不破坏 pure-router 边界的前提下决定。
- `.claude/CLAUDE.md` 最终采用“引用说明 / 装配说明 / 最小导入提示”哪种文案，由 planner 在不形成第二套政策文本的前提下决定。
- Phase 28 的 section 映射表是写进 plan artifacts 还是同时在 live nav doc 留极简指针，由 planner 决定；前提是不新增治理中间层。

</decisions>

<specifics>
## Specific Ideas

- 当前根 `CLAUDE.md` 的高风险重复区块已经非常清晰：`执行回路`、`修改后必须执行`、`Rule-system 默认值`、`CodeMap CLI Dogfood`、`交付清单`。
- 当前 `.claude/CLAUDE.md` 已经形成“第二套 Claude 手册”的症状：它不仅声明了项目特定指令，还重复了通用政策、验证命令、提交策略与任务模板。
- `docs/rules/engineering-with-codex-openai.md` 已经写明“地图优于手册”，这应作为本 phase 的设计原则，而不是再发明新的入口规则。
- `docs/rules/validation.md` 已经持有验证顺序、rule-system 默认值与 gate 说明；Phase 29 应优先复用，而不是再写第三份摘要。
- `AI_GUIDE.md` 已经持有工具发现与命令速查；Phase 29 只应检查是否还缺入口导航，而不是再在 `CLAUDE.md` 里保留 dogfood 命令块。

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and locked requirements
- `.planning/ROADMAP.md` — Phase 28 goal、depends on、success criteria
- `.planning/REQUIREMENTS.md` — `DEST-01`、`DEST-02`、`ROUTE-04` 与整个 milestone 的 traceability
- `.planning/PROJECT.md` — `v1.8` milestone goal、active scope、out-of-scope framing
- `.planning/STATE.md` — current phase, deferred items, milestone status
- `docs/brainstorms/2026-04-22-rules-entry-docs-phase1-structure-consolidation-requirements.md` — canonical phase requirements, locked decisions, deferred-to-planning questions

### Entry docs under migration
- `AGENTS.md` — 当前仓库级宪法 + 大量操作性内容混合的入口面
- `CLAUDE.md` — 当前 root router，同时仍携带执行/验证/dogfood/checklist 内容
- `.claude/CLAUDE.md` — 当前 Claude-specific 文件，但仍重复通用执行政策与模板

### Destination docs and machine truth
- `docs/rules/README.md` — 当前 rules 导航索引，回答“先读哪份规则”
- `docs/rules/validation.md` — 验证顺序、repo-local rule validator、rule-system defaults、CI gateway truth
- `docs/rules/engineering-with-codex-openai.md` — 工程执行协议、entry-doc downflow 原则、doc-sync trigger
- `AI_GUIDE.md` — AI / agent 工具发现、命令速查、文档导航
- `ARCHITECTURE.md` — 系统地图与分层边界真相，说明哪些内容不该停留在入口文档
- `.claude/rule-system.config.json` — `enabled` / `route_by_edit_path` / `soft_gate` / `hard_gate.mode` 的 machine truth
- `RTK.md` — RTK 使用原则与速查，不应再由 `AGENTS.md` 承担长命令表

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/rules/README.md` 的“场景 → 文档”索引：可直接复用为后续 root `CLAUDE.md` 的导航参考，而不必重新设计一套规则路由系统
- `docs/rules/validation.md` 的“最小验证顺序”与 `Repo-local rule validator` 段落：已经覆盖 root `CLAUDE.md` 当前重复的验证命令与默认值
- `docs/rules/engineering-with-codex-openai.md` 的“地图优于手册”“最小交付清单”“当前项目的 CLI/CI 护栏”：已经覆盖 `.claude/CLAUDE.md` 与 root `CLAUDE.md` 当前重复的大部分执行协议
- `AI_GUIDE.md` 的“快速开始”“命令选择速查表”“文档导航”：已经覆盖 root `CLAUDE.md` 的 dogfood / 命令发现内容
- `RTK.md` 的简短代理说明：已经是 RTK 快速参考的更合适承载面

### Established Patterns
- 这个仓库已经有清晰的“入口短、细节下沉”模式：`ARCHITECTURE.md` 只回答系统地图，`docs/rules/*` 持有规则正文，`AI_GUIDE.md` 持有工具发现
- 可执行默认值应优先放在 config 或代码相邻真相文件，例如 `.claude/rule-system.config.json`，而不是让入口文档再维护一份 prose 版默认值
- live 文档已经按“导航索引 vs 规则正文 vs 产品使用”分层；Phase 28 要做的是把 entry docs 拉回这条既有分层，而不是重新发明目录结构

### Integration Points
- Phase 29 将直接改写 `AGENTS.md`、`CLAUDE.md`、`.claude/CLAUDE.md`
- Phase 29 可能同步补写 `docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`、`AI_GUIDE.md`、`docs/rules/README.md`、`RTK.md`
- Phase 30 将用 `npm run docs:check` 与 `node dist/cli/index.js ci check-docs-sync` 验证新的入口网络没有再形成重复规范面

</code_context>

<deferred>
## Deferred Ideas

- 入口文档重复 drift 的自动检测 / 自审机制
- ghost commands、验证可信度、archive/live 身份治理
- 任何新的治理中间层、生成式文档系统或额外规则承接机制
- 若 Phase 29/30 发现还需要更系统的导航治理，只能作为后续 milestone 决策，不在当前 phase 扩 scope

</deferred>

---

*Phase: 28-entry-doc-authority-and-destination-map*
*Context gathered: 2026-04-22*
