# Requirements: Milestone v2.2 architecture-foundation

**Defined:** 2026-05-06
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## v2.2 Requirements

### Parser Foundation

- [ ] **PAR-01**: 维护者运行 `mycodemap generate` 时，默认主流程使用 Tree-sitter-based parser path，而不是 `FastParser` 或 `hybrid` 自动切换
- [ ] **PAR-02**: 当用户通过 CLI 或配置请求已废弃的 `fast` 或 `hybrid` mode 时，系统返回显式错误码、迁移提示和修复建议
- [ ] **PAR-03**: parser 选择逻辑只有一个主入口；`src/core/analyzer.ts` 不再保留基于文件数阈值的 parser 切换逻辑
- [ ] **PAR-04**: TypeScript/JavaScript、Python、Go 文件能通过统一 parser 主流程进入分析，而不是只有 TypeScript 走新路径
- [ ] **PAR-05**: parser 主流程在 native `tree-sitter` 不可用时仍可通过现有 WASM fallback 完成运行，且失败场景有真实验证证据

### Storage Convergence

- [ ] **STOR-01**: `storage.type: "auto"` 只会选择 SQLite family，不再静默切换到 `filesystem` 或 `kuzudb`
- [ ] **STOR-02**: 当用户显式配置 `storage.type: "filesystem"` 或 `"kuzudb"` 时，系统返回 `UNSUPPORTED_STORAGE_TYPE` 级别的显式错误，而不是继续执行旧 backend
- [ ] **STOR-03**: 当 native `better-sqlite3` 不可用时，系统只在 SQLite family 内尝试 fallback，并返回可执行 remediation，而不是跨 backend 降级
- [ ] **STOR-04**: 默认配置、config loader 校验和相关运行时输出都把 SQLite 表述为唯一推荐持久化 backend

### MCP Direct Execution

- [ ] **MCP-01**: 至少一组高频 contract-backed MCP tools 在单次调用内返回真实 structured result，而不是 `status: "cli_redirect"`
- [ ] **MCP-02**: MCP direct execution 与对应 CLI 命令共享同一执行逻辑或 service seam，而不是复制实现
- [ ] **MCP-03**: direct execution 路径在成功和失败两种场景下都返回统一错误语义与结构化输出
- [ ] **MCP-04**: direct execution 改造后，新增或改造的 CLI command wrapper 保持薄封装，不再把主要业务逻辑塞在 `src/cli/commands/*.ts` 内

### Context Routing Gate

- [ ] **CTX-01**: agent 可以通过 `codemap_context` 请求 `review`、`debug` 或 `default` 三种任务上下文
- [ ] **CTX-02**: `codemap_context` 返回最小但足够的 graph stats、risk score 和 `nextToolSuggestions`
- [ ] **CTX-03**: `codemap_context` 至少支持 `minimal` 和 `standard` 两级 detail level，并能证明 `minimal` 明显更短
- [ ] **CTX-04**: `codemap_context` 支持 tool filtering，避免向 agent 暴露无关工具集合

## Deferred Requirements

### v2.2 Stretch / Non-blocking

- **PAR-06**: `PythonTypeEnhancer` 提供 docstring-based 类型增强，但不阻塞 v2.2 closeout
- **MCP-05**: SSE transport 支持可作为 MCP direct execution 子任务，但不阻塞 v2.2 committed scope

### Future Milestones

- **INI-01**: `mycodemap init --json` machine-readable receipt gap —— future cleanup milestone
- **GRAPH-01**: SQLite schema redesign —— v2.3 schema-redesign-graph-capability
- **GRAPH-02**: Incremental update / impact CTE / community detection —— v2.3+
- **INT-04**: Auto-Provisioned Agent Skills —— v3.0+
- **INT-05**: MCP `verify_contract` Tool —— v3.0+

## Out of Scope

| Feature | Reason |
|---------|--------|
| 在 v2.2 中重做 SQLite schema / graph capability | 属于 v2.3 及之后的能力层，不属于 architecture-foundation 的收敛范围 |
| 在 v2.2 中恢复 `filesystem` 或 `kuzudb` 为长期支持 backend | 与单一 storage truth 目标冲突 |
| 在 v2.2 中把所有 agent integration follow-ups 一次打包完成 | 会把 architecture foundation 扩成 v3.0 scope |
| 在本 milestone 中执行真实 release 操作 | release 仍属于 L3 边界 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAR-01 | Phase 59 | Pending |
| PAR-02 | Phase 59 | Pending |
| PAR-03 | Phase 59 | Pending |
| PAR-04 | Phase 59 | Pending |
| PAR-05 | Phase 59 | Pending |
| STOR-01 | Phase 60 | Pending |
| STOR-02 | Phase 60 | Pending |
| STOR-03 | Phase 60 | Pending |
| STOR-04 | Phase 60 | Pending |
| MCP-01 | Phase 61 | Pending |
| MCP-02 | Phase 61 | Pending |
| MCP-03 | Phase 61 | Pending |
| MCP-04 | Phase 61 | Pending |
| CTX-01 | Phase 62 | Pending |
| CTX-02 | Phase 62 | Pending |
| CTX-03 | Phase 62 | Pending |
| CTX-04 | Phase 62 | Pending |

**Coverage:**
- v2.2 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-05-06*
*Last updated: 2026-05-06 after roadmap draft creation*
