# Phase 58 Design: Subagent Environment Contract Retrieval

> 基于跨平台调研后的重新设计（v2）。本文档定义 Phase 58 的完整架构、数据模型、CLI 接口和验证策略。
>
> 设计前提：
> - Claude Code 和 Codex CLI **都有**子代理功能
> - 两个平台都**不做**可靠的项目级环境契约注入（出于隔离设计哲学 + 机制缺陷）
> - mycodemap 作为**项目层索引提供者**，让子代理能够**自行检索**项目规则
> - 不生成 prompt snippets 进行注入，而是提供检索指引和查询接口

---

## 1. 架构分层

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AI 平台层（Claude Code / Codex）                │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ 子代理生命周期   │  │ 基础上下文隔离   │  │ 平台级指令注入       │ │
│  │ spawn/wait/close│  │ sandbox/权限    │  │ （不可靠）           │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
│                                                                     │
│  平台职责：通用基础设施，项目规则注入机制存在已知缺陷                   │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 子代理通过 Bash/MCP 查询项目规则
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                  mycodemap 项目层（Phase 58 新增）                   │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ 契约发现引擎     │  │ 契约存储 & 一致性│  │ 检索接口 & 适配配置 │ │
│  │ (Discovery)     │  │ (Consistency)   │  │ (Retrieval)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │
│                                                                     │
│  项目职责：发现、索引、验证项目特异性环境契约                         │
│           提供统一查询接口（CLI + MCP）                               │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
                              │ 项目提供环境操作事实
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                           项目仓库                                   │
│                                                                     │
│  AGENTS.md  docs/rules/*.md  package.json  .githooks/  .mycodemap/  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.1 设计原则

| 原则 | 说明 | 反例（避免） |
|------|------|------------|
| **检索优先** | 默认输出是"去哪查"和"查什么"，不是规则全文 | 生成 prompt snippets 并按类型注入 |
| **实时为准** | 子代理查询获得的是当前仓库真实规则 | 基于 snapshot 的预编译契约 |
| **平台适配只提供指引** | 告诉子代理如何调用 `mycodemap env-contract` | 替平台做 prompt 注入 |
| **冲突报告不阻断** | 多源矛盾时输出 warn，由使用者决定 | 阻断式冲突编译器 |
| **补充平台** | 不替代平台的隔离机制 | 试图让子代理继承父会话所有上下文 |

---

## 2. 数据模型

### 2.1 Contract Item（契约项）

```typescript
interface ContractItem {
  /** 唯一标识符，如 "shell-rtk-wrapper" */
  id: string;

  /** 契约范畴，用于过滤 */
  category: 'execution' | 'commit' | 'retrieval' | 'validation' | 'style';

  /** 严重程度：critical = 不知道就会直接出错 */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** 人类可读的契约描述 */
  content: string;

  /** 结构化数据（可选） */
  metadata?: Record<string, unknown>;

  /** 来源文件和行号，用于审计和漂移检测 */
  sources: Array<{
    file: string;
    line?: number;
    hash?: string; // 文件内容 hash，用于漂移检测
  }>;
}
```

### 2.2 Contract Conflict（契约冲突）

```typescript
interface ContractConflict {
  /** 唯一标识符 */
  id: string;

  /** 严重程度 */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** 冲突描述 */
  description: string;

  /** 冲突的各来源 */
  sources: Array<{
    file: string;
    value: string;
  }>;

  /** 建议以哪个来源为准 */
  recommendation: string;
}
```

### 2.3 Project Environment Contract（项目环境契约）

```typescript
interface ProjectEnvironmentContract {
  /** 契约版本（基于源文件 hash） */
  version: string;

  /** 生成时间 */
  generatedAt: string;

  /** 发现的全部契约项 */
  items: ContractItem[];

  /** 检测到的冲突 */
  conflicts: ContractConflict[];

  /** 源文件快照（用于漂移检测） */
  sourceSnapshots: Array<{
    file: string;
    hash: string;
    lastModified: string;
  }>;
}
```

### 2.4 Agent Type Filter（代理类型过滤）

```typescript
interface AgentTypeContractFilter {
  /** 代理类型标识 */
  agentType: string;

  /** 接收的契约范畴 */
  includedCategories: ContractItem['category'][];
}

const DEFAULT_AGENT_FILTERS: AgentTypeContractFilter[] = [
  { agentType: 'explore', includedCategories: ['retrieval', 'validation'] },
  { agentType: 'plan', includedCategories: ['validation', 'retrieval'] },
  { agentType: 'edit', includedCategories: ['execution', 'commit', 'style', 'validation'] },
  { agentType: 'worker', includedCategories: ['execution', 'commit', 'style', 'validation'] },
  { agentType: 'verify', includedCategories: ['execution', 'validation'] },
  { agentType: 'default', includedCategories: ['execution', 'commit', 'style', 'validation', 'retrieval'] },
];
```

> 注意：过滤只影响 `mycodemap env-contract --for <type>` 的输出范围，不影响注入——因为不注入。

---

## 3. 契约发现引擎

### 3.1 发现源和映射

| 源文件 | 发现的内容 | 范畴 | 发现方式 |
|--------|-----------|------|---------|
| `package.json` scripts | 测试命令、构建命令 | `execution` | 读取 scripts 字段 |
| `.githooks/commit-msg` | commit 格式、TAG 白名单 | `commit` | 解析 hook 脚本中的正则 |
| `docs/rules/testing.md` | Vitest 配置、测试入口 | `execution` | 解析 markdown 中的配置 |
| `AGENTS.md` Section 6 | 检索优先级规则 | `retrieval` | 匹配规则描述 |
| `AGENTS.md` Section 3.1 | 任务分级规则 L0-L3 | `validation` | 匹配任务分级表格 |
| `AGENTS.md` Section 8.1 | 真实场景验证阈值 | `validation` | 匹配验证要求 |
| `docs/rules/engineering-with-codex-openai.md` | commit-msg 格式确认 | `commit` | 匹配格式描述 |
| `docs/rules/release.md` | `rtk` 包装规则 | `execution` | 匹配 `rtk` 命令示例 |
| `.mycodemap/rules/` | 本地自定义规则 | 多种 | 读取 rules bundle |
| `vitest.config.ts` / `vitest.e2e.config.ts` | 实际测试配置 | `execution` | 解析配置字段 |

### 3.2 发现流程

```
扫描仓库 → 识别源文件 → 提取契约事实 → 打标签 → 生成索引 → 检测冲突
```

**冲突检测策略：**
- 同一契约（如 commit 格式）在多个源中出现时，比较内容是否一致
- 不一致时记录为 `ContractConflict`，不阻断生成
- 冲突以"更权威的源"标记 recommendation：hooks > docs/rules > AGENTS.md > package.json

---

## 4. CLI 接口设计

### 4.1 命令族：`mycodemap env-contract`

```bash
# 显示完整契约（JSON）
mycodemap env-contract

# 按代理类型过滤
mycodemap env-contract --for edit
mycodemap env-contract --for explore
mycodemap env-contract --for plan
mycodemap env-contract --for verify

# 生成 Claude Code hook 配置示例
mycodemap env-contract --as-hook-config

# 生成 Codex agent 配置示例
mycodemap env-contract --as-codex-agent

# 验证契约完整性（检查源文件是否漂移 + 冲突检测）
mycodemap env-contract --check
# 退出码：0 = 最新且无冲突，1 = 有漂移，2 = 有关键冲突

# 强制重新生成（忽略缓存）
mycodemap env-contract --update
```

### 4.2 输出示例

**`mycodemap env-contract --for edit`：**

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
      "sources": [{ "file": "docs/rules/pre-release-checklist.md", "line": 180 }]
    },
    {
      "id": "commit-format",
      "category": "commit",
      "severity": "critical",
      "content": "Use `[TAG] scope: message` format",
      "validTags": ["BUGFIX", "FEATURE", "REFACTOR", "CONFIG", "DOCS", "DELETE"],
      "sources": [{ "file": ".githooks/commit-msg", "line": 7 }]
    }
  ],
  "conflicts": []
}
```

**`mycodemap env-contract --as-hook-config`：**

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
      },
      {
        "matcher": "Plan",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SubagentStart\",\"additionalContext\":\"Before planning, query project rules: mycodemap env-contract --for plan --json\"}}'"
          }
        ]
      }
    ]
  }
}
```

**`mycodemap env-contract --as-codex-agent`：**

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

The contract contains project-specific rules that you MUST follow.
"""
```

### 4.3 与 `init` 集成

```bash
# 初始化时自动生成环境契约和适配配置示例
mycodemap init
# 输出中包含：
# ✅ Generated .mycodemap/env-contract.json
# ✅ Generated .mycodemap/assistants/claude-hook-example.json
# ✅ Generated .mycodemap/assistants/codex-agent-example.toml
# ℹ️  Copy the assistant configs to your .claude/settings.json or .codex/agents/
```

### 4.4 与 `doctor` 集成

```bash
mycodemap doctor
# 输出新增：
# [agent] contract-schema-ok          ✅ env-contract.json is valid
# [agent] contract-fresh              ✅ env-contract is up-to-date (hash match)
# [agent] contract-conflicts          ⚠️  1 conflict: commit-tag-case (hook vs docs)
#                                      Recommendation: align docs with .githooks/commit-msg
```

---

## 5. MCP Server 集成

### 5.1 MCP Tool：`codemap_env_contract`

```json
{
  "name": "codemap_env_contract",
  "description": "Query the project environment contract for sub-agent rule retrieval",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agentType": {
        "type": "string",
        "enum": ["explore", "plan", "edit", "worker", "verify", "default"],
        "description": "Filter contract items by agent type"
      },
      "format": {
        "type": "string",
        "enum": ["json"],
        "default": "json",
        "description": "Output format"
      },
      "category": {
        "type": "string",
        "enum": ["execution", "commit", "retrieval", "validation", "style"],
        "description": "Optional: filter by specific category"
      }
    }
  }
}
```

### 5.2 使用场景

AI 助手可以通过 MCP 在委派子代理前查询契约：

```
[Parent Agent] 要编辑 src/cli/commands/generate.ts
→ 调用 codemap_env_contract(agentType="edit")
→ 收到结构化 JSON
→ 将 JSON 内容作为上下文提供给子代理
→ 或者将检索提示 prepend 到子代理的 task prompt 中
```

---

## 6. 存储与文件布局

```
.mycodemap/
├── env-contract.json              # 结构化契约索引（机器可读）
├── assistants/                    # 平台适配配置示例（不自动生效）
│   ├── claude-hook-example.json   # Claude Code SubagentStart hook 示例
│   └── codex-agent-example.toml   # Codex agent developer_instructions 示例
└── status/
    └── env-contract-last.json     # 上次生成元数据（用于漂移检测）
```

> **注意**：v1 不生成 `.mycodemap/prompt-snippets/`。该目录在旧设计中存放预编译 prompt snippet，因注入路径不可靠已废弃。

---

## 7. 验证策略

### 7.1 验证分层

| 层级 | 验证方式 | 说明 |
|------|---------|------|
| **单元测试** | Jest/Vitest | 契约发现逻辑、过滤逻辑、冲突检测 |
| **集成测试** | 子进程调用 CLI | `mycodemap env-contract --for edit --json` 输出验证 |
| **E2E 验证** | 真实子代理运行 | 验证子代理能否通过 Bash/MCP 查询到规则 |

### 7.2 真实子代理验证（必须）

Phase 58 **必须**包含真实子代理运行验证，满足 SDC-05 和 VER-03。

**验证场景 A：Claude Code Subagent 通过 Bash 检索**

```bash
# 1. 在隔离的 temp repo 中初始化 mycodemap
cd $(mktemp -d)
git init
cp /path/to/test-project/{AGENTS.md,package.json,.githooks} ./
mycodemap init

# 2. 启动 Claude Code 会话，配置 SubagentStart hook
# hook 返回: "Before exploring, query: mycodemap env-contract --for explore --json"

# 3. 让 Claude Code 派 Explore 子代理去找所有测试文件
# 预期：子代理在第一个 tool call 中执行 Bash("mycodemap env-contract --for explore --json")
# 预期：子代理的输出中包含检索到的规则（如"Use mycodemap query first"）
# 预期：子代理后续使用 mycodemap query 而非 grep
```

**验证场景 B：Codex Subagent 通过 MCP 检索**

```bash
# 1. 配置 .codex/agents/worker.toml 包含检索提示

# 2. 通过 codex exec 启动子代理，执行需要知道规则的任务
# 预期：子代理调用 codemap_env_contract MCP tool
# 预期：子代理获取规则后遵守 commit 格式、使用 rtk 包装
```

**负面验证场景**：

```bash
# 移除 env-contract.json，验证子代理查询失败
# 预期：子代理报告"无法找到项目规则"，而不是静默按默认行为执行
```

### 7.3 验证证据要求

根据 AGENTS.md Section 8.1 真实场景验证阈值：

1. **真实命令记录**：子代理执行 `mycodemap env-contract` 的完整命令行
2. **真实查询产物**：子代理收到的 env-contract JSON 输出
3. **真实规则应用证据**：子代理的输出中正确使用 rtk/commit-format/vitest 的证据
4. **真实失败场景**：无 env-contract.json 时子代理查询失败的证据
5. **工作区卫生检查**：验证后 working tree 是干净的

---

## 8. 与现有功能的集成矩阵

| 现有功能 | 集成方式 | 输出变化 |
|---------|---------|---------|
| `mycodemap init` | 新增生成步骤 | 生成 `.mycodemap/env-contract.json` + `assistants/` 示例配置 |
| `mycodemap doctor` | 新增诊断项 | `check-env-contract` 检测漂移和冲突 |
| `mycodemap generate` | 无直接联动 | 可选 `--env-contract` flag 同步更新契约 |
| MCP Server | 保留 tool | `codemap_env_contract` tool |
| Contract Schema | 新增命令 | `env-contract` 加入 interface contract |
| `mycodemap init` receipt | 新增状态项 | 报告契约生成状态和适配配置路径 |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 子代理不执行检索提示 | 子代理不知道规则 | 检索提示要简短明确（< 100 字符）；Explore/Plan 子代理动机强，优先覆盖 |
| 子代理检索失败 | 命令不存在或报错 | `mycodemap env-contract` 命令本身要有清晰的错误输出；子代理可感知 |
| 每个子代理重复查询 | 时间和 token 开销 | 子代理上下文隔离，无法共享；开销可控（单次查询 < 100ms） |
| 平台修复注入机制 | 检索模式变得次优 | 保留评估：如果平台修复了 `updatedPrompt` 或 `developer_instructions`，可重新评估预注入 |
| 与 Codex bug 冲突 | Codex agent 配置不生效 | 提供 `codex exec` 嵌套作为备选方案文档；不依赖 Codex 原生 agent 配置 |

---

## 10. 实现顺序（建议）

### Wave 1：契约发现与存储（无依赖）
1. 实现契约发现引擎（扫描各源文件）
2. 实现 `env-contract.json` 生成
3. 实现冲突检测（只报告不阻断）
4. 单元测试覆盖发现逻辑

### Wave 2：检索接口（依赖 Wave 1）
1. 实现 `mycodemap env-contract` CLI
2. 实现 `--for <type>` 过滤
3. 实现 `--as-hook-config` 和 `--as-codex-agent` 配置生成
4. 集成测试覆盖 CLI 输出

### Wave 3：与现有功能集成（依赖 Wave 2）
1. 集成到 `mycodemap init`
2. 集成到 `mycodemap doctor`
3. 保留 MCP tool
4. 加入 contract schema

### Wave 4：真实子代理验证（依赖 Wave 3）
1. Claude Code 真实子代理检索验证
2. Codex 真实子代理检索验证
3. 负面场景验证
4. 证据收集与归档

---

*Design: 58-subagent-environment-contract-injection*  
*Created: 2026-05-02*  
*Revised: 2026-05-02 (v2 — retrieval over injection)*  
*Status: Ready for planning*
