# Requirements: v1.2 图数据库后端生产化

**Defined:** 2026-03-24  
**Core Value:** AI 能以稳定、机器可读的方式获得代码上下文，而不是被混杂的实现型工作流和不清晰的命令边界干扰。
**Latest Shipped Milestone:** `v1.2 图数据库后端生产化`

## v1.2 Requirements

### Storage Surface

- [x] **GST-01**: 用户可以通过正式配置/运行时入口选择 `filesystem`、`kuzudb`、`neo4j` 或 `auto` 存储后端，而不是被 `generate` 硬编码到文件系统
- [x] **GST-02**: `generate` / repository 主路径会把 CodeGraph 保存到所选后端，并保持对未安装可选依赖的清晰诊断
- [x] **GST-03**: 图数据库后端复用共享 storage contract/helper，而不是继续各自维护占位逻辑和分叉行为

### KùzuDB Backend

- [x] **KUZ-01**: 当用户选择 `kuzudb` 且安装依赖后，完整 CodeGraph 能持久化到真实 KùzuDB schema
- [x] **KUZ-02**: KùzuDB 后端可以加载、更新、删除并查询模块/符号/依赖数据，满足 `IStorage` 合同
- [x] **KUZ-03**: KùzuDB 后端可以提供 callers/callees/cycles/impact/statistics 等最小分析闭环，而不是继续返回空结果或 `NOT_IMPLEMENTED`

### Neo4j Backend

- [x] **NEO-01**: 当用户选择 `neo4j` 且连接信息有效时，完整 CodeGraph 能持久化到真实 Neo4j 实例并重新加载
- [x] **NEO-02**: Neo4j 后端可以更新、删除并查询模块/符号/依赖数据，满足与 KùzuDB 一致的 `IStorage` 合同
- [x] **NEO-03**: Neo4j 后端可以提供 callers/callees/cycles/impact/statistics 的兼容实现，并在认证/连接失败时返回清晰错误

### Documentation & Validation

- [x] **DOC-05**: `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*`、相关 setup/rules 文档明确说明存储配置、可选依赖、边界和失败语义
- [x] **VAL-02**: 自动化验证覆盖至少一条后端成功路径与一条失败路径，证明图数据库产品面不是“代码里存在但主流程不可达”

## v2 Requirements

### Deferred

- **API-01**: 在图数据库后端稳定后，再单独评估是否需要独立 HTTP API 产品面
- **OPT-01**: 基于 DB-native 图查询进一步优化 callers/cycles/impact 的性能与查询计划
- **VAL-03**: 补齐 Phase 01 / 02 的 Nyquist 历史工件与更广文档 guardrail 扩围

## Out of Scope

| Feature | Reason |
|---------|--------|
| 重新公开 `mycodemap server` / HTTP API 产品面 | `Server Layer` 边界已稳定，且 `AnalysisHandler` 仍是 mock 级骨架，本 milestone 不重开产品面 |
| 插件 marketplace / 远程安装生态 | 与图数据库后端主线无关，会重演 scope 漂移 |
| 一次性引入云端/集群化图数据库部署方案 | 当前目标是本地/单实例后端生产化，不是新的运维产品 |
| 仅为历史 Nyquist 债务扩围单开多条战线 | 违背单线程收敛原则，本轮只保留与图数据库闭环直接相关的验证 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GST-01 | Phase 10 | Satisfied |
| GST-02 | Phase 10 | Satisfied |
| GST-03 | Phase 10 | Satisfied |
| KUZ-01 | Phase 11 | Satisfied |
| KUZ-02 | Phase 11 | Satisfied |
| KUZ-03 | Phase 11 | Satisfied |
| NEO-01 | Phase 12 | Satisfied |
| NEO-02 | Phase 12 | Satisfied |
| NEO-03 | Phase 12 | Satisfied |
| DOC-05 | Phase 12 | Satisfied |
| VAL-02 | Phase 12 | Satisfied |

**Coverage:**
- v1.2 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after completing v1.2 milestone*
