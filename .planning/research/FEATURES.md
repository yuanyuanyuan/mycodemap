# Feature Research

**Domain:** AI-native code analysis CLI architecture foundation
**Researched:** 2026-05-06
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (This Milestone Must Deliver)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 单一 parser 主路径 | maintainers/agents 需要稳定、可预测的解析行为 | HIGH | 当前 `createParser` 仍只分 `fast`/`smart`，而 `analyze()` 仍保留 `hybrid` 自动切换。 |
| 单一 storage truth | agent-facing tool 不应依赖 backend roulette | HIGH | 当前 `auto` 仍优先 `kuzudb`，失败后静默回退到 `filesystem`。 |
| MCP 真实执行 | MCP tool 应一次调用即返回结果 | HIGH | 当前 contract tools 仍返回 `status: "cli_redirect"`。 |
| 最小 routing gate | agent 需要用一个轻量入口判断下一步该用哪条工具链 | MEDIUM | `codemap_context` 目前还不存在；适合在 v2.2 做简化版。 |

### Differentiators (值得做，但不必抢在最前)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `PythonTypeEnhancer` | 在 parser cutover 后补最小类型增强价值 | LOW | backlog 明确标成非阻塞验收项。 |
| `detail_level` / `tool` filters | 让 `codemap_context` 同时服务 humans 和 agents | MEDIUM | 适合和 routing gate 同 phase 或后置同 milestone。 |
| SSE transport | 后续 agent integration 更顺滑 | MEDIUM | backlog 已列为 MCP 直接执行子任务，但不应阻塞 direct execution 主线。 |

### Anti-Features (看起来合理，实际会拖慢 v2.2)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 同时重做 v2.3 schema | 一次性“彻底重构”很诱人 | 会把 v2.2 从架构收敛扩成存储模型重设计，phase 边界失控 | v2.2 先收口 parser/storage/MCP seam，schema 留给 v2.3 |
| 保留 `fast`/`smart`/`hybrid` 三个 public mode | 想减少 breaking change | 会让 analyzer、config、docs、tests 长期双轨维护 | 显式废弃旧 mode，提供修复建议 |
| 继续让 MCP contract tool 只告诉用户怎么跑 CLI | 实现更省事 | 对 agent 没有真正 machine-actionable value | service seam + structured result |

## Feature Dependencies

```text
Parser cutover
    └──requires──> parser entrypoint truth
                        └──requires──> config migration for old mode values

SQLite-only storage
    └──requires──> storage factory truth
                        └──requires──> actionable remediation for unavailable runtime

MCP direct execution
    └──requires──> pure function / service seam
                        └──enhances──> codemap_context routing gate

codemap_context
    └──depends on──> stable graph stats + stable tool execution semantics
```

### Dependency Notes

- **Parser cutover requires config migration:** 当前 config 仍接受 `fast`/`smart`/`hybrid`，不能先删实现再留 silent parse drift。
- **Storage convergence requires remediation:** 当前用户可能显式写了 `filesystem`/`kuzudb`；必须有清晰错误码和建议，而不是 silent fallback。
- **Routing gate depends on execution truth:** 如果 tool 仍返回 `cli_redirect`，`codemap_context` 的建议只是“推荐你再手动执行”，对 agent 无意义。

## MVP Definition

### Launch With (v2.2 milestone core)

- [ ] Parser 统一：主流程不再依赖 `FastParser` / `hybrid`
- [ ] Storage 收敛：`auto` 统一到 SQLite 路径，`filesystem` / `kuzudb` 转成显式不支持
- [ ] MCP 直接执行：contract tools 不再返回 `cli_redirect`
- [ ] `codemap_context` 最小版：支持 `review` / `debug` / `default`

### Add After Core Convergence (v2.2 stretch)

- [ ] `PythonTypeEnhancer` — parser 主路径稳定后补最小类型增强
- [ ] SSE transport — direct execution 稳定后再补 transport 体验

### Future Consideration (v2.3+)

- [ ] SQLite schema redesign
- [ ] Incremental update / impact CTE / community detection
- [ ] Auto-Provisioned Agent Skills / MCP `verify_contract`

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Parser 统一 | HIGH | HIGH | P1 |
| Storage 收敛 | HIGH | HIGH | P1 |
| MCP 真实执行 | HIGH | HIGH | P1 |
| `codemap_context` | HIGH | MEDIUM | P1 |
| `PythonTypeEnhancer` | MEDIUM | LOW | P2 |
| SSE transport | MEDIUM | MEDIUM | P2 |

## Sources

- [backlog.md:32](/data/codemap/docs/backlog.md:32) — v2.2 scope baseline
- [parser/index.ts:25](/data/codemap/src/parser/index.ts:25) — current parser factory truth
- [analyzer.ts:12](/data/codemap/src/core/analyzer.ts:12) — current hybrid threshold logic
- [StorageFactory.ts:48](/data/codemap/src/infrastructure/storage/StorageFactory.ts:48) — current storage type selection
- [schema-adapter.ts:286](/data/codemap/src/server/mcp/schema-adapter.ts:286) — current `cli_redirect` handler

---
*Feature research for: v2.2 architecture-foundation*
*Researched: 2026-05-06*
