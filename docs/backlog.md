# mycodemap Backlog

> **版本**: v3.0-convergence
> **更新日期**: 2026-05-05
> **适用范围**: v2.2-v2.6 架构收敛 + 图智能，基于 CODEMAP_GRAPH_ENHANCEMENT_ASSESSMENT.md 和 BACKLOG_mycodemap-redesign-20260505.md 的 grill-with-docs 决策
> **核心约束**: AI Agents First | 4 语言 (TS/JS/Python/Go) | SQLite 唯一存储 | MCP 直接执行

---

## 一、规划来源

| 来源文档 | 角色 | 状态 |
|----------|------|------|
| `CODEMAP_GRAPH_ENHANCEMENT_ASSESSMENT.md` | 调研论文：识别什么已有/什么缺/什么可借鉴 | 已消化 |
| `BACKLOG_mycodemap-redesign-20260505.md` | 实施蓝图：19 个任务 (P0-P3, 4 sub-milestone) | 已过滤/增强/重排 |
| `docs/backlog.md` (v2.0-sync) | 现有待办：Must Do / Should Do / Could Do | 已合并/对齐 |

---

## 二、Milestone 总览

| Milestone | 核心主题 | 主要内容 | 预估人天 |
|---|---|---|---|
| **v2.2** architecture-foundation | 架构根基 + Agent 入口 | P0-1 + P0-2 + P0-3 + P1-5 | 30-40 |
| **v2.3** schema-redesign-graph-capability | Schema 重设计 + 核心图能力 | Schema 重写 + P2-2 + P1-1 + P1-2 + P1-3 | 30-40 |
| **v2.4** agent-graph-experience | Agent 图体验 | P1-4 + P2-1 + P2-4 | 20-25 |
| **v2.5** deep-analysis-hooks | 深度分析 + Hook | P2-3 + P2-5 + P3-4 | 15-18 |
| **v2.6** polish-and-stabilize | 打磨收尾 | P3-2 + P3-5 + P3-6 + IC 1.0.0 + SQLite 优化 | 10-15 |

---

## 三、v2.2 — 架构根基 + Agent 入口

### 3.1 P0-1 Parser 统一

- **删除 FastParser**：TreeSitterParser + WASM 完全替代，无需正则解析器
- **删除 Hybrid 模式**：Tree-sitter 对所有规模够快，无需 50 文件阈值切换
- **SmartParser 缩减为 ~300 行 TS 类型增强层**：只做 TS Compiler API 类型推断（泛型、类型别名、typeof），内部委托给 TreeSitterParser
- **TreeSitterParser 接入主流程**：修改 `createParser` 工厂 + `analyzer.ts` 使用 ParserRegistry
- **4 语言支持**：TS/JS/Python/Go 通过 ParserRegistry 自动生效
- **PythonTypeEnhancer**（非阻塞验收项）：基于 docstring 的类型推断，~100-150 行

**验收标准**：
- `mycodemap generate` 默认使用 Tree-sitter 解析
- FastParser/Hybrid 不再被主流程调用
- SmartParser 代码量 < 300 行
- 4 语言解析可用（TS/JS/Python/Go）
- WASM 降级路径正常工作

**Breaking Changes**：`mode: 'fast'` / `mode: 'hybrid'` 配置失效 → 明确错误码 + 修复建议

### 3.2 P0-2 存储收敛

- **删除 KùzuDB 后端**：`UNSUPPORTED_STORAGE_TYPE`
- **删除 FileSystem 后端**：`UNSUPPORTED_STORAGE_TYPE`
- **`auto` 策略改为 sqlite 唯一默认**：不可用时硬着陆报错 + Failure-to-Action 引导（`--wasm-fallback` / 安装命令）
- **SQLite 三层降级**：`better-sqlite3` native → `sql.js` WASM → `node:sqlite`（可选检测）
- **ARCHITECTURE.md 修复**并入验收标准

**验收标准**：
- `StorageFactory.create('auto')` 返回 SQLiteStorage
- 传入 `filesystem`/`kuzudb` 抛出 `UNSUPPORTED_STORAGE_TYPE`
- 不可用时返回 `{error: {code: 'STORAGE_UNAVAILABLE', remediation: '...'}}`

**Breaking Changes**：`storage: 'filesystem'` / `storage: 'kuzudb'` 配置失效

### 3.3 P0-3 MCP 直接执行

- **全部 20+ 命令拆分为 pure function + CLI wrapper + MCP adapter**
- **统一接口规范**：typed object input + `ServiceResult<T>` + 统一错误码
- **CLI 瘦身验收**：每个 CLI 命令文件 < 300 行
- **SSE transport** 作为子任务

**验收标准**：
- MCP tool 调用一次即返回结果，无需二次 CLI 执行
- `cli_redirect` 模式彻底消灭
- `src/cli/commands/` 下无超过 300 行的文件

### 3.4 P1-5 MCP 路由门

- **`codemap_context` MCP tool**：~100 tokens 路由门
  - v2.2 先支持 3 个 task：`review` / `debug` / `default`
  - `graphStats`：modules, symbols, edges（不含 communities，v2.3 后加入）
  - `riskScore`：简化版（基于模块数、循环依赖数、高复杂度文件数）
  - `nextToolSuggestions`：根据 task 推荐下一步 tool
- **detail_level 三级**：minimal（摘要+计数） / standard（完整） / full（含代码片段）
- **tool 过滤**：`--tools` CLI 参数 / `CODEMAP_TOOLS` 环境变量

**验收标准**：
- `codemap_context --task review` 返回 `nextToolSuggestions: ["impact", "surprising"]`
- `detail_level=minimal` 输出比 `standard` 压缩 40-60%

---

## 四、v2.3 — Schema 重设计 + 核心图能力

### 4.1 SQLite Schema 重写

- **从 governance-v3 迁移到图优化 schema**：
  - `nodes` 表：integer id PK + `qualified_name TEXT UNIQUE`
  - `edges` 表：`source_qn`/`target_qn`（无外键，允许解析中临时不一致）+ `confidence_tier TEXT DEFAULT 'EXTRACTED'`
  - `file_hashes` 表：增量更新基础
  - `communities` 表：社区检测结果
  - `nodes_fts` FTS5 虚拟表：全文搜索
  - 复合索引：`edges(source_qn, kind)` / `edges(target_qn, kind)` / `nodes(file_path)`
- **迁移脚本**：`mycodemap migrate --from v2.2 --to v2.3`

**Breaking Changes**：Schema 不兼容 → `mycodemap migrate` 脚本

### 4.2 P2-2 边置信度

- edges 表加 `confidence_tier` 字段
- 解析器输出时标记每条边：EXTRACTED（AST 直接提取） / INFERRED（名称匹配解析） / AMBIGUOUS（多候选/动态调用）
- **置信度分布目标**：EXTRACTED >60%, INFERRED <30%, AMBIGUOUS <10%, EXTRACTED precision >95%

### 4.3 P1-1 增量更新

- **git-diff 驱动** + 2-hop 依赖级联 + 500 文件上限
- **`--on-change` 参数**：检测变更 + 增量更新（v2.5 通用 Hook 替换）
- **SHA-256 哈希比对**（复用 file-hash-cache）
- **Worker Threads 并行解析**（<8 文件串行）
- **SQLite 原子写入**：`BEGIN IMMEDIATE` → `DELETE` → `INSERT` → `COMMIT`
- **不需要 `--no-git`**，不需要 Watch mode

**性能目标**：叶子节点 <1.5s，核心文件 <5s

### 4.4 P1-2 影响分析 CTE

- **SQLite Recursive CTE BFS** 替代内存图遍历
- **分层摘要 + detail_level 三级**：
  - minimal：summary（total_nodes, max_depth, by_confidence）~50 tokens
  - standard：summary + 前 3 层节点 ~200 tokens
  - full：完整分层结果
- **`_impact_seeds` 临时表**避免 SQL 变量过多
- **内存图 BFS 保留为 fallback**

**性能目标**：1K 节点 <50ms，10K <200ms

### 4.5 P1-3 社区检测

- **ngraph + 自研 Louvain**（Research 阶段对比 CRG igraph / graphify graspologic / louvain npm）
- **边权重映射**：CALLS=1.0, IMPORTS_FROM=0.7, INHERITS=0.8, IMPLEMENTS=0.7, DEPENDS_ON=0.6, TESTED_BY=0.4, CONTAINS=0.3
- **超大社区拆分**：>25% 图节点时二次 Leiden
- **自动命名**：路径前缀优先（>60% 覆盖率）→ 前缀::主导类名 → community_N 兜底
  - 后续可通过白名单/配置表覆盖，v2.3 不做编辑功能
- **凝聚力评分**：社区内实际边数 / 最大可能边数

---

## 五、v2.4 — Agent 图体验

### 5.1 P1-4 Surprise 评分

- **报告模式**：输出但不建议行动
- **通过 `codemap_context` 路由门间接引导**（task=review 时推荐 surprising）
- **多因子评分**：confidence_tier, 跨目录(+2), 跨社区(+1), Peripheral→Hub(+1), 历史回归(+2)
- 阈值默认 8 分，可配置

### 5.2 P2-1 执行流追踪

- **两阶段交互**：
  - `mycodemap flows --summary`：返回入口点列表 + 置信度
  - `mycodemap flows --trace <entry>`：返回调用链
- **三层入口点检测**：True root / 框架装饰器 / 传统命名
- **Criticality 评分**：深度 × 节点数 × 安全关键词 × 跨社区惩罚
- 输出带 confidence 标记，Agent 可决定信任哪些

### 5.3 P2-4 裸名解析

- 收集裸名 CALLS 边（target 不含 `::`）
- 单候选 → EXTRACTED，多候选 → INFERRED，零候选 → AMBIGUOUS
- 多候选时通过 IMPORTS_FROM 边判断源文件是否导入目标文件
- **置信度分布目标**替代精度百分比

---

## 六、v2.5 — 深度分析 + Hook

### 6.1 P2-3 Hub/Bridge 检测

- **Hub**：degree centrality + hub_tier (critical/major/minor) + God Node 排除
- **Bridge**：跨社区边数近似（不实时计算 betweenness，离线可选）
- 结果持久化到 SQLite `hub_bridge_scores` 表

### 6.2 P2-5 Hook 机制

- **首次提醒 + 后续静默**：同一会话只在第一次 Glob/Grep 时提醒
- **基于 Phase 58 env-contract 检索指引**：Hook 内容指向 `mycodemap env-contract` 接口
- **⚠️ 实施前必须 double-confirm Phase 58 兼容性**
- v2.3 的 `--on-change` 硬编码参数替换为通用 Hook 框架

### 6.3 P3-4 节点去重

- Layer 1（文件内）：AST extractor 维护 `seen_ids` set
- Layer 2（跨文件）：后写入覆盖策略
- Layer 3（缓存）：显式 `seen` set 处理缓存命中
- 处理 TypeScript `export { x } from './y'` 重导出场景

---

## 七、v2.6 — 打磨收尾

| 项 | 内容 |
|---|---|
| P3-2 复杂度计算统一 | `ast-complexity-analyzer.ts` 为唯一源，SmartParser 调用其 API |
| P3-5 MCP 空白行过滤 | stdio transport 层过滤空白行输入 |
| P3-6 边 ID 归一化 | `[^a-zA-Z0-9]+` → `_` + 转小写 |
| Interface Contract 1.0.0 | 所有命令补全 outputShape/errorCodes/examples，`stable: true` |
| SQLite+In-Memory 优化 | LRU 查询缓存，内存邻接表加速多跳查询 |

---

## 八、已排除项（不在 v2.2-v2.6 范围）

| 项 | 排除原因 |
|---|---|
| FastParser / Hybrid 模式 | TreeSitterParser + WASM 完全替代 |
| FileSystem 后端 | SQLite 唯一主线，WASM 降级兜底 |
| KùzuDB 后端 | 与 SQLite 路线冲突 |
| Auto Storage Heuristic | SQLite 对所有规模够快，无需启发式切换 |
| Watch mode | 非 Agent First，推出范围 |
| `--no-git` 模式 | 随 Watch mode 一起排除 |
| viz 命令 | 不需要可视化 |
| 插件系统 | 推到 v3.0+ milestone |
| Parser 扩展 Rust/Java/C++ | 只支持 TS/JS/Python/Go |
| 14+ 语言 parser | 与 4 语言约束冲突 |
| LLM 语义提取 | 与纯静态分析定位冲突 |
| Embedding / 向量检索 | 与本地优先策略冲突 |
| 交互可视化 | Mermaid 已满足需求 |
| Betweenness centrality 实时计算 | O(n×m) 太慢，用跨社区边数近似 |

---

## 九、关键设计决策记录

| # | 决策 | 理由 | 日期 |
|---|------|------|------|
| D-01 | v2.1 保持原样 close，新规划从 v2.2 开始 | 避免 scope 膨胀 | 2026-05-05 |
| D-02 | SSE transport 合并到 P0-3 | 不依赖 cli_redirect 消灭，但同属 MCP 正式化 | 2026-05-05 |
| D-03 | Interface Contract 1.0.0 降到 v2.6 | 纯打磨项，不阻塞核心能力 | 2026-05-05 |
| D-04 | ARCHITECTURE.md 修复并入 P0-2 验收 | P0-2 删存储后端后架构文档必须同步 | 2026-05-05 |
| D-05 | 删 FileSystem + 硬着陆（不可用报错+引导） | WASM 降级覆盖绝大多数环境 | 2026-05-05 |
| D-06 | SmartParser 保留为独立 parser（~300 行） | TS Compiler API 类型推断仍有价值 | 2026-05-05 |
| D-07 | 删除 FastParser | TreeSitterParser + WASM 完全替代 | 2026-05-05 |
| D-08 | 全部 20+ 命令拆分 pure function | 避免新旧模式并存的混乱期 | 2026-05-05 |
| D-09 | Schema 一次性重写 + 单独 milestone 做重设计 | 避免在旧 schema 上写查询再重写 | 2026-05-05 |
| D-10 | Schema 保留 integer id + UNIQUE qn 索引 | B-tree 性能优势 + qn 查询效率 | 2026-05-05 |
| D-11 | P1-5 路由门前移到 v2.2 | Agent 体验的基石，越早做越好 | 2026-05-05 |
| D-12 | IMPORTS_FROM 权重提升到 0.7 | import 是影响传播第一跳，比 call 更静态确定 | 2026-05-05 |
| D-13 | 增量更新只做 CLI + Hook，不做 Watch | Agent First，Watch 服务人类 | 2026-05-05 |
| D-14 | `--on-change` 保持简单（只做增量更新） | Agent 可自己串联命令 | 2026-05-05 |
| D-15 | 影响 CTE 分层摘要 + detail_level 三级 | Agent token 预算有限 | 2026-05-05 |
| D-16 | 执行流两阶段交互（summary → trace） | Agent 有选择权，不被不完整数据淹没 | 2026-05-05 |
| D-17 | Surprise 报告模式 + 路由门间接引导 | 置信度不够，需人类确认 | 2026-05-05 |
| D-18 | Hub/Bridge 用 degree + 跨社区边数近似 | betweenness O(n×m) 太慢 | 2026-05-05 |
| D-19 | Hook 首次提醒+后续静默，基于 Phase 58 检索指引 | 平衡提醒与干扰 | 2026-05-05 |
| D-20 | 边置信度提前到 v2.3 | schema 重写时一并加字段，避免后续回填 | 2026-05-05 |
| D-21 | 置信度分布目标替代精度百分比 | Agent 根据 confidence_tier 自行判断信任度 | 2026-05-05 |
| D-22 | 社区自动命名（路径前缀优先），后续可加白名单/配置表 | v2.3 不做编辑，保持简单 | 2026-05-05 |
| D-23 | 每个 milestone 自行处理 breaking change | 诚实报错 + migrate 脚本 | 2026-05-05 |
| D-24 | PythonTypeEnhancer 纳入 v2.2 非阻塞 | ~150 行，docstring 类型推断有增量价值 | 2026-05-05 |
| D-25 | 插件系统移出 v2.2-v2.6 | 用户数极少，Agent 端价值有限 | 2026-05-05 |
| D-26 | P2-5 依赖 Phase 58 env-contract 接口，实施前 double-confirm | Phase 58 未通过验收，需确认兼容性 | 2026-05-05 |
| D-27 | `codemap_context` 渐进式：v2.2 简化版（3 task，无 communities），v2.3+ 扩展 | 与后端能力同步 | 2026-05-05 |
| D-28 | Pure function 统一接口：typed object input + ServiceResult<T> + 统一错误码 | MCP adapter 统一消费 | 2026-05-05 |
