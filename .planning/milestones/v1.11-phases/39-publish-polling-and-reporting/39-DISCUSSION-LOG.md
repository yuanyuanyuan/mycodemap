# Phase 39: Publish polling and reporting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `39-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 39-publish-polling-and-reporting
**Areas discussed:** 入口形态, 轮询节奏, 报告形态, 可信度边界

---

## 入口形态

| Option | Description | Selected |
|--------|-------------|----------|
| 单独 follow-up 命令（推荐） | `/release` 只提示“接下来可运行只读状态检查”，polling/reporting 独立存在，但仍被 release 文档定义为 follow-up observability | ✓ |
| 内嵌在 `/release` 完成报告里 | `/release` 结束前顺手做一次 snapshot / 可选短轮询，用户感知更顺，但 `/release` 会变更厚 | |
| 只保留 URL，不新增正式 contract | 最保守，但基本达不到 `RELF-02` 的 structured report 目标 | |
| 其他 | 自定义设想 | |

**User's choice:** 单独 follow-up 命令  
**Notes:** follow-up 必须保持只读，不进入 `/release` authority 本体，也不能变成第二条 release 入口。

---

## 轮询节奏

| Option | Description | Selected |
|--------|-------------|----------|
| 只做一次 snapshot | 立刻返回当前状态；最轻量 | ✓ |
| 默认 snapshot + 可选有界轮询 | 先给当前状态，再允许有限等待 | |
| 默认就一直轮询到终态 | 更省人工，但命令更重 | |
| 其他 | 自定义设想 | |

**User's choice:** 只做一次 snapshot  
**Notes:** 命令定位是读取当前 publish truth，不默认替用户持续盯发布流程。

---

## 报告形态

| Option | Description | Selected |
|--------|-------------|----------|
| 只给终端摘要 | 对人类最直接，但不够像正式 contract | |
| 终端摘要 + machine-readable report（推荐） | 默认看得懂，也能被 agent / script 消费 | ✓ |
| 只给 machine-readable report | 最契约化，但人类直接使用体验差 | |
| 其他 | 自定义设想 | |

**User's choice:** 终端摘要 + machine-readable report  
**Notes:** 该 phase 需要明确 structured report contract，而不仅仅是 prose status。

---

## 可信度边界

| Option | Description | Selected |
|--------|-------------|----------|
| 严格 truth-first（推荐） | 不能确认就明确报 `unavailable / ambiguous`，不给猜测结果 | ✓ |
| 精确匹配优先，失败时退化到最新 publish run | 更有机会给出答案，但有误报风险 | |
| 始终 best-effort | 尽量返回一个“最像”的状态，同时附 warning | |
| 其他 | 自定义设想 | |

**User's choice:** 严格 truth-first  
**Notes:** 如果 run 无法精确确认、权限不足或 API 不可达，应显式返回 non-success truth，而不是猜测最新一条 publish run。

---

## the agent's Discretion

- follow-up 命令的具体命名
- structured report 的字段名与 schema 细节
- 人类终端摘要的排版方式

## Deferred Ideas

- 默认持续 watch / poll 到终态
- release readiness gate integration（Phase 40）
