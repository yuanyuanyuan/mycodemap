# Phase 58 Context: Subagent Environment Contract Retrieval

**Gathered:** 2026-05-02 (revised)
**Status:** S1-S3 rework planned (v5 — subagent verification返工决策)
**Source:** Cross-ecosystem agent delegation research + v2.1 milestone requirements (SDC-01~05) + live issue-status recheck + official docs verification (2026-05-03) + S1-S3 返工讨论 (2026-05-05)

---

## 调研修正声明（第二版）

此前 Phase 58 的设计假设是"将契约编译成 prompt snippet 并注入子代理"。经社区 issue 验证，平台提供的注入机制存在已知缺陷（见下方「验证记录」）。官方文档确认了子代理机制的存在，但未提及这些缺陷。

1. **Claude Code `SubagentStart` hook 的 `additionalContext` 只能 append 到 user context**（issue #23885）。issue 原文指出这是机制设计（非 system prompt），在上下文压缩时**可能**被丢弃。
2. **Claude Code `PreToolUse` hook 的 `updatedInput` 对 Agent tool 静默丢弃**（issue #39814 已确认），无法直接修改子代理 prompt。
3. **Codex 官方文档确认子代理可通过 `.codex/agents/*.toml` 配置 `developer_instructions`**（[官方文档「Custom agent file schema」](https://developers.openai.com/codex/subagents)），但社区 issue 报告该机制存在多项缺陷：Windows 上不生效（#19399）、项目级 `.codex/config.toml` 自定义角色不被 `spawn_agent` 识别（#14579）、Codex App 中不注入（#11004）。
4. **Codex 子代理 spawn 时无条件附加硬编码的 `<spawned_agent_context>` prompt 块**（issue #17323 报告，代码路径 `codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs`）。官方文档未描述此行为，且当前无配置项可关闭或覆盖。

**因此 Phase 58 的目标从"注入契约"调整为"提供检索指引"：**
- 不是把规则塞进子代理 prompt，而是告诉子代理"规则在哪，怎么查"。
- 子代理通过自身工具能力（Bash/Read/MCP）主动检索规则。
- 契约发现引擎保留，但角色从"编译器"变为"索引生成器"。

### 2026-05-02 事实复核补丁

本 context 曾写明"所有 8 个 issue 均真实存在且处于开放状态"。2026-05-02 live recheck 后，该表述不再准确：

- Claude Code #49106 已关闭。
- Claude Code #23885 已关闭为 duplicate，但其 `additionalContext` 语义仍作为设计风险参考。
- Codex #14579 已关闭。
- Claude Code #40459 / #39814 与 Codex #17323 / #19399 / #11004 当前仍开放。

**规划含义**：Phase 58 不应依赖 issue 的开放状态作为唯一理由；真正锁定的是"平台级注入不能作为可靠项目层契约传播机制"这一风险模型。下游 researcher/planner 必须重新读取 canonical refs，而不是只复用本文件中的状态摘要。

---

<domain>
## Phase Boundary

### 问题定义

两个平台的子代理系统都存在同一个缺口：**项目特异性的环境契约不会自动流入子代理**。

但社区验证表明，**平台提供的"注入"机制本身不可靠**：

| 平台 | 子代理支持 | 官方注入机制 | 实际可靠性 | 社区 workaround |
|------|-----------|-------------|-----------|----------------|
| **Claude Code** | ✅ Agent/Tool 子代理 | `SubagentStart` hook + `additionalContext` | ⚠️ 中——文本注入到子代理对话开头（非 system prompt），子代理**不保证执行**（官方文档确认："placed at the start of the conversation, before the first prompt"）| 在子代理定义的系统提示中明确要求检索 |
| **Claude Code** | ✅ Agent/Tool 子代理 | `PreToolUse` + `updatedInput` 改 Agent prompt | ❌ **零**——静默丢弃 | 无法 workaround |
| **Claude Code** | ✅ Agent/Tool 子代理 | 子代理定义文件 `.claude/agents/*.md` 的系统提示 | ✅ 高——子代理收到的唯一系统提示（官方文档："Subagents receive only this system prompt"） | 在 prompt 中写死检索指令 |
| **Codex CLI** | ✅ Agent Thread | `.codex/agents/*.toml` 的 `developer_instructions`<br>（[官方文档](https://developers.openai.com/codex/subagents) 确认格式，必填字段） | ⚠️ 中——官方机制存在，但社区报告多项缺陷（#19399 Windows 不生效、#11004 App 不注入） | 在 developer_instructions 中写死检索指令 |
| **Codex CLI** | ✅ Agent Thread | spawn 时附加的硬编码 prompt 块<br>（官方文档未描述） | ❌ 低——无条件注入，无法配置（#17323） | 忍气吞声 |

> **[v4 修正]** 官方文档确认 `additionalContext` 是**文本注入**（不是强制命令执行），放在子代理对话开头。子代理是否遵循取决于 LLM 判断。同理，`developer_instructions` 是代理的"核心指令"，但也是文本，不保证执行。**最可靠的注入点是子代理定义文件的系统提示**（Claude: `.claude/agents/*.md` 的 body；Codex: `developer_instructions`），因为这是子代理收到的**唯一**系统提示。

**Phase 58 的新定位**：在"平台注入不可靠"的前提下，**在 mycodemap 项目层提供"检索指引"能力**，让子代理能够自行发现并应用项目规则。

### 为什么"检索"比"注入"更可靠？

| 维度 | 注入模式（旧设计） | 检索模式（新设计） |
|------|------------------|------------------|
| 规则新鲜度 | 基于 snapshot，可能过时 | 实时查询，始终最新 |
| 平台依赖 | 依赖平台 hook/agent 机制 | 只依赖子代理的 Bash/Read 工具 |
| 跨平台一致性 | 每个平台注入方式不同 | 统一的 CLI 查询接口 |
| 上下文占用 | 大（prompt snippets 塞满） | 小（只有一条检索提示） |
| 子代理控制力 | 被动接收，无法选择 | 主动查询，按需获取 |
| 失败模式 | 注入错误/过期的规则 | 查询失败时子代理可感知并处理 |

### Scope (Locked)

#### In Scope

1. **环境契约发现引擎**
   - 扫描 `package.json` scripts → 测试入口、构建命令
   - 扫描 `.githooks/commit-msg` → commit 格式规则 + TAG 白名单
   - 扫描 `docs/rules/testing.md` → Vitest 配置真相
   - 扫描 `AGENTS.md` → 检索优先级、任务分级规则
   - 扫描 `docs/rules/*.md` → 项目工程规范
   - 输出 `.mycodemap/env-contract.json`（结构化索引）

2. **契约一致性检查**
   - `mycodemap doctor` 检测多源规则是否矛盾（如 hook 要求大写 tags，文档示例写小写）
   - 报告冲突，但不阻断——让使用者决定以谁为准
   - 源文件 hash 漂移检测（规则文件是否改了）

3. **检索指引生成**
   - `mycodemap env-contract` —— 返回结构化契约 JSON
   - `mycodemap env-contract --for <agent-type>` —— 按代理类型过滤
   - `mycodemap env-contract --as-hook-config` —— 生成 Claude Code `SubagentStart` hook 配置
   - `mycodemap env-contract --as-codex-agent` —— 生成 Codex `developer_instructions` 检索提示模板

4. **CLI 集成**
   - `mycodemap init` → 生成 `.mycodemap/env-contract.json` + 平台适配配置指引
   - `mycodemap doctor` → 新增 `check-env-contract` 诊断项（一致性+漂移）
   - MCP server → 保留 `codemap_env_contract` tool（子代理通过 MCP 查询）

5. **平台适配配置（示例/模板）**
   - Claude Code `.claude/settings.json` 的 `SubagentStart` hook 示例
   - Codex `.codex/agents/` TOML 的 `developer_instructions` 示例
   - AGENTS.md / CLAUDE.md 中可引用的检索指引段落

#### Out of Scope (Explicit)

- **不生成 prompt snippets 并注入**——已验证该路径不可靠，本 phase 不提供
- **不替代平台的子代理基础设施**——mycodemap 不做 spawn/wait/close
- **不破坏平台隔离**——不注入任务历史、父会话决策
- **不自动重写用户的 `CLAUDE.md` / `AGENTS.md`**——只提供 copy-paste 片段
- **不做跨仓库委派**——Phase 58 只处理单仓库内的环境契约
- **不做通用 AI 助手规则**——只处理项目特异性的操作约定

</domain>

<decisions>
## Implementation Decisions

### 设计原则 (D-01)
- **检索优先**：默认输出是"去哪查"和"查什么"，不是"规则全文"
- **平台适配层只提供指引**：告诉子代理如何调用 `mycodemap env-contract`，不替平台做注入
- **实时为准**：子代理通过 CLI/MCP 查询获得的是当前仓库的真实规则
- **可审计**：每条契约有来源追踪，但不需要预编译去重合并
- **冲突只报告不阻断**：多源矛盾时输出 warn，由使用者决定以谁为准

### 与平台机制的关系 (D-02)
- **补充而非替代**：平台的子代理隔离机制（Claude Code 的 `omitClaudeMd`、Codex 的 spawn 行为）继续生效
- **mycodemap 是项目层索引**：提供统一查询接口，不替代平台级行为
- **不竞争、不冲突**：适配配置可以嵌入到用户的 `.claude/settings.json` 或 `.codex/agents/*.toml`

### 检索指引格式 (D-03)
- **Claude Code**: 子代理定义文件 `.claude/agents/*.md` 的系统提示中写入检索指令（**最可靠**——这是子代理收到的唯一系统提示）；`SubagentStart` hook 的 `additionalContext` 作为辅助（文本注入，不保证执行）
- **Codex**: `.codex/agents/*.toml` 的 `developer_instructions` 中嵌入检索指令（必填字段，但社区报告 Windows/App 环境下可能不生效）
- **通用**: AGENTS.md 中可引用 `"Use mycodemap env-contract to discover project-specific operational rules"`

> **[v4 修正]** 最可靠的注入点是子代理定义文件的系统提示，不是 SubagentStart 钩子。`additionalContext` 是文本注入，子代理不保证执行。

### 契约存储 (D-04)
- **`.mycodemap/env-contract.json`**：结构化索引，机器可读，带来源追踪
- **不生成 `.mycodemap/prompt-snippets/`**：该目录和预编译 snippet 模式已废弃
- **契约项标签保留**：`execution` / `commit` / `retrieval` / `validation` / `style`，用于过滤

### 与上游 Phase 的关系 (D-05)
- **Phase 51** (`init`): `mycodemap init` 生成 `.mycodemap/env-contract.json` 和平台适配配置指引（作为 init asset）
- **Phase 52** (Harness Guard): 运行时检测子代理是否检索了规则（可选增强，不阻塞）
- **Phase 53** (Profiles): 不同项目类型（Node.js/Python/Go/Rust）的契约发现规则不同
- **Phase 54** (Preview): `codemap preview` 可展示契约概览作为项目分析的一部分

### 本次补充讨论锁定 (D-06~D-10)

- **D-06：从 Phase 55 seed 演进，不重开 seed 设计。** Phase 58 必须把现有 `.mycodemap/env-contract.json` seed 升级为完整 Project Environment Contract；可以迁移 schema，但不能静默丢弃 Phase 55 已生成的 manifest facts 或 assistant 示例路径。
- **D-07：source authority 以可执行事实优先。** 冲突推荐顺序为：实际执行/验证入口（`.githooks/*`、`package.json` scripts、`vitest*.config.ts`） > `docs/rules/*` / `AGENTS.md` > generated assistant examples > brainstorm/example docs。doctor 报告冲突但不阻断，除非关键契约缺失导致 `--check` 失败。
- **D-08：MCP 暴露首选走 interface contract 自动注册。** `mycodemap env-contract` 应注册到 `src/cli/interface-contract/commands/`，优先让 MCP 动态暴露等价工具；planner 必须验证 hyphen 命令名是否会被规范化为可用的 `codemap_env_contract` 形态。只有当命名或输出形状无法满足子代理查询时，才新增手写 native MCP tool。
- **D-09：真实子代理验证遵循 roadmap 的更严格目标。** Requirement SDC-05 至少要求 Claude 或 Codex 一条真实子代理路径。Planner 应以"两者都做"为目标；若运行环境缺少其中一个平台，必须记录环境 blocker/waiver，不能静默降级。**[v4 修正]** `claude -p` 是单次提示模式（print mode），**不是**子代理机制（官方文档：https://code.claude.com/docs/en/cli-reference 确认 `-p` 为 non-interactive output）。真正的 Claude 子代理通过 Agent 工具派生，或 `claude --agent <name>` 启动会话级代理。Codex 子代理通过 `.codex/agents/*.toml` 配置 + 提示触发，`codex exec` 没有 `--agent` 参数。
- **D-10：Phase 57 依赖风险必须显式处理。** ROADMAP 声明 Phase 58 depends on Phase 57，但 STATE 当前仍显示 Phase 57 ready_to_plan；planner 在开始 Phase 58 前必须确认 Phase 57 的真实状态，或把未完成依赖作为 plan 前置检查。

### S1-S3 返工决策 (D-11~D-17, 2026-05-05 讨论)

- **D-11：新建 58-05 Plan，不修补已有 plan。** S1-S3 子代理验证返工以独立 plan (58-05-PLAN.md) 组织，不混入已完成的 58-01~58-04 记录。Plan 范围：全链路返工（重写验证脚本 + 创建 Claude/Codex 子代理定义文件 + 手动测试协议文档 + 证据收集机制）。代码改动仅限测试/验证层，不触及生产代码。
- **D-12：Claude 优先 + Codex 可选。** Claude 子代理验证是 SDC-05 的必须路径；Codex 子代理验证作为 optional，若运行环境缺少 Codex CLI 则记录 environment blocker/waiver，不阻塞 plan 或 v2.1 关闭。
- **D-13：验证通过标准为"检索调用存在即通过"。** 子代理 output 中包含 `mycodemap env-contract` 或 `codemap_env_contract` 的调用痕迹（命令输出、MCP 调用记录）即为通过。不要求规则被应用——因为 `additionalContext`/`developer_instructions` 是文本注入，LLM 不保证执行，这是已知平台限制而非代码缺陷。
- **D-14：子代理忽略检索指令 = 已知限制 + 改进提示。** 如果子代理忽略了系统提示中的检索指令，记录为"检索指引未被遵循"（已知限制），归类为 warn 而非 failure。改善方向是优化子代理定义文件中的系统提示措辞（增加 IMPORTANT/MANDATORY 标记、缩短步骤描述），不要求反复重试直到通过。
- **D-15：SDC-05 是 v2.1 关闭硬门。** 必须完成至少一条 Claude 真实子代理验证才能关闭 v2.1 里程碑。Codex 验证可记录 environment blocker 后 waiver。最小通过条件：Claude 子代理一条即通过。
- **D-16：验证方式为纯手动测试协议。** 不尝试自动化子代理派生（Claude Code 会话是交互式的，无法完全脚本化）。在 58-HUMAN-UAT.md 中写清晰的测试协议：创建子代理定义 → 启动 Claude Code → 派生子代理 → 收集 output → 判断是否检索。用户按步骤操作，复制结果作为证据。
- **D-17：重写验证脚本为准备脚本。** 现有 `scripts/verify-subagent-env-contract.mjs` 用 `claude -p` / `codex exec --agent` 测试（两者都不是真正子代理），重写为准备工作脚本：创建子代理定义文件、生成 hook 配置、打印手动测试步骤指引。不尝试自动启动子代理。保留完整证据收集机制（prompt + output + 判断结果写入 `docs/generated/phase-58/subagent-evidence/`）。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 验证记录

> **验证时间**：2026-05-02
> **验证方式**：直接访问 GitHub issue 页面和 Codex 官方文档
> **验证人**：AI assistant（非文档原作者）

| 引用 | 验证状态 | 说明 |
|------|---------|------|
| Claude Code #49106 | ✅ 真实存在，已关闭 | 子代理不继承 CLAUDE.md，多轮后规则覆盖率降至 ~5%；关闭状态不改变该历史证据的设计参考价值 |
| Claude Code #40459 | ✅ 真实存在，开放 | v2.1.84+ `omitClaudeMd: true`，作者做了二进制反编译分析 |
| Claude Code #23885 | ✅ 真实存在，已关闭为 duplicate | `additionalContext` 只能 append 到 user context（非 system prompt），原文说"可能"在压缩时丢弃 |
| Claude Code #39814 | ✅ 真实存在，开放 | `updatedInput` 对 Agent tool 静默丢弃，测试环境 2.1.85+/macOS |
| Codex #17323 | ✅ 真实存在，开放 | 子代理 spawn 时无条件附加 `<spawned_agent_context>` prompt 块，代码路径 `spawn.rs` 已确认 |
| Codex #14579 | ✅ 真实存在，已关闭 | 项目级 `.codex/config.toml` 自定义角色不被 `spawn_agent` 识别 |
| Codex #19399 | ✅ 真实存在，开放 | Windows Codex desktop app 上 named subagent config 完全不生效 |
| Codex #11004 | ✅ 真实存在，开放 | Codex App 中 `developer_instructions` 不注入（canonical refs 中遗漏，已补） |
| Codex 官方 Subagents 文档 | ✅ 可访问 | 确认子代理机制，但**未提及**上述已知缺陷 |

**重要发现**：
- 所有 8 个 issue 均真实存在，但开放状态已经分化：#49106 / #23885 / #14579 已关闭，其余引用仍开放。
- Issue #23885 的「压缩丢弃」是文档的推论，issue 原文表述为"may be dropped"（可能性），不是确定性结论。
- Codex 官方文档确认 subagent 配置机制，但对上述社区报告的缺陷/限制没有完整风险说明。

### 平台生态调研

> **[v4 新增]** 官方文档直接访问验证（2026-05-03）

#### 官方文档（已验证可访问）

- [Claude Code Hooks 文档](https://code.claude.com/docs/en/hooks) —— 确认 SubagentStart 钩子：matcher 按代理类型过滤，`additionalContext` 放在子代理对话开头（非 system prompt），不能阻断/修改子代理，用于 side effects
- [Claude Code Sub-agents 文档](https://code.claude.com/docs/en/sub-agents) —— 确认：子代理定义为 `.claude/agents/*.md`（YAML frontmatter + 系统提示），子代理收到的**唯一**系统提示是定义文件的 body（"not the full Claude Code system prompt"），支持 hooks/mcpServers/skills/isolation 等 frontmatter
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference) —— 确认 `-p`/`--print` 是 non-interactive output 模式，**不是**子代理机制；`--agent <name>` 以子代理身份运行整个会话
- [Codex Subagents 文档](https://developers.openai.com/codex/subagents) —— 确认：`.codex/agents/*.toml` 配置格式，`developer_instructions` 必填字段，内置代理（default/worker/explorer），子代理继承父会话 sandbox 策略
- [Codex Config Reference](https://developers.openai.com/codex/config-reference) —— 确认：`developer_instructions` 是 session 级可选字段，`agents.<name>.config_file` 指向代理 TOML 文件
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference) —— 确认：`codex exec` **没有** `--agent` 参数，有 `--skip-git-repo-check`、`--sandbox`、`--profile` 等参数

#### 社区 Issue（已验证存在）

- [Claude Code issue #49106](https://github.com/anthropics/claude-code/issues/49106) —— 子代理不继承 CLAUDE.md
- [Claude Code issue #40459](https://github.com/anthropics/claude-code/issues/40459) —— v2.1.84+ `omitClaudeMd: true` 分析
- [Claude Code issue #23885](https://github.com/anthropics/claude-code/issues/23885) —— `additionalContext` append 到 user context 而非 system prompt，压缩时可能丢弃
- [Claude Code issue #39814](https://github.com/anthropics/claude-code/issues/39814) —— `PreToolUse` `updatedInput` 对 Agent tool 静默丢弃
- [Codex issue #17323](https://github.com/openai/codex/issues/17323) —— 子代理 spawn 时无条件附加 `<spawned_agent_context>` prompt 块，代码路径 `codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs`
- [Codex issue #14579](https://github.com/openai/codex/issues/14579) —— 项目级 agent 配置不生效
- [Codex issue #19399](https://github.com/openai/codex/issues/19399) —— Windows 上 agent 配置不生效
- [Codex issue #11004](https://github.com/openai/codex/issues/11004) —— Codex App 中 `developer_instructions` 不注入

### 项目规则来源
- `AGENTS.md` —— 检索优先级（Section 6）、任务分级（Section 3.1）、证据协议（Section 5）
- `docs/rules/testing.md` —— Vitest 配置、测试入口命令
- `docs/rules/engineering-with-codex-openai.md` —— commit-msg 格式、hooks 规则
- `docs/rules/release.md` / `pre-release-checklist.md` —— `rtk` 包装规则
- `.githooks/commit-msg` —— commit 格式验证逻辑
- `package.json` scripts —— 测试、构建命令定义

### 现有 mycodemap 功能
- `src/cli/init/reconciler.ts` —— init plan/apply/receipt 架构
- `src/cli/init/env-contract-plan.ts` —— Phase 55 seed contract 生成与 InitAsset 集成
- `src/cli/init/manifest-extractors.ts` —— manifest facts 提取，当前只覆盖 obvious manifests
- `src/cli/init/assistant-plan.ts` —— inactive Claude/Codex assistant 示例，目前仍是 `cat .mycodemap/env-contract.json` 级别
- `src/cli/init/rules.ts` —— rules bundle 生成
- `src/cli/doctor/orchestrator.ts` —— doctor checker 编排
- `src/cli/doctor/types.ts` —— doctor category/severity/report/exitCode 类型
- `src/cli/interface-contract/commands/index.ts` —— public CLI contract registry
- `src/cli/index.ts` —— commander public command registry
- `src/server/mcp/server.ts` —— MCP server 工具注册
- `src/cli/interface-contract/` —— CLI 契约 schema

### 上游 Phase 关联
- `.planning/phases/51-post-install-agent-bootstrap-configuration/51-CONTEXT.md` —— init 生成 env-contract 的集成点
- `.planning/phases/52-codemap-cli-priority-harness-guard/52-CONTEXT.md` —— 运行时合规检查的可选增强
- `.planning/phases/53-bootstrap-profiles-project-detection/53-CONTEXT.md` —— 不同项目类型的契约发现规则
- `.planning/phases/54-zero-config-preview/54-CONTEXT.md` —— preview 展示契约概览

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/cli/init/env-contract-plan.ts` already models `.mycodemap/env-contract.json` as a tool-owned `InitAsset` with preview/apply/already-synced/conflict behavior. Phase 58 should extend or migrate this path instead of creating a second contract writer.
- `src/cli/init/manifest-extractors.ts` already extracts obvious manifest facts (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`) and explicitly records unknown test/build commands. This is the seed discovery baseline.
- `src/cli/init/assistant-plan.ts` already generates inactive `claude-hook-example.json` and `codex-agent-example.toml`. Phase 58 should upgrade these examples from raw `cat .mycodemap/env-contract.json` retrieval to the new `mycodemap env-contract --for <type> --json` / MCP retrieval interface.
- `src/cli/doctor/orchestrator.ts` runs doctor checkers in parallel and computes aggregate exit code from `DiagnosticSeverity`; `src/cli/doctor/types.ts` has the shared `agent` category needed for env-contract diagnostics.
- `src/server/mcp/server.ts` dynamically registers tools generated from the CLI interface contract via `convertContractToMcpTools()`. Registering a first-class `env-contract` command in the interface contract may be enough to expose it to MCP without hand-writing a native MCP tool.

### Established Patterns

- Public CLI commands need both commander registration and interface-contract registration.
- `mycodemap init` writes tool-owned `.mycodemap/` files, but team-owned files (`CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.codex/agents/*`) remain manual copy targets.
- Existing init assets treat content drift as `conflict` and require manual review rather than automatic overwrite.
- Doctor exit codes currently mean `0=all pass`, `1=has errors`, `2=warnings only`; Phase 58 should map env-contract drift/conflicts into that model rather than inventing a separate exit convention unless the CLI command itself needs `--check`-specific codes.

### Integration Points

- Add a new CLI command implementation for `mycodemap env-contract` and register it in `src/cli/index.ts`.
- Add an interface contract file under `src/cli/interface-contract/commands/` and include it in `src/cli/interface-contract/commands/index.ts`.
- Extend the init contract writer from Phase 55 to produce the full Project Environment Contract and keep `.mycodemap/status/env-contract-last.json` or equivalent metadata for drift checks.
- Add a doctor checker under `src/cli/doctor/` for stale/missing/conflicting env-contract state.
- Add/verify MCP exposure through the dynamic contract path, including generated tool naming for the hyphenated `env-contract` command; only add a native `codemap_env_contract` tool if the generated tool cannot satisfy subagent lookup ergonomics.
- Update assistant examples so subagents retrieve filtered contract data by agent type instead of reading the full seed file blindly.

</code_context>

<specifics>
## Specific Ideas

### 契约发现输出示例

`.mycodemap/env-contract.json`（检索索引）：

```json
{
  "version": "sha256:abc123...",
  "generatedAt": "2026-05-02T10:00:00Z",
  "items": [
    {
      "id": "shell-rtk-wrapper",
      "category": "execution",
      "severity": "critical",
      "content": "Shell commands must be wrapped with `rtk`",
      "sources": ["docs/rules/pre-release-checklist.md:180"]
    },
    {
      "id": "commit-format",
      "category": "commit",
      "severity": "critical",
      "content": "Use `[TAG] scope: message` format",
      "validTags": ["BUGFIX", "FEATURE", "REFACTOR", "CONFIG", "DOCS", "DELETE"],
      "sources": [".githooks/commit-msg:7"]
    },
    {
      "id": "test-entry-vitest",
      "category": "execution",
      "severity": "critical",
      "content": "Run tests with `npx vitest run`, not `npm test`",
      "sources": ["docs/rules/testing.md:11"]
    }
  ],
  "conflicts": [
    {
      "id": "commit-tag-case",
      "severity": "high",
      "description": "Commit tag case mismatch",
      "sources": [
        { "file": ".githooks/commit-msg", "value": "BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE" },
        { "file": "docs/brainstorms/phase-58-example.md", "value": "feat fix docs test refactor" }
      ],
      "recommendation": "Hook is the enforcement source; documentation examples should align with hook"
    }
  ],
  "sourceSnapshots": [
    { "file": "AGENTS.md", "hash": "sha256:abc...", "lastModified": "2026-05-01T08:00:00Z" },
    { "file": ".githooks/commit-msg", "hash": "sha256:def...", "lastModified": "2026-04-30T12:00:00Z" }
  ]
}
```

### 平台适配配置示例

**Claude Code `.claude/settings.json`：**

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "Explore",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SubagentStart\",\"additionalContext\":\"Before exploring, query project rules: mycodemap env-contract --for explore --json\"}}'"
          }
        ]
      }
    ]
  }
}
```

**Codex `.codex/agents/worker.toml`：**

```toml
name = "worker"
description = "Execution-focused agent for implementation and fixes"
# model = "o4-mini"  # 可选：覆盖父会话模型
# model_reasoning_effort = "high"  # 可选
# sandbox_mode = "workspace-write"  # 可选：覆盖父会话 sandbox 策略
developer_instructions = """
You are a worker agent responsible for implementing and fixing code.

Before starting any task, query the project environment contract:
- Run: mycodemap env-contract --for worker --json
- Or use the MCP tool: codemap_env_contract(agentType="worker")

The contract contains project-specific rules that you MUST follow, including:
- Shell command wrappers (e.g., rtk)
- Commit message format
- Test entry commands
- Code style requirements

IMPORTANT: The above retrieval step is MANDATORY. Do not skip it.
"""
```

> **[v4 修正]** `model = "gpt-5.4"` 改为注释占位符（避免引用不存在的模型 ID）。`developer_instructions` 中增加 "IMPORTANT" 强调，因为官方文档确认这是文本注入，子代理不保证执行。移除 `format="json"` 参数（MCP 工具签名中无此参数）。

### 集成点

1. **`mycodemap init` 增强**
   - 初始化时自动生成 `.mycodemap/env-contract.json`
   - 生成 `.mycodemap/assistants/claude-hook-example.json` 和 `.mycodemap/assistants/codex-agent-example.toml`
   - Init 收据报告契约生成状态和适配配置路径
   - **不自动修改**用户的 `.claude/settings.json` 或 `.codex/agents/`——只提供 copy-paste 示例

2. **`mycodemap doctor` 增强**
   - 新增 `check-env-contract` 诊断项
   - 检测契约是否过期（源文件 hash 漂移）
   - 检测关键契约项缺失
   - 检测多源冲突（warn 级别，不阻断）

3. **MCP Server 保留**
   - 保留 `codemap_env_contract` tool
   - 支持 `agent_type` 参数过滤
   - 返回结构化 JSON（子代理通过 MCP 查询，无需 Bash）

</specifics>

<deferred>
## Deferred Ideas

- 跨仓库委派时的目标仓库契约注入 → 需要更复杂的仓库发现和切换机制，v2.2+
- 契约的自动修复/同步（检测到漂移后自动更新）→ 需要变更检测和自动写文件机制，v2.2+
- 与 Claude Code hooks 的深层集成（可靠的 `updatedPrompt` / system-level project-context 注入机制）→ 等待平台提供明确支持后重新评估
- 与 Codex `config.toml` 的 `[agents]` 配置联动 → 等待 Codex agent config 格式稳定
- 契约的历史版本追踪和 diff 展示 → v2.2+
- 注入模式的重新评估 → 如果平台修复了 `additionalContext` 压缩问题或 `updatedInput` Agent tool 支持，可重新评估预注入方案。当前最可靠路径是子代理定义文件的系统提示（[v4 docs review 确认](https://code.claude.com/docs/en/sub-agents)）

</deferred>

---

*Phase: 58-subagent-environment-contract-injection*
*Context gathered: 2026-05-02 (revised v5 — 2026-05-05)*
*Design philosophy: retrieval over injection*
