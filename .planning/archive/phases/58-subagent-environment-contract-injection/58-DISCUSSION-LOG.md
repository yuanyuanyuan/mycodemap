# Phase 58: Subagent Environment Contract Retrieval - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02 (updated 2026-05-05)
**Phase:** 58-subagent-environment-contract-injection
**Areas discussed:** Existing context handling, live verification freshness, seed-to-full-contract evolution, integration surface, dependency risk, S1-S3 返工策略, 验证通过标准, v2.1 关闭条件, 验证方式选择

---

## Existing Context Handling (2026-05-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Update it | Read existing context and update it with current decisions. | ✓ |
| View it | Summarize existing context before deciding whether to update. | |
| Skip | Leave existing context unchanged. | |

**User's choice:** Tool fallback defaulted to "Update it" because the user invoked `/gsd-discuss-phase 58`.
**Notes:** Existing `58-CONTEXT.md` was already present and marked ready for planning. The update path preserved its retrieval-over-injection direction.

---

## Live Verification Freshness (2026-05-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Correct statuses | Re-check canonical external refs and update issue status language before planning. | ✓ |
| Keep prior summary | Leave the old issue-status summary unchanged and let researcher re-check later. | |
| Remove issue table | Drop status table and keep only high-level design conclusion. | |

**User's choice:** Tool fallback defaulted to "Correct statuses".
**Notes:** Live recheck found that the old "all 8 issues open" statement was no longer accurate. CONTEXT now records closed/open split and tells downstream agents to re-read canonical refs instead of trusting stale status summaries.

---

## Seed-To-Full-Contract Evolution (2026-05-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Evolve existing seed | Upgrade Phase 55 `.mycodemap/env-contract.json` seed into full contract while preserving migration path. | ✓ |
| New writer | Add a separate Phase 58 writer and leave Phase 55 seed untouched. | |
| Rewrite from scratch | Replace the seed model entirely without compatibility expectations. | |

**User's choice:** Tool fallback defaulted to "Evolve existing seed".
**Notes:** This matches Phase 55's future-compatible seed boundary and minimizes duplicate state writers.

---

## Integration Surface (2026-05-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Interface contract first | Register `env-contract` as a public CLI command and let dynamic MCP registration expose it. | ✓ |
| Native MCP first | Add a hand-written native MCP tool immediately. | |
| CLI only | Skip MCP exposure for v1. | |

**User's choice:** Tool fallback defaulted to "Interface contract first".
**Notes:** Existing MCP server already dynamically registers interface-contract commands; a native MCP tool remains allowed only if generated tool ergonomics are insufficient.

---

## Dependency Risk (2026-05-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit preflight | Keep Phase 58 context usable, but require planner to confirm Phase 57 state before implementation. | ✓ |
| Block discussion | Stop all Phase 58 context updates until Phase 57 is complete. | |
| Ignore dependency | Proceed as if dependency state is already resolved. | |

**User's choice:** Tool fallback defaulted to "Explicit preflight".
**Notes:** ROADMAP says Phase 58 depends on Phase 57, while STATE still shows Phase 57 ready_to_plan. CONTEXT now flags this for planner.

---

## S1-S3 返工策略 (2026-05-05)

### Plan 组织形式

| Option | Description | Selected |
|--------|-------------|----------|
| 新建 58-05 Plan | 新建 58-05-PLAN.md，专注 S1-S3 子代理验证返工。清晰隔离返工范围。 | ✓ |
| 修补 58-04 | 直接修改 58-04 plan 的后续动作。 | |
| 转为纯手动测试 | 不新建 plan，S1-S3 作为 HUMAN-UAT 项永久保留。 | |

**User's choice:** 新建 58-05 Plan
**Notes:** 代码改动极小（主要重写验证脚本 + 创建子代理定义文件），但需要清晰隔离返工范围。

### Plan 范围

| Option | Description | Selected |
|--------|-------------|----------|
| 全链路返工 | 重写验证脚本 + 创建子代理定义文件 + 手动测试协议文档 + 证据收集机制。 | ✓ |
| 仅脚本重写 | 只重写验证脚本，不创建子代理定义文件。 | |
| 仅文档协议 | 只写测试协议文档，不做代码改动。 | |

**User's choice:** 全链路返工

### 测试策略

| Option | Description | Selected |
|--------|-------------|----------|
| 按 HUMAN-UAT 方案 | Claude + Codex 子代理定义 + 重写脚本 + 证据收集 + 手动测试协议。 | ✓ |
| Claude 优先 + Codex 可选 | 只用 Claude 子代理测试，Codex 作为 optional。 | |
| 两者必测，缺一阻塞 | 两种平台都必须测试。 | |

**User's choice:** Claude 优先 + Codex 可选
**Notes:** 减少环境依赖。Codex 缺少环境时记录 blocker/waiver。

---

## 验证通过标准 (2026-05-05)

### 通过定义

| Option | Description | Selected |
|--------|-------------|----------|
| 执行即通过 | 子代理执行了检索命令并返回契约 JSON 即为通过。 | ✓ |
| 应用才通过 | 要求子代理在后续操作中应用规则。 | |
| 概率阈值 | 运行 N 次测试，要求至少 M 次通过。 | |

**User's choice:** 执行即通过
**Notes:** 文本注入是概率性的，LLM 可能忽略指令，这是已知平台限制。

### 通过判定

| Option | Description | Selected |
|--------|-------------|----------|
| 检索调用存在 | 子代理 output 中包含检索命令调用痕迹。 | ✓ |
| 契约内容可见 | 子代理 output 中包含契约项具体内容。 | |
| 明确承诺遵循 | 子代理声明"我将遵循这些规则"。 | |

**User's choice:** 检索调用存在
**Notes:** 最低门槛，符合"执行即通过"原则。

### 忽略指令处理

| Option | Description | Selected |
|--------|-------------|----------|
| 已知限制 + 改进提示 | 记录为已知限制，改善系统提示措辞。 | ✓ |
| 视为失败，重试 | 反复重试直到通过。 | |
| 忽略，记录 blocker | 不处理，记录为 blocker。 | |

**User's choice:** 已知限制 + 改进提示

### 负面测试

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 + 补充 | 保留现有 E2E 负面测试 + 增加子代理级对比测试。 | ✓ |
| 仅保留现有 | 不增加子代理级负面测试。 | |
| 扩展负面测试 | 增加更多负面场景。 | |

**User's choice:** 保留 + 补充

### 证据收集

| Option | Description | Selected |
|--------|-------------|----------|
| 完整证据链 | 完整 prompt + output + 判断结果。 | ✓ |
| 简单证据 | 只记录是否输出了契约内容。 | |
| 纯人工判断 | 不自动解析。 | |

**User's choice:** 完整证据链

---

## v2.1 关闭条件 (2026-05-05)

### 硬门判定

| Option | Description | Selected |
|--------|-------------|----------|
| 环境 blocker 可关闭 | 核心功能全部通过，S1-S3 标记为环境问题后可关闭。 | |
| 硬门，必须通过 | 必须完成至少一条真实子代理验证。 | ✓ |
| v2.1.1 跟进 | 关闭 v2.1，S1-S3 作为 hotfix。 | |

**User's choice:** 硬门，必须通过
**Notes:** SDC-05 是 requirement，必须满足。

### 最小通过条件

| Option | Description | Selected |
|--------|-------------|----------|
| Claude 一条即通过 | Claude 子代理通过即可，Codex 可记录 waiver。 | ✓ |
| 两种各一条 | 两种平台都必须。 | |
| CLI 或 MCP 任一渠道 | 放宽验证渠道。 | |

**User's choice:** Claude 一条即通过

---

## 验证方式选择 (2026-05-05)

### 测试模式

| Option | Description | Selected |
|--------|-------------|----------|
| 半自动（脚本 + 手动触发） | 脚本准备 + 手动触发子代理。 | |
| 纯手动测试协议 | 完全手动：按协议操作，复制结果作为证据。 | ✓ |
| 尝试全自动 | 用 `claude --agent` 非交互式启动。 | |

**User's choice:** 纯手动测试协议
**Notes:** Claude Code 会话是交互式的，无法完全脚本化。

### 协议组织

| Option | Description | Selected |
|--------|-------------|----------|
| HUMAN-UAT 文档协议 | 在 58-HUMAN-UAT.md 中写清晰测试协议。 | ✓ |
| 脚本准备 + 手动触发 | 加自动化脚本做准备工作。 | |
| 非正式记录 | 不写正式协议。 | |

**User's choice:** HUMAN-UAT 文档协议

### 验证脚本处理

| Option | Description | Selected |
|--------|-------------|----------|
| 重写为准备脚本 | 重写为创建子代理定义、生成 hook 配置、打印指引。 | ✓ |
| 删除，纯文档 | 删除现有脚本。 | |
| Deprecated + 新增文档 | 保留但标记为 deprecated。 | |

**User's choice:** 重写为准备脚本

---

## Claude's Discretion

- Exact schema migration shape from `env-contract.seed.v1` to full Project Environment Contract.
- Exact generated MCP tool name if CLI command name contains a hyphen.
- Exact wording of assistant retrieval examples, provided they route to filtered `mycodemap env-contract --for <type> --json` or MCP retrieval.
- Exact wording of HUMAN-UAT test protocol steps.
- Exact structure of the preparation script (verify-subagent-env-contract.mjs rewrite).
- Exact subagent definition file content (system prompt wording).

## Deferred Ideas

- None added in this update. Existing deferred ideas in CONTEXT remain unchanged.
