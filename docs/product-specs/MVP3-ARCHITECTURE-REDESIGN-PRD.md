# CodeMap MVP3 架构重构产品需求文档（PRD，v1.3 同步版）

> **版本**: v1.3-sync  
> **状态**: Shipped baseline / archived design synced  
> **日期**: 2026-03-25  
> **负责人**: Architecture Team

---

## 1. 文档目的

本文档不再把早期 MVP3 设计稿中的所有目标都视为“当前已实现”，而是明确区分：

- **已交付基线**：当前仓库在 `v1.3` 已落地的架构与产品边界
- **Deferred**：仍保留为未来候选、但尚未成为当前产品事实的内容

---

## 2. 背景

MVP3 重构的原始目的，是把 CodeMap 从“CLI 直接拼接分析逻辑的 brownfield 工具”收敛为：

1. 有清晰层次边界的 AI-first 代码地图工具
2. 有稳定存储契约的分析系统
3. 有可扩展 parser 注册机制的多语言基础设施
4. 有统一文档和验证护栏的可维护产品面

---

## 3. 当前已交付基线（`v1.3`）

### 3.1 架构边界

当前仓库已经形成如下稳定层次：

| 层级 | 路径 | 当前职责 |
|------|------|----------|
| Interface | `src/interface/` | 类型定义、配置契约 |
| Infrastructure | `src/infrastructure/` | storage、parser、repositories 等技术实现 |
| Domain | `src/domain/` | 实体、领域服务、仓储接口 |
| Server | `src/server/` | **内部** transport / handler 层 |
| CLI | `src/cli/` | 公共命令面、参数解析、输出编排 |

**边界要求**：

- `Server Layer` 是内部架构层，不等于公共 `mycodemap server` 命令
- 公共 CLI 不再暴露 `server`、`watch`、`report`、`logs`

### 3.2 存储产品面

当前正式存储 surface 为：

| 类型 | 状态 | 说明 |
|------|------|------|
| `filesystem` | shipped | 默认、最稳定 |
| `memory` | shipped | 测试/内存场景 |
| `kuzudb` | shipped | 当前图存储主线 |
| `auto` | shipped surface | 配置面存在，但当前仍保守落到 `filesystem` |
| `neo4j` | removed | 不再是正式支持 backend；旧配置返回显式迁移错误 |

### 3.3 解析器能力

当前已落地的 parser 实现为：

| 语言族 | 当前实现 |
|--------|----------|
| TypeScript / JavaScript | `TypeScriptParser` |
| Go | `GoParser` |
| Python | `PythonParser` |

说明：

- `LanguageId` 仍保留未来扩展空间
- 但当前文档不再把 Java / Rust / C/C++ / 14 种语言描述成已交付事实

### 3.4 公共 CLI 面

当前公共命令面聚焦于代码地图与代码分析：

```text
init / generate / query / deps / cycles / complexity / impact
analyze / ci / workflow / export / ship
```

其中：

- `analyze` 的公共契约固定为 `find` / `read` / `link` / `show`
- `workflow` 是 **analysis-only** 能力，只编排 `find → read → link → show`
- `ship` 仍是公开的过渡能力，但 must-pass 检查已复用 `ci`

### 3.5 文档与验证护栏

当前已交付的验证基线：

- `npm run docs:check`
- `npm run typecheck`
- `npm run lint`（当前允许 warning baseline，只阻断 error）
- `npm test`
- `npm run build`
- `node dist/cli/index.js ci check-docs-sync`

---

## 4. 产品需求状态

### 4.1 已满足

| 需求 | 当前状态 |
|------|----------|
| 五层架构与命名边界稳定 | 已满足 |
| Kùzu-only 图存储主线 | 已满足 |
| 历史 `neo4j` 配置迁移诊断 | 已满足 |
| 解析器注册机制与 3 类实现 | 已满足 |
| `analyze` / `workflow` / `server` 边界收口 | 已满足 |
| docs/CI guardrail 自动化 | 已满足 |

### 4.2 Deferred

| 候选项 | 当前状态 |
|--------|----------|
| 更丰富的 auto heuristic 存储切换 | Deferred |
| Java / Rust / C/C++ 等更多 parser 实现 | Deferred |
| `viz` / `tui` / 更丰富 CLI 可视化 | Deferred |
| 公共 HTTP API / `mycodemap server` 产品面 | Deferred |
| 更深的 Kùzu-native 查询优化 | Deferred |

### 4.3 明确不在当前基线内

| 项目 | 处理原则 |
|------|----------|
| 恢复 `neo4j` 正式支持 | 不在当前范围 |
| 把 `Server Layer` 重新包装成公共产品面 | 不在当前范围 |
| 把 workflow 扩回实现/提交/CI 编排 | 不在当前范围 |

---

## 5. 用户价值

### 5.1 AI / Agent 用户

需求：

- 拿到稳定、机器可读、边界清晰的代码上下文
- 不被不稳定的命令面和文档漂移误导

当前交付：

- 公共命令面已收口
- 输出契约已固定
- docs guardrail 与 CI 能阻止高信号漂移

### 5.2 Python / Go / TypeScript 团队

需求：

- 能在当前主流仓库里复用统一代码地图能力
- 不需要等到“14 种语言全部完成”才使用 MVP3

当前交付：

- TypeScript/JavaScript、Go、Python 已有 parser 实现
- 解析器接口保留未来扩展余地

### 5.3 大仓库维护者

需求：

- 能切换到图存储后端
- 遇到旧配置时有清晰迁移语义

当前交付：

- `filesystem` / `memory` / `kuzudb` / `auto` 为正式配置面
- 旧 `neo4j` 配置会显式报错，不再静默 fallback

---

## 6. 非功能基线

### 6.1 兼容性

- 当前正式配置文件名为 `mycodemap.config.json`
- 对旧 `codemap.config.json` 保留兼容读取与迁移提示
- 输出仍围绕 `AI_MAP.md`、`codemap.json` 及相关导出格式组织

### 6.2 可维护性

- 文档、实现、测试、CI 必须使用同一套边界措辞
- 架构文档必须持续区分“内部 Server Layer”与“公共 CLI surface”

### 6.3 性能表述

当前文档不再把早期草案中的 `<100ms` GraphDB 指标写成现成 SLA。

更准确的当前表达是：

- Kùzu 路径已接入正式产品面
- 更激进的 DB-native 查询优化属于后续候选项，而非 `v1.3` 既成事实

---

## 7. 发布历史（按已交付里程碑）

| 里程碑 | 交付重点 |
|--------|----------|
| `v1.0` | AI-first 定位、公共 CLI 收口、analyze/workflow/ship/docs guardrail 基线 |
| `v1.1` | 插件扩展点产品化 |
| `v1.2` | 图数据库后端生产化 |
| `v1.3` | Kùzu-only 收敛、高信号 debt 清偿、docs/CI 自动验证闭环 |

---

## 8. 风险与缓解

| 风险 | 当前状态 | 缓解策略 |
|------|----------|----------|
| 文档继续把历史设计写成当前现实 | 高信号风险 | 持续运行 `docs:check` 与 `ci check-docs-sync` |
| `Server Layer` 与公共 `server` 命令再次混淆 | 高信号风险 | 在 README / AI docs / 架构文档统一措辞 |
| `auto` 被误读为“已完成智能切换” | 中 | 文档明确写明当前仍保守落到 `filesystem` |
| repo-wide lint warnings 演变成阻断项 | 中 | 单独开新 milestone 清理 warning baseline |

---

## 9. 参考文档

- `docs/product-specs/MVP3-ARCHITECTURE-COMPARISON.md`
- `docs/product-specs/MVP3-ARCHITECTURE-REDESIGN-TECH-PRD.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/v1.3-MILESTONE-AUDIT.md`
