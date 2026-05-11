# Phase 74: Env-contract Reminder Hook - Research

**Researched:** 2026-05-10
**Domain:** Delegated-agent reminder hooks for Phase 58 env-contract retrieval
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Trigger Boundary
- **D-01:** The reminder triggers only at **agent/subagent start** for delegated work, not on unrelated hook events in the same session.
- **D-02:** Codex and Claude should preserve the same behavior semantics, but may use runtime-specific equivalent hook implementations rather than forcing one identical event model.
- **D-03:** Reminder selection is **role-aware**: within a parent session, the first start for each delegated role may trigger its own reminder.

### Silence Scope
- **D-04:** `then-silent` is keyed by **parent session × agent role**.
- **D-05:** Within the same parent session, the first `worker` start reminds, later `worker` starts stay silent; a first `explore` or `verify` start may still remind once for that role.
- **D-06:** Silence state resets when the parent session ends; Phase 74 does not introduce cross-session or persistent memory.
- **D-07:** Silence keys should not split separately by runtime, to avoid Codex/Claude drift in the user-visible contract.

### Failure Visibility
- **D-08:** If the Phase 58 retrieval surface is unavailable, the hook must emit a **visible warning** with **exact actionable remediation**.
- **D-09:** Phase 74 must not silently fall back to hidden prompt snippets, cached rules, or implicit injected guidance.
- **D-10:** Retrieval failure should remain visible while delegated work continues; this phase does not hard-block agent/subagent start.

### Phase Boundary Reinforcement
- **D-11:** Phase 74 reuses the shipped Phase 58 `env-contract` retrieval surface; it must not reopen or redesign the underlying env-contract contract.
- **D-12:** Phase 74 locks behavior around reminders only; it must not expand into a new governance/control plane for hooks.

### the agent's Discretion
- Exact session-key plumbing and in-memory state shape, as long as user-visible semantics remain `parent session × role`.
- Exact reminder wording, as long as it points to the existing `env-contract` retrieval surface and remains clearly role-aware.
- Exact failure-message format and transport surface, as long as failures are visible, actionable, and testable.

### Deferred Ideas (OUT OF SCOPE)
- Expanding reminders to unrelated hook events beyond delegated start
- Cross-session or persistent reminder memory
- Hidden fallback rule injection, prompt snippets, or cached governance text
- Hard-blocking delegated work when retrieval is unavailable
- Any redesign of the Phase 58 env-contract contract or broader hook policy framework
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOK-02 | Implement first-remind-then-silent hook behavior and route reminders to the Phase 58 env-contract retrieval surface | Runtime seams, session-key model, failure surfacing, and existing test anchors below define the minimum implementable shape |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 输出与交付默认使用中文。[VERIFIED: AGENTS.md]
- 回复必须区分 `[证据]` / `[推论]` / `[假设]` / `[观点]`，未核实内容不能伪装成事实。[VERIFIED: AGENTS.md]
- 默认采用 retrieval-led reasoning，不把记忆当作最终事实。[VERIFIED: AGENTS.md]
- 任务开始必须声明风险等级；本 phase 属于 hook/config 相关规划，至少按 L1 看待。[VERIFIED: AGENTS.md]
- 只改与任务直接相关的文件；禁止顺手扩大范围。[VERIFIED: AGENTS.md]
- 涉及 hooks / CI / 输出契约时，必须给出失败场景与修复验证证据。[VERIFIED: AGENTS.md][VERIFIED: docs/rules/validation.md]
- 不得通过关闭 hook、`--no-verify`、放宽阈值来“过关”。[VERIFIED: AGENTS.md][VERIFIED: docs/rules/engineering-with-codex-openai.md]
- 仓库 shell 约定要求使用 `rtk` 包装命令。[VERIFIED: /home/stark/.codex/RTK.md]

## Summary

Phase 74 不需要重开 env-contract 设计，也不需要新增控制面。已有 CLI `env-contract`、原生 MCP `codemap_env_contract`、Phase 58 验证夹具、以及 Claude/Codex 的 runtime 配置面已经足够支撑一个很窄的“提醒器”实现。[VERIFIED: src/cli/commands/env-contract.ts][VERIFIED: src/server/mcp/server.ts][VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-VERIFICATION.md]

Claude 路径的实现 seam 明确：官方文档直接提供 `SubagentStart` / `SubagentStop`，并在输入里暴露 `session_id`、`agent_id`、`agent_type`；这与 `parent session × role` 语义天然对齐。[CITED: https://code.claude.com/docs/en/hooks][CITED: https://code.claude.com/docs/en/sub-agents] Codex 路径目前最关键的不确定点不是“有没有 hooks”，而是“spawned subagent 到底映射到哪个 hook event，以及是否带足够角色信号”。官方文档已确认 Codex 有 `SessionStart`、`UserPromptSubmit`、`Stop` hooks，并提供 `session_id`，但没有专门的 `SubagentStart` 事件说明。[CITED: https://developers.openai.com/codex/hooks][CITED: https://developers.openai.com/codex/subagents]

最小可行方案应采用“共享决策引擎 + runtime 适配输出”模式：把 Claude/Codex 的 hook 输入先归一化成统一事件，再由一个共享状态层判断“首次提醒 / 后续静默 / 检索失败警告”，最后按 runtime 输出 `additionalContext` 或可见 warning。由于 hooks 每次都是独立进程，`then-silent` 不能靠进程内内存；必须有一个会话级、非持久化、可原子写入的临时状态账本。[CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]

**Primary recommendation:** 用一个共享 TypeScript reminder engine 复用 Phase 58 的 `env-contract` CLI/MCP 检索面；Claude 直接落在 `SubagentStart`，Codex 先做一个极小 PoC 确认 `SessionStart` 或 `UserPromptSubmit` 哪个能稳定表达“delegated role start”，再接主实现。[VERIFIED: src/cli/commands/env-contract.ts][CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Delegated-start detection for Claude | Frontend Server (runtime hook layer) | — | Claude 官方把 `SubagentStart` / `SubagentStop` 暴露在主会话 hook 系统里。[CITED: https://code.claude.com/docs/en/hooks] |
| Delegated-start detection for Codex | Frontend Server (runtime hook layer) | API / Backend | Codex hooks 是会话级 CLI/runtime 生命周期扩展点；若 role 解析不足，才需要从 agent config surface 辅助补信号。[CITED: https://developers.openai.com/codex/hooks][CITED: https://developers.openai.com/codex/subagents] |
| Reminder decision logic (`first-remind-then-silent`) | API / Backend | Frontend Server | 判断逻辑应该集中到共享 TypeScript 模块，避免在两套 hook 脚本里复制状态规则。[VERIFIED: src/cli/commands/env-contract.ts][VERIFIED: src/cli/init/assistant-plan.ts] |
| Env-contract retrieval | API / Backend | — | 现有 CLI `mycodemap env-contract --for <role> --json` 与 MCP `codemap_env_contract` 已是 shipped retrieval surface。[VERIFIED: src/cli/commands/env-contract.ts][VERIFIED: src/server/mcp/server.ts] |
| Session-local silence ledger | Database / Storage | Frontend Server | Hooks 是多次独立进程调用，状态必须落到临时存储；但只能是 session-local、非持久化账本。[CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks] |
| Visible failure surfacing | Frontend Server (runtime hook output) | — | Warning 必须经 runtime hook 输出面到达用户/事件流，而不是隐藏在 repo 内部日志里。[CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks] |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 24.14.0 available locally | Hook helper runtime and temp-state I/O | 本仓库现有 CLI/runtime 已经是 Node/TypeScript 主路径，无需额外 runtime。[VERIFIED: package.json][VERIFIED: local env `node --version`] |
| TypeScript | repo `5.3.3` | Shared reminder engine and runtime adapters | 直接复用现有 CLI 分层与测试基线，避免再引 shell-only 状态机。[VERIFIED: package.json] |
| `@modelcontextprotocol/sdk` | repo `1.29.0`; latest `1.29.0` published 2026-03-30 | Existing MCP retrieval surface (`codemap_env_contract`) | Phase 74 不需要新 MCP dependency；现有原生 tool 已可做 fallback retrieval/remediation target。[VERIFIED: package.json][VERIFIED: src/server/mcp/server.ts][VERIFIED: npm registry] |
| `vitest` | repo `1.1.0`; latest `4.1.5` published 2026-04-21 | Hook decision/unit regression tests | 仓库测试主框架已固定为 Vitest；本 phase 只应补测试，不做框架升级。[VERIFIED: package.json][VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `commander` | repo `11.1.0` | If a hidden/utility CLI entrypoint is added for hooks | 仅在把 hook runner 暴露为 CLI 子命令时使用；否则直接复用现有 command wiring。[VERIFIED: package.json][VERIFIED: src/cli/commands/env-contract.ts] |
| Node `fs` / `path` / `os` | built-in | Temp ledger, atomic marker creation, cleanup | 实现 session-local silence 时优先用标准库，不引入缓存/DB 包。[ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared reminder engine | Separate Claude/Codex shell scripts | 短期更快，但状态规则和失败文案会分叉，违背 D-07。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md] |
| OS tempdir ledger | SQLite / repo-local JSON | SQLite/仓库文件都更接近持久化控制面，超出 phase 边界。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md][ASSUMED] |
| Visible warning + continue | Hard block | 与 D-10 冲突。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md] |

**Installation:**
```bash
# None — reuse existing workspace dependencies
```

**Version verification:** current npm registry checks completed for `vitest` and `@modelcontextprotocol/sdk`; no new package install is recommended in this phase.[VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
Claude SubagentStart --------------------\
                                          \
Codex SessionStart/UserPromptSubmit -----> Normalize Hook Event
                                           (runtime, session_id, role, event)
                                                     |
                                                     v
                                     Atomic Session-Role Silence Ledger
                                     key = parent_session_id + normalized_role
                                                     |
                           +-------------------------+-------------------------+
                           |                                                   |
                           v                                                   v
                    first time? yes                                      first time? no
                           |                                                   |
                           v                                                   v
         Build reminder target: `mycodemap env-contract --for <role> --json`  silent no-op
         or `codemap_env_contract(agentType="<role>")`
                           |
                           v
              Retrieval surface reachable? ---- no ----> visible warning + exact remediation + continue
                           |
                          yes
                           |
                           v
               runtime adapter emits additionalContext / systemMessage
```

### Recommended Project Structure
```text
src/
├── cli/env-contract/
│   ├── reminder-hook.ts      # shared decision engine
│   ├── reminder-state.ts     # atomic session-role marker logic
│   └── reminder-format.ts    # Claude/Codex output adapters
├── cli/commands/
│   └── env-contract.ts       # optional hidden hook entrypoint wiring
└── server/mcp/
    └── server.ts             # existing retrieval fallback target, unchanged behavior
```

### Pattern 1: Shared Hook Decision Engine
**What:** 将 runtime hook payload 先归一化，再由单个函数返回 `remind | silent | warn`，避免把状态判断写进两套 hook 脚本。[VERIFIED: src/cli/commands/env-contract.ts][CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]
**When to use:** 当 Claude/Codex 语义要一致，但事件名/输出格式不同的时候。
**Example:**
```typescript
// Source: derived from official Claude/Codex hook input schemas and local env-contract role model
type NormalizedReminderEvent = {
  runtime: 'claude' | 'codex';
  parentSessionId: string;
  role: 'explore' | 'plan' | 'edit' | 'worker' | 'review' | 'verify' | 'default';
};

type ReminderDecision =
  | { kind: 'silent' }
  | { kind: 'remind'; command: string; mcpTool: string }
  | { kind: 'warn'; message: string };

function decideReminder(
  event: NormalizedReminderEvent,
  markFirstSeen: (key: string) => boolean,
  retrievalAvailable: boolean,
): ReminderDecision {
  const key = `${event.parentSessionId}:${event.role}`;
  if (!markFirstSeen(key)) return { kind: 'silent' };
  if (!retrievalAvailable) {
    return {
      kind: 'warn',
      message: `env-contract unavailable. Run mycodemap env-contract --check or use codemap_env_contract(agentType="${event.role}").`,
    };
  }
  return {
    kind: 'remind',
    command: `mycodemap env-contract --for ${event.role} --json`,
    mcpTool: `codemap_env_contract(agentType="${event.role}")`,
  };
}
```

### Pattern 2: Atomic Session-Role Marker
**What:** 用原子创建的临时标记实现“第一次提醒，后续静默”；不要先 `exists()` 再 `write()`。[CITED: https://developers.openai.com/codex/hooks]
**When to use:** 同一父会话可能并发派生多个相同 role 时。
**Example:**
```typescript
// Source: derived from Codex docs noting matching hooks can run concurrently
// and from Phase 74 D-04/D-05 session-role semantics.
function markFirstSeenAtomically(markerPath: string): boolean {
  try {
    const fd = fs.openSync(markerPath, 'wx');
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}
```

### Pattern 3: Runtime-Specific Visible Failure
**What:** 成功路径发 reminder context；失败路径发可见 warning，但不阻断 delegated work。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md][CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]
**When to use:** `env-contract` CLI/MCP 不可用、角色无法解析、或 hook feature 未启用时。
**Example:**
```typescript
// Source: derived from Codex common output fields and Claude non-blocking SubagentStart behavior.
function formatCodexWarning(message: string) {
  return JSON.stringify({
    continue: true,
    systemMessage: message,
  });
}
```

### Anti-Patterns to Avoid
- **Process-local memory map:** hook 每次是独立进程，`new Map()` 只在单次调用有效，无法实现 `then-silent`。[CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]
- **Re-query full contract to decide silence:** 提醒是否静默只依赖 `session × role`，不应该把 Phase 74 变成新的 contract evaluation pipeline。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md]
- **Hidden fallback prompt text:** 与 D-09 冲突。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md]
- **Broad all-events remindering:** 会把 phase 扩成噪音治理层，违背 D-01 / D-12。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Project rule retrieval | New rule snapshot / new contract format | Existing `mycodemap env-contract` CLI + `codemap_env_contract` MCP tool | Phase 58 已经交付并有测试覆盖。[VERIFIED: src/cli/commands/env-contract.ts][VERIFIED: src/server/mcp/server.ts][VERIFIED: src/server/mcp/__tests__/env-contract-tool.test.ts] |
| Hook bootstrap examples | New ad-hoc docs-only snippets | Existing assistant assets / env-contract examples | 现有项目已经有 Claude hook 示例与 Codex agent 示例。[VERIFIED: src/cli/init/assistant-plan.ts][VERIFIED: docs/AI_ASSISTANT_SETUP.md] |
| Session silence persistence | SQLite / repo config / hidden governance DB | Tempdir marker ledger keyed by `session_id:role` | 需求只要 session-local silence，不要跨 session memory。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md][ASSUMED] |
| Failure remediation | Opaque “hook failed” notices | Exact command-level remediation (`env-contract --check`, `env-contract --update`, MCP fallback) | 用户明确要求 visible + actionable。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md][VERIFIED: src/cli/doctor/check-env-contract.ts] |

**Key insight:** 这不是一个“新规则下发系统”问题，而是一个“如何在 runtime 入口稳定提醒去查现有规则，并且别重复打扰”的问题。[VERIFIED: docs/ideation/2026-05-04-subagent-hooks-deep-dive-ideation.md][VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: 把 reminder 当强制执行
**What goes wrong:** 以为 `additionalContext` / `developer_instructions` 会强制子代理执行检索，导致失败路径缺失。[VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-CONTEXT.md]
**Why it happens:** Phase 58 已经证明“注入不等于执行”；官方文档也只承诺 context injection，不承诺 action enforcement。[CITED: https://code.claude.com/docs/en/hooks][CITED: https://developers.openai.com/codex/subagents]
**How to avoid:** 把成功定义成“提醒被发出且检索面可达”，把真实检索调用继续交给 Phase 58 的验证夹具与 transcript evidence。[VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-VERIFICATION.md]
**Warning signs:** 计划里出现“自动把 contract 塞进子代理 prompt 并视为完成”。

### Pitfall 2: 并发重复提醒
**What goes wrong:** 同一 parent session 同时起两个同 role agent 时，两个 hook 都判断为“第一次”。[CITED: https://developers.openai.com/codex/hooks]
**Why it happens:** Codex 官方明确说同一事件的多个 matching hooks 会并发启动；类似的 check-then-write race 在任何多进程 hook 方案里都成立。[CITED: https://developers.openai.com/codex/hooks]
**How to avoid:** silence ledger 必须用原子创建或 lock file，而不是 `existsSync` 后再写入。[ASSUMED]
**Warning signs:** 实现里出现 `if (!existsSync(path)) writeFileSync(path)`。

### Pitfall 3: 选择了错误的 Codex event
**What goes wrong:** 实现挂在一个不会稳定代表“delegated start”的 Codex 事件上，结果要么漏提醒，要么每个用户 prompt 都提醒。[CITED: https://developers.openai.com/codex/hooks]
**Why it happens:** Codex 官方有 hooks，但文档没有单独的 `SubagentStart` 事件说明。[CITED: https://developers.openai.com/codex/hooks]
**How to avoid:** 在正式实现前做一次极小 PoC，记录 spawned subagent 时 `SessionStart` / `UserPromptSubmit` 的输入 payload，再锁定事件。[ASSUMED]
**Warning signs:** 计划直接把 Codex 等同于 Claude `SubagentStart`，没有前置验证任务。

### Pitfall 4: 把失败做成静默 fallback
**What goes wrong:** `env-contract` 不可用时悄悄换成隐藏 prompt 文本或缓存规则，破坏用户对 Phase 58 surface 的可见性。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md]
**Why it happens:** 想降低噪音，但实际把错误埋掉了。
**How to avoid:** 失败只允许两件事：可见 warning，附准确 remediation；delegated work 继续。[VERIFIED: .planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md]
**Warning signs:** 代码里出现硬编码规则列表或“if retrieval fails then inject default rules”。

### Pitfall 5: 忘了 Codex project-local hooks 需要 trusted `.codex/`
**What goes wrong:** 配好了 repo-local hooks 但实际不加载，用户只看到“功能没生效”。[CITED: https://developers.openai.com/codex/hooks]
**Why it happens:** Codex 官方明确说明不受信任项目不会加载 project-local hook layer。[CITED: https://developers.openai.com/codex/hooks]
**How to avoid:** 计划中把 trust/state check 作为验证前置，并给出缺失时的明确 warning/remediation。[ASSUMED]
**Warning signs:** 单测都绿，但真实 CLI 会话完全没有 hook 输出。

## Code Examples

Verified patterns from official sources and local shipped surfaces:

### Claude delegated-start reminder surface
```json
// Source: src/cli/commands/env-contract.ts and Claude hooks docs
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "Worker",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SubagentStart\",\"additionalContext\":\"Before starting work, run: mycodemap env-contract --for worker --json\"}}'"
          }
        ]
      }
    ]
  }
}
```

### Codex retrieval target already shipped in MCP
```typescript
// Source: src/server/mcp/server.ts
server.registerTool('codemap_env_contract', {
  title: 'CodeMap Environment Contract',
  description: 'Query the Project Environment Contract for subagent rule retrieval.'
}, async ({ agentType, category, check }) => {
  // discovery + filtering + check mode
});
```

### Existing role-specific Codex agent guidance
```toml
# Source: .codex/agents/env-contract-verifier.toml
name = "env-contract-verifier"
description = "Phase 58 verification-only agent."
developer_instructions = """
Before any substantive work, retrieve the project environment contract.
Run: mycodemap env-contract --for worker --json
Alternate: codemap_env_contract(agentType="worker")
"""
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prompt-snippet injection into subagents | Retrieval-first reminder to the shipped env-contract surface | Phase 58 re-baseline, verified 2026-05-05 | Phase 74 must remind toward retrieval, not re-open injection.[VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-CONTEXT.md][VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-VERIFICATION.md] |
| Fake headless proof (`claude -p`, nonexistent `codex exec --agent`) | Real verifier-agent evidence / explicit waiver | Phase 58 re-verification, 2026-05-05 | Future validation for Phase 74 should reuse real runtime evidence style, not deprecated fake paths.[VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-HUMAN-UAT.md][VERIFIED: src/cli/env-contract/__tests__/headless-evidence.test.ts] |
| One-off static examples only | Official runtime hooks now exist in Codex as well as Claude | Official docs current on 2026-05-10 | Codex no longer needs to be modeled only as `developer_instructions`; it has a hook layer, but the exact delegated-start seam still needs proof.[CITED: https://developers.openai.com/codex/hooks][CITED: https://developers.openai.com/codex/subagents] |

**Deprecated/outdated:**
- Treating `claude -p` as subagent proof: superseded by Phase 58 manual runtime evidence.[VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-HUMAN-UAT.md]
- Treating `codex exec --agent` as a real flag: does not exist; old evidence path is superseded.[VERIFIED: src/cli/env-contract/__tests__/headless-evidence.test.ts][VERIFIED: .planning/phases/58-subagent-environment-contract-injection/58-HUMAN-UAT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Spawned Codex subagents will emit either `SessionStart` or `UserPromptSubmit` with enough signal to derive delegated role and apply `first-remind-then-silent`. | Summary / Common Pitfalls | Codex implementation seam may need to fall back to agent-file-only guidance or a different event, changing task breakdown. |
| A2 | A tempdir marker ledger (`session_id:role`) is acceptable as “session-local, non-persistent memory” for this phase. | Architecture Patterns / Don't Hand-Roll | If rejected, planner must design another non-persistent cross-process store. |
| A3 | Atomic file creation is sufficient to suppress duplicate reminders under hook concurrency without needing a more complex lock service. | Architecture Patterns / Common Pitfalls | Duplicate reminders may still appear in high-concurrency edge cases. |

## Resolved Planning Decisions

1. **Codex delegated-start seam**
   - Resolution: the planning contract treats this as a mandatory Wave 1 proof gate, not as an open architectural question. The first execution task must capture a real spawned-agent payload, decide between `SessionStart` and `UserPromptSubmit`, and only then unlock broader adapter wiring.[CITED: https://developers.openai.com/codex/hooks]
   - Why this is considered resolved for planning: Phase 74 does not need the final event answer to produce a valid plan; it only needs the execution order to force that answer before shared reminder logic is trusted.

2. **Session-role ledger placement**
   - Resolution: use `os.tmpdir()` with a `mycodemap-env-contract-reminder/` namespace and atomic marker creation keyed by `parent_session_id:role`.
   - Why this is considered resolved for planning: this satisfies the locked `session-local, non-persistent` boundary and avoids drifting into SQLite, repo-local files, or a broader governance store.[CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]

3. **Failure visibility transport**
   - Resolution: success paths use structured runtime output; failure paths use the most visibly stable non-blocking warning surface per runtime, and the plan must require explicit adapter-level tests for it.
   - Why this is considered resolved for planning: the exact transport primitive may differ between Codex and Claude, but the user-visible contract is locked to `visible + actionable + continue`, so planning can proceed as long as that adapter proof is explicit.[CITED: https://developers.openai.com/codex/hooks][CITED: https://code.claude.com/docs/en/hooks]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Hook helper runtime, tests | ✓ | 24.14.0 | — |
| npm / npx | Test execution, package metadata checks | ✓ | 11.9.0 / 11.9.0 | — |
| Python 3 | Optional hook/script examples if shell wrappers appear | ✓ | 3.12.3 | Prefer Node implementation anyway |
| Claude Code CLI | Real Claude reminder verification | ✓ | 2.1.133 | If unavailable in another env, keep unit tests + record blocker |
| Codex CLI | Real Codex reminder verification / seam PoC | ✓ | 0.130.0 | If unavailable in another env, keep unit tests + record blocker |

**Missing dependencies with no fallback:**
- None in this environment.[VERIFIED: local env]

**Missing dependencies with fallback:**
- None in this environment.[VERIFIED: local env]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (repo uses `1.1.0`; latest registry is `4.1.5`) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/cli/commands/__tests__/env-contract-command.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/init/__tests__/init-assistant.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOOK-02 | First delegated start per role emits reminder toward `env-contract` | unit | `npx vitest run src/cli/env-contract/__tests__/reminder-engine.test.ts -t "first role start reminds"` | ❌ task-created |
| HOOK-02 | Later starts in same parent session + same role stay silent | unit | `npx vitest run src/cli/env-contract/__tests__/reminder-engine.test.ts -t "same session role stays silent"` | ❌ task-created |
| HOOK-02 | Different role in same parent session still reminds once | unit | `npx vitest run src/cli/env-contract/__tests__/reminder-engine.test.ts -t "different role still reminds"` | ❌ task-created |
| HOOK-02 | Retrieval unavailable emits visible actionable warning but does not hard-block | unit | `npx vitest run src/cli/env-contract/__tests__/reminder-engine.test.ts -t "warning continues"` | ❌ task-created |
| HOOK-02 | Existing retrieval surfaces remain valid (`CLI`, `MCP`, assistant examples) | regression | `npx vitest run src/cli/commands/__tests__/env-contract-command.test.ts src/server/mcp/__tests__/env-contract-tool.test.ts src/cli/init/__tests__/init-assistant.test.ts` | ✅ |

### Sampling Rate
- **Per task commit:** `npx vitest run src/cli/env-contract/__tests__/reminder-hook-runner.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** targeted hook tests + existing env-contract regressions green before `$gsd-verify-work`

### Task-Local Test Creation
- [ ] `src/cli/env-contract/__tests__/reminder-engine.test.ts` — created in Task 2 to cover session-role silence and warning semantics
- [ ] `src/cli/env-contract/__tests__/reminder-hook-runner.test.ts` — created in Task 1/2 to cover Codex seam-proof fixture, Claude adapter output validity, and runtime failure warning transport
- [ ] Planning is consistent once RESEARCH, VALIDATION, and PLAN all point at these task-created test targets; implementation still needs to create/green them during execution

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | yes | Session-local ledger keyed by runtime `session_id`; no cross-session persistence |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Parse hook stdin as JSON and normalize `agent_type`/role through an allowlist |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hook command injection via role/runtime fields | Tampering | Never shell-interpolate raw hook payload; map role to a strict enum before formatting commands |
| Silent policy bypass when retrieval is unavailable | Repudiation | Emit visible warning with exact remediation; do not hide fallback rules |
| Duplicate reminder race | Denial of Service | Atomic marker creation, not check-then-write |
| Cross-session leakage of silence state | Information Disclosure | Use session-scoped temp keys and TTL cleanup; do not store in repo or long-lived DB |

## Sources

### Primary (HIGH confidence)
- [VERIFIED: `.planning/phases/74-env-contract-reminder-hook/74-CONTEXT.md`] - locked behavior, scope, and out-of-scope decisions
- [VERIFIED: `src/cli/commands/env-contract.ts`] - existing CLI retrieval surface, Claude hook example, Codex agent example
- [VERIFIED: `src/cli/init/assistant-plan.ts`] - bootstrap assets and existing delegated-work guidance
- [VERIFIED: `src/server/mcp/server.ts`] - native `codemap_env_contract` MCP tool
- [VERIFIED: `src/server/mcp/__tests__/env-contract-tool.test.ts`] - MCP retrieval behavior and tool naming
- [VERIFIED: `src/cli/commands/__tests__/env-contract-command.test.ts`] - CLI retrieval behavior, `--as-hook-config`, `--as-codex-agent`
- [VERIFIED: `.planning/phases/58-subagent-environment-contract-injection/58-VERIFICATION.md`] - shipped Phase 58 verification truth and evidence style
- [CITED: https://code.claude.com/docs/en/hooks] - `SubagentStart`, `SubagentStop`, `SessionStart`, exit-code semantics, `session_id`, `agent_type`
- [CITED: https://code.claude.com/docs/en/sub-agents] - project-level subagent hooks, subagent lifecycle, explicit invocation modes
- [CITED: https://developers.openai.com/codex/hooks] - hook locations, feature flag, supported events, concurrency note, `session_id`, `systemMessage`
- [CITED: https://developers.openai.com/codex/subagents] - Codex subagent workflows, built-in roles, custom agent file schema

### Secondary (MEDIUM confidence)
- [VERIFIED: `docs/AI_ASSISTANT_SETUP.md`] - public-facing assistant setup examples
- [VERIFIED: `docs/ideation/2026-05-04-subagent-hooks-deep-dive-ideation.md`] - validated retrieval-vs-injection conclusion
- [VERIFIED: `.mycodemap/handoffs/phase58-subagent-hooks-deep-dive.handoff.md`] - prior local analysis of Claude hook tradeoffs

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies recommended; versions and local runtime availability were verified.
- Architecture: MEDIUM - Claude seam is explicit, but Codex delegated-start event still needs a short PoC.
- Pitfalls: HIGH - most failure modes are already evidenced by official hook semantics or shipped Phase 58 learnings.

**Research date:** 2026-05-10
**Valid until:** 2026-05-17
