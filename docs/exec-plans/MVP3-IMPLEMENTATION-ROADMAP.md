# MVP3 架构重构实施路线图

> **文档类型**: 执行计划  
> **版本**: v1.1.0  
> **状态**: In Progress  
> **更新日期**: 2026-03-17  
> **时间线**: 10 周 (2026-03-17 ~ 2026-05-26)

---

## 1. 总体时间线

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MVP3 实施甘特图                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Week:   1    2    3    4    5    6    7    8    9    10                    │
│          │    │    │    │    │    │    │    │    │    │                    │
│  Phase 1: 架构重构 + Server 层                                              │
│  ├─ 接口层设计        [████]                                               │
│  ├─ 存储抽象层        [████]                                               │
│  ├─ Server 层         [████████]                                           │
│  └─ CLI 适配          [    ████]                                           │
│                                                                             │
│  Phase 2: 多语言支持                                                        │
│  ├─ Tree-sitter 集成       [████]                                          │
│  ├─ Python 支持            [    ████████]                                  │
│  ├─ Java/Rust/C++          [        ████████████]                          │
│  └─ 语言注册表             [    ████████]                                  │
│                                                                             │
│  Phase 3: 图数据库                                                          │
│  ├─ KùzuDB 集成                    [████████]                              │
│  ├─ 存储工厂自动选择               [    ████]                              │
│  └─ 性能优化                       [        ████]                          │
│                                                                             │
│  Phase 4: CLI 可视化                                                        │
│  ├─ 树形可视化                          [████████]                         │
│  ├─ ASCII 依赖图                        [    ████]                         │
│  ├─ 热力图                              [        ████]                     │
│  └─ 进度条/Spinner     [████████████████] (贯穿全程)                        │
│                                                                             │
│  Phase 5: 集成测试                                                          │
│  ├─ 单元测试           [████████████████████████]                          │
│  ├─ 集成测试                                    [████████████]             │
│  └─ 回归测试                                         [    ████████]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 1: 架构重构 + Server 层 (Week 1-4)

### Week 1: 接口层 + 存储抽象基础

**目标**: 建立分层基础，定义核心接口

```
Day 1-2: Interface Layer
├── src/interface/types/index.ts (从 src/types 迁移)
├── src/interface/types/storage.ts (新增)
├── src/interface/types/parser.ts (新增)
└── src/interface/config/index.ts (新增)

Day 3-4: Storage Abstraction - Interface
├── src/infrastructure/storage/interfaces/IStorage.ts
└── src/infrastructure/storage/StorageFactory.ts (基础)

Day 5: FileSystem Storage 迁移
└── src/infrastructure/storage/implementations/FileSystemStorage.ts
    (从现有代码提取，实现 IStorage)
```

**验收标准**:
- [x] 所有类型定义迁移到 `interface/` 目录
- [x] `FileSystemStorage` 实现 `IStorage` 接口
- [x] 单元测试通过
- [x] ESLint Guardrail 配置完成

**状态**: ✅ 已完成 (2026-03-17)

### Week 2: Domain Layer + Server Layer 基础

**目标**: 核心业务逻辑迁移到 Domain，建立 Server 用例框架

```
Day 1-2: Domain Layer - Entities
├── src/domain/entities/Project.ts
├── src/domain/entities/Module.ts
├── src/domain/entities/Symbol.ts
└── src/domain/entities/Dependency.ts

Day 3: Domain Layer - Services
└── src/domain/services/AnalysisService.ts
    (从 src/core/analyzer.ts 重构)

Day 4-5: Server Layer - Use Cases
├── src/server/dto/GenerateRequest.ts
├── src/server/dto/GenerateResponse.ts
├── src/server/usecases/IGenerateCodeMap.ts
└── src/server/usecases/GenerateCodeMap.ts
```

**验收标准**:
- [x] Domain Layer 实体完整 (Project, Module, Symbol, Dependency)
- [x] CodeGraphBuilder 服务实现
- [x] DomainEvent 系统建立
- [x] CodeGraphRepository 接口定义

**状态**: ✅ 已完成 (2026-03-17)

### Week 3: Server Layer 完善 + Parser Abstraction

**目标**: 完成核心用例，建立解析器抽象

```
Day 1-2: Server Layer - 更多用例
├── src/server/usecases/IQuerySymbol.ts
├── src/server/usecases/QuerySymbol.ts
├── src/server/usecases/IAnalyzeImpact.ts
└── src/server/usecases/AnalyzeImpact.ts

Day 3: Server Layer - Services
└── src/server/services/CodeMapService.ts

Day 4-5: Parser Abstraction
├── src/infrastructure/parser/interfaces/ILanguageParser.ts
└── src/infrastructure/parser/ParserRegistry.ts
```

**验收标准**:
- [x] Server Layer HTTP API 完整
- [x] QueryHandler 和 AnalysisHandler 实现
- [x] RESTful 端点: /api/v1/*
- [x] 支持 JSON/GraphML/DOT 导出

**状态**: ✅ 已完成 (2026-03-17)

### Week 4: CLI 适配 + 回归测试

**目标**: 适配新架构，确保向后兼容

```
Day 1-2: CLI 适配
├── src/cli/commands/generate.ts (适配 Server 层)
├── src/cli/commands/query.ts (适配 Server 层)
└── src/cli/commands/impact.ts (适配 Server 层)

Day 3: 向后兼容层
└── src/index.ts (导出兼容 API)

Day 4-5: 回归测试 + Bugfix
└── 确保所有现有测试通过
```

**验收标准**:
- [x] 新 CLI 架构在 `src/cli-new/` 建立
- [x] server/export/query 命令实现
- [x] 所有架构层整合完成
- [x] 705 个测试全部通过

**状态**: ✅ Phase 1 核心架构完成 (2026-03-17)

**待办**:
- [ ] Parser 抽象层 (计划 7)
- [ ] 仓库实现 (计划 8)
- [ ] 新架构测试覆盖 (计划 9)
- [ ] 旧 CLI 迁移 (计划 10)

---

## 3. Phase 2: 多语言支持 (Week 3-6)

> **注意**: 与 Phase 1 部分重叠，可在 Week 3 开始 Parser 工作

### Week 3-4: Tree-sitter 集成 + Python 支持

```
Day 1-2: Tree-sitter 基础
├── npm install tree-sitter tree-sitter-python
├── src/infrastructure/parser/TreeSitterParser.ts (基类)
└── Tree-sitter 初始化逻辑

Day 3-5: Python Parser
└── src/infrastructure/parser/implementations/python/PythonParser.ts
    ├── extractImports (解析 import/from)
    ├── extractExports (解析 class/def)
    ├── extractSymbols (解析函数、类、方法)
    └── buildCallGraph (解析函数调用)

Week 4: Python 测试 + 优化
├── tests/python/fixtures/ (测试固件)
├── tests/python/PythonParser.test.ts
└── Python 项目集成测试
```

**验收标准**:
- [ ] 可正确解析 Django/Flask 项目
- [ ] Python 符号提取准确率 > 95%
- [ ] 性能: 1000 文件 < 30s

### Week 5: Java + Rust 支持

```
Day 1-2: Java Parser
└── src/infrastructure/parser/implementations/java/JavaParser.ts
    ├── 解析 package/import
    ├── 解析 class/interface/enum
    └── 解析 method/field

Day 3-4: Rust Parser
└── src/infrastructure/parser/implementations/rust/RustParser.ts
    ├── 解析 mod/use
    ├── 解析 fn/struct/impl/trait
    └── 解析 cargo.toml 依赖

Day 5: 集成测试
└── Java/Maven 项目测试
└── Rust/Cargo 项目测试
```

### Week 6: C/C++ 支持 + 语言注册表

```
Day 1-3: C/C++ Parser
└── src/infrastructure/parser/implementations/cpp/CppParser.ts
    ├── 解析 #include
    ├── 解析 function/class/struct
    └── 解析 macro/typedef

Day 4-5: Parser Registry 完善
├── src/infrastructure/parser/ParserRegistry.ts
├── 自动根据扩展名选择解析器
└── 语言特性检测
```

**Phase 2 验收标准**:
- [x] 支持 4 种语言 (TS, JS, Go, Python) - Parser 抽象层完成
- [x] 新架构单元测试 37 个 (总计 742 个测试)
- [ ] Java, Rust, C/C++ 支持 (V1.1)
- [ ] 混合语言项目支持

---

## 4. Phase 3: 图数据库支持 (Week 5-8)

### Week 5-6: KùzuDB 集成

```
Day 1-2: KùzuDB 基础
├── npm install kuzu
├── src/infrastructure/storage/implementations/KuzuDBStorage.ts (框架)
└── 数据库初始化逻辑

Day 3-4: Schema 设计
├── Node Table: Module, Symbol, File
├── Rel Table: IMPORTS, CALLS, INHERITS, CONTAINS
└── 索引设计

Day 5: CRUD 操作
├── saveCodeGraph (批量导入)
├── loadCodeGraph (导出)
└── 增量更新

Week 6: 查询实现
├── findSymbolByName (索引查询)
├── findCallers (图遍历)
├── calculateImpact (多跳查询)
└── detectCycles (环检测)
```

### Week 7: 存储工厂 + 自动选择

```
Day 1-2: 存储工厂完善
├── src/infrastructure/storage/StorageFactory.ts
├── 自动选择逻辑
└── 配置验证

Day 3-4: 自动选择策略
├── 文件数阈值: 500
├── 符号数阈值: 10000
└── 用户可覆盖

Day 5: 性能基准测试
├── 文件系统 vs KùzuDB 对比
├── 查询性能测试
└── 内存占用测试
```

### Week 8: 性能优化

```
Day 1-2: 批量导入优化
├── 分批导入 (每批 1000 节点)
├── 并行导入
└── 进度回调

Day 3-4: 查询优化
├── 查询缓存
├── 连接池
└── 索引优化

Day 5: 故障恢复
├── 导入失败回滚
├── 自动重试
└── 降级到文件系统
```

**Phase 3 验收标准**:
- [ ] KùzuDB 查询性能比文件系统快 10x
- [ ] 自动选择策略准确率 > 90%
- [ ] 支持 10,000+ 文件项目

---

## 5. Phase 4: CLI 可视化 (Week 7-9)

### Week 7-8: 基础可视化

```
Day 1-2: 树形可视化
├── npm install chalk
├── src/cli/visualizers/TreeVisualizer.ts
└── mycodemap viz tree 命令

Day 3-4: ASCII 依赖图
├── src/cli/visualizers/GraphVisualizer.ts
├── 层级布局算法
└── mycodemap viz deps 命令

Day 5: 进度条
├── npm install cli-progress
├── src/cli/progress/ProgressBar.ts
└── integrate to generate command

Week 8: 热力图 + Spinner
├── src/cli/visualizers/HeatmapVisualizer.ts
├── src/cli/progress/Spinner.ts
└── mycodemap viz heatmap 命令
```

### Week 9: TUI (可选)

```
Day 1-3: 基础 TUI
├── npm install ink react
├── src/cli/tui/App.tsx
├── src/cli/tui/components/
└── mycodemap tui 命令

Day 4-5: 交互功能
├── 文件浏览器
├── 符号搜索
└── 依赖图浏览
```

**Phase 4 验收标准**:
- [ ] 所有 `viz` 命令正常工作
- [ ] 进度条显示准确
- [ ] TUI 流畅运行 (可选)

---

## 6. Phase 5: 集成测试 + 发布 (Week 9-10)

### Week 9: 全面测试

```
Day 1-2: 单元测试
├── Domain Layer: > 80% 覆盖率
├── Server Layer: > 70% 覆盖率
└── Infrastructure: > 60% 覆盖率

Day 3-4: 集成测试
├── 端到端测试: 10 个场景
├── 性能测试: 基准对比
└── 兼容性测试: 向后兼容

Day 5: Bugfix + 优化
└── 修复测试中发现的问题
```

### Week 10: 发布准备

```
Day 1-2: 文档完善
├── README.md 更新
├── API 文档生成
└── 迁移指南编写

Day 3-4: 发布流程
├── 版本号更新 (v3.0.0)
├── CHANGELOG.md
├── npm publish (beta)
└── GitHub Release

Day 5: 社区反馈
├── 收集早期用户反馈
├── 紧急修复
└── 准备 stable 发布
```

---

## 7. 风险应对

| 风险 | 概率 | 应对方案 |
|------|------|----------|
| Tree-sitter 性能不佳 | 中 | 准备 WebAssembly 预编译方案 |
| KùzuDB 稳定性问题 | 低 | 保留文件系统作为 fallback |
| 开发进度延期 | 中 | Phase 2 语言可分阶段发布 |
| 向后兼容破坏 | 低 | 完整回归测试，灰度发布 |

---

## 8. 关键里程碑

```
┌─────────────────────────────────────────────────────────────────┐
│                        里程碑检查点                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Week 2 结束: Alpha 就绪  ✅ COMPLETED                           │
│  ✅ Interface Layer 完成                                          │
│  ✅ Storage Abstraction 基础完成                                   │
│  ✅ Server Layer 框架可用                                          │
│  ✅ CLI 向后兼容                                                   │
│                                                                 │
│  Week 4 结束: Beta 就绪  🔄 IN PROGRESS                          │
│  ✅ 架构重构完成 (6 层全部落地)                                     │
│  ⏳ Python 语言支持 (计划中)                                        │
│  ✅ 所有现有测试通过 (705 tests)                                    │
│                                                                 │
│  Week 6 结束: RC 就绪                                            │
│  ✅ 7 种语言支持                                                   │
│  ✅ KùzuDB 集成完成                                                │
│  ✅ CLI 可视化基础                                                 │
│                                                                 │
│  Week 10 结束: Stable 发布                                       │
│  ✅ 所有功能完成                                                   │
│  ✅ 测试覆盖率 > 80%                                              │
│  ✅ 文档完善                                                       │
│  ✅ 社区验证                                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 团队分工建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 架构师 | 1 | 架构设计、代码审查、技术决策 |
| 后端开发 | 2 | Server Layer、Storage Layer、Domain Layer |
| 语言专家 | 2 | Tree-sitter 集成、多语言解析器 |
| CLI 开发 | 1 | CLI 命令、可视化、TUI |
| 测试工程师 | 1 | 测试策略、自动化测试、性能测试 |

---

## 已完成计划汇总

| 计划 | 名称 | 提交 | 状态 |
|------|------|------|------|
| 计划 1 | Lint Guardrail (ESLint 9.x) | `45eb558` | ✅ 已合并 |
| 计划 2 | Interface Layer | `7ab39ff` | ✅ 已合并 |
| 计划 3 | Infrastructure Storage Layer | `27e2688` | ✅ 已合并 |
| 计划 4 | Domain Layer | `08438ca` | ✅ 已合并 |
| 计划 5 | Server Layer (HTTP API) | `a3ee2e7` | ✅ 已合并 |
| 计划 6 | CLI Layer (cli-new) | `fa9db9c` | ✅ 已合并 |
| 计划 7 | Parser Abstraction Layer | `3928fe3` | ✅ 已合并 |
| 计划 8 | Repository Implementation | `2ce6771` | ✅ 已合并 |
| 计划 9 | New Architecture Test Coverage | `015d7f8` | ✅ 已推送 |

### 进行中计划

| 计划 | 名称 | 状态 |
|------|------|------|
| 计划 10 | CLI Migration | 🔄 可选/待开始 |

---

## 10. 附录

### 10.1 分支策略

```
main (stable)
  └── develop (v3.0)
        ├── feature/mvp3-architecture
        ├── feature/mvp3-storage-abstraction
        ├── feature/mvp3-python-parser
        ├── feature/mvp3-kuzudb
        ├── feature/mvp3-cli-viz
        └── ...
```

### 10.2 每日站会模板

```
昨日完成:
- xxx

今日计划:
- xxx

阻塞/风险:
- xxx
```

### 10.3 代码审查 Checklist

- [ ] 是否符合分层架构原则
- [ ] 接口是否定义清晰
- [ ] 是否有对应的单元测试
- [ ] 是否影响向后兼容性
- [ ] 性能是否有退化
