# Requirements: post-v1.6 Symbol-level graph and experimental MCP thin slice

**Defined:** 2026-04-18
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。
**Source Phase:** `Phase 26`
**Previous Completed Milestone:** `v1.6 CodeMap CLI dogfood reliability hardening`

## Completed Requirements

- [x] **P26-NOW-SYMBOL-GENERATE**: `generate --symbol-level` 必须把 symbol-level 调用真相落到 CodeGraph / 存储层，且默认 generate 行为不变
- [x] **P26-NOW-SQLITE-PATH**: symbol-level data 必须通过 SQLite / storage read model 可查询，而不是停留在 parser 临时结果
- [x] **P26-NOW-PARTIAL-GRAPH-TRUTH**: 单文件解析失败不得拖垮整次 generate，结果必须显式标记为 `partial`
- [x] **P26-NOW-MCP-STDIO**: `mcp start` / `mcp install` 必须以 experimental local stdio surface 落地，且 `stdout` 保持协议纯净
- [x] **P26-NOW-SYMBOL-IMPACT**: `codemap_query` / `codemap_impact` 必须暴露最小可用 symbol definition / callers / callees / impact truth，并带显式错误语义

## Constraints

| Boundary | Why |
|----------|-----|
| symbol-level generate 必须是显式 opt-in | 默认模块级 `generate` / `impact` public surface 不能被首期薄切片悄悄改变 |
| `smart-parser` 是首期 symbol call truth authority | 避免首期同时维护第二套 parser 真相源 |
| partial / unavailable / ambiguous 必须显式建模 | 不能把不确定或不完整结果伪装成确定结论 |
| MCP 首期仅限 local-only / read-only / experimental | 避免 transport / host lifecycle 支持面在价值验证前膨胀 |
| docs / guardrail 必须跟随 CLI / MCP 契约同步 | 否则 AI 会基于过时 contract 调用真实实现 |

## Failure Rehearsal

- **风险模式 1**: 单文件解析失败后仍把图伪装成 `complete`
- **风险模式 2**: graph-missing / symbol-missing / ambiguous 情况继续被包装成“看起来成功”的查询结果
- **风险模式 3**: `mcp start` 把人类日志写进 `stdout`，污染 JSON-RPC / stdio 协议
- **风险模式 4**: filesystem / SQLite 读模型在真实 dogfood 中出现序列化漂移，导致 metadata / contract 失真
- **风险模式 5**: experimental MCP 的宿主支持 / lifecycle 未定义，却被误当成稳定长期 surface

## Deferred

- `graph freshness identity`（`commit_sha` / `dirty` / `graph_schema_version`）
- 首期 symbol query / impact 的最小质量基线与样本集
- `mcp install` host support matrix、升级 / 卸载 / 回滚 lifecycle
- 基于真实反馈重新评估 MCP 是否继续保留在首期交付面

## Out of Scope

| Feature | Reason |
|---------|--------|
| `generate --incremental` / `file_hashes` / `parse_errors` 持续维护链路 | 设计文档已明确延期到后续 tranche |
| community / hub-bridge / surprise score 等图算法 | 仍属 Later / Deferred，不属于首期薄切片 |
| 把 experimental MCP 扩成全宿主稳定支持矩阵 | 当前只验证最小 local-only stdio value |
| 恢复 `Phase 22-24` 或重新引入 Docker / ArcadeDB | 与当前 follow-up scope 无关 |

## Traceability

| Requirement | Phase / Plan | Status | Notes |
|-------------|--------------|--------|-------|
| P26-NOW-SYMBOL-GENERATE | Phase 26 / Plan 01 | Completed | opt-in symbol materialization 已落地 |
| P26-NOW-SQLITE-PATH | Phase 26 / Plan 01 | Completed | SQLite / storage read path 可查询 symbol-level truth |
| P26-NOW-PARTIAL-GRAPH-TRUTH | Phase 26 / Plan 02 | Completed | `graph_status` / `generated_at` / failure metadata 已收口 |
| P26-NOW-MCP-STDIO | Phase 26 / Plan 03 | Completed | `mcp start` / `mcp install` 与 stdio purity 已验证 |
| P26-NOW-SYMBOL-IMPACT | Phase 26 / Plan 03 | Completed | `codemap_query` / `codemap_impact` 已基于 symbol graph 返回 structured truth |

**Coverage:**
- Completed requirements: 5 total
- Mapped to plans: 5
- Unmapped: 0

---
*Requirements defined: 2026-04-18*
*Last updated: 2026-04-19 after completing and verifying Phase 26*
