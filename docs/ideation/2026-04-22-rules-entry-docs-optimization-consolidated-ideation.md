---
date: 2026-04-22
topic: rules-entry-docs-optimization-consolidated
focus: 融合两份 2026-04-22 ideation 的最佳部分，形成更强的 rules / AGENTS.md / CLAUDE.md 终稿提案
mode: repo-grounded
sources:
  - docs/archive/ideation/2026-04-22-harness-rules-entry-docs-optimization-ideation.md
  - docs/archive/ideation/2026-04-22-rules-claude-agents-optimization-ideation.md
---

# Ideation: Consolidated rules / AGENTS.md / CLAUDE.md optimization

## Grounding Context

### Codebase Context

- [证据] 仓库自我定义已经很清楚：`AGENTS.md` 应是“强约束 + 路由”，`CLAUDE.md` 应是“启动清单、检索顺序、最小操作手册”；而且入口文档应该保持短小：`AGENTS.md:3`、`AGENTS.md:14`、`AGENTS.md:15`、`AGENTS.md:329`。
- [证据] 但当前根 `CLAUDE.md` 同时承载了 post-edit 默认验证、路径路由、rule-system 默认值、CLI dogfood、交付清单，已经超过“薄入口”定位：`CLAUDE.md:25`、`CLAUDE.md:43`、`CLAUDE.md:57`、`CLAUDE.md:65`、`CLAUDE.md:80`。
- [证据] `.claude/CLAUDE.md` 又额外定义了任务开始前/结束后清单、TDD 流程、禁止行为、commit 策略和 `npm run check:all`，与根 `CLAUDE.md` 形成双入口：`.claude/CLAUDE.md:1`、`.claude/CLAUDE.md:7`、`.claude/CLAUDE.md:33`、`.claude/CLAUDE.md:51`。
- [证据] 文档已经主张“先路由、再按需下钻”和“按改动类型做最小验证”，但根 `CLAUDE.md` 仍保留一套统一 post-edit 命令与固定 checklist，存在叙事冲突：`docs/rules/README.md:19`、`docs/rules/validation.md:5`、`docs/rules/validation.md:29`、`docs/rules/validation.md:31`、`CLAUDE.md:25`。
- [证据] 当前部分验证命令存在“文档真、脚本假”的信任问题：`docs/rules/architecture-guardrails.md` 把 `npm run check:architecture` 列为快速验证，但 `package.json` 中它仍是 `echo` stub；`check:unused` 也是同样情况：`docs/rules/architecture-guardrails.md:24`、`docs/rules/architecture-guardrails.md:29`、`package.json:45`、`package.json:46`、`package.json:48`。
- [证据] 仓库处于过渡态，文档体系与执行面并存新旧结构；历史归档仍在，少量指南仍在根层，官方要求“以实际存在的文件为准”：`AGENTS.md:324`、`AGENTS.md:327`、`AGENTS.md:329`。
- [推论] 因此当前核心问题不是“规则数量不足”，而是“shared truth source 不够清晰 + 入口过载 + 某些执行约束与真实自动化不一致”。

### External Context

- [证据] OpenAI Codex 官方 `AGENTS.md` 指南强调：写长期稳定、项目特有、可快速扫读的指令；复杂说明应拆到配套 markdown，而不是把一切都塞进根入口。来源：https://developers.openai.com/codex/guides/agents-md
- [证据] OpenAI Codex best practices 还强调：应通过 retrospective 把重复失败模式沉淀为更专门的技能或流程，而不是继续膨胀通用指令文件。来源：https://developers.openai.com/codex/learn/best-practices
- [证据] Claude Code 官方 memory 文档建议共享 memory 维持在约 200 行以内；需要更长时，应拆文件并用 `@path` 导入，同时支持在 `CLAUDE.md` 中导入 `AGENTS.md` 与用 `.claude/rules/` 的 `paths:` 做路径作用域加载。来源：https://code.claude.com/docs/en/memory
- [证据] Claude Code 官方 best practices / hooks 文档强调：`CLAUDE.md` 更适合行为指导，hooks 与 settings 更适合确定性 enforcement；长会话和超长上下文会拖垮效果。来源：https://code.claude.com/docs/en/best-practices 、https://docs.anthropic.com/en/docs/claude-code/hooks
- [证据] 2026 社区与研究信号都在同一方向上收敛：instruction 文件过长、过泛、缺少可执行细节时会显著掉质；保留最小必要要求比堆叠规则更有效。来源：https://dev.to/reporails/the-state-of-ai-instruction-quality-35mn 、https://arxiv.org/abs/2602.11988

### Synthesis

- [推论] 文档一的强项是“战略方向正确、外部 grounding 充分、结构完整”，文档二的强项是“repo-specific 问题抓得具体、能直接落实施工项”。
- [推论] 更强的终稿不应在两者之间二选一，而应采用“文档一的治理框架 + 文档二的具体问题卡片”。

## Ranked Ideas

### 1. One Constitution, Two Thin Adapters
**Description:** [推论] 以 `AGENTS.md` 作为唯一共享治理宪法，专门承载风险分级、证据协议、改动边界、truth-source map、文档职责层次；把根 `CLAUDE.md` 收缩成 Claude/Codex 共用入口路由；把 `.claude/CLAUDE.md` 收缩成 Claude 专属 adapter，优先通过 `@AGENTS.md` 与 `@CLAUDE.md` 引入，而不是重复抄写规则。
**Rationale:** [推论] 这同时解决了“根入口过载”和“双 CLAUDE.md”问题，也最符合 Codex 原生 `AGENTS.md` 与 Claude 官方 import / memory 模型。
**Repo-Specific Leverage:** [证据] 当前双入口问题真实存在：根 `CLAUDE.md:25` 到 `CLAUDE.md:88` 已是一整套执行面，`.claude/CLAUDE.md:7` 到 `.claude/CLAUDE.md:39` 又重复定义任务前后动作。
**Downsides:** [观点] 需要一次性定义清楚三者边界，否则很容易演变成“三份薄文档互相引用但仍然漂移”。
**Confidence:** 97%
**Complexity:** Medium
**Status:** Explored

### 2. Validation Router + No Ghost Commands
**Description:** [推论] 把根 `CLAUDE.md` 中“修改后必须执行”改写为 1 屏验证决策树：按改动类型跳转到 `docs/rules/validation.md`；同时禁止在入口与规则文档中引用 `echo` stub 命令，所有写进 quick-start 的命令都必须是真实可运行命令。
**Rationale:** [推论] 这是把 harness 的“最小必要验证”从口号变成真正可信的路由；它还顺手修掉最伤信任的“跑了命令但其实没验证”的问题。
**Repo-Specific Leverage:** [证据] `docs/rules/architecture-guardrails.md:29` 当前推荐 `npm run check:architecture`，但 `package.json:46` 仍是提示安装 dependency-cruiser 的 `echo`；`check:unused` 在 `package.json:48` 也是同类问题。
**Downsides:** [观点] 若短期内不想落地真实检查，就必须先从入口与规则文档中移除这些命令，否则只会继续制造假安全感。
**Confidence:** 96%
**Complexity:** Medium
**Status:** Explored

### 3. Behavior / Enforcement Split
**Description:** [推论] 明确分层：`AGENTS.md` / `CLAUDE.md` 负责行为与路由；`.claude/settings*.json`、hooks、`scripts/validate-rules.py`、CI 负责确定性 enforcement；`docs/rules/*` 只解释何时触发、如何恢复、失败后果是什么。
**Rationale:** [推论] 这既符合 Claude 官方“behavioral guidance vs technical enforcement”的划分，也与本仓库已有 `report-only` / `soft_gate` / `hard_gate` 设计天然一致。
**Repo-Specific Leverage:** [证据] 根 `CLAUDE.md` 现在同时扮演“行为协议”“默认 gate 配置”“交付 checklist”三种角色：`CLAUDE.md:57`、`CLAUDE.md:61`、`CLAUDE.md:62`、`CLAUDE.md:63`、`CLAUDE.md:80`。
**Downsides:** [观点] 需要重写措辞，让“默认路由/默认验证”与“真正 blocker”区分得非常清楚，否则用户会误会规则被放松。
**Confidence:** 93%
**Complexity:** Medium
**Status:** Explored

### 4. Path-Scoped Governance for a Transitional Repo
**Description:** [推论] 根入口只维护“如何选规则”的导航，细节继续下沉到按路径加载的文档：Codex 依赖更近的 `AGENTS.md`，Claude 依赖 `.claude/rules/**` 的 `paths:`；同时在根入口显式声明“当前是迁移仓库，MVP3 层级优先，但历史目录仍可能存在”。
**Rationale:** [推论] 这把文档二的“路由覆盖不足”问题与文档一的“progressive disclosure”主张合并起来：根文件不需要越来越长，但路径规则必须覆盖真实项目形态。
**Repo-Specific Leverage:** [证据] 仓库已明确“过渡说明”和“入口文档应保持短小”：`AGENTS.md:324`、`AGENTS.md:327`、`AGENTS.md:329`；根 `CLAUDE.md` 当前路由表仍是高度 layer-centric：`CLAUDE.md:43` 到 `CLAUDE.md:55`。
**Downsides:** [观点] 若没有命名约定和 archive discipline，路径化后会把问题从“根太长”转移成“子规则散落”。
**Confidence:** 91%
**Complexity:** Medium-High
**Status:** Explored

### 5. Live Rulebook + Archive Demotion
**Description:** [推论] 明确标注 live governance surface：只认 `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`、`docs/rules/README.md` 与活跃规则文档；历史 rollout、模板母本、迁移提案要统一降级为 reference/archive，并在文件头写明“不可作为当前执行真相”。
**Rationale:** [推论] 对 agent 来说，最贵的不是少一条规则，而是不知道哪份文档才是现在真的生效。
**Repo-Specific Leverage:** [证据] 仓库已承认“历史归档仍保留、少量操作指南仍在根层、执行时以实际存在文件为准”：`AGENTS.md:327`。
**Downsides:** [观点] 这是文档身份治理，不是炫目的功能增强；但如果不做，后续所有瘦身都会被旧文档重新污染。
**Confidence:** 92%
**Complexity:** Low-Medium
**Status:** Explored

### 6. Governance Self-Audit + Generated Shared Tables
**Description:** [推论] 把“规则重复”和“规则自身腐烂”合并成一个治理能力：高频重复表格（如代码红线、职责映射、验证入口）应由单一结构化源生成；并定期审计链接、命令存在性、路径路由覆盖和 live/reference 身份是否一致。
**Rationale:** [推论] 文档二抓住了 repo 的真实维护痛点，而文档一提供了更高层的约束原则；把两者合并后，能防止“今天瘦身，明天重新 drift”。
**Repo-Specific Leverage:** [证据] 当前重复与漂移已在多处出现：`AGENTS.md:127`、`docs/rules/engineering-with-codex-openai.md:89`；而命令存在性问题已被 `package.json:46`、`package.json:48` 证明。
**Downsides:** [观点] 这已经逼近“小型文档治理系统”了；若一次做太大，容易反向过度工程化。
**Confidence:** 88%
**Complexity:** Medium
**Status:** Explored

## Recommended Final Direction

- [观点] **首选主轴**：`#1 One Constitution, Two Thin Adapters`
  这是最强的结构性修复，因为它同时吸收了双入口治理、single source of truth、Claude/Codex 双工具共存三类问题。
- [观点] **第二优先级**：`#2 Validation Router + No Ghost Commands`
  这是最强的信任修复，因为它能最快把“文档说一套、命令做一套”的错位消掉。
- [观点] **第三优先级**：`#3 Behavior / Enforcement Split`
  这是最强的长期维护修复，因为它能防止入口文件再次被确定性流程污染。
- [推论] 若只允许保留一个总原则，应是：**根入口只负责“让 agent 知道去哪读、何时验证、谁在阻断”，不负责承载全部细节、全部命令、全部历史。**

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | `Universal Mega Entry File` | [推论] 与 Codex / Claude 官方“短入口 + 路由 + 作用域加载”方向完全相反。 |
| 2 | `Per-Tool Twin Rulebooks` | [推论] 会把多 agent 共享规则重新复制成两套真相，长期必漂移。 |
| 3 | `Everything as Structured YAML First` | [观点] 对重复表格很有价值，但若把全部治理文档都数据化，会过早走向工具化治理。 |
| 4 | `Only Fix Ghost Commands` | [推论] 只能修补信任问题，不能解决入口过载与 shared truth source 不清晰。 |
| 5 | `Only Merge the Two CLAUDE Files` | [推论] 不触及 `AGENTS.md` / `docs/rules/*` 的职责划分，仍会留下多真相竞争。 |
| 6 | `Archive Nothing, Just Add More Cross Links` | [观点] 交叉链接能缓解迷路，不能解决“哪份文档是 live contract”的根问题。 |

## Session Log

- [证据] 2026-04-22：对比 `docs/archive/ideation/2026-04-22-harness-rules-entry-docs-optimization-ideation.md` 与 `docs/archive/ideation/2026-04-22-rules-claude-agents-optimization-ideation.md`，确认前者更强在治理框架与外部 grounding，后者更强在 repo-specific 问题识别。
- [证据] 2026-04-22：补充校验根 `CLAUDE.md`、`.claude/CLAUDE.md`、`package.json`、`docs/rules/architecture-guardrails.md`，把“双入口”“ghost commands”“迁移仓库”三个具体问题收敛进统一提案。
- [推论] 2026-04-22：最终终稿选择“保留文档一的骨架，吸收文档二最具体的实施抓手”，而不是继续保留两份并行 ideation。
