# Pitfalls Research

**Domain:** AI-native code analysis CLI architecture foundation
**Researched:** 2026-05-06
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Parser truth only half-migrated

**What goes wrong:** `createParser()` 和 `analyze()` 看似完成 cutover，但旧 `fast`/`hybrid` mode、`parseFile()` fallback 和 registry 并存，最终不同入口得到不同解析语义。  
**Why it happens:** 现有代码已经有 legacy parser seam 和新 parser registry，两边都“几乎可用”，最容易停在中间态。  
**How to avoid:** 第一阶段先固定唯一 parser orchestrator，再把旧 mode 变成显式兼容错误或 shim。  
**Warning signs:** `config-loader` 还接受 `fast`/`hybrid`；`createParser()` 仍返回 `FastParser`；`analyze()` 仍有 `HYBRID_THRESHOLD`。  
**Phase to address:** 建议 Phase 59。

---

### Pitfall 2: Storage convergence still silently changes backend family

**What goes wrong:** 名义上“默认用 SQLite”，但运行时仍可能回退到 `filesystem` 或显式 `kuzudb` 路径，导致 graph truth、性能和 docs 不一致。  
**Why it happens:** 当前 `auto` 和 `kuzudb` 逻辑把“backend choice”与“runtime fallback”混在一起。  
**How to avoid:** 把 fallback 限制在 SQLite family 内部（native/WASM/built-in），跨 backend 统一报 `UNSUPPORTED_STORAGE_TYPE` 或 `STORAGE_UNAVAILABLE`。  
**Warning signs:** `StorageFactory.determineStorageType()` 仍返回 `filesystem`；配置默认值仍是 `filesystem`。  
**Phase to address:** 建议 Phase 60。

---

### Pitfall 3: MCP direct execution stops at schema registration

**What goes wrong:** MCP tools 看起来更多了，但 contract tools 仍只回 `cli_redirect`，agent 还是拿不到真实结构化结果。  
**Why it happens:** 现有 native tools 已经能直接查 storage，容易让人误以为 MCP 层“基本完成”。  
**How to avoid:** 以 `service.ts` 这种 native tool 模式为样板，优先抽 query/deps/impact/analyze 之类高频命令的 shared service seam。  
**Warning signs:** `schema-adapter.ts` 还定义 `cliRedirectOutputSchema`；`dynamic-server.test` 仍把 `cli_redirect` 当成功语义。  
**Phase to address:** 建议 Phase 61。

---

### Pitfall 4: Node engine truth and SQLite fallback truth drift apart

**What goes wrong:** 设计上依赖 built-in `node:sqlite`，但 package engine 仍允许 Node 20，导致部分用户环境不满足假设。  
**Why it happens:** `sqlite-loader` 已写了 Node 22+ path，很容易在 roadmap 里被误写成“现成可依赖主路径”。  
**How to avoid:** v2.2 明确把 `node:sqlite` 视为 fallback/bonus，而不是唯一运行前提；直到 engine baseline 升级前都必须保留 `better-sqlite3` 或 `sql.js` 可行路径。  
**Warning signs:** 需求或文档开始写“SQLite fallback = node:sqlite”；但 `package.json` 仍是 `node >=20`。  
**Phase to address:** 建议 Phase 60。

---

### Pitfall 5: Big-bang refactor across parser + storage + MCP in one phase

**What goes wrong:** 一个 phase 同时改 parser、storage、commands、MCP、docs，验证面过大，失败时很难定位。  
**Why it happens:** v2.2 scope 本身就是架构层，天然容易让人想“一次清完”。  
**How to avoid:** 按 seam 拆 phase，且每 phase 都要求一个失败场景验证证据。  
**Warning signs:** 单个 commit/phase 同时触达 `src/parser`、`src/infrastructure/storage`、`src/server/mcp`、`src/cli/commands` 大量文件。  
**Phase to address:** 全 milestone。

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 先保留 `fast`/`hybrid` 但不再测试 | cutover 更快 | 未验证旧入口会继续腐烂并制造 ghost contract | 仅在一小段 deprecation 窗口，且错误消息已固定 |
| 删除 backend 但不更新 config loader/defaults | 少改文档和迁移逻辑 | 用户在 runtime 才踩雷，错误上下文更差 | 不可接受 |
| MCP 继续返回 CLI recipe | 几乎零实现成本 | agent 价值没有真正提升 | 仅在 discovery prototype，不适合 v2.2 done definition |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Tree-sitter cutover 未保留 WASM safety net | native 环境缺失时新 parser 直接不可用 | 明确保留 `tree-sitter-loader` 的 native/WASM path | 在无 build tools 的新环境立刻暴露 |
| SQLite-only 但没有 actionable remediation | 用户看到 generic load error，不知道如何恢复 | 统一错误码 + `--wasm-fallback` / 安装建议 | native dep 缺失时立刻暴露 |
| 直接执行改造不抽 shared service | CLI/MCP 各写一套逻辑，性能和行为不一致 | 先抽 service seam，再接双 adapter | 中后期 command 数量增长时爆炸 |

## "Looks Done But Isn't" Checklist

- [ ] **Parser cutover:** `createParser()` 不再返回 `FastParser`，且 `analyze()` 不再看 `HYBRID_THRESHOLD`
- [ ] **Storage convergence:** `createDefaultStorageConfig()`、`VALID_STORAGE_TYPES`、`StorageFactory`、docs 同步改完
- [ ] **MCP direct execution:** contract tools 返回真实 structured result，而不是 `cli_redirect`
- [ ] **Compatibility:** 至少有一个失败场景验证旧 config / 缺失 native dep / MCP tool error path

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Parser truth half-migrated | Phase 59 | 旧 mode 失败场景 + 主流程 parser truth smoke |
| Silent storage fallback | Phase 60 | `auto` / explicit unsupported config regression tests |
| MCP fake execution | Phase 61 | MCP tool integration test returns real structured result |
| Node engine truth drift | Phase 60 | Node 20-compatible fallback evidence + remediation message proof |
| Big-bang refactor | All phases | 每 phase 单独 verifier / focused test evidence |

## Sources

- [analyzer.ts:12](/data/codemap/src/core/analyzer.ts:12)
- [config-loader.ts:41](/data/codemap/src/cli/config-loader.ts:41)
- [StorageFactory.ts:133](/data/codemap/src/infrastructure/storage/StorageFactory.ts:133)
- [schema-adapter.ts:286](/data/codemap/src/server/mcp/schema-adapter.ts:286)
- [sqlite-loader.ts:24](/data/codemap/src/infrastructure/storage/adapters/sqlite-loader.ts:24)
- [package.json:93](/data/codemap/package.json:93)

---
*Pitfalls research for: v2.2 architecture-foundation*
*Researched: 2026-05-06*
