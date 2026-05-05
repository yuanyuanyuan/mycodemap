---
status: partial
phase: 58-subagent-environment-contract-injection
source: [58-VERIFICATION.md]
started: 2026-05-02T16:30:00.000Z
updated: 2026-05-03T02:00:00.000Z
---

## Current Test

[awaiting human testing — test procedures redesigned based on official docs]

## Documentation Review (2026-05-03)

### Claude Code SubagentStart Hook — 官方文档确认

**来源:** https://code.claude.com/docs/en/hooks + https://code.claude.com/docs/en/sub-agents

| 项 | 原始假设 | 文档确认 | 影响 |
|---|---------|---------|------|
| SubagentStart 触发时机 | 子代理派生时触发 | ✅ 正确 | — |
| additionalContext 作用 | 强制子代理执行命令 | ❌ 错误 — 是文本注入，放在子代理对话开头，子代理**不保证执行** | 测试设计需重写 |
| 钩子能否阻断子代理 | 未考虑 | ❌ 不能 — "no decision control, cannot block or modify" | 无法强制检索 |
| 子代理系统提示 | 继承父会话 | ❌ 不继承 — "not the full Claude Code system prompt" | 需在子代理定义中明确要求检索 |
| matcher 过滤 | 按代理类型名 | ✅ 正确 — "Explore", "general-purpose", 自定义名 | — |

### Codex Agent TOML 配置 — 官方文档确认

**来源:** https://developers.openai.com/codex/subagents + https://developers.openai.com/codex/config-reference + https://developers.openai.com/codex/cli/reference

| 项 | 原始假设 | 文档确认 | 影响 |
|---|---------|---------|------|
| 代理配置文件位置 | `.codex/agents/` | ✅ 正确 — 也支持 `~/.codex/agents/` | — |
| developer_instructions | 必填字段 | ✅ 正确 — "Core instructions that define the agent's behavior" | — |
| `codex exec --agent` | 支持 | ❌ 错误 — `codex exec` 没有 `--agent` 参数 | 测试命令需修正 |
| "可信目录"概念 | 存在 | ❌ 错误 — 文档中无此概念；之前错误可能是不在 Git 仓库中 | 改用 `--skip-git-repo-check` |
| developer_instructions 执行 | 强制执行 | ❌ 错误 — 是文本注入，代理不保证执行 | 同 Claude 的问题 |
| 子代理 sandbox 策略 | 独立 | ❌ 继承父会话 — "Subagents inherit your current sandbox policy" | — |

### 关键发现

**两个平台的共同问题：** `additionalContext`（Claude）和 `developer_instructions`（Codex）都是**文本注入**，不是强制命令执行。子代理是否执行检索指令取决于：
1. 指令的清晰度和优先级
2. 子代理系统提示是否强调检索必要性
3. 子代理是否被设计为遵循这类指令

## Tests

### 1. Claude 子代理环境契约检索
expected: 子代理在开始工作前检索 env-contract 并报告内容
result: [pending — 需重新设计]
blocker: 原方案用 `claude -p` 模拟，非真正子代理机制

**修正后的测试方案：**
1. 创建子代理定义 `.claude/agents/env-contract-tester.md`，在系统提示中明确要求检索契约
2. 配置 SubagentStart 钩子注入 `additionalContext`（辅助作用）
3. 在 Claude Code 会话中通过 Agent 工具派生该子代理
4. 验证子代理是否执行了 `mycodemap env-contract --for explore --json`

**子代理定义文件：**
```markdown
---
name: env-contract-tester
description: Test agent that verifies environment contract retrieval
tools: Read, Bash, Grep, Glob
model: haiku
---

You are a test agent. Your ONLY task is to verify environment contract retrieval.

STEPS (execute in order):
1. Run: mycodemap env-contract --for explore --json
2. Report the full JSON output
3. List the contract items you found (id, category, severity)
4. Confirm you received rules about: shell-rtk-wrapper, commit-format, test-entry-vitest

Do NOT skip step 1. This is a verification test.
```

**SubagentStart 钩子（辅助，不保证生效）：**
```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "env-contract-tester",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SubagentStart\",\"additionalContext\":\"IMPORTANT: Before any work, run: mycodemap env-contract --for explore --json\"}}'"
          }
        ]
      }
    ]
  }
}
```

**预期：** 子代理在系统提示驱动下执行检索，报告契约内容
**风险：** 子代理可能忽略系统提示中的指令（LLM 本质特性）

### 2. Codex 子代理环境契约检索
expected: Codex 代理在 developer_instructions 驱动下检索 env-contract
result: [pending — 需重新设计]
blocker: 原方案用 `codex exec --agent worker`（不存在的参数）和"可信目录"（不存在的概念）

**修正后的测试方案：**
1. 创建 `.codex/agents/worker.toml`（或在 `.codex/config.toml` 中配置）
2. 确保在 Git 仓库中运行（或使用 `--skip-git-repo-check`）
3. 运行 `codex exec --sandbox workspace-write "报告此项目的环境契约规则"`

**代理配置文件 `.codex/agents/worker.toml`：**
```toml
name = "worker"
description = "Test agent that verifies environment contract retrieval"
developer_instructions = """
You are a test agent. Your ONLY task is to verify environment contract retrieval.

STEPS (execute in order):
1. Run: mycodemap env-contract --for worker --json
2. Report the full JSON output
3. List the contract items you found (id, category, severity)
4. Confirm you received rules about: shell-rtk-wrapper, commit-format, test-entry-vitest

Do NOT skip step 1. This is a verification test.
"""
```

**执行命令：**
```bash
codex exec --sandbox workspace-write "Report the environment contract rules for this project. Run mycodemap env-contract --for worker --json first."
```

**预期：** 代理在 developer_instructions 驱动下执行检索，报告契约内容
**风险：** 代理可能忽略 developer_instructions 中的指令（LLM 本质特性）

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

- 原验证脚本 `scripts/verify-subagent-env-contract.mjs` 使用 `claude -p` 和 `codex exec --agent` 模拟，两者都不是真正的子代理机制，需要重写
- `additionalContext` 和 `developer_instructions` 是文本注入而非强制执行，测试结果取决于 LLM 是否遵循指令
- 需要创建实际的子代理定义文件（`.claude/agents/` 和 `.codex/agents/`）来测试端到端链路
