---
date: 2026-04-22
topic: harness-rules-entry-docs-optimization
focus: 基于 harness mode 优点与 2026-04 最新 Codex / Claude Code 官方 + 社区实践，重构 rules、AGENTS.md、CLAUDE.md 的职责与加载方式
mode: repo-grounded
---

# Ideation: Harness-aligned rules and entry docs optimization

## Grounding Context

### Codebase Context

- [证据] 仓库已经明确把入口文档定义为“强约束 + 路由”，并把 `AGENTS.md` 定义为仓库级强约束、把 `CLAUDE.md` 定义为启动清单与最小操作手册：`AGENTS.md:3`、`AGENTS.md:14`、`AGENTS.md:15`。
- [证据] `CLAUDE.md` 仍同时承载固定 post-edit 命令、rule-system 默认值与交付清单，已经不只是“入口路由”：`CLAUDE.md:25`、`CLAUDE.md:41`、`CLAUDE.md:59`、`CLAUDE.md:63`、`CLAUDE.md:83`。
- [证据] `docs/rules/README.md` 已主张“先路由、再按需下钻”，`docs/rules/validation.md` 已主张“按改动类型做最小验证”，与根入口中的“统一大礼包命令”存在张力：`docs/rules/README.md:19`、`docs/rules/validation.md:5`、`docs/rules/validation.md:29`、`docs/rules/validation.md:31`。
- [证据] 任务分级、可信度自评、代码红线等核心治理内容已在多处重复陈述，truth source 不单一：`AGENTS.md:43`、`AGENTS.md:100`、`AGENTS.md:127`、`docs/rules/engineering-with-codex-openai.md:15`、`docs/rules/engineering-with-codex-openai.md:89`、`docs/rules/engineering-with-codex-openai.md:193`。
- [推论] 当前问题更像“入口过载 + 多真相竞争”，而不是“规则还不够多”；优化重点应是职责重划与加载路径重写，而不是继续往根文件里加内容。

### External Context

- [证据] OpenAI Codex 官方 `AGENTS.md` 指南强调：指令文件要长期有效、优先写项目特有信息、复杂说明要拆到配套 markdown，并且“保持可快速扫读”；同时建议通过回顾重复错误，把稳定流程沉淀成更专门的技能而不是不断膨胀入口文件。来源：https://developers.openai.com/codex/guides/agents-md 与 https://developers.openai.com/codex/learn/best-practices 。
- [证据] Claude Code 官方 memory 文档明确建议把共享 memory 控制在约 200 行以内；超过后应拆到额外文件并用 `@path` 导入；同时支持在 `CLAUDE.md` 中直接导入 `AGENTS.md`，以及用 `.claude/rules/` + `paths:` 做按路径加载。来源：https://code.claude.com/docs/en/memory 。
- [证据] Claude Code 官方 best practices 强调：上下文窗口很快会塞满，长会话性能会下降；应把通用或高频操作下沉为子目录 `CLAUDE.md`、hooks、命令或技能，而不是让根文件继续变长；hooks 适合确定性动作，`CLAUDE.md` 更适合行为指导。来源：https://code.claude.com/docs/en/best-practices 与 https://docs.anthropic.com/en/docs/claude-code/hooks 。
- [证据] 2026-04-21 的社区语料分析（RepoRails）统计了 28,721 个 coding-agent 项目，发现 instruction 文件只有 27.2% 的原子陈述是真正可执行指令，89.9% 缺少具体构造；同时 37% 的项目已是多 agent 配置，最常见组合之一就是 Claude + Codex。来源：https://dev.to/reporails/the-state-of-ai-instruction-quality-35mn 。
- [证据] 2026-02-12 的论文《Do AGENTS.md Files Help LLM-Based Code Generation Agents?》指出：上下文文件并非总是提升效果，过量要求会拉低成功率并增加 token 消耗；作者建议只保留执行任务所需的最小要求。来源：https://arxiv.org/abs/2602.11988 。
- [证据] 高信号社区实践也在收敛到“基础记忆 + hooks/settings + skills/agents/rules 分层”而不是单一超级入口文件。一个近期公开示例把 `CLAUDE.md`、settings、hooks、agents、skills、`rules/` 分成独立治理面。来源：https://github.com/ChrisWiles/claude-code-showcase 。

### Past Learnings

- [推论] 本仓库已经具备 harness 友好的关键机制：`route_by_edit_path`、`soft_gate` / `hard_gate`、场景化验证矩阵、短入口路线图；真正缺的是“谁是 live truth source”的清晰边界，而不是新机制本身：`CLAUDE.md:61`、`CLAUDE.md:62`、`CLAUDE.md:63`、`docs/rules/validation.md:10`、`docs/rules/validation.md:21`。
- [推论] 因为仓库已经同时面向 Claude 与 Codex，任何继续复制规则到多份入口文件的做法，都会与外部多-agent 收敛趋势正面冲突。

## Ranked Ideas

### 1. One Constitution, Two Adapters
**Description:** [推论] 把 `AGENTS.md` 收缩为唯一共享“治理宪法”：只保留风险分级、证据协议、改动边界、truth-source map、文档职责分层；把 `CLAUDE.md` 收缩为 Claude 适配层，只保留 `@AGENTS.md`、Claude 专属能力边界、检索顺序、最小入口 checklist。
**Rationale:** [推论] 这条路最直接利用了 Codex 原生 `AGENTS.md` 与 Claude 官方“`CLAUDE.md` 可导入 `AGENTS.md`”的交集；它把双 agent 共识收敛成一份 shared constitution，再用极薄 adapter 承载每个 harness 的差异。
**Downsides:** [观点] 初次重写需要明确“什么必须共享、什么必须保留为 Claude/Codex delta”，否则容易把 adapter 又写胖。
**Confidence:** 96%
**Complexity:** Medium
**Status:** Explored

### 2. Validation Decision Tree, Not Post-Edit Bundle
**Description:** [推论] 把 `CLAUDE.md` 里的“修改后必须执行”改成 1 屏决策树：先判断改动类型，再跳到 `docs/rules/validation.md` 的最小验证矩阵；根文件只保留“如何选路径”，不再内嵌固定大礼包命令。
**Rationale:** [推论] 这最贴合 harness mode 的优势：让 agent 在当前改动上做最小充分验证，而不是默认加载一整套命令；也能把 `CLAUDE.md:25` 与 `docs/rules/validation.md:5` 的冲突消掉。
**Downsides:** [观点] 决策树如果写得太抽象，用户会失去“一眼能 copy”的即时性；需要在短小与可执行之间拿捏。
**Confidence:** 94%
**Complexity:** Medium
**Status:** Explored

### 3. Behavior / Enforcement Split
**Description:** [推论] 明确宣布：`AGENTS.md` / `CLAUDE.md` 只负责行为协议与路由；`.claude/settings*.json`、hooks、`scripts/validate-rules.py`、CI 才负责确定性 enforcement；`docs/rules/*` 解释何时、为何、怎样触发这些护栏。
**Rationale:** [推论] 这同时对齐了 Claude 官方“technical enforcement 用 settings，behavioral guidance 用 `CLAUDE.md`”与本仓库已有 soft/hard gate 设计；一旦边界清晰，入口文件自然会瘦下来。
**Downsides:** [观点] 需要重写若干表述，把“必须执行”改成“默认路由 / 真正阻断点”，否则读者会误会要求被削弱。
**Confidence:** 92%
**Complexity:** Medium
**Status:** Explored

### 4. Path-Scoped Governance Packs
**Description:** [推论] 把高细节治理内容继续下沉到按路径加载的文件：Codex 用更近的 `AGENTS.md`，Claude 用 `.claude/rules/**` 的 `paths:`；根入口只保留“何时去哪个包里读”。
**Rationale:** [推论] 这是把 progressive disclosure 真正落地成结构，而不是口号。Claude 官方已经给出路径规则机制，Codex 也原生按目录查找 `AGENTS.md`；本仓库正好同时受益。
**Downsides:** [观点] 如果没有严格的命名和归档规则，治理文件数量会增加，反而形成“散落的小真相”。
**Confidence:** 90%
**Complexity:** Medium-High
**Status:** Unexplored

### 5. Live Rulebook / Archive Demotion
**Description:** [推论] 显式定义 live governance surface：只认 `AGENTS.md`、`CLAUDE.md`、`docs/rules/README.md` 与活跃 `docs/rules/*`；已完成 rollout、模板参考、历史提案全部改成 reference/archive 身份，并在文件头标出“不可作为当前执行真相”。
**Rationale:** [推论] 这会直接消灭当前最伤 harness 的问题之一——第二真相来源。对于 agent 来说，“哪些文件是历史，哪些文件能执行”比多一条规则更重要。
**Downsides:** [观点] 文档本身的“身份治理”不性感，短期收益不如入口重写直观；但如果不做，后续任何瘦身都可能再次被旧文档反污染。
**Confidence:** 91%
**Complexity:** Low-Medium
**Status:** Explored

### 6. Retrospective-Driven Rule Admission
**Description:** [推论] 新规则只允许通过三种入口进入根治理文档：重复性错误、人工 review 反复发现、或 deterministic hook 仍覆盖不了的高风险缺口；其余内容默认进入 scoped rules、skill、prompt template 或参考文档。
**Rationale:** [推论] 这直接吸收了 Codex 官方“把重复流程沉淀为技能”的建议，以及社区/论文对“说明文件一旦膨胀就掉质”的共同结论；它能防止这次瘦身后再反弹。
**Downsides:** [观点] 这是治理纪律，不是一次性重构；需要 owner 持续执行，否则很容易回到“先塞进根文件再说”。
**Confidence:** 89%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | `Root 200-Line Budget` | [推论] 很好的 guardrail，但它更适合作为 #1 / #4 的验收指标，而不是顶层方向。 |
| 2 | `Command Cookbook Extraction` | [推论] 本质上是 #2 的实现动作，不值得单列为产品级 ideation winner。 |
| 3 | `Assistant Compatibility Matrix` | [观点] 更像 #1 的附属表格，用于落地 shared constitution，而不是单独战略。 |
| 4 | `Current-vs-Target Architecture Banner` | [推论] 价值很高，但更像 #4 / #5 的具体机制；单独成项会让 ideation 过碎。 |
| 5 | `Rule Delta Log / Governance Changelog` | [推论] 是 #5 的配套治理件，不是独立顶层方向。 |
| 6 | `Deterministic Guardrail Ledger` | [推论] 核心价值已被 #3 吸收；单列会重复“behavior vs enforcement”主轴。 |
| 7 | `Skill-First Escape Hatch` | [观点] 是 #6 的优先级规则，不是独立结构重写。 |
| 8 | `Per-Tool Twin Rulebooks` | [推论] 与 Claude 官方 `@AGENTS.md` 导入机制和多-agent single-source 方向相冲突，会扩大漂移面。 |
| 9 | `Universal Mega Entry File` | [推论] 与 Codex / Claude 官方“短入口 + 分层导入 + 作用域加载”全部背离，是反 harness 方案。 |

## Session Log

- [证据] 2026-04-22：交叉阅读本仓库 `AGENTS.md`、`CLAUDE.md`、`docs/rules/README.md`、`docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`，确认当前痛点是“入口过载 + 多真相竞争”。
- [证据] 2026-04-22：补充 OpenAI Codex 官方 `AGENTS.md` / best practices、Claude Code 官方 memory / best practices / hooks，以及 2026 社区语料分析与论文证据。
- [推论] 2026-04-22：最终收敛结论不是“再加更多规则”，而是“重建 single source of truth、把 deterministic enforcement 与行为指导拆开、让作用域加载真正生效”。
