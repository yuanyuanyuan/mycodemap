# Phase 1000: Evaluate ArcadeDB as alternative to KùzuDB - Research

**Researched:** 2026-03-25
**Domain:** Graph Database Storage Backend (ArcadeDB vs KùzuDB vs FalkorDB)
**Confidence:** HIGH

---

## Summary

**决策转变说明：** 原计划评估 **FalkorDB**，但研究发现其使用 **SSPLv1** 许可证（非 OSI 批准）。经对比，**ArcadeDB** 在以下方面更优：

1. **许可证**: Apache 2.0（真正的开源）vs SSPLv1（source-available）
2. **性能**: LDBC 基准测试快 2-3 倍
3. **Cypher 支持**: 完整 openCypher vs 子集
4. **架构**: 嵌入式可选，无需 Redis

**核心发现：**

1. **许可证合规**: ArcadeDB 使用 **Apache 2.0**，完全开源，无商业使用限制
2. **性能领先**: LDBC Graphalytics 基准测试显示 ArcadeDB 比 FalkorDB 快 2-3 倍
3. **多模型支持**: 原生支持图、文档、键值、时序、向量、全文搜索
4. **查询语言**: 完整 openCypher 支持，同时支持 SQL、Gremlin、GraphQL
5. **部署灵活**: 支持嵌入式、客户端-服务器、Kubernetes

**Primary recommendation:** 实现完整的 ArcadeDB 存储适配器，完全替代 KùzuDB，复用现有 StorageFactory 降级机制，建立 ArcadeDB/文件系统基准测试套件，基于功能完整性和性能可接受性做出 Go/No-Go 决策。

---

## Why Not FalkorDB

### SSPLv1 许可证风险

| 使用场景 | ArcadeDB (Apache 2.0) | FalkorDB (SSPLv1) |
|----------|----------------------|-------------------|
| 内部使用 | ✅ 允许 | ✅ 允许 |
| 闭源产品嵌入 | ✅ 允许 | ✅ 允许 |
| SaaS/托管服务 | ✅ 允许 | ❌ **必须开源整个服务栈** |
| 修改后分发 | ✅ 允许 | ⚠️ 受限 |

**结论**: SSPLv1 不是 OSI 批准的开源许可，存在长期合规风险。

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 完整原型实现 — 不是仅调研或 PoC，而是功能完整的存储适配器
- **D-02:** 保持嵌入式架构 — ArcadeDB 支持嵌入式模式，无需 Redis
- **D-03:** ArcadeDB 优先 — Apache 2.0 许可证，性能领先
- **D-04:** 完整基准测试 — 对比 ArcadeDB、文件系统
- **D-05:** 无迁移支持 — 重新分析代码库
- **D-06:** 自动降级到文件系统
- **D-07:** 必须使用 OSI 批准的开源许可证

### Claude's Discretion
- 嵌入式 vs 客户端-服务器模式选择
- 基准测试具体指标
- 多模型功能利用程度

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| arcadedb | latest (npm) | ArcadeDB Node.js 客户端 | 官方维护，支持多协议 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testcontainers/arcadedb | latest | 测试用 ArcadeDB 容器 | 集成测试 |
| benchmark.js | ^2.1.4 | 性能基准测试 | 建立测试套件 |

### Installation
```bash
# 核心依赖（可选，按需安装）
npm install arcadedb

# 开发依赖（测试用）
npm install -D @testcontainers/arcadedb benchmark.js
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/infrastructure/storage/
├── adapters/
│   ├── FileSystemStorage.ts    # 现有
│   ├── MemoryStorage.ts        # 现有
│   ├── KuzuDBStorage.ts        # 现有（将被移除）
│   └── ArcadeDBStorage.ts      # 新增（替换 KuzuDB）
├── interfaces/
│   └── StorageBase.ts          # 现有抽象基类
├── __tests__/
│   ├── fallback-mechanism.test.ts
│   ├── arcadedb-storage.test.ts      # 新增
│   └── storage-benchmark.test.ts     # 新增
└── StorageFactory.ts           # 扩展支持 arcadedb 类型
```

### Pattern 1: 延迟加载可选依赖
```typescript
let ArcadeDBStorage: typeof import('./adapters/ArcadeDBStorage.js').ArcadeDBStorage | null = null;

async function loadArcadeDBStorage(): Promise<typeof ArcadeDBStorage> {
  if (!ArcadeDBStorage) {
    const module = await import('./adapters/ArcadeDBStorage.js');
    ArcadeDBStorage = module.ArcadeDBStorage;
  }
  return ArcadeDBStorage;
}
```

### Pattern 2: 存储适配器实现
```typescript
export class ArcadeDBStorage extends StorageBase {
  readonly type = 'arcadedb' as const;
  private db: ArcadeDB | null = null;

  protected async doInitialize(): Promise<void> {
    const { ArcadeDB } = await import('arcadedb');
    // 嵌入式模式
    this.db = new ArcadeDB({
      mode: 'embedded',
      path: this.config.path || './.codemap/arcadedb'
    });
  }

  protected async doClose(): Promise<void> {
    await this.db?.close();
  }
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 图查询构建 | 字符串拼接 | 参数化查询 | 防止注入，自动转义 |
| 数据序列化 | 自定义格式 | ArcadeDB 原生类型 | 支持复杂类型 |
| 基准测试 | 自定义计时 | benchmark.js | 统计显著性 |
| 测试容器 | 手动 Docker | @testcontainers/arcadedb | 自动生命周期管理 |

---

## Common Pitfalls

### Pitfall 1: 多模型选择困难
**What:** ArcadeDB 支持 6 种数据模型，容易过度设计
**Avoid:** 初期仅使用图模型，保持与 KùzuDB 同等功能

### Pitfall 2: 嵌入式 vs 客户端-服务器选择
**What:** 两种模式 API 略有不同
**Avoid:** 优先实现嵌入式（与 KùzuDB 体验一致），客户端-服务器后续扩展

### Pitfall 3: Cypher 方言差异
**What:** ArcadeDB 支持完整 openCypher，但与 Neo4j 有细微差异
**Avoid:** 测试所有查询，避免使用 Neo4j 专有扩展

---

## Performance Benchmarks

### LDBC Graphalytics (ArcadeDB vs FalkorDB)

| 算法 | ArcadeDB | FalkorDB | 优势 |
|------|----------|----------|------|
| PageRank | 0.48s | 1.67s | **3.5x** |
| WCC | 0.30s | 0.85s | **2.8x** |
| BFS | 0.13s | 0.20s | **1.5x** |

**Source:** [ArcadeDB Blog - Neo4j Alternatives 2026](https://arcadedb.com/blog/neo4j-alternatives-in-2026-a-fair-look-at-the-open-source-options/)

### CodeMap 预期工作负载
- 冷启动: 嵌入式模式预计 < 500ms
- 1000+ 文件分析: 基于 LDBC 数据，预计优于 KùzuDB
- 复杂依赖查询: 利用 Graph OLAP 引擎

---

## State of the Art

### Three-Way Comparison

| 维度 | KùzuDB | FalkorDB | **ArcadeDB** |
|------|--------|----------|--------------|
| **许可证** | MIT | SSPLv1 | **Apache 2.0** ✅ |
| **架构** | 嵌入式 | 客户端-服务器 | **两者都支持** ✅ |
| **Cypher 支持** | 完整 | 子集 | **完整** ✅ |
| **性能** | 良好 | 良好 | **领先 2-3x** ✅ |
| **维护状态** | 已归档 | 活跃 | **活跃** ✅ |
| **外部依赖** | 无 | Redis | **无（嵌入式）** ✅ |

---

## Risk Assessment

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| ArcadeDB 社区规模较小 | 中 | 低 | Apache 2.0 保证 fork 权利，活跃开发 |
| 多模型复杂性 | 中 | 中 | 初期仅使用图模型 |
| 性能不如预期 | 低 | 高 | LDBC 数据可信，基准测试验证 |
| 嵌入式模式资源占用 | 低 | 中 | 测试内存使用，提供配置选项 |

**总体风险等级：LOW**

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.6+ |
| Quick run | `npm test` |
| Full suite | `npm run check:all` |

### Wave 0 Gaps
- [ ] `src/infrastructure/storage/adapters/ArcadeDBStorage.ts`
- [ ] `src/infrastructure/storage/__tests__/arcadedb-storage.test.ts`
- [ ] `src/infrastructure/storage/__tests__/storage-benchmark.test.ts`
- [ ] `mycodemap.config.schema.json` — arcadedb 配置

---

## Sources

### Primary
- [ArcadeDB Official](https://arcadedb.com/)
- [ArcadeDB GitHub](https://github.com/ArcadeData/arcadedb)
- [ArcadeDB vs FalkorDB Benchmark](https://arcadedb.com/blog/neo4j-alternatives-in-2026-a-fair-look-at-the-open-source-options/)

### License Information
- [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [FalkorDB License - SSPLv1](https://docs.falkordb.com/References/license.html)

---

## Metadata

**Research date:** 2026-03-25
**Valid until:** 2025-04-25
**Key decision:** Switched from FalkorDB to ArcadeDB due to Apache 2.0 license

---

*This research document is consumed by `/gsd:plan-phase` to create PLAN.md files.*
