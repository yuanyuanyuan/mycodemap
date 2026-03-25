# Phase 1000: FalkorDB Evaluation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 1000-evaluate-falkordb-as-alternative-to-k-zudb
**Mode:** discuss-phase (user-driven decisions)

---

## Gray Areas Discussed

### Area 1: Evaluation Depth

**Question:** Phase 1000 的评估深度应该是？

| Option | Description | Selected |
|--------|-------------|----------|
| 完整原型实现 | 实现完整的 FalkorDB 存储适配器，与现有 KuzuDBStorage 功能对等，进行详细性能对比 | ✓ |
| 概念验证 (PoC) | 仅实现核心查询的 PoC，验证技术可行性和主要兼容性风险 | |
| 文档调研 | 仅进行文档调研和代码静态分析，产出评估报告 | |

**User's choice:** 完整原型实现

**Rationale Captured:**
- 需要充分验证 FalkorDB 的技术可行性
- 完整原型可以支持全面的基准测试
- 如果决策为 Go，原型可以直接演进为生产实现

---

### Area 2: Architecture Constraints

**Question:** CodeMap 的架构约束如何？

| Option | Description | Selected |
|--------|-------------|----------|
| 接受 Redis 依赖 | 接受 Redis 依赖，评估 FalkorDB 作为默认图数据库后端 | ✓ |
| 保持纯嵌入式 | 保持纯嵌入式架构，如果 FalkorDB 需要 Redis 则放弃 | |
| 双模式支持 | 支持两种模式：FalkorDB（需要 Redis）和文件系统（嵌入式） | |

**User's choice:** 接受 Redis 依赖

**Rationale Captured:**
- 嵌入式架构不是 CodeMap 的核心卖点
- Redis 是广泛部署的基础设施，依赖是可接受的
- 用户可以选择使用文件系统（无需 Redis）或 FalkorDB（需要 Redis）

---

### Area 3: Selection Priority

**Question:** FalkorDB 的选择优先级？

| Option | Description | Selected |
|--------|-------------|----------|
| FalkorDB 优先 | 只要 FalkorDB 可行就选择它，因为 KùzuDB 已归档 | ✓ |
| 对比优选 | FalkorDB 必须明显优于 DuckPGQ 等其他备选才选择 | |
| 开放决策 | 综合评估所有选项，最终决策可延迟到评估完成后 | |

**User's choice:** FalkorDB 优先

**Rationale Captured:**
- KùzuDB 归档需要尽快找到替代方案
- FalkorDB 官方提供迁移指南，风险可控
- 不需要花费时间评估其他备选

---

### Area 4: Performance Validation

**Question:** 性能评估策略？

| Option | Description | Selected |
|--------|-------------|----------|
| 完整基准测试 | 建立完整的基准测试套件，对比 KùzuDB、FalkorDB 和文件系统在典型工作负载下的性能 | ✓ |
| 最低门槛验证 | 仅验证 FalkorDB 满足最低性能门槛，不与其他方案详细对比 | |
| 功能优先 | 跳过性能测试，仅验证功能正确性 | |

**User's choice:** 完整基准测试

**Rationale Captured:**
- 需要量化数据支持 Go/No-Go 决策
- 用户关心性能是否比 KùzuDB 有倒退
- 基准测试结果为后续优化提供基线

---

### Area 5: Data Migration

**Question:** 现有 KùzuDB 用户的数据迁移？

| Option | Description | Selected |
|--------|-------------|----------|
| 自动迁移工具 | 提供自动迁移工具，从 KùzuDB 导出数据并导入 FalkorDB | |
| 手动迁移指南 | 提供手动迁移指南和脚本，由用户执行 | |
| 无迁移支持 | 不需要迁移支持，用户重新分析代码库即可 | ✓ |

**User's choice:** 无迁移支持

**Rationale Captured:**
- 重新分析代码库是 CodeMap 的常见操作
- 自动迁移工具开发成本高，使用场景少
- 降低 Phase 1000 的复杂度，聚焦核心评估

---

### Area 6: Rollback Strategy

**Question:** FalkorDB 失败时的回滚策略？

| Option | Description | Selected |
|--------|-------------|----------|
| 自动降级到文件系统 | 保持降级机制，FalkorDB 失败时自动回退到文件系统 | ✓ |
| 双后端支持 | 同时支持 KùzuDB 和 FalkorDB，用户可配置切换 | |
| 完全替换 | 完全替换 KùzuDB，不提供回滚 | |

**User's choice:** 自动降级到文件系统

**Rationale Captured:**
- 复用 Phase 999.1 已实现的降级机制
- 保持系统可用性是最重要的
- 不需要保留 KùzuDB 支持（已归档）

---

## Summary of Decisions

| # | Area | Decision | Key Rationale |
|---|------|----------|---------------|
| 1 | 评估深度 | 完整原型实现 | 充分验证技术可行性 |
| 2 | 架构约束 | 接受 Redis 依赖 | 嵌入式不是核心卖点 |
| 3 | 选择优先级 | FalkorDB 优先 | KùzuDB 归档需要尽快替代 |
| 4 | 性能验证 | 完整基准测试 | 量化数据支持决策 |
| 5 | 数据迁移 | 无迁移支持 | 降低复杂度，重新分析可接受 |
| 6 | 回滚策略 | 自动降级到文件系统 | 复用现有机制 |

---

## Deferred Ideas

The following were considered but **not** included in this phase:

1. **KùzuDB → FalkorDB 数据迁移工具** — 决策明确无迁移支持
2. **DuckPGQ / ArcadeDB 评估** — FalkorDB 优先策略
3. **分布式 Redis 集群支持** — 初期仅单机
4. **多租户支持** — 超出 scope

---

## Next Steps

1. ✅ CONTEXT.md created with all decisions
2. ⏭️ Research phase — investigate FalkorDB API and implementation patterns
3. ⏭️ Planning phase — create detailed PLAN.md with tasks
4. ⏭️ Execution — implement FalkorDB adapter and benchmarks

---

*Log created: 2026-03-25*
