# Phase 1000: Evaluate ArcadeDB as alternative to KùzuDB - Context

**Phase:** 1000
**Status:** Ready for planning
**Gathered:** 2026-03-25
**Revised:** 2026-03-25 (switched from FalkorDB to ArcadeDB)

<domain>
## Phase Boundary

评估 **ArcadeDB** 作为 KùzuDB 的替代方案，实现完整功能原型，建立性能基准测试，输出明确的 Go/No-Go 决策建议。

**背景**:
- KùzuDB 已于 2025-10-10 归档停止维护，需要找到活跃的替代方案
- 原计划评估 FalkorDB，但发现其 **SSPLv1 许可证** 不是 OSI 批准的开源许可
- **ArcadeDB** 使用 **Apache 2.0** 许可证，性能优于 FalkorDB，且支持完整 Cypher

**成功标准**:
1. 完整功能的 ArcadeDB 存储适配器（与 KuzuDBStorage 功能对等）
2. 性能基准测试对比（ArcadeDB vs 文件系统）
3. 明确的 Go/No-Go 决策建议

</domain>

<decisions>
## Implementation Decisions

### 评估深度
- **D-01:** 完整原型实现 — 不是仅调研或 PoC，而是功能完整的存储适配器
- 适配器必须支持 CodeMap 所有核心图查询：依赖分析、调用链、符号查询

### 架构约束
- **D-02:** 保持嵌入式架构 — ArcadeDB 支持嵌入式模式，无需外部依赖
- 优先使用嵌入式（类似 KùzuDB），可选客户端-服务器模式
- 无 Redis 依赖，简化部署

### 选择优先级
- **D-03:** ArcadeDB 优先 — Apache 2.0 许可证，性能领先，完整 Cypher 支持
- 不评估其他备选方案（FalkorDB 已排除，DuckPGQ 研究阶段不成熟）
- 决策标准：功能完整 + 性能可接受 = Go

### 性能验证
- **D-04:** 完整基准测试 — 建立对比 ArcadeDB、文件系统的测试套件
- 覆盖典型 CodeMap 工作负载：大代码库分析、复杂依赖查询、批量导入
- 性能不劣于 KùzuDB 视为通过

### 数据迁移
- **D-05:** 无迁移支持 — 现有 KùzuDB 用户需重新分析代码库
- 不提供 KùzuDB → ArcadeDB 的自动迁移工具
- 降低实现复杂度，用户代价可接受（重新分析是常见操作）

### 回滚策略
- **D-06:** 自动降级到文件系统 — ArcadeDB 失败时自动 fallback
- 复用 Phase 999.1 已实现的降级机制
- 不保留 KùzuDB 支持，完全替换为 ArcadeDB

### 许可证要求
- **D-07:** 必须使用 OSI 批准的开源许可证 — 排除 SSPLv1 等 source-available 许可
- Apache 2.0 为首选，确保长期合规性

### Claude's Discretion
- 基准测试具体指标和阈值
- ArcadeDB 嵌入式 vs 客户端-服务器模式选择
- 多模型功能（文档/时序）是否利用

</decisions>

<canonical_refs>
## Canonical References

### KùzuDB 归档风险
- Phase 999.1 已确认 KùzuDB 于 2025-10-10 归档
- `.planning/phases/999.1-kuzu-primary-storage/999.1-CONTEXT.md`
- `.planning/phases/999.1-kuzu-primary-storage/999.1-DISCUSSION-LOG.md`

### 现有存储实现
- `src/infrastructure/storage/StorageFactory.ts` — 存储工厂和降级机制
- `src/infrastructure/storage/adapters/KuzuDBStorage.ts` — 当前 KùzuDB 适配器（参考实现）
- `src/infrastructure/storage/adapters/FileSystemStorage.ts` — 文件系统适配器
- `src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` — 降级机制测试

### ArcadeDB 资源
- [ArcadeDB 官方站点](https://arcadedb.com/)
- [ArcadeDB GitHub](https://github.com/ArcadeData/arcadedb)
- [ArcadeDB vs FalkorDB Benchmark](https://arcadedb.com/blog/neo4j-alternatives-in-2026-a-fair-look-at-the-open-source-options/)

### 被排除的方案
- **FalkorDB** — SSPLv1 许可证不合规（source-available，非 OSI 批准）
- **DuckPGQ** — 研究阶段，生产就绪度不足

</canonical_refs>

<code_context>
## Existing Code Insights

### 可复用资产
- **StorageFactory 降级机制** — Phase 999.1 已实现，可直接复用
- **IStorage 接口** — 添加 ArcadeDB 适配器只需实现标准接口
- **测试框架** — fallback-mechanism.test.ts 可作为模板

### 架构影响
- **嵌入式模式** — ArcadeDB 支持嵌入式，保持与 KùzuDB 相同的部署体验
- **无外部依赖** — 不需要 Redis 或 Docker，降低用户门槛
- **配置扩展** — mycodemap.config.json 需要新增 arcadedb 配置选项

### 集成点
- StorageFactory.create() — 添加 'arcadedb' 类型支持
- 配置验证 — 新增 arcadedb 配置 schema
- CLI 帮助 — 更新 storage type 选项说明

</code_context>

<specifics>
## Specific Requirements

### ArcadeDB 适配器功能清单
- [ ] 初始化 ArcadeDB（嵌入式或客户端-服务器）
- [ ] 保存代码图（saveCodeGraph）
- [ ] 加载代码图（loadCodeGraph）
- [ ] 符号查询（querySymbols）
- [ ] 依赖查询（getDependencies）
- [ ] 调用链查询（getCallChain）
- [ ] 模块查询（getModules）

### 基准测试场景
- [ ] 冷启动时间
- [ ] 大型代码库（1000+ 文件）分析时间
- [ ] 复杂依赖查询（跨多层调用）性能
- [ ] 内存占用对比
- [ ] 并发查询性能

### 许可证合规检查
- [ ] 确认 ArcadeDB 为 Apache 2.0
- [ ] 确认依赖项许可证兼容
- [ ] 文档中注明许可证信息

</specifics>

<deferred>
## Deferred Ideas

### 不在此阶段实现
- **KùzuDB → ArcadeDB 数据迁移工具** — 决策 D-05 明确无迁移支持
- **FalkorDB 评估** — 已排除（SSPLv1 不合规）
- **DuckPGQ 生产化** — 等待项目成熟
- **多模型功能利用** — 仅使用图模型，文档/时序功能暂不启用

### 可能的后继阶段
- **Phase 1001**: ArcadeDB 生产化 — 如果在 Phase 1000 中决策为 Go
- **Backlog**: 多模型支持 — 探索文档/时序与图数据的结合

</deferred>

---

*Phase: 1000-evaluate-arcadedb-as-alternative-to-k-zudb*
*Context gathered: 2026-03-25*
*Revised: 2026-03-25 (ArcadeDB selected over FalkorDB due to Apache 2.0 license)*
