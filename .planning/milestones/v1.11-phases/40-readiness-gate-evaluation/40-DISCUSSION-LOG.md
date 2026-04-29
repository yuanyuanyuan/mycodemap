# Phase 40: Readiness gate evaluation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 40-readiness-gate-evaluation
**Areas discussed:** Gate 强度分层, Gate 触发时机与位置

---

## Gate 强度分层

| Option | Description | Selected |
|--------|-------------|----------|
| 升级三层语义 | 把 blocking: boolean 改成 gateMode: 'hard' \| 'warn-only' \| 'fallback' | ✓ |
| 保留两层但重命名文档 | 代码保持 blocking true/false，文档映射 | |
| 只在文档层定义三层 | 代码不变，文档定义概念框架 | |

**User's choice:** 升级三层语义
**Notes:** 用户明确要求统一代码和文档中的三层表达

---

## Fallback 模式行为

| Option | Description | Selected |
|--------|-------------|----------|
| 信号不可用时降级为人工确认 | unavailable 时输出 fallback 并中止自动流程 | ✓ |
| 信号不可用时用保守默认值 | unavailable 时视为 warn 但继续 | |
| 你决定 | 由实现 agent 选择 | |

**User's choice:** 信号不可用时降级为人工确认
**Notes:** fallback 不是 pass 也不是 fail，是显式需要人工判断的第三种状态

---

## 升级范围

| Option | Description | Selected |
|--------|-------------|----------|
| 只新增 readiness gate contract | 新增独立规则集，现有 ship 不变 | |
| 统一整个发布检查体系 | 重构现有 mustPass/shouldPass 纳入三层语义 | ✓ |
| 新增 contract 但提供迁移路径 | 新增 contract，标记旧 blocking @deprecated | |

**User's choice:** 统一整个发布检查体系
**Notes:** 工作量更大但概念更一致

---

## Gate 触发位置

| Option | Description | Selected |
|--------|-------------|----------|
| 作为 /release 流程的增强步骤 | gate 是发布流程的一部分 | |
| 独立 CLI 命令 + /release 调用 | 新增独立命令，/release 调用它 | ✓ |
| GitHub Actions + 本地双层 | CI 和本地都运行 | |
| 你决定 | 由实现 agent 选择 | |

**User's choice:** 独立 CLI 命令 + /release 调用
**Notes:** gate 可单独运行测试，也可被 /release 集成

---

## 独立 gate 命令与现有 ship/ci 的关系

| Option | Description | Selected |
|--------|-------------|----------|
| 重构 ship rules 为新命令的核心 | 把 ship/rules 重构为 gate 核心引擎 | ✓ |
| 新增 gate 命令但保持 ship 独立 | 两者共存，未来收敛 | |
| 复用 ci assess-risk 作为 gate 基础 | 基于 risk assessment 扩展 | |

**User's choice:** 重构 ship rules 为新命令的核心
**Notes:** 统一入口，减少重复

---

## the agent's Discretion

- 新命令的具体命名和 CLI flag 设计
- 现有 mustPass/shouldPass 规则向三层语义的精确映射
- CLI 输出的终端排版和 structured report 字段命名
- 是否需要保留旧 `blocking` 字段的兼容层
- 重构后的 `QualityRule` interface 具体字段命名

## Deferred Ideas

- GitHub Actions 层面的 pre-publish job
- 真实 `/release v1.9` 执行
- 将 gate 扩展为通用 CI 门禁（不限于 release）
