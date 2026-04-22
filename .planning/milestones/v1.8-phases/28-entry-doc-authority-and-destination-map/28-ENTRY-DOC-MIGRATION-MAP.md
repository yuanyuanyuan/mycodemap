# Phase 28 Entry-Doc Migration Map

**Phase:** `28-entry-doc-authority-and-destination-map`  
**Status:** Ready for Phase 29 rewrite  
**Primary output:** section-level migration contract for `AGENTS.md`、根 `CLAUDE.md`、`.claude/CLAUDE.md`

## Scope Lock

- 本工件只回答三件事：哪些 section **保留**、哪些 section **移出**、移出后去哪个**现有 live doc / machine truth** 维护。
- 不在本 phase 新增治理中间层、生成式文档系统、重复检测自动化或 ghost commands 修复。
- 若目标文档已持有真相，则 **reuse as-is**；若目标文档角色正确但缺少精确表述，则在 Phase 29 做 **targeted supplement**，而不是把内容继续留在入口文档。

## Hard Constraints

| Constraint | Meaning | Source |
|---|---|---|
| `AGENTS.md = constitution` | 只保留仓库级治理、证据协议、改动边界、验证/交付底线 | `.planning/phases/28-entry-doc-authority-and-destination-map/28-CONTEXT.md:20` |
| `CLAUDE.md = pure router` | 只保留加载顺序、去哪里读、必要的导航型路径表 | `.planning/phases/28-entry-doc-authority-and-destination-map/28-CONTEXT.md:22` |
| `.claude/CLAUDE.md = thin adapter` | 只保留 Claude 自动读取 / 装配差异 | `.planning/phases/28-entry-doc-authority-and-destination-map/28-CONTEXT.md:23` |
| existing destinations only | 所有移出内容只能落到现有 live docs / machine truth | `.planning/phases/28-entry-doc-authority-and-destination-map/28-CONTEXT.md:26` |
| minimal navigation sync only | `docs/rules/README.md` / `AI_GUIDE.md` 只允许导航增强，不长成第二套规则正文 | `.planning/phases/28-entry-doc-authority-and-destination-map/28-CONTEXT.md:37` |

## Source Inventory

### `AGENTS.md`

| Disposition | Source section | Source evidence | Destination truth | Target status | Why |
|---|---|---|---|---|---|
| Keep | `## 1. 作用域与优先级` | `AGENTS.md:6` | `AGENTS.md` | keep in place | 宪法层定义作用域与优先级，符合 `D-01` |
| Keep | `## 2. 文档职责分层` | `AGENTS.md:12` | `AGENTS.md` | keep in place | 宪法层需要解释文档分层与 authority model |
| Keep | `## 3. 开始任务前` | `AGENTS.md:36` | `AGENTS.md` | keep in place | “先明确目标/限制/验收/依赖”属于仓库级执行底线 |
| Keep | `## 3.1 任务分级与自主权边界` | `AGENTS.md:43` | `AGENTS.md` | keep in place | 风险分级是仓库级治理真相 |
| Move out | `## 3.2 Commit 策略` | `AGENTS.md:59` | `docs/rules/engineering-with-codex-openai.md:76` | reuse as-is + targeted supplement | commit/PR/checklist 属于工程执行协议，不能继续由宪法层维护；`D-05` 已锁定归宿 |
| Keep | `## 4. 执行循环` | `AGENTS.md:84` | `AGENTS.md` | keep in place | 单线程、原子化、滑板原则是 repo-level execution baseline |
| Keep | `## 5. 证据协议` | `AGENTS.md:92` | `AGENTS.md` | keep in place | 证据标签与 retrieval-led reasoning 是 constitutional truth |
| Keep | `## 5.1 可信度自评要求` | `AGENTS.md:100` | `AGENTS.md` | keep in place | 交付时必须给出可信度自评，属于交付底线 |
| Keep | `## 6. 检索与分析优先级` | `AGENTS.md:112` | `AGENTS.md` | keep in place | “先 CodeMap，再 fallback”是仓库级检索协议 |
| Keep | `## 7. 代码与改动规则` / `## 7.1 代码生成红线` | `AGENTS.md:119`, `AGENTS.md:127` | `AGENTS.md` | keep in place | 改动边界与红线是 constitutional content |
| Keep | `## 8. 验证与失败预演` | `AGENTS.md:140` | `AGENTS.md` | keep in place | 验证底线应继续由宪法层定权，但不保留长命令清单 |
| Move out | `### 9.1 必须更新文档的触发条件` | `AGENTS.md:150` | `docs/rules/engineering-with-codex-openai.md:196` | reuse as-is + targeted supplement | 这是 doc-sync execution protocol，不应继续占据宪法层 |
| Move out | `### 9.1.1 AI 友好文档规范` | `AGENTS.md:169` | `docs/rules/engineering-with-codex-openai.md:166` | targeted supplement in Phase 29 | 这是 docs authoring protocol；authority 应落在工程规则文档，不应与 `AI_GUIDE.md` 角色混写 |
| Move out | `### 9.2 文档更新决策流程` | `AGENTS.md:283` | `docs/rules/engineering-with-codex-openai.md:166` | targeted supplement in Phase 29 | 决策流程属于工程交付路由，不是宪法正文 |
| Compress | `### 9.3 交付要求` | `AGENTS.md:301` | `AGENTS.md` + `docs/rules/engineering-with-codex-openai.md:183` | split in Phase 29 | 保留“说明改了什么/为什么/如何验证/风险”的宪法级底线；把 checklist 化内容交给工程规则文档 |
| Move out | `## 9.1 技术债务标记规范` | `AGENTS.md:308` | `docs/rules/code-quality-redlines.md:23` | reuse as-is | `TODO-DEBT` 是代码 authoring convention，已有更合适的 code-quality truth |
| Keep | `## 10. 当前仓库过渡说明` | `AGENTS.md:324` | `AGENTS.md` | keep in place, may trim | 迁移期上下文仍是 repo-specific reality，可保留为短说明 |
| Compress | `## 11. RTK 使用规范` | `AGENTS.md:331` | `RTK.md:1` | split in Phase 29 | `AGENTS.md` 只保留“shell 命令优先加 `rtk`”原则；速查表/元命令全部下沉到 `RTK.md`，符合 `D-08` |
| Exclude from authority surface | `<claude-mem-context>` appendix | `AGENTS.md:380` | none — remove if source-controlled | do not migrate | 这是运行期记忆载荷，不是 live-doc truth，也不属于本 milestone 的规则 authority surface |

### `CLAUDE.md`

| Disposition | Source section | Source evidence | Destination truth | Target status | Why |
|---|---|---|---|---|---|
| Keep | 角色声明 + `## 加载顺序` | `CLAUDE.md:1`, `CLAUDE.md:5` | `CLAUDE.md` | keep in place | 根 `CLAUDE.md` 必须继续承担 pure-router 入口 |
| Move out | `## 执行回路` | `CLAUDE.md:11` | `docs/rules/engineering-with-codex-openai.md:12` | targeted supplement in Phase 29 | Plan/Build/Verify 表达属于工程执行协议，`D-05` 已锁定归宿 |
| Move out | `## 修改后必须执行` | `CLAUDE.md:25` | `docs/rules/validation.md:5` | reuse as-is | post-edit verification order 与默认命令已经在 validation truth 中存在；`D-04` |
| Compress to pointer | `## 路径路由` | `CLAUDE.md:43` | `docs/rules/README.md:5` | reuse as-is | “改哪类文件先读哪份规则”应由 `docs/rules/README.md` 回答；根 `CLAUDE.md` 只保留最小导航指针，`D-07` |
| Move out | `## Rule-system 默认值` | `CLAUDE.md:57` | `docs/rules/validation.md:27` + `.claude/rule-system.config.json:1` | reuse as-is | prose 默认值归 `validation.md`，machine truth 继续以 config 为准；`D-04` |
| Move out | `## CodeMap CLI Dogfood` | `CLAUDE.md:65` | `AI_GUIDE.md:45` | reuse as-is | CLI / dogfood / tool discovery 已由 `AI_GUIDE.md` 持有；`D-06` |
| Move out | `## CodeMap CLI Dogfood > Experimental MCP` | `CLAUDE.md:73` | `AI_GUIDE.md:127` / `docs/ai-guide/INTEGRATION.md:31` | reuse as-is | MCP 使用提示是 AI / agent integration guidance，不应停留在入口路由页 |
| Move out | `## 交付清单` | `CLAUDE.md:80` | `docs/rules/engineering-with-codex-openai.md:183` | reuse as-is + targeted supplement | 交付 checklist 是工程协议，不是 root router authority |

### `.claude/CLAUDE.md`

| Disposition | Source section | Source evidence | Destination truth | Target status | Why |
|---|---|---|---|---|---|
| Keep (rewrite) | 标题 + intro + 与根入口关系说明 | `.claude/CLAUDE.md:1`, `.claude/CLAUDE.md:3` | `.claude/CLAUDE.md` | keep in place, rewrite as thin adapter | adapter 只需要说明 Claude 自动读取行为与 shared truth 关系，符合 `D-03` |
| Move out | `## 强制执行规则 > 1. 任务开始前必须执行 > 评估任务等级 / 声明任务等级` | `.claude/CLAUDE.md:7` | `AGENTS.md:43` | reuse as-is | 风险分级与声明属于仓库级治理，不应由 Claude adapter 重复 |
| Compress to pointer | `## 强制执行规则 > 1. 任务开始前必须执行 > 阅读 AGENTS.md / 阅读 CLAUDE.md` | `.claude/CLAUDE.md:9` | `CLAUDE.md:5` + `AGENTS.md:6` | rewrite as adapter note | adapter 只需说明“Claude 自动读取本文件，但权威在 AGENTS，路由在根 CLAUDE” |
| Move out | `## 强制执行规则 > 2. 任务执行必须遵循 > TDD 流程` | `.claude/CLAUDE.md:16` | `docs/rules/engineering-with-codex-openai.md:12` | targeted supplement in Phase 29 | TDD / build loop 是工程执行协议 |
| Move out | `## 强制执行规则 > 2. 任务执行必须遵循 > 分层架构` | `.claude/CLAUDE.md:21` | `docs/rules/architecture-guardrails.md:5` | reuse as-is | 分层约束已由架构护栏文档定权 |
| Move out | `## 强制执行规则 > 2. 任务执行必须遵循 > 代码质量红线` | `.claude/CLAUDE.md:26` | `docs/rules/code-quality-redlines.md:5` | reuse as-is | 代码红线已有专门 truth surface |
| Move out | `## 强制执行规则 > 3. 任务完成必须执行 > 运行验证` | `.claude/CLAUDE.md:33` | `docs/rules/validation.md:5` | reuse as-is | post-edit checks 属于 validation truth |
| Move out | `## 强制执行规则 > 3. 任务完成必须执行 > 验收清单 / PR 描述` | `.claude/CLAUDE.md:35` | `docs/rules/engineering-with-codex-openai.md:183` | reuse as-is + targeted supplement | 交付/PR/完成态协议不应留在 adapter |
| Split and move out | `## 禁止行为` | `.claude/CLAUDE.md:41` | `AGENTS.md:127` + `docs/rules/validation.md:112` + `docs/rules/architecture-guardrails.md:15` + `docs/rules/code-quality-redlines.md:5` | decompose in Phase 29 | 该 section 混写治理禁令、验证禁令、架构禁令、代码红线，必须拆回各自 authoritative docs |
| Move out | `## Commit 策略` | `.claude/CLAUDE.md:51` | `docs/rules/engineering-with-codex-openai.md:76` | reuse as-is + targeted supplement | commit policy 属于工程协议，不应由 adapter 维护第二份 |
| Split and move out | `## 首选模式` | `.claude/CLAUDE.md:60` | `AGENTS.md:112` + `docs/rules/architecture-guardrails.md:15` + `docs/rules/code-quality-redlines.md:5` | decompose in Phase 29 | “检索优先、最小改动、依赖注入、显式类型”分别已有更合适的权威落点 |
| Move out | `## 快速参考 > 常用命令 > 验证` | `.claude/CLAUDE.md:70` | `docs/rules/validation.md:86` | reuse as-is | 验证命令速查属于 validation truth |
| Move out | `## 快速参考 > 常用命令 > CLI 工具` | `.claude/CLAUDE.md:79` | `AI_GUIDE.md:45` | reuse as-is | CLI 命令选择与 dogfood 已归 AI guide |
| Move out | `## 快速参考 > 常用命令 > AI 任务钩子` | `.claude/CLAUDE.md:84` | `docs/rules/validation.md:33` | targeted supplement in Phase 29 | hook / post-task 行为应由 validation / engineering docs 解释 |
| Move out | `## 快速参考 > 文件模板 > TS 文件头` | `.claude/CLAUDE.md:89` | `docs/rules/code-quality-redlines.md:15` | reuse as-is | `[META]` / `[WHY]` 已由 code-quality doc 持有 |
| Move out | `## 快速参考 > 文件模板 > 技术债务标记` | `.claude/CLAUDE.md:97` | `docs/rules/code-quality-redlines.md:23` | reuse as-is | `TODO-DEBT` 示例已有更合适的代码规范落点 |
| Compress | `## 相关文档` | `.claude/CLAUDE.md:105` | `.claude/CLAUDE.md` | rewrite as thin adapter note | adapter 只保留“AGENTS 定权、根 CLAUDE 路由、Architecture/Rules/AI Guide 下钻”的最小说明 |
| Move out | `## 任务初始化模板` | `.claude/CLAUDE.md:114` | `docs/rules/engineering-with-codex-openai.md:12` | targeted supplement in Phase 29 | 任务模板是工程执行协议，不能继续作为 Claude 专属手册正文 |

## Consolidated Move Matrix

| Source file | Source section | Destination file | Why / maintenance owner |
|---|---|---|---|
| `AGENTS.md` | `3.2 Commit 策略` | `docs/rules/engineering-with-codex-openai.md` | commit / PR / delivery workflow 由工程规则文档维护 |
| `AGENTS.md` | `9.1` / `9.1.1` / `9.2` 详细文档同步协议 | `docs/rules/engineering-with-codex-openai.md` | doc-sync 触发条件与 authoring protocol 属于工程执行协议 |
| `AGENTS.md` | `9.1 技术债务标记规范` 示例 | `docs/rules/code-quality-redlines.md` | `TODO-DEBT` 是代码 authoring convention |
| `AGENTS.md` | `11 RTK 使用规范` 的长表 / 元命令 | `RTK.md` | RTK quick ref 已有专属文档；宪法层只保留原则 |
| `CLAUDE.md` | `执行回路` | `docs/rules/engineering-with-codex-openai.md` | Plan/Build/Verify loop 不应留在 router |
| `CLAUDE.md` | `修改后必须执行` | `docs/rules/validation.md` | post-edit checks 已有 validation truth |
| `CLAUDE.md` | `路径路由` 的详细路径表 | `docs/rules/README.md` | “改哪类文件先读哪份规则”由 rules index 回答 |
| `CLAUDE.md` | `Rule-system 默认值` | `docs/rules/validation.md` + `.claude/rule-system.config.json` | prose defaults + machine truth 双层落点已存在 |
| `CLAUDE.md` | `CodeMap CLI Dogfood` | `AI_GUIDE.md` | CLI/tool discovery 已有 AI guide truth |
| `CLAUDE.md` | `Experimental MCP` | `docs/ai-guide/INTEGRATION.md` | MCP integration guidance 不应留在 router |
| `CLAUDE.md` | `交付清单` | `docs/rules/engineering-with-codex-openai.md` | delivery checklist 是工程规则，不是 router |
| `.claude/CLAUDE.md` | 通用执行规则 / TDD / 验证 / commit / 模板 | `docs/rules/engineering-with-codex-openai.md` | Claude adapter 不再维护第二套执行手册 |
| `.claude/CLAUDE.md` | 分层架构要求 | `docs/rules/architecture-guardrails.md` | 架构护栏已有唯一权威 |
| `.claude/CLAUDE.md` | 代码质量红线 / 文件模板 | `docs/rules/code-quality-redlines.md` | 代码规范已有唯一权威 |
| `.claude/CLAUDE.md` | 验证命令 / hooks / gate 行为 | `docs/rules/validation.md` | verification surface 已存在 |
| `.claude/CLAUDE.md` | CLI quick refs | `AI_GUIDE.md` | CLI/agent 使用速查不应留在 adapter |

## Navigation Sync Decision

**Decision:** Phase 28 不修改 `docs/rules/README.md` 或 `AI_GUIDE.md` 本体；后续仅在 Phase 29/30 发现 root `CLAUDE.md` 缩成 pure router 后仍存在 discoverability 缺口时，做 **minimal navigation sync**。

### Why no live-doc edit is needed yet

- `docs/rules/README.md:5` 已有“场景 → 文档”索引，可承接根 `CLAUDE.md` 当前的路径路由。
- `docs/rules/validation.md:5`、`docs/rules/validation.md:27` 已持有验证顺序与 rule-system defaults。
- `docs/rules/engineering-with-codex-openai.md:12`、`docs/rules/engineering-with-codex-openai.md:183` 已持有工程执行原则与最小交付清单。
- `AI_GUIDE.md:45`、`AI_GUIDE.md:127`、`AI_GUIDE.md:148` 已持有命令速查、MCP guidance、文档导航。
- `RTK.md:1` 已是 RTK quick reference 的更合适承载面。

## Guardrails for Phase 29 / 30

1. **Do not create a new governance landing doc.** 只允许复用 `docs/rules/*`、`AI_GUIDE.md`、`docs/ai-guide/*`、`RTK.md`、`.claude/rule-system.config.json`。
2. **Do not re-home moved details into `AGENTS.md`.** 宪法层只保留 authority、边界、证据、底线。
3. **Rewrite root `CLAUDE.md` as a pure router.** 允许一句话角色声明、加载顺序、极简导航；禁止保留执行回路、命令块、默认值、dogfood、checklist。
4. **Rewrite `.claude/CLAUDE.md` as a thin adapter.** 只保留 Claude 自动读取 / shared truth 关系说明；禁止保留 TDD、commit、验证命令、快速参考、任务模板。
5. **Allow targeted supplements only where ownership is already correct.** 若 `engineering-with-codex-openai.md`、`validation.md`、`README.md`、`AI_GUIDE.md` 的角色正确但缺少精确措辞，只补最小段落，不复制整个 section。
6. **Treat navigation docs as navigation only.** `docs/rules/README.md` 回答“规则去哪读”；`AI_GUIDE.md` 回答“产品/工具怎么用”；两者都不得长成第二套规则正文。

## Source Coverage Audit

| Source | Item | Covered by this artifact | Notes |
|---|---|---|---|
| GOAL | Phase 28 goal = 建立 section 级迁移图并锁定 destination ownership | yes | 本文即 phase goal artifact |
| REQ | `DEST-01` | yes | 用 consolidated move matrix 证明所有移出内容都有 existing destination |
| REQ | `DEST-02` | yes | 明确给出 `source file + source section + destination file + why` |
| REQ | `ROUTE-04` | yes | guardrails 显式禁止 new governance middle layer / automation scope creep |
| CONTEXT | `D-01` ~ `D-03` | yes | Source inventory 明确 keep / move / compress 边界 |
| CONTEXT | `D-04` ~ `D-08` | yes | destination ownership 已逐项锁定 |
| CONTEXT | `D-09` / `D-10` | yes | 本文给出显式 mapping，并区分 reuse vs targeted supplement |
| CONTEXT | `D-11` / `D-12` | yes | navigation sync decision + phase 29/30 guardrails 明确化 |
| CONTEXT | `D-13` / `D-14` | yes | 根 `CLAUDE.md` / `.claude/CLAUDE.md` 的已知迁移对象逐项列出 |

## What This Artifact Enables Next

- Phase 29 可以直接按本工件重写三份入口文档，而不需要重新判断哪些内容该留、该移、该删。
- Phase 29 若需要补写目标文档，只能补到这里锁定的 destination，不得临时发明新承接面。
- Phase 30 可以以本工件为基线做 discoverability sweep 与 zero-duplication verification。
