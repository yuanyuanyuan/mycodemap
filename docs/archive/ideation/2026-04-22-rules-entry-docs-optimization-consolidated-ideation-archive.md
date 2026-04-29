---
date: 2026-04-22
archived: 2026-04-29
source: docs/ideation/2026-04-22-rules-entry-docs-optimization-consolidated-ideation.md
reason: 以下想法已在 2026-04-22 至 2026-04-29 期间实现并合并至主分支
---

# Ideation Archive: Consolidated rules / AGENTS.md / CLAUDE.md optimization (Implemented)

> 本归档包含原 ideation 文档中已完全实现的 1 项核心想法（#1 One Constitution, Two Thin Adapters）。
> 剩余项（#2–#6）保留在源文档中。

## Grounding Context (原文)

### Codebase Context

- [证据] 仓库自我定义已经很清楚：`AGENTS.md` 应是"强约束 + 路由"，`CLAUDE.md` 应是"启动清单、检索顺序、最小操作手册"；而且入口文档应该保持短小：`AGENTS.md:3`、`AGENTS.md:14`、`AGENTS.md:15`、`AGENTS.md:329`。
- [证据] 但当前根 `CLAUDE.md` 同时承载了 post-edit 默认验证、路径路由、rule-system 默认值、CLI dogfood、交付清单，已经超过"薄入口"定位：`CLAUDE.md:25`、`CLAUDE.md:43`、`CLAUDE.md:57`、`CLAUDE.md:65`、`CLAUDE.md:80`。
- [证据] `.claude/CLAUDE.md` 又额外定义了任务开始前/结束后清单、TDD 流程、禁止行为、commit 策略和 `npm run check:all`，与根 `CLAUDE.md` 形成双入口：`.claude/CLAUDE.md:1`、`.claude/CLAUDE.md:7`、`.claude/CLAUDE.md:33`、`.claude/CLAUDE.md:51`。
- [证据] 文档已经主张"先路由、再按需下钻"和"按改动类型做最小验证"，但根 `CLAUDE.md` 仍保留一套统一 post-edit 命令与固定 checklist，存在叙事冲突：`docs/rules/README.md:19`、`docs/rules/validation.md:5`、`docs/rules/validation.md:29`、`docs/rules/validation.md:31`、`CLAUDE.md:25`。
- [证据] 当前部分验证命令存在"文档真、脚本假"的信任问题：`docs/rules/architecture-guardrails.md` 把 `npm run check:architecture` 列为快速验证，但 `package.json` 中它仍是 `echo` stub；`check:unused` 也是同样情况：`docs/rules/architecture-guardrails.md:24`、`docs/rules/architecture-guardrails.md:29`、`package.json:45`、`package.json:46`、`package.json:48`。
- [证据] 仓库处于过渡态，文档体系与执行面并存新旧结构；历史归档仍在，少量指南仍在根层，官方要求"以实际存在的文件为准"：`AGENTS.md:324`、`AGENTS.md:327`、`AGENTS.md:329`。
- [推论] 因此当前核心问题不是"规则数量不足"，而是"shared truth source 不够清晰 + 入口过载 + 某些执行约束与真实自动化不一致"。

### External Context

- [证据] OpenAI Codex 官方 `AGENTS.md` 指南强调：写长期稳定、项目特有、可快速扫读的指令；复杂说明应拆到配套 markdown，而不是把一切都塞进根入口。来源：https://developers.openai.com/codex/guides/agents-md
- [证据] OpenAI Codex best practices 还强调：应通过 retrospective 把重复失败模式沉淀为更专门的技能或流程，而不是继续膨胀通用指令文件。来源：https://developers.openai.com/codex/learn/best-practices
- [证据] Claude Code 官方 memory 文档建议共享 memory 维持在约 200 行以内；需要更长时，应拆文件并用 `@path` 导入，同时支持在 `CLAUDE.md` 中导入 `AGENTS.md` 与用 `.claude/rules/` 的 `paths:` 做路径作用域加载。来源：https://code.claude.com/docs/en/memory
- [证据] Claude Code 官方 best practices / hooks 文档强调：`CLAUDE.md` 更适合行为指导，hooks 与 settings 更适合确定性 enforcement；长会话和超长上下文会拖垮效果。来源：https://code.claude.com/docs/en/best-practices 、https://docs.anthropic.com/en/docs/claude-code/hooks
- [证据] 2026 社区与研究信号都在同一方向上收敛：instruction 文件过长、过泛、缺少可执行细节时会显著掉质；保留最小必要要求比堆叠规则更有效。来源：https://dev.to/reporails/the-state-of-ai-instruction-quality-35mn 、https://arxiv.org/abs/2602.11988

## 已实现的想法

### 1. One Constitution, Two Thin Adapters ✅
**Description:** [推论] 以 `AGENTS.md` 作为唯一共享治理宪法，专门承载风险分级、证据协议、改动边界、truth-source map、文档职责层次；把根 `CLAUDE.md` 收缩成 Claude/Codex 共用入口路由；把 `.claude/CLAUDE.md` 收缩成 Claude 专属 adapter，优先通过 `@AGENTS.md` 与 `@CLAUDE.md` 引入，而不是重复抄写规则。
**Rationale:** [推论] 这同时解决了"根入口过载"和"双 CLAUDE.md"问题，也最符合 Codex 原生 `AGENTS.md` 与 Claude 官方 import / memory 模型。
**Repo-Specific Leverage:** [证据] 当前双入口问题真实存在：根 `CLAUDE.md:25` 到 `CLAUDE.md:88` 已是一整套执行面，`.claude/CLAUDE.md:7` 到 `.claude/CLAUDE.md:39` 又重复定义任务前后动作。
**Downsides:** [观点] 需要一次性定义清楚三者边界，否则很容易演变成"三份薄文档互相引用但仍然漂移"。
**Confidence:** 97%
**Complexity:** Medium
**Status:** Implemented

**Implementation References:**
- `AGENTS.md` — 仓库级宪法，首句明确定义 `AGENTS.md = constitution / CLAUDE.md = router / .claude/CLAUDE.md = Claude adapter`
- `CLAUDE.md` — 54 行纯入口路由，只回答"谁定权、下一步去哪读、规则变更时该改哪份文档"
- `.claude/CLAUDE.md` — 29 行纯 adapter，不维护第二套规则
- `scripts/validate-docs.js:96-253` — `validateEntryDocGovernance`，自动审计三份文档的边界合规性

## Session Log

- [证据] 2026-04-22：对比 `docs/archive/ideation/2026-04-22-harness-rules-entry-docs-optimization-ideation.md` 与 `docs/archive/ideation/2026-04-22-rules-claude-agents-optimization-ideation.md`，确认前者更强在治理框架与外部 grounding，后者更强在 repo-specific 问题识别。
- [证据] 2026-04-22：补充校验根 `CLAUDE.md`、`.claude/CLAUDE.md`、`package.json`、`docs/rules/architecture-guardrails.md`，把"双入口""ghost commands""迁移仓库"三个具体问题收敛进统一提案。
- 2026-04-29：验证 #1 完全实现；归档至本文档
