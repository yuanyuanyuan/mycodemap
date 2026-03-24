# Roadmap: CodeMap

## Milestones

- ✅ **v1.0 AI-first 重构** — Phases 1-6 (shipped 2026-03-24)
- ✅ **v1.1 插件扩展点产品化** — Phases 7-9 (shipped 2026-03-24)
- ✅ **v1.2 图数据库后端生产化** — Phases 10-12 (shipped 2026-03-24)

## Overview

`v1.2` 已把既有图数据库存储抽象推进为用户真正可到达、可持久化、可验证的产品能力。执行顺序按 roadmap 收口完成：先打通 storage activation / contract → 再完成 KùzuDB 主链路 → 最后补齐 Neo4j、文档与验证闭环。

## Phases

- [x] **Phase 10: Storage Activation & Contract** - 收口存储选择入口、主路径接入和共享 contract
- [x] **Phase 11: KùzuDB Persistence & Query Parity** - 让 KùzuDB 达到真实持久化与查询闭环
- [x] **Phase 12: Neo4j Compatibility, Docs & Validation** - 补齐 Neo4j、文档、guardrail 与失败验证

## Phase Details

### Phase 10: Storage Activation & Contract
**Goal**: 把图数据库后端从“代码里存在”推进到“主流程可选可达”，并建立共享 storage contract，避免后续继续复制 fallback/TODO 逻辑  
**Depends on**: Phase 9 (v1.1 shipped)  
**Requirements**: GST-01, GST-02, GST-03  
**Success Criteria** (what must be TRUE):
  1. 用户可以通过正式配置/运行时入口选择存储后端，而不是被 `generate` 固定到 `filesystem`
  2. 缺少 `kuzu` / `neo4j-driver` 或配置错误时，CLI 会暴露清晰诊断，而不是静默 fallback 掩盖问题
  3. 共享 helper / contract tests 固定 callers/callees/cycles/impact/statistics 的最小一致行为
**Plans**: 3 plans

Plans:
- [x] 10-01: 收口 storage config / backend selection / diagnostics surface
- [x] 10-02: 让 `generate` / repository 主路径接入可选 backend
- [x] 10-03: 抽取共享 graph query / analysis helpers 与 contract tests

### Phase 11: KùzuDB Persistence & Query Parity
**Goal**: 让 KùzuDB 从内存 fallback 占位实现升级为真实 schema、持久化、查询和分析后端  
**Depends on**: Phase 10  
**Requirements**: KUZ-01, KUZ-02, KUZ-03  
**Success Criteria** (what must be TRUE):
  1. 选择 `kuzudb` 且安装依赖后，CodeGraph 会写入真实 KùzuDB schema，并能重新加载
  2. `updateModule` / `deleteModule` / 查询接口不再停留在 TODO 或空结果
  3. callers/callees/cycles/impact/statistics 至少达到与共享 contract 一致的可验证行为
**Plans**: 3 plans

Plans:
- [x] 11-01: 实现 KùzuDB schema 与 full-graph persist/load
- [x] 11-02: 补齐 KùzuDB 增量更新、查询与分析接口
- [x] 11-03: 为 KùzuDB 增加契约测试与失败验证

### Phase 12: Neo4j Compatibility, Docs & Validation
**Goal**: 让 Neo4j 达到相同 storage contract，并把配置、边界、失败语义写进文档/guardrail/验证  
**Depends on**: Phase 11  
**Requirements**: NEO-01, NEO-02, NEO-03, DOC-05, VAL-02  
**Success Criteria** (what must be TRUE):
  1. 选择 `neo4j` 且连接有效时，CodeGraph 可以写入、读取、更新、删除并查询真实 Neo4j 数据
  2. 文档、AI guide、setup/rules 与实现同步说明后端配置、可选依赖和边界，不把 `Server Layer` 误写成公共 API 扩面
  3. 自动化验证至少覆盖一条成功路径和一条失败路径，证明图数据库产品面已闭环
**Plans**: 3 plans

Plans:
- [x] 12-01: 实现 Neo4j 持久化、查询契约与连接错误语义
- [x] 12-02: 同步 README / AI docs / setup / rules 的 graph storage 文档
- [x] 12-03: 补齐 backend contract / failure validation 与 milestone verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Storage Activation & Contract | v1.2 | 3/3 | Completed | 2026-03-24 |
| 11. KùzuDB Persistence & Query Parity | v1.2 | 3/3 | Completed | 2026-03-24 |
| 12. Neo4j Compatibility, Docs & Validation | v1.2 | 3/3 | Completed | 2026-03-24 |
