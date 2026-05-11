# Phase 79: Complexity Truth Unification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 79-Complexity Truth Unification
**Areas discussed:** 持久化模型, 失败策略, 细节稳定性, 收敛范围

---

## 持久化模型

| Option | Description | Selected |
|--------|-------------|----------|
| Shared persisted truth | `canonical analyzer` 结果写回 shared parser/module/symbol truth，CLI/存储只读这份 persisted truth | ✓ |
| Direct consumer calls | 允许 CLI/下游直接调用 canonical analyzer，不强制先持久化 | |
| Other | 用户自定义方案 | |

**User's choice:** Shared persisted truth
**Notes:** 用户回复“同意”，接受推荐路径；这保留了已有 persisted/shared truth 消费面，同时把计算源收敛到统一 canonical analyzer。

---

## 失败策略

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit fail | 无法产出 canonical complexity truth 时显式失败，禁止静默估算 | ✓ |
| Warned fallback | 允许带 warning 的兼容 fallback，但必须明确标记为 non-canonical | |
| Other | 用户自定义方案 | |

**User's choice:** Explicit fail
**Notes:** 讨论中同时保留了实现层面的裁量空间：若迁移期间确有临时兼容路径，必须显式标记为 non-canonical，不能伪装成 canonical truth。

---

## 细节稳定性

| Option | Description | Selected |
|--------|-------------|----------|
| Stable symbol detail | 函数/方法 detail 统一到现有 symbol / qualified-name 规范，必要时做迁移 | ✓ |
| Module-only guarantee | 只保证 module totals 统一，function details 允许 best-effort | |
| Other | 用户自定义方案 | |

**User's choice:** Stable symbol detail
**Notes:** 这与 Phase 72 已锁定的 Python symbol/module shared truth 一致，避免下游 consumer 因 detail identity 漂移而读到不同含义的数据。

---

## 收敛范围

| Option | Description | Selected |
|--------|-------------|----------|
| Active path only | 只收 active parser flows、analyzer、`complexity` CLI、storage/read path | ✓ |
| Sweep everything | 仓内所有 complexity 消费点这次一次性扫平 | |
| Other | 用户自定义方案 | |

**User's choice:** Active path only
**Notes:** 这把 scope 控制在 `POL-01` 所需的主路径，不把 preview/plugin/helper 全量清理混进本 phase。

---

## the agent's Discretion

- 统一 `ast-complexity-analyzer.ts` 与各语言 parser 的接线形式
- 需要时如何把临时迁移路径标记为 non-canonical 并加测试
- 回归测试落在哪个 subsystem 最能证明旧路径不再静默漂移

## Deferred Ideas

- 仓内所有 preview/plugin/helper complexity surface 的全面收口
- 新 complexity UX 或额外 consumer 扩展
- 超出 active parser/analyzer/CLI path 的架构重整
