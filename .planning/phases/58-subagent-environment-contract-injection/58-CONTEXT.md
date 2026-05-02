# Phase 58 Context: Subagent Environment Contract Retrieval

**Gathered:** 2026-05-02 (revised)
**Status:** Ready for planning (v2 draft)
**Source:** Cross-ecosystem agent delegation research + v2.1 milestone requirements (SDC-01~05)

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

---

<domain>
## Phase Boundary

### 问题定义

两个平台的子代理系统都存在同一个缺口：**项目特异性的环境契约不会自动流入子代理**。

但社区验证表明，**平台提供的"注入"机制本身不可靠**：

| 平台 | 子代理支持 | 官方注入机制 | 实际可靠性 | 社区 workaround |
|------|-----------|-------------|-----------|----------------|
| **Claude Code** | ✅ Agent/Tool 子代理 | `SubagentStart` hook + `additionalContext` | ❌ 低——append 到 user context，压缩后丢弃 | 手动在任务指令中重复规则 |
| **Claude Code** | ✅ Agent/Tool 子代理 | `PreToolUse` + `updatedInput` 改 Agent prompt | ❌ **零**——静默丢弃 | 无法 workaround |
| **Codex CLI** | ✅ Agent Thread | `.codex/agents/*.toml` 的 `developer_instructions`<br>（[官方文档](https://developers.openai.com/codex/subagents) 确认格式） | ⚠️ 中——官方机制存在，但社区报告多项缺陷 | `codex exec` 嵌套绕过 |
| **Codex CLI** | ✅ Agent Thread | spawn 时附加的硬编码 prompt 块<br>（官方文档未描述） | ❌ 低——无条件注入，无法配置（#17323） | 忍气吞声 |

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
- **Claude Code**: `SubagentStart` hook 返回 `additionalContext`: `"Before starting work, run: mycodemap env-contract --for <type> --json"`
- **Codex**: `developer_instructions` 嵌入 `"Query project rules via MCP tool codemap_env_contract or CLI mycodemap env-contract"`
- **通用**: AGENTS.md 中可引用 `"Use mycodemap env-contract to discover project-specific operational rules"`

### 契约存储 (D-04)
- **`.mycodemap/env-contract.json`**：结构化索引，机器可读，带来源追踪
- **不生成 `.mycodemap/prompt-snippets/`**：该目录和预编译 snippet 模式已废弃
- **契约项标签保留**：`execution` / `commit` / `retrieval` / `validation` / `style`，用于过滤

### 与上游 Phase 的关系 (D-05)
- **Phase 51** (`init`): `mycodemap init` 生成 `.mycodemap/env-contract.json` 和平台适配配置指引（作为 init asset）
- **Phase 52** (Harness Guard): 运行时检测子代理是否检索了规则（可选增强，不阻塞）
- **Phase 53** (Profiles): 不同项目类型（Node.js/Python/Go/Rust）的契约发现规则不同
- **Phase 54** (Preview): `codemap preview` 可展示契约概览作为项目分析的一部分

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
| Claude Code #49106 | ✅ 真实存在，开放 | 子代理不继承 CLAUDE.md，多轮后规则覆盖率降至 ~5% |
| Claude Code #40459 | ✅ 真实存在，开放 | v2.1.84+ `omitClaudeMd: true`，作者做了二进制反编译分析 |
| Claude Code #23885 | ✅ 真实存在，开放 | `additionalContext` 只能 append 到 user context（非 system prompt），原文说"可能"在压缩时丢弃 |
| Claude Code #39814 | ✅ 真实存在，开放 | `updatedInput` 对 Agent tool 静默丢弃，测试环境 2.1.85+/macOS |
| Codex #17323 | ✅ 真实存在，开放 | 子代理 spawn 时无条件附加 `<spawned_agent_context>` prompt 块，代码路径 `spawn.rs` 已确认 |
| Codex #14579 | ✅ 真实存在，开放 | 项目级 `.codex/config.toml` 自定义角色不被 `spawn_agent` 识别 |
| Codex #19399 | ✅ 真实存在，开放 | Windows Codex desktop app 上 named subagent config 完全不生效 |
| Codex #11004 | ✅ 真实存在，开放 | Codex App 中 `developer_instructions` 不注入（canonical refs 中遗漏，已补） |
| Codex 官方 Subagents 文档 | ✅ 可访问 | 确认子代理机制，但**未提及**上述已知缺陷 |

**重要发现**：
- 所有 8 个 issue 均真实存在且处于开放状态，无已关闭/已修复标记。
- Issue #23885 的「压缩丢弃」是文档的推论，issue 原文表述为"may be dropped"（可能性），不是确定性结论。
- Codex 官方文档对已知缺陷（无条件注入、Windows bug、项目级 config 不生效）**零提及**。

### 平台生态调研
- [Claude Code issue #49106](https://github.com/anthropics/claude-code/issues/49106) —— 子代理不继承 CLAUDE.md
- [Claude Code issue #40459](https://github.com/anthropics/claude-code/issues/40459) —— v2.1.84+ `omitClaudeMd: true` 分析
- [Claude Code issue #23885](https://github.com/anthropics/claude-code/issues/23885) —— `additionalContext` append 到 user context 而非 system prompt，压缩时可能丢弃
- [Claude Code issue #39814](https://github.com/anthropics/claude-code/issues/39814) —— `PreToolUse` `updatedInput` 对 Agent tool 静默丢弃
- [Codex 官方 Subagents 文档](https://developers.openai.com/codex/subagents) —— Agent Thread 配置和继承模型（确认：built-in agents、`.codex/agents/*.toml` 格式、`developer_instructions` 必填、`sandbox_mode` 继承。未提及：无条件 prompt 注入、已知缺陷）
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
- `src/cli/init/rules.ts` —— rules bundle 生成
- `src/cli/doctor/orchestrator.ts` —— doctor checker 编排
- `src/server/mcp/server.ts` —— MCP server 工具注册
- `src/cli/interface-contract/` —— CLI 契约 schema

### 上游 Phase 关联
- `.planning/phases/51-post-install-agent-bootstrap-configuration/51-CONTEXT.md` —— init 生成 env-contract 的集成点
- `.planning/phases/52-codemap-cli-priority-harness-guard/52-CONTEXT.md` —— 运行时合规检查的可选增强
- `.planning/phases/53-bootstrap-profiles-project-detection/53-CONTEXT.md` —— 不同项目类型的契约发现规则
- `.planning/phases/54-zero-config-preview/54-CONTEXT.md` —— preview 展示契约概览

</canonical_refs>

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
model = "gpt-5.4"
model_reasoning_effort = "high"
sandbox_mode = "workspace-write"
developer_instructions = """
You are a worker agent responsible for implementing and fixing code.

Before starting any task, query the project environment contract:
- Run: mycodemap env-contract --for worker --json
- Or use the MCP tool: codemap_env_contract(agentType="worker", format="json")

The contract contains project-specific rules that you MUST follow, including:
- Shell command wrappers (e.g., rtk)
- Commit message format
- Test entry commands
- Code style requirements
"""
```

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
- 与 Claude Code hooks 的深层集成（`SubagentStart` 支持 `updatedPrompt`）→ 等待官方 issue #23885 解决
- 与 Codex `config.toml` 的 `[agents]` 配置联动 → 等待 Codex agent config 格式稳定
- 契约的历史版本追踪和 diff 展示 → v2.2+
- 注入模式的重新评估 → 如果平台修复了 `additionalContext` 压缩问题或 `updatedInput` Agent tool 支持，可重新评估预注入方案

</deferred>

---

*Phase: 58-subagent-environment-contract-injection*  
*Context gathered: 2026-05-02 (revised v2)*  
*Design philosophy: retrieval over injection*
