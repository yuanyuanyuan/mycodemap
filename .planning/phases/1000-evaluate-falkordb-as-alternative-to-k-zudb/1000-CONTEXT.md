# Phase 1000: Evaluate FalkorDB as alternative to KùzuDB - Context

**Phase:** 1000
**Status:** Ready for planning
**Gathered:** 2026-03-25

<domain>
## Phase Boundary

评估 FalkorDB 作为 KùzuDB 的替代方案，实现完整功能原型，建立性能基准测试，输出明确的 Go/No-Go 决策建议。

**背景**: KùzuDB 已于 2025-10-10 归档停止维护，需要找到活跃的替代方案。FalkorDB 由 RedisLabs 支持，提供 OpenCypher 支持和 KùzuDB 迁移指南。

**成功标准**:
1. 完整功能的 FalkorDB 存储适配器（与 KuzuDBStorage 功能对等）
2. 性能基准测试对比（KùzuDB vs FalkorDB vs 文件系统）
3. 明确的 Go/No-Go 决策建议

</domain>

<decisions>
## Implementation Decisions

### 评估深度
- **D-01:** 完整原型实现 — 不是仅调研或 PoC，而是功能完整的存储适配器
- 适配器必须支持 CodeMap 所有核心图查询：依赖分析、调用链、符号查询

### 架构约束
- **D-02:** 接受 Redis 依赖 — FalkorDB 需要 Redis，这是可接受的架构变化
- 从纯嵌入式 (KùzuDB) 演进为客户端-服务器 (FalkorDB + Redis)
- Redis 可作为可选依赖，不强制要求所有用户使用

### 选择优先级
- **D-03:** FalkorDB 优先 — 只要技术可行就选择 FalkorDB
- 不需要与其他备选方案（DuckPGQ、ArcadeDB）进行详细对比
- 决策标准：功能完整 + 性能可接受 = Go

### 性能验证
- **D-04:** 完整基准测试 — 建立对比 KùzuDB、FalkorDB、文件系统的测试套件
- 覆盖典型 CodeMap 工作负载：大代码库分析、复杂依赖查询、批量导入
- 性能不劣于 KùzuDB 视为通过

### 数据迁移
- **D-05:** 无迁移支持 — 现有 KùzuDB 用户需重新分析代码库
- 不提供 KùzuDB → FalkorDB 的自动迁移工具
- 降低实现复杂度，用户代价可接受（重新分析是常见操作）

### 回滚策略
- **D-06:** 自动降级到文件系统 — FalkorDB/Redis 失败时自动 fallback
- 复用 Phase 999.1 已实现的降级机制
- 不保留 KùzuDB 支持，完全替换为 FalkorDB

### Claude's Discretion
- 基准测试具体指标和阈值
- FalkorDB 连接池和错误处理细节
- Redis 部署配置建议（单机 vs 集群）

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

### FalkorDB 资源
- [FalkorDB 官方迁移指南](https://www.falkordb.com/blog/kuzudb-to-falkordb-migration/)
- [FalkorDB GitHub](https://github.com/FalkorDB/falkordb)

</canonical_refs>

<code_context>
## Existing Code Insights

### 可复用资产
- **StorageFactory 降级机制** — Phase 999.1 已实现，可直接复用
- **IStorage 接口** — 添加 FalkorDB 适配器只需实现标准接口
- **测试框架** — fallback-mechanism.test.ts 可作为模板

### 架构影响
- **Redis 依赖** — 需要新增 docker-compose.yml 或 Redis 安装指南
- **配置扩展** — mycodemap.config.json 需要新增 falkordb 配置选项
- **CI/CD** — 测试需要 Redis 服务

### 集成点
- StorageFactory.create() — 添加 'falkordb' 类型支持
- 配置验证 — 新增 falkordb 配置 schema
- CLI 帮助 — 更新 storage type 选项说明

</code_context>

<specifics>
## Specific Requirements

### FalkorDB 适配器功能清单
- [ ] 连接 FalkorDB/Redis
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

</specifics>

<deferred>
## Deferred Ideas

### 不在此阶段实现
- **KùzuDB → FalkorDB 数据迁移工具** — 决策 D-05 明确无迁移支持
- **DuckPGQ 评估** — FalkorDB 优先策略，无需对比其他方案
- **多租户支持** — 超出当前 scope
- **分布式 Redis 集群支持** — 初期仅支持单机 Redis

### 可能的后继阶段
- **Phase 1001**: FalkorDB 生产化 — 如果在 Phase 1000 中决策为 Go
- **Backlog**: 分布式存储支持 — 如果需要横向扩展

</deferred>

---

*Phase: 1000-evaluate-falkordb-as-alternative-to-k-zudb*
*Context gathered: 2026-03-25*
