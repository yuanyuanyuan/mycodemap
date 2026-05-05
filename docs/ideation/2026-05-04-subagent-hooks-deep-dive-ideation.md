---
date: 2026-05-04
topic: subagent-hooks-deep-dive
focus: Phase 58 hooks system deepening and security architecture
mode: repo-grounded
---

# Ideation: Subagent Hooks 安全体系深化

## Grounding Context

### Codebase Context
- **父代理 session 无防护**: settings.json hooks 为空，所有执行仅存在于 worker.md frontmatter
- **52 个第三方代理无 hooks**: /home/stark/.claude/agents/ 下所有 hooks 被注释掉
- **Transcript 审计脆弱**: subagent-stop-audit.js 使用正则扫描 JSONL，可被绕过
- **Dead hooks**: rule-route-advisory.js 和 check-gstack.sh 存在但未接入
- **Exit code 协议不一致**: process.exit(2) vs decision:'block' JSON 混用
- **L0-L3 分级存在但 hooks 不感知**: 分类系统是建议而非控制

### Past Learnings
- SubagentStart additionalContext 不可靠（压缩时可能丢弃，Issue #23885）
- PreToolUse updatedInput 对 Agent tool 静默丢弃（Issue #39814）
- 注入失败，检索成功：retrieval-based pattern 是验证的路径
- 渐进升级管道：report-only → warn → block
- env-contract 基础设施成熟：CLI、MCP、doctor、checker、validator

### External Context
- Claude Code hooks 支持 20+ 事件、5 种 handler（command, http, mcp_tool, prompt, agent）
- 无竞品有环境契约模式；OS 级沙箱是收敛趋势
- Codex CLI 使用 sandbox-exec/namespaces 做沙箱
- Langfuse 提供 session-level trace grouping 和 agent graph visualization
- 游戏反作弊从客户端控制转向服务端权威验证

## Ranked Ideas

### 1. 父代理升级为执行权威 (Invert Parent Session to Enforcer)
**Description:** 将主要执行点从子代理 frontmatter 移到父代理的 settings.json hooks。父代理成为主动防火墙，在子代理工具调用到达文件系统前进行检查、拦截和日志记录。子代理级 hooks 变为可选补充而非唯一执行机制。
**Warrant:** `direct:` — settings.json hooks 显式为空；所有执行仅存在于 worker.md frontmatter 中。父代理是所有子交互的唯一不变量。
**Rationale:** 每个其他 hook、审计和契约机制都是执行位置的下游。将执行移到父代理将多个 per-agent hook 配置折叠为单一策略面。这是单一最高杠杆的架构变更。
**Downsides:** 父代理 hooks 在每次工具调用时触发，增加延迟。需要精心设计 matcher 避免对父代理自身操作的误报。可能与现有父代理工具使用模式冲突。
**Confidence:** 85%
**Complexity:** Medium-High
**Status:** Unexplored

### 2. 用签名执行收据替代 Transcript 审计 (Signed Execution Receipts)
**Description:** 用结构化 JSON "执行收据" 替代 subagent-stop-audit.js 的正则扫描。收据包含：契约哈希、工具调用摘要、文件访问日志。父代理验证收据完整性而非 transcript 内容。
**Warrant:** `direct:` — 审计脚本存在于 subagent-stop-audit.js，其正则方法被确认为脆弱。JSONL transcript 不是为机器可验证合规设计的——它们是人类可读日志被误用为验证协议。
**Rationale:** 消除合规管道中最大单一误报/漏报源。将验证从"transcript 是否包含正确字符串"转向"执行是否产生了有效收据"。收据构造上即防篡改。
**Downsides:** 收据需要子代理配合（必须在 Stop 前发出）。收据格式需要版本化。需要从当前审计的迁移路径。
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 3. 第三方代理包装模式 (Third-Party Agent Wrapping)
**Description:** 创建项目所有的包装代理 (.claude/agents/safe-*.md)，委托给第三方代理同时添加 PreToolUse hooks for Bash safety 和 Stop 审计。包装器成为项目的执行边界；第三方代理行为不变。
**Warrant:** `reasoned:` — Claude Code 按名称从 .claude/agents/*.md 解析代理。如果项目定义了带 hooks 的 safe-brainstorm.md，用户调用 @safe-brainstorm 时 hooks 生效。这是装饰器模式应用于代理治理。
**Rationale:** 当前状态是二元的：要么完全信任 52 个代理，要么不使用它们。包装给出中间地带——使用代理能力同时执行项目级规则。对会生成自己子代理的代理（嵌套信任链）尤其有价值。
**Downsides:** 每个包装器是维护面。包装器可能与上游代理定义漂移。并非所有第三方代理都能干净地包装（复杂工具需求）。
**Confidence:** 80%
**Complexity:** Low-Medium
**Status:** Unexplored

### 4. 审计日志作为一等工件 (Audit Trail As First-Class Artifact)
**Description:** 创建结构化追加日志 (.mycodemap/audit.jsonl)，每个 hook 调用追加一行 JSON（时间戳、事件、代理类型、决策、原因）。构建 `mycodemap audit` CLI 命令查询和趋势分析。
**Warrant:** `direct:` — subagent-stop-audit.js 已经读取 transcript、解析 JSONL 并提取结构化数据。如果它将发现写入结构化日志，审计轨迹将经受 transcript 轮换、可被 mycodemap doctor 查询、并支持趋势分析。
**Rationale:** 将合规从"我们认为代理遵循规则"转变为"我们可以证明，这是趋势"。使 mycodemap doctor 能报告合规率。创建反馈循环：如果规则产生大量违规，要么沟通不畅，要么规则过严。
**Downsides:** 日志文件随时间增长（需要轮换）。Hook 脚本稍微复杂（必须写入日志）。共享仓库的隐私考虑。
**Confidence:** 90%
**Complexity:** Low
**Status:** Unexplored

### 5. 服务端权威结果验证 (Server-Authoritative Outcome Validation)
**Description:** 不验证代理行为（调用了什么工具），而是验证代理结果（代码库状态变化）。运行确定性后置验证检查不变量——无意外文件修改、无规则违规、无能力边界突破。
**Warrant:** `reasoned:` — 游戏反作弊从客户端控制转向服务端权威验证，因为不能信任客户端。CodeMap 当前通过 PreToolUse hooks（客户端控制）控制代理行为。52 个无 hooks 代理 = 忽略反作弊的游戏客户端。但你可以通过检查代码库 diff 验证任何代理触碰后的状态。
**Rationale:** 直接解决"52 个代理无 hooks"盲区。即使无法拦截代理的工具调用，也可以通过检查结果代码库 diff 检测违规。从"控制代理"转向"控制后果"。
**Downsides:** 事后检测（损害已发生）。需要清晰定义不变量。合法但异常的变更可能产生误报。
**Confidence:** 80%
**Complexity:** Medium
**Status:** Unexplored

### 6. 契约运行时 API — 单一编译面 (Contract Runtime API)
**Description:** 构建 compileContract() 函数，从所有治理源（AGENTS.md, .githooks, package.json, docs/rules/, .mycodemap/rules/）产生单一 ProjectEnvironmentContract 工件。所有下游消费者——hooks、MCP、doctor、CI、transcript 审计——从这一个编译输出读取。
**Warrant:** `reasoned:` — 当前 discovery.ts 已部分实现（5 个硬编码 builder），但每个新执行面需要自己的集成代码。单一编译步骤加稳定 API 消除每消费者集成工作。添加新契约项 = 添加一个 builder 函数；所有消费者自动获取。
**Rationale:** 当前添加新契约规则需要分别修改 discovery、CLI、MCP tool、doctor 和可能的 hooks。运行时 API 意味着每个未来契约项以零额外接线流过所有执行路径。O(1) 集成而非 O(n)。
**Downsides:** 需要重构现有消费者使用 API。单一编译面成为单点故障。API 设计需要关注向后兼容。
**Confidence:** 85%
**Complexity:** Medium
**Status:** Unexplored

### 7. 反转 Read-Before-Edit；编辑前自动读取 (Auto-Read Before Edits)
**Description:** 不阻断未读文件的编辑，而是在 PreStep 中自动触发静默读取。Hook 拦截 Edit 调用，内部执行读取，将文件内容注入子代理上下文，然后允许编辑继续。执行是环境性的，非教育性的。
**Warrant:** `reasoned:` Read-Before-Edit 是已知的 AI 编程助手失败模式。阻断门创建摩擦并教会子代理添加形式化读取调用。不可见预读确保上下文始终存在，无需子代理显式请求。
**Rationale:** 消除最常见的 AI 编码错误类别（过时上下文编辑）而不增加摩擦。无论子代理是否"记得"先读都有效。执行是环境性的，非教育性的。
**Downsides:** Hook 必须注入文件内容到上下文（大文件的 token 成本）。可能与子代理自身读取策略冲突。实现依赖 Claude Code hook 注入内容的能力。
**Confidence:** 70%
**Complexity:** Medium-High
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| P6 | SubagentStart Context Injection Broken Promise | 已有文档覆盖 |
| P4 | Two-Language Exit Code Problem | 低于讨论门槛 — 清理任务 |
| P5 | Dead Hooks on Disk | 低于讨论门槛 — 接线任务 |
| I3 | Remove Explicit env-contract Calls via Hook Injection | Warrant 自相矛盾 |
| I7 | Remove Inconsistent Exit Code | 与 P4 重复 |
| A5 | The Contract Is The Hook | 与 I3 重复 |
| A6 | Treat Hook Bugs As Config | Bug 未修复时不可操作 |
| A7 | Agent-Type-less Contracts | 成本超过收益 |
| A2 | Behavioral Anomaly Scoring | 过于投机，无基础设施 |
| L6 | Contract Item Plugin Registry | 当前规模过度设计 |
| L7 | Drift-Aware Regeneration Pipeline | 低于讨论门槛 — 工程任务 |
| L8 | Contract Coverage Matrix | 低于讨论门槛 — doctor 扩展 |
| I4 | Convert Advisory to Mandatory Gates | 直接工程任务 |
| L5 | Platform-Agnostic Adapters | 非核心安全问题 |
| A1 | The Parent Is The Threat | 被更强 I1 吸收 |
| A3 | Transcript Audit As Prevention | 被更强 I1 吸收 |
| C6 | Parent Session Mirror | 被更强 I1 吸收 |
| L4 | Agent Behavior Ledger | 被更强 A8 吸收 |
| C7 | Honeypot Contract Injection | 被更强 C3 吸收 |
| L2 | Hook Action Bindings | 被更强 L1 吸收 |
| I6 | Automate L0-L3 Classification | 精度不足 |
| P7 | L0-L3 But Hooks Don't See It | 被 I6 吸收后拒绝 |
| P8 | 52-Agent Blind Spot in Audit | 被更强 C3 吸收 |
| L3 | Contract-as-Test Harness | 被更强 A8 吸收 |
| I5 | Remove Per-Agent Hook Config | 被更强 I1 吸收 |
| P3 | Retroactive Audit Theater | 被更强 I1 吸收 |
| C2 | All 20+ Events Telemetry Ring | 与 A8 重叠但更不实用 |
| C1 | Zero-Token Enforcement | 有趣但实现成本高 |
| C4 | Agent Registry & Capability Negotiation | 需要平台支持 |
| C5 | Contract-as-Runtime-Code Compiler | 高成本，增量收益有限 |
| C8 | Custom MCP Enforcement Gateway | 过度设计 |
