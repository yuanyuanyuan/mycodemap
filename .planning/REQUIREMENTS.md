# Requirements: v1.3 Kùzu-only 收敛与高信号债务清理

**Defined:** 2026-03-24  
**Core Value:** AI 能以稳定、机器可读的方式获得代码上下文，而不是被混杂的实现型工作流和不清晰的命令边界干扰。  
**Latest Shipped Milestone:** `v1.2 图数据库后端生产化`

## v1.3 Requirements

### Storage Surface Simplification

- [ ] **STG-01**: `mycodemap.config.json` / schema / README / AI docs / setup 文档只暴露 `filesystem`、`memory`、`kuzudb`、`auto` 四种正式存储选项，不再把 `neo4j` 当作受支持 backend
- [ ] **STG-02**: runtime storage factory、`generate`、`export` 与相关 diagnostics 不再尝试创建 `neo4j` backend；当读到旧 `neo4j` 配置时返回清晰迁移错误，而不是静默 fallback
- [ ] **STG-03**: `neo4j` 相关 adapter、测试、验证与 guardrail 从正式主路径中移除或降级到明确内部归档，不再让未支持能力继续污染产品面

### Public Surface Closure

- [ ] **SUR-01**: `analyze` 的 `find` intent 执行路径与 Intent Router 契约一致，不再依赖不完整 legacy fallback 才能完成主流程
- [ ] **SUR-02**: `workflow` 命令、帮助文案、AI 文档与测试都明确为 analysis-only 四阶段正式能力，不再保留“过渡能力/仍在开发”的歧义
- [ ] **SUR-03**: 与公共 CLI 无关的 `server` command 实现从运行路径、源码死角和文档暗示中清理或显式 internal-only 化，不再形成“命令已删除但仍像正式产品功能”的误导

### Technical Debt Paydown

- [ ] **DEBT-01**: `plugin-loader` 的热重载、diagnostics 与输出文件写入边界 debt 收口，避免插件迭代时 runtime state 和路径安全语义继续模糊
- [ ] **DEBT-02**: `global-index` 支持 `tsconfig.json` 路径映射，`parser/index` 不再停留在“更详细分析 TODO”的主路径状态
- [ ] **DEBT-03**: `TypeScriptParser`、`PythonParser`、`GoParser` 的 TODO-DEBT 被实现、替换或正式文档化，不再裸留在主实现文件顶部
- [ ] **DEBT-04**: `AnalysisHandler` 的 mock TODO 收口为真实内部能力或显式 not-supported contract，避免 `Server Layer` 继续呈现“看起来可用、实际上未完成”的歧义

### Documentation & Validation Automation

- [ ] **DOC-06**: `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*`、`docs/rules/*`、schema 与 docs guardrail 同步反映 Kùzu-only 与真实命令边界
- [ ] **VAL-03**: `docs:check`、`typecheck`、`vitest`、`build` 全部通过，且 docs sync 自动检查进入 CI 或 must-pass 验证链路，避免只能靠手动执行发现漂移

## v2 Requirements

### Deferred

- **API-01**: 在内部 `Server Layer` debt 收口后，再单独评估是否需要独立 HTTP API 产品面
- **OPT-01**: 基于 Kùzu-native 图查询进一步优化 callers/cycles/impact 的性能与查询计划
- **WKF-01**: 若后续需要多角色/多阶段的完整工程工作流编排，再单独开 milestone 设计新的 workflow 产品面

## Out of Scope

| Feature | Reason |
|---------|--------|
| 恢复 `neo4j` 正式支持 | 用户已明确当前不需要，继续保留只会增加产品面和维护成本 |
| 重新公开 `mycodemap server` / HTTP API 产品面 | `Server Layer` 仍是内部层，本 milestone 先消除 unfinished 歧义而不是重开产品面 |
| 一次性引入新的图数据库后端或集群部署方案 | 当前目标是收敛，不是扩面 |
| 插件 marketplace / 远程安装生态 | 与当前 debt / guardrail 收口目标无关 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STG-01 | Phase 13 | Pending |
| STG-02 | Phase 13 | Pending |
| STG-03 | Phase 13 | Pending |
| SUR-01 | Phase 14 | Pending |
| SUR-02 | Phase 14 | Pending |
| SUR-03 | Phase 14 | Pending |
| DEBT-01 | Phase 15 | Pending |
| DEBT-02 | Phase 15 | Pending |
| DEBT-03 | Phase 15 | Pending |
| DEBT-04 | Phase 15 | Pending |
| DOC-06 | Phase 16 | Pending |
| VAL-03 | Phase 16 | Pending |

**Coverage:**
- v1.3 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after starting v1.3 milestone*
