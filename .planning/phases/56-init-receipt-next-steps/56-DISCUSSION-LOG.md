# Phase 56: Init Receipt + Next Steps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 56-init-receipt-next-steps
**Areas discussed:** Receipt Layout, Next Steps, Sync Detect, Doc Sync

---

## Receipt Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Main: 路径+合并指引; Subagent: 路径+复制指引 | Main Agent 部分报告 claude-context.md/agents-context.md 路径，指引用户手动合并到 CLAUDE.md/AGENTS.md。Subagent 部分报告 env-contract.json 和适配器配置路径，指引用户复制到平台设置。 | ✓ |
| 两部分都显示路径+状态+下一步 | 每个部分都显示：生成的文件路径、同步状态（已存在/需手动/已同步）、以及具体的下一步操作。更详细但可能信息过载。 | |
| 统一列表，按类型分组 | 不用两个独立部分，而是按资产类型分组显示（上下文文件、配置文件、适配器示例），每组显示路径和操作指引。更简洁但区分度较低。 | |

**User's choice:** Main: 路径+合并指引; Subagent: 路径+复制指引
**Notes:** 用户选择最清晰的两部分布局，每个部分有明确的路径和操作指引。

---

## Next Steps

| Option | Description | Selected |
|--------|-------------|----------|
| 基于已安装资产动态生成 | 根据 init 实际安装了哪些资产来生成下一步：如果安装了 assistant 资产 → 指引连接 agent；如果有 manual-action → 优先显示手动步骤；如果没有 → 显示 generate/doctor。 | ✓ |
| 基于 receipt 状态分层 | 按优先级分层：冲突 → 手动操作 → 新安装资产的使用指引 → 默认推荐步骤。每层只显示最相关的一条。 | |
| 固定模板 + 条件插入 | 保持固定结构（安装完成 → 下一步 → 更多资源），但在中间条件插入特定资产的指引。可预测但不够灵活。 | |

**User's choice:** 基于已安装资产动态生成
**Notes:** 用户选择最灵活的动态生成方式，根据实际安装的资产来计算下一步。

---

## Sync Detect

| Option | Description | Selected |
|--------|-------------|----------|
| 检查文件内容是否包含 .mycodemap/ 引用 | 读取 CLAUDE.md/AGENTS.md 内容，检查是否已包含 .mycodemap/ 路径引用。如果已引用 → 显示 already-synced；否则 → 显示 manual-action-needed 和 copy-paste 片段。 | ✓ |
| 只检查文件是否存在，不检查内容 | 只检查 CLAUDE.md/AGENTS.md 是否存在。存在 → 提示用户检查是否已同步；不存在 → 提示创建。更简单但可能产生误报。 | |
| 检查 InitAsset 的 status 字段 | 复用 Phase 55 已有的 InitAsset 状态检测逻辑（already-synced/manual-action-needed），不在 receipt 层重新实现。依赖已有实现但可能不够精确。 | |

**User's choice:** 检查文件内容是否包含 .mycodemap/ 引用
**Notes:** 用户选择最精确的检测方式，通过检查文件内容来确认是否已同步。

---

## Doc Sync

| Option | Description | Selected |
|--------|-------------|----------|
| README + SETUP_GUIDE + AI_ASSISTANT_SETUP | 三个文档都更新：README 显示快速开始，SETUP_GUIDE 显示详细步骤，AI_ASSISTANT_SETUP 显示 agent 连接指引。覆盖全面但工作量大。 | ✓ |
| 只更新 AI_ASSISTANT_SETUP | 只更新 agent 专用文档，README 和 SETUP_GUIDE 保持不变。最小改动但可能让用户找不到新流程。 | |
| README + AI_ASSISTANT_SETUP | README 显示快速开始摘要，AI_ASSISTANT_SETUP 显示详细 agent 连接流程。SETUP_GUIDE 保持不变。平衡覆盖面和工作量。 | |

**User's choice:** README + SETUP_GUIDE + AI_ASSISTANT_SETUP
**Notes:** 用户选择最全面的文档同步方案，确保所有相关文档都描述统一的 init 流程。

---

## Claude's Discretion

无 — 所有灰色地带用户都做出了明确选择。

## Deferred Ideas

- Full env-contract discovery belongs to Phase 58.
- Automatic platform config mutation remains out of scope.
- Runtime/session enforcement that subagents actually retrieved project rules remains out of scope.
