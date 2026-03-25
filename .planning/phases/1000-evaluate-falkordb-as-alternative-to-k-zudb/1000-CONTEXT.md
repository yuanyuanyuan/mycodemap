# Phase 1000: Evaluate FalkorDB as alternative to KùzuDB

**Phase:** 1000
**Status:** Planning
**Created:** 2026-03-25
**Goal:** 评估 FalkorDB 作为 KùzuDB 的替代方案，验证其技术可行性、迁移成本和长期维护性

---

## Why This Phase

KùzuDB 已于 **2025-10-10** 被官方归档并停止维护（v0.11.3 为最终版本）。虽然 CodeMap 已实现的降级机制能确保系统在 KùzuDB 不可用时自动 fallback 到文件系统，但继续使用已归档的数据库会累积技术债务：

- 无安全漏洞修复
- 无新平台/Node.js 版本支持
- 依赖冲突风险随时间增加
- 社区生态萎缩

FalkorDB 是 KùzuDB 官方推荐的迁移目标，由 RedisLabs 支持并活跃维护，提供专门的 [KùzuDB 迁移指南](https://www.falkordb.com/blog/kuzudb-to-falkordb-migration/)。

---

## Success Criteria (Definition of Done)

1. **技术可行性验证**：FalkorDB 能完整支持 CodeMap 的所有图查询需求（依赖分析、调用链、符号查询）
2. **迁移成本评估**：量化从 KùzuDB 迁移到 FalkorDB 所需的代码变更量和工作量
3. **性能对比**：FalkorDB 在 CodeMap 典型工作负载下的性能表现（不劣于 KùzuDB）
4. **维护性评估**：FalkorDB 的社区活跃度、文档质量、长期支持承诺
5. **决策建议**：明确的 Go/No-Go 建议及替代方案（如 DuckPGQ）对比

---

## Key Questions to Answer

1. FalkorDB 的 Redis 依赖是否与 CodeMap 的嵌入式架构兼容？
2. FalkorDB 支持 OpenCypher 的程度如何？现有 Cypher 查询需要多少修改？
3. 数据模型映射：KùzuDB 的 Node Table / Rel Table 如何映射到 FalkorDB？
4. 部署复杂度：从纯嵌入式 (KùzuDB) 到 Redis-based (FalkorDB) 的架构变化成本
5. 回滚策略：如果迁移后发现问题，能否平滑回退？

---

## Alternatives Considered

| 方案 | 优势 | 劣势 | 评估状态 |
|------|------|------|----------|
| **FalkorDB** | RedisLabs 支持、活跃维护、有官方迁移指南、OpenCypher 支持 | 需要 Redis、架构从嵌入式变为客户端-服务器 | 首选评估 |
| DuckDB + DuckPGQ | SQL/PGQ 标准、10-100x 性能优势、分析型查询强 | 需重写 Cypher 为 SQL/PGQ、社区较小 | 备选 |
| ArcadeDB | 多模型支持、LDBC 基准测试领先 | 架构差异大、迁移成本高 | 低优先级 |
| 继续使用 KùzuDB | 无需迁移工作 | 技术债务累积、长期风险高 | 不建议 |

---

## Related Phases

- **Phase 999.1** (Archived): KùzuDB Primary Storage — 已完成降级机制，因 KùzuDB 归档已移出 active planning surface
- **Phase 1000** (Current): FalkorDB Evaluation — 替代方案评估

---

*Next step: Run `/gsd:discuss-phase 1000` to gather requirements and constraints.*
