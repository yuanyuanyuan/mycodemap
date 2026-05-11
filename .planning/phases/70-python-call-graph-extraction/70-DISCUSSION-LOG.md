# Phase 70: Python Call-graph Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-10
**Phase:** 70-python-call-graph-extraction
**Areas discussed:** 解析范围, 动态特性策略, 不确定性输出, 图写回粒度

---

## 解析范围

| Option | Description | Selected |
|--------|-------------|----------|
| 保守首版 | 只覆盖高置信静态调用、直接方法调用、明确 imported call；不含 `staticmethod/classmethod` 扩展 | |
| 标准首版 | 覆盖高置信静态调用，包含 `staticmethod/classmethod`、同文件 class method、明确 imported call | ✓ |
| 激进首版 | 再尝试 inheritance dispatch、decorator 包装追踪等更复杂推断 | |

**User's choice:** 标准首版  
**Notes:** 首版覆盖高置信静态调用与 `staticmethod/classmethod`，但不做复杂 inheritance dispatch 与 runtime rebinding。

---

## 动态特性策略

| Option | Description | Selected |
|--------|-------------|----------|
| 严格保守 | `getattr`、monkey patch、runtime alias/rebinding、duck-typed dispatch 一律不推断，只标 unresolved/unsupported | ✓ |
| 有限启发式 | 只对极简单 alias 转发做静态推断，其余 unresolved | |
| 尽量推断 | 对更多动态形态做启发式猜测并产出 inferred edge | |

**User's choice:** 严格保守  
**Notes:** 动态调用不猜，保持结果高可解释性。

---

## 不确定性输出

| Option | Description | Selected |
|--------|-------------|----------|
| 高置信 only | 只写高置信 edge；不确定调用只显式标 `unresolved / ambiguous / unsupported_dynamic` | ✓ |
| 高置信 edge + 诊断列表 | 只写高置信 edge，并附带 unresolved diagnostics 列表 | |
| 高置信 + inferred edge | 同时允许写带置信度的 inferred edge | |

**User's choice:** 高置信 only  
**Notes:** 首版 graph truth 以干净、稳定为先，不引入 inferred edge。

---

## 图写回粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 只写 function/method 级 edge | 以 symbol-level truth 为唯一写回单位，file/module 视图后续聚合 | ✓ |
| 同时写 symbol-level + file-level aggregation | 同时维护两层真相，方便现有消费面复用 | |
| 先写 file-level | 兼容旧分析面优先，symbol-level 退居附属信息 | |

**User's choice:** 只写 function/method 级 edge  
**Notes:** 不在首版同时维护双层 graph writeback truth。

---

## the agent's Discretion

- unresolved / ambiguous / unsupported-dynamic 的内部数据结构可由后续 planner/implementer 决定
- parser extraction、call resolution、graph writeback 的代码分层可由后续 planner/implementer 决定

## Deferred Ideas

- 复杂 inheritance dispatch 推断
- runtime rebinding / alias heuristics
- inferred edge 模式
- file/module-level 双层写回
