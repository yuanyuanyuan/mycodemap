# Requirements: CodeMap v2.0 agent-native-foundation

**Defined:** 2026-04-30
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## v2.0 Requirements

### Agent-Native Interface (AGENT)

> Goal: 把 CLI 表面从"手写 dual track"升级为"schema 驱动的自描述统一接口"，让新命令自动获得 parser、MCP、help-json 和 completion。

- [ ] **AGENT-01**: 定义 CLI Interface Contract Schema 作为单一真相源。Schema 必须覆盖：命令名、参数（positional + optional）、标志（boolean / string / number / array）、输出形状（JSON Schema）、错误码枚举、示例。
- [ ] **AGENT-02**: Schema 驱动生成 CLI parser。Contract schema 能直接生成或校验现有 commander 配置，消除手写 parser 与文档之间的漂移。
- [ ] **AGENT-03**: Schema 驱动自动生成 MCP tool 定义。每个 schema 命令自动获得对应的 MCP `registerTool` 调用，包括参数映射和 JSON schema 输出形状。
- [ ] **AGENT-04**: Schema 驱动生成 `--help-json` 与 shell completion。`--help-json` 输出完整的命令契约（非人类 help 文本），供 agent 消费；shell completion 从同一 schema 生成。
- [ ] **AGENT-05**: 运行时暴露 interface contract 元数据。提供 `codemap --schema` 或类似命令输出完整契约，供外部 agent 自省和动态适配。
- [ ] **AGENT-06**: 现有核心命令渐进迁移到 contract schema。至少覆盖 `analyze`、`query`、`deps`、`design` 四个命令族；未迁移命令保持向后兼容。
- [ ] **AGENT-07**: 所有命令默认输出 JSON/NDJSON。stdout 输出结构化数据；人类可读内容走渲染器或 `--human`。
- [ ] **AGENT-08**: `--human` 标志与 TTY 自动检测渲染器。当检测到 TTY 且无显式 `--json`/`--human` 时，输出表格、颜色和 spinner；非 TTY 时默认 JSON。
- [ ] **AGENT-09**: Progress 事件重定向到 stderr 作为结构化 NDJSON。长时间运行的命令（`generate`、`analyze`）在 stderr 输出 `{type: "progress", percent, message}` NDJSON 行，不污染 stdout 数据流。

### Trust Architecture (TRUST)

> Goal: 修复"文档说一套、命令做一套"的信任危机，让错误变成可行动的状态转移而不是死胡同。

- [ ] **TRUST-01**: `codemap doctor` 能检测 `package.json` 中的 ghost commands。扫描 `scripts` 中返回 `echo "...not installed"` 的 no-op 命令并标记为 broken promise。
- [ ] **TRUST-02**: `codemap doctor` 能检测 native dependency health。验证 `tree-sitter` 和 `better-sqlite3` 的编译/加载状态，在缺少 build tools 时给出 WASM fallback 建议。
- [ ] **TRUST-03**: `codemap doctor` 能检测 `.mycodemap/` workspace drift。对比 `config.json`、status receipts 与实际文件系统状态，标记未初始化或过期的工作区。
- [ ] **TRUST-04**: Failure-to-Action Protocol。每个错误返回结构化对象：`{attempted, rootCause, remediationPlan, confidence, nextCommand}`。对于 native dep 失败，自动建议 `--wasm-fallback` 或预构建二进制 URL。
- [ ] **TRUST-05**: Validation Router。根 `CLAUDE.md` 中"修改后必须执行"改为 1 屏验证决策树：按改动类型（docs-only / code-only / config / CI）跳转到 `docs/rules/validation.md` 的最小验证路径。
- [ ] **TRUST-06**: Ghost Commands 清理。`check:architecture` 和 `check:unused` 要么替换为真实检查（安装 dependency-cruiser / knip 并实现），要么从 `package.json` 和文档中诚实移除，不得保留 echo stub。
- [ ] **TRUST-07**: 文档与真实自动化的一致性验证接入 CI。`scripts/validate-docs.js` 或新增脚本定期扫描 docs 中引用的 `npm run` 命令，验证其在 `package.json` 中不是 stub。

### Installation & Runtime (INST)

> Goal: 消除 `npm install codemap` 在缺少 build tools 的环境中的失败，把平台覆盖率从 ~70% 推到 ~100%。

- [ ] **INST-01**: `tree-sitter` 提供 WASM 回退模块。当原生编译失败时，自动加载 `web-tree-sitter` WASM 版本；解析结果与原生版本语义等价。
- [ ] **INST-02**: `better-sqlite3` / `node:sqlite` 提供 WASM/纯 JS 回退路径。Node 22+ 优先使用内置 `node:sqlite`；旧版本或构建失败时使用 WASM SQLite。
- [ ] **INST-03**: Native opt-in 机制与性能 benchmark。提供 `--native` 或配置项强制使用原生二进制；提供 `codemap benchmark` 子命令对比 WASM vs Native 在目标代码库上的性能。

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-Generate design.md from codebase | 需要深层语义分析（ beyond import graphs ），属于 v2.1+ "Architecture Intelligence" |
| Auto-Generate Architecture Remediation Patches | 需要语义理解和安全重构能力，依赖 design.md 生成先到位 |
| Self-Healing Design Contract (Drift Approval) | 需要严格的版本控制和多级审批机制，不适合与 interface contract 同周期开发 |
| SQLite + In-Memory Graph Migration (complete Kùzu removal) | KùzuDB 当前稳定；`better-sqlite3` 已作为依赖加入；完整迁移是 storage 专项 milestone |
| First-Run Concierge + Bootstrap Profiles | UX 增强，依赖 doctor / interface contract 先到位；作为 v2.1+ onboarding 专项 |
| Zero-Config Preview / Progressive Commitment | `npx codemap` 无配置预览依赖 init reconciler 和性能优化；适合与 Concierge 一起做 |
| Path-Scoped Governance (`.claude/rules/` with `paths:`) | 文档治理深化，持续进行，不阻塞 v2.0 发布 |
| Auto-Provisioned Agent Skills | Interface Contract 完成后是 trivial 薄层；v2.1+ 自动部署 |
| MCP `verify_contract` Tool | 依赖 Interface Contract schema 先完成；schema 稳定后 trivial |
| 真实 npm publish / GitHub Release | 发布仍是 L3；v2.0 是功能 milestone，不自动触发发布 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGENT-01 | Phase 41 | Not started |
| AGENT-02 | Phase 41 | Not started |
| AGENT-03 | Phase 42 | Not started |
| AGENT-04 | Phase 41 | Not started |
| AGENT-05 | Phase 41 | Not started |
| AGENT-06 | Phase 42 | Not started |
| AGENT-07 | Phase 44 | Not started |
| AGENT-08 | Phase 44 | Not started |
| AGENT-09 | Phase 44 | Not started |
| TRUST-01 | Phase 43 | Not started |
| TRUST-02 | Phase 43 | Not started |
| TRUST-03 | Phase 43 | Not started |
| TRUST-04 | Phase 45 | Not started |
| TRUST-05 | Phase 46 | Not started |
| TRUST-06 | Phase 46 | Not started |
| TRUST-07 | Phase 46 | Not started |
| INST-01 | Phase 47 | Not started |
| INST-02 | Phase 47 | Not started |
| INST-03 | Phase 47 | Not started |

**Coverage:**
- v2.0 requirements: 19 total
- Complete: 0
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-30*
*Last updated: 2026-04-30 at milestone initialization*
