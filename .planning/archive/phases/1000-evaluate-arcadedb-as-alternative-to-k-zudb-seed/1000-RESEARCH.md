# Phase 1000: Evaluate ArcadeDB Node integration feasibility - Research

**Researched:** 2026-03-25
**Domain:** ArcadeDB support matrix vs CodeMap Node/CLI architecture
**Confidence:** HIGH

---

## Summary

当前 `Phase 1000` 原始计划的核心前提是错的：**ArcadeDB 的 embedded 模式不是 Node.js 直接可用的 SDK 路径**。ArcadeDB 官方把 embedded 定位为 **JVM languages** 与 **Java API** 能力，而 Node.js 侧可用的是 **client/server** 路径，包括 HTTP/JSON 与 Bolt（可用官方 Neo4j drivers）。  

因此，`1000` 不应继续规划成“直接实现一个 Node embedded 版 `ArcadeDBStorage`”，而应先回答：**server-backed ArcadeDB 是否值得为 CodeMap 打开新的运行时与配置面**。

**Primary recommendation:** 把 `1000` 重定为 **官方支持面核验 + 有界 Node 实验 + 决策报告**。  
**Explicit NO-GO:** 否定“ArcadeDB 是 KùzuDB 的 drop-in embedded replacement for Node.js”这一前提。  
**Conditional path:** 若后续实验表明 HTTP/JSON 或 Bolt 接入成本可接受，再单开 follow-up phase，而不是在本 phase 直接改产品代码面。

---

## Official Findings

### 1. Embedded mode is not a Node runtime path

ArcadeDB 官方 embedded 文档把能力定位为：

- **Works With:** `JVM languages`
- **API:** `Java API`

这直接否定了“在 Node.js 中 `import('arcadedb')` 然后 `new ArcadeDB({ mode: 'embedded' })`”的设计假设。

### 2. Node.js can access ArcadeDB only through client/server protocols

ArcadeDB 官方 client/server 文档明确列出：

- **HTTP/JSON API** — 任何支持 HTTP 的语言都可接入
- **Neo4j Bolt Protocol** — 可使用官方 Neo4j drivers
- 其他协议如 Postgres / Redis / Gremlin 面向不同客户端生态

对 CodeMap 的 Node/CLI 来说，可行的最小实验路径是：

1. **HTTP/JSON**（首选）  
   - Node 18+ 自带 `fetch`
   - 无需恢复 Neo4j 公开产品语义
   - 可把实验隔离在脚本或 phase artifact 中

2. **Bolt / neo4j-driver**（次选）  
   - 官方兼容
   - 但更容易重新引入仓库当前明确拒绝的 Neo4j 风格配置心智

### 3. Current repo surface is incompatible with a first-class server-backed ArcadeDB today

当前仓库的公开 surface 明确围绕本地后端展开：

- `StorageType` 仅公开 `filesystem` / `kuzudb` / `memory`
- `config-loader` 仅允许 `type / outputPath / databasePath / autoThresholds`
- `config-loader` 显式拒绝 `uri / username / password`
- `README` 与 AI guide 只描述现有四种存储类型

这意味着若要把 ArcadeDB 变成正式 backend，不只是“新增一个 adapter”：

- 需要新配置字段：`uri`、`database`、`username`、`password`、`protocol`、可能还要 `tls`
- 需要新运行说明：服务端启动、认证、网络可达性、容器/本地安装方式
- 需要更新 CLI 错误消息、schema、README、AI 文档与 fallback 叙事

---

## Support Matrix

| Mode | Official status | Node.js fit | Why it matters |
|------|-----------------|-------------|----------------|
| Embedded | JVM only / Java API | **No direct fit** | 当前 execute plan 假设失效 |
| HTTP/JSON | Official client/server path | **Yes** | 最容易做有界实验，不必新增 driver |
| Bolt | Official client/server path | **Yes** | 可做 secondary validation，但会放大 Neo4j 语义联想 |

---

## Repo Constraint Analysis

### Current public contract

| Surface | Current state | Impact if ArcadeDB becomes first-class |
|---------|---------------|----------------------------------------|
| `src/interface/types/storage.ts` | 无 `arcadedb` | 需要扩展 union 类型与下游处理 |
| `src/cli/config-loader.ts` | 拒绝 `uri / username / password` | 需要新增并重新定义安全约束 |
| `mycodemap.config.schema.json` | 仅 `databasePath` | 需要 server-backed 字段集合 |
| `README.md` / `docs/ai-guide/COMMANDS.md` | 仅文档化 4 种后端 | 需要新增部署、认证、故障模式说明 |
| `StorageFactory.ts` | 围绕本地依赖 + fallback | 需要处理服务端不可达、认证失败、协议选择 |

### Blast radius conclusion

**结论：高于原计划预估。**  
当前 phase 1000 不能再被视为“小范围存储实现”；它本质上是一次 **product surface change assessment**。

---

## Recommended Experiment Strategy

### Preferred: isolated HTTP smoke script

在不修改产品 public surface 的前提下，最小实验可以是：

- 文件：`scripts/experiments/arcadedb-http-smoke.mjs`
- 输入环境变量：
  - `ARCADEDB_HTTP_URL`
  - `ARCADEDB_DATABASE`
  - `ARCADEDB_USERNAME`
  - `ARCADEDB_PASSWORD`
  - `ARCADEDB_CYPHER`（可选）
- 请求端点：
  - `POST {ARCADEDB_HTTP_URL}/api/v1/command/{ARCADEDB_DATABASE}`
- 请求体：
  - `{"language":"cypher","command":"MATCH (n) RETURN count(n) AS total LIMIT 1"}`

这个脚本的价值不是把 ArcadeDB 产品化，而是验证：

1. Node runtime 能否稳定访问 ArcadeDB
2. 最小认证/配置面是什么
3. 后续若进入 follow-up phase，需要引入哪些正式契约

### Not recommended in this phase

- 直接把 `arcadedb` 加进 `StorageType`
- 直接修改 `config-loader` 接受新的公网/凭证字段
- 直接承诺 benchmark 数字或“可替换 KùzuDB”

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 继续按 embedded 假设实现 | High | High | 在本 phase 明确判定该前提失效 |
| server-backed 配置面扩张污染主线 | High | High | 实验隔离到 `scripts/experiments` 与 planning artifacts |
| 把 Bolt 误读为“恢复 Neo4j backend” | Medium | High | 首选 HTTP/JSON 实验，并把 Bolt 仅列为 secondary path |
| 用 placeholder benchmark 代替真实支持拓扑 | Medium | High | 先做 smoke evidence，再定义 benchmark strategy |

**Overall risk rating:** Medium-High for productization, Low for isolated evidence gathering.

---

## Validation Architecture

### Test / Validation stack

| Property | Value |
|----------|-------|
| Framework | Node 18+ built-in runtime + existing Vitest |
| Quick run | `node --check scripts/experiments/arcadedb-http-smoke.mjs` |
| Full run | `npm run typecheck && npm test -- src/infrastructure/storage/__tests__/fallback-mechanism.test.ts` |
| Manual prerequisite | 本地或容器中可访问的 ArcadeDB server |

### Required validation outputs

- `1000-EVIDENCE.md` 必须明确写出 `Embedded | JVM only`
- `1000-ARCHITECTURE-IMPACT.md` 必须量化配置 / docs / fallback blast radius
- `1000-EVALUATION-REPORT.md` 必须显式给出 `GO / NO-GO / CONDITIONAL`
- 若 smoke script 不可运行，报告必须写明 blocker，而不是伪造性能结论

---

## Recommendation

### Phase 1000 recommendation

1. **Replan now**：把 phase 1000 改成 evidence-first research phase
2. **Execute bounded experiment**：仅验证 HTTP/JSON Node path
3. **Decide later**：只有在 blast radius 被明确接受后，才考虑 follow-up implementation phase

### Decision posture

- **NO-GO** for “Node embedded replacement”
- **CONDITIONAL** for “server-backed ArcadeDB experiment and later productization”

---

## Sources

### External
- `https://arcadedb.com/embedded.html`
- `https://arcadedb.com/client-server.html`

### Repo
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `src/interface/types/storage.ts`
- `src/infrastructure/storage/StorageFactory.ts`
- `src/cli/config-loader.ts`
- `mycodemap.config.schema.json`
- `README.md`
- `docs/ai-guide/COMMANDS.md`

---

*This research document is consumed by `gsd-plan-phase` and intentionally replaces the invalid embedded-first assumptions from the previous draft.*
