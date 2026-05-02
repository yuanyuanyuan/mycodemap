---
date: 2026-05-02
topic: subagent-environment-contract-retrieval
focus: Phase 58 subagent environment contract retrieval (revised v2)
mode: repo-grounded
run_id: b5a40dda
---

# Ideation: Subagent Environment Contract Retrieval

> **修订说明（v2）**：经社区实践验证，平台提供的"注入"机制存在根本性缺陷。本 ideation 从"注入模式"调整为"检索模式"：不预编译 prompt snippet 塞给子代理，而是让子代理通过 CLI/MCP 自行查询项目规则。

## Grounding Context

### Codebase Context

- [证据] Phase 58 的问题定义是：Claude Code 与 Codex CLI 都有子代理能力，但项目级环境契约不会可靠进入子代理，导致 `rtk` 包装、commit 格式、测试入口、CodeMap 检索优先级等规则丢失：`.planning/phases/58-subagent-environment-contract-injection/58-CONTEXT.md:29`。
- [证据] **社区验证：平台注入机制不可靠**——Claude Code `SubagentStart` 的 `additionalContext` append 到 user context，会被上下文压缩丢弃（issue #23885）；`PreToolUse` 的 `updatedInput` 对 Agent tool 静默丢弃（issue #39814）；Codex `developer_instructions` 在 Windows 上不生效（#19399）、项目级自定义角色 `spawn_agent` 不认识（#14579）：详见 `.planning/phases/58-subagent-environment-contract-injection/58-CONTEXT.md` 调研修正声明。
- [证据] Phase 58 scope 已锁定为环境契约发现、`.mycodemap/env-contract.json`、检索接口、平台适配配置示例、`mycodemap env-contract`、`init`、`doctor`、MCP 集成。`.mycodemap/prompt-snippets/` 已废弃：`.planning/phases/58-subagent-environment-contract-injection/58-CONTEXT.md:74`。
- [证据] Phase 58 明确 out of scope：不替代平台 spawn/wait/close、不自动重写 `CLAUDE.md` / `AGENTS.md`、不做跨仓库委派、不生成 prompt snippets 进行注入：`.planning/phases/58-subagent-environment-contract-injection/58-CONTEXT.md:103`。
- [证据] 设计已有 `ContractItem` 模型：`category`、`severity`、`content`、`metadata`、`sources.file/line/hash`：`.planning/phases/58-subagent-environment-contract-injection/58-DESIGN.md:64`。
- [证据] 现有 role filter 已覆盖 `explore`、`plan`、`edit`、`worker`、`verify`、`default`：`.planning/phases/58-subagent-environment-contract-injection/58-DESIGN.md:109`。
- [证据] CodeMap 已有可复用落点：`init` 的 plan/apply/receipt 架构：`src/cli/init/reconciler.ts:536`；`doctor` checker orchestrator：`src/cli/doctor/orchestrator.ts:10`；MCP 从 interface contract 自动注册 tools：`src/server/mcp/server.ts:78`。
- [证据] `.githooks/commit-msg` 实际接受 uppercase tags：`BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE`，并要求 `[TAG] scope: message`：`.githooks/commit-msg:7`、`.githooks/commit-msg:25`、`.githooks/commit-msg:34`。

### Past Learnings

- [证据] 既有 ideation 已把 `init` 定位为项目级 AI 助手基础设施初始化器，并强调不自动改写 `CLAUDE.md` / `AGENTS.md`：`docs/ideation/2026-04-20-mycodemap-init-enhancements-ideation.md:17`。
- [证据] UX/agent experience ideation 已把机器可读接口契约、CLI-as-MCP、doctor、agent skills 自动分发列为高杠杆方向：`docs/ideation/2026-04-29-ux-install-agent-experience-ideation.md:100`。
- [证据] dogfood 报告指出 agent 高风险点包括 `--json` 不一致、静默通过、低置信度空结果和噪音输出：`docs/eatdogfood-reports/2026-04-17-eatdogfood-agent-experience.md:85`。
- [推论] Phase 58 最稳形态不是"把更多规则塞进 prompt"，也不是"编译成可审计 IR 后注入"，而是**"发现真实契约 -> 建立结构化索引 -> 提供统一检索接口 -> 让子代理自行查询"**。

### External Context

- [证据] OpenAI Codex 官方文档确认 Codex 支持 subagent workflows、自定义 agents、`.codex/agents/` TOML、`developer_instructions`、sandbox 继承与显式 spawn：https://developers.openai.com/codex/subagents
- [证据] Claude Code 官方文档确认 project subagents 位于 `.claude/agents/`，subagent 有独立 context window、custom system prompt、tool access；subagent file body 成为 system prompt，且不会收到完整 Claude Code system prompt：https://docs.anthropic.com/en/docs/claude-code/sub-agents
- [推论] 两个平台都提供了"平台级子代理运行时"，但**项目级契约注入机制存在已知缺陷**。CodeMap 作为项目层工具，应提供**检索能力**而非**注入能力**。

### Risk Snapshot

- [推论] 最大风险从"把错误规则注入子代理"变为"子代理不执行检索提示，导致不知道规则"。
- [证据] 本轮 grounding 发现具体冲突风险：Phase 58 示例里出现 lowercase tags，但当前 hook 接受 uppercase tags；真实实现必须以 hook 或更权威来源为准。
- [证据] CodeMap CLI 本轮对真实存在的 phase Markdown 文件执行 `analyze -i read` 返回"未找到文件"，已记录到 `.mycodemap/issues/codemap-issues.md`。

## Ranked Ideas

### 1. Env Contract Discovery + Retrieval Index

**Description:** [推论] 把 env-contract 生成做成"发现+索引"流程。扫描仓库规则源（hooks、docs、configs），提取结构化契约项，输出 `.mycodemap/env-contract.json` 作为**检索索引**。子代理通过 `mycodemap env-contract --for <type> --json` 或 MCP `codemap_env_contract` 自行查询。

**Rationale:** [推论] 这是 Phase 58 v2 的核心。不依赖平台注入机制，而是利用子代理自身的 Bash/MCP 工具能力。规则始终最新，跨平台一致，上下文占用极小（只有一条检索提示）。

**Downsides:** [观点] 依赖子代理自觉执行检索提示；Explore/Plan 子代理动机强，Edit/Worker 可能直接开干。需通过简洁明确的提示和 agent type 适配来缓解。

**Confidence:** 90%

**Complexity:** Medium

**Status:** Expanded to Phase 58 Design v2

---

### 2. Contract Consistency Checker (冲突检测降级)

**Description:** [推论] 契约发现过程中检测多源冲突（如 hook 要求大写 tags，文档示例写小写）。输出 `conflicts[]` 到 `env-contract.json`，`mycodemap doctor` 报告冲突并给出 recommendation。不阻断生成，只 warn。

**Rationale:** [推论] 旧设计中的"冲突优先编译器"过于厚重（quarantined 状态、阻断策略）。降级为一致性检查更轻量，也避免变成小型规则推理系统。冲突由使用者决定以谁为准。

**Downsides:** [观点] 不自动解决冲突，需要人工判断。但自动解决冲突的权重分配本身就需要人工定义，warn-only 是务实的起点。

**Confidence:** 88%

**Complexity:** Low-Medium

**Status:** Incorporated into Phase 58 Design v2

---

### 3. Platform Adapter Config Generator

**Description:** [推论] `mycodemap env-contract --as-hook-config` 生成 Claude Code `SubagentStart` hook 配置；`mycodemap env-contract --as-codex-agent` 生成 Codex `developer_instructions` 检索提示模板。作为 `.mycodemap/assistants/` 下的 copy-paste 示例，不自动修改用户配置。

**Rationale:** [推论] 降低用户接入门槛。用户不需要手写 hook JSON 或 TOML，只需 copy-paste 生成的示例到 `.claude/settings.json` 或 `.codex/agents/`。

**Downsides:** [观点] Codex agent 配置存在已知 bug（#19399, #14579），生成的配置在部分平台可能不生效。需在文档中标注已知限制和备选方案。

**Confidence:** 85%

**Complexity:** Low

**Status:** Incorporated into Phase 58 Design v2

---

### 4. Agent Readiness Doctor With Probe Matrix

**Description:** [推论] 为每个 critical/high contract item 增加 probe 定义：来源 hash、抽取规则、验证命令、失败样例。`doctor` 新增 env-contract checker，报告 missing、stale、conflicting、MCP-tool-missing。

**Rationale:** [推论] 这把"生成了契约"提升为"契约可被真实 CLI/subprocess 验证"，贴合仓库真实场景验证阈值，也复用现有 doctor 架构。

**Downsides:** [观点] probe 初版应覆盖少数关键契约，如 commit、test、retrieval、output mode；不要一开始覆盖所有 docs/rules。

**Confidence:** 84%

**Complexity:** Medium

**Status:** Unexplored

---

### 5. Context-Budgeted Contract Fetch

**Description:** [推论] `mycodemap env-contract --for <role>` 和 MCP `codemap_env_contract` 支持按 agent type 过滤返回契约；无 MCP 环境使用 `.mycodemap/env-contract.json` 文件直接读取。

**Rationale:** [推论] 子代理上下文有限，按类型过滤可减少返回数据量。MCP 强时动态拉取，MCP 不可用时仍能靠文件工作。

**Downsides:** [观点] 这是检索模式的自然延伸，不是独立架构方向。

**Confidence:** 82%

**Complexity:** Low

**Status:** Incorporated into Phase 58 Design v2

---

### 6. Failure-Mode-First Contract Items

**Description:** [推论] 契约项不写成长手册，而是优先表达高频失败边界：不要裸 shell（本仓需 `rtk`）、不要错误 commit tag、不要用错误测试入口、低置信度空结果必须声明、机器输出必须保持 JSON/NDJSON 纯净。

**Rationale:** [推论] 子代理查询结果需要快速消化，负面边界比完整规范更能减少实际事故，也能自然支持失败场景验证。

**Downsides:** [观点] 如果只写禁止项，可能缺少正向示例；每个 critical item 至少应包含一个正确命令或正确格式。

**Confidence:** 78%

**Complexity:** Low-Medium

**Status:** Unexplored

---

### 7. Subagent Preflight Receipt

**Description:** [推论] 子代理执行任务前，通过检索获取契约并在输出中简短 ACK（如"已检索项目规则：使用 rtk 包装、commit 格式 [TAG] scope: message"）。父代理或验证脚本可观测到 ACK。

**Rationale:** [推论] 让"检索成功"成为可观测事件。如果子代理输出中没有规则 ACK，说明它可能忽略了检索提示。

**Downsides:** [观点] 不能要求所有子代理都复诵规则；ACK 应保持极短，主要用于验证与高风险任务。

**Confidence:** 72%

**Complexity:** Medium

**Status:** Unexplored

---

## Rejection Summary

| # | Idea | Reason Rejected |
|---|---|-----------------|
| 1 | Conflict-First Env Contract Compiler (v1) | [推论] 旧设计假设"注入可靠"，但社区验证表明平台注入机制不可靠。"编译器+阻断"模型过于厚重，降级为"发现+索引+一致性检查"。 |
| 2 | EnvContract IR And Adapter Compiler (prompt snippet lowering) | [推论] 旧设计包含生成 prompt snippets 并注入子代理。因注入路径不可靠，不再生成 `.mycodemap/prompt-snippets/`。适配层改为"检索指引生成"。 |
| 3 | Role-scoped prompt packs / wristband / checklist | [推论] 是必要呈现形态，但已被检索模式覆盖。子代理通过查询获取适合自身的规则子集。 |
| 4 | Source freshness hash check | [推论] 是 doctor/probe matrix 的组成部分，不够独立。 |
| 5 | Init receipt with manual injection tasks | [推论] 已在 Phase 58 scope 和现有 init receipt 架构中，适合作为实现细节。 |
| 6 | MCP env contract tool standalone gate | [推论] MCP 很重要，但 standalone 版本过度依赖 MCP；已并入检索接口设计。 |
| 7 | Platform-specific snippet packs | [推论] 已被平台适配配置生成覆盖。 |
| 8 | Contract as environment API | [推论] 是检索模式的核心原则，而非单独产品方向。 |
| 9 | 10x-token dossier | [观点] 可作为 debug mode，但主路径需要最小必要契约。 |
| 10 | Solo maintainer profile | [观点] 太窄，和 default profile 区别不够大。 |
| 11 | Multi-team role lattice | [推论] 方向合理，但 scenario profiles 更简单、更适合 Phase 58。 |
| 12 | No-platform bootstrap packet | [观点] 是边界原则，不是独立实施项。 |
| 13 | Subagent context gap report | [推论] 适合作为 doctor/fetch 的报告视图。 |
| 14 | JSON/NDJSON contract audit stream | [推论] 是检索接口必备输出属性，不是独立方向。 |

## Session Log

- 2026-05-02: 初始 ideation（v1）；假设"注入可靠"，提出冲突优先编译器、prompt snippet 生成等方案。
- 2026-05-02: 社区验证：发现 Claude Code `additionalContext` 压缩丢弃、`updatedInput` 静默丢弃、Codex agent 配置 bug 等关键证据。
- 2026-05-02: **修订为 v2**：从"注入模式"全面转向"检索模式"，废弃 prompt snippets 和冲突编译器，改为检索索引 + 一致性检查 + 平台适配配置生成。
- 2026-05-02: Phase 58 Context 和 Design 文档已同步更新为 v2。
