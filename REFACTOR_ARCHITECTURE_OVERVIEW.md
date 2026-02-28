# CodeMap 编排层重构设计方案 - 概要设计

> 版本: 2.3
> 日期: 2026-02-28
> 状态: 待实施

---

## 文档导航

本文档是架构设计的**概要文档**，概述整体架构设计。如需了解特定模块的详细设计，请参考对应的详细设计文档：

| 模块 | 详细设计文档 |
|------|-------------|
| 置信度机制 | [REFACTOR_CONFIDENCE_DESIGN.md](./REFACTOR_CONFIDENCE_DESIGN.md) |
| 多工具结果融合 | [REFACTOR_RESULT_FUSION_DESIGN.md](./REFACTOR_RESULT_FUSION_DESIGN.md) |
| CLI 命令与编排层 | [REFACTOR_ORCHESTRATOR_DESIGN.md](./REFACTOR_ORCHESTRATOR_DESIGN.md) |
| 测试关联器 | [REFACTOR_TEST_LINKER_DESIGN.md](./REFACTOR_TEST_LINKER_DESIGN.md) |
| Git 分析器 | [REFACTOR_GIT_ANALYZER_DESIGN.md](./REFACTOR_GIT_ANALYZER_DESIGN.md) |

---

## 1. 设计前提：职责分离

**核心原则**：Codemap 只负责执行，意图理解交给上游 AI (Claude Code / Codex)

```
用户自然语言
    │
    ▼
Claude Code / Codex CLI
    │ 意图理解 + 转换为 Codemap 指令
    ▼
Codemap (结构化输入 → 执行分析)
    │
    ▼
结果返回
```

**优势**：
- Codemap 意图分类器大幅简化
- 准确性由 Claude Code 保障
- 问题定位更清晰

---

## 2. 目标与约束

### 2.1 核心目标

增强 AI 大模型对项目代码的理解和查询能力，减少 token 消耗和搜索错误。

### 2.2 关键指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| Token 消耗降低 | >= 40% | 统计 analyze 输出 token 数 vs rg/grep 基准 |
| Hit@8 | >= 90% | Top-8 结果中包含用户期望结果的比率 |
| 默认输出规则 | Top-K=8、每条<=160 token | 代码约束 |
| 基准集 | 30 条查询 | 预先定义的典型查询 |
| 搜索范围 | TS/JS + Markdown | 配置约束 |

### 2.3 技术约束

- 入口：单 CLI 编排（优先快速落地）
- 集成方式：fork 子进程调用外部工具

---

## 3. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code / Codex CLI                   │
│              意图理解 → 转换为 Codemap 指令                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    用户 CLI 入口                              │
│            codemap analyze --intent impact ...               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    意图路由 (Intent Router)                  │
│            根据 intent 类型路由到执行计划                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               工具编排器 (Tool Orchestrator)                 │
│         执行工具 → 计算置信度 → 回退级联 → 结果融合            │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│   CodeMap 核心   │ │  ast-grep   │
│  (依赖/复杂度/  │ │ (代码搜索/  │
│   影响评估/概览) │ │  AST分析)   │
└─────────────────┘ └─────────────┘ └─────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    结果归一化 + 输出裁剪                     │
│                  统一格式 + Top-K + Token 限制               │
└─────────────────────────────────────────────────────────────┘
```

### 工具职责划分

| 工具 | 职责 | 调用方式 | 权重 |
|------|------|----------|------|
| **CodeMap 核心** | 代码结构提取、依赖图生成、复杂度分析、影响评估、项目概览 | 本地调用 | 0.9 |
| **ast-grep** | 代码模式匹配、语义搜索、AST 分析、多语言支持 | fork 子进程 | 1.0 |
| **rg** | 快速文本搜索、正则匹配（兜底） | fork 子进程 | 0.7 |

---

## 4. 核心模块概览

### 4.1 置信度机制

基于搜索结果质量（结果数量、质量、场景匹配度）计算置信度，决定是否触发回退。

**详见**: [REFACTOR_CONFIDENCE_DESIGN.md](./REFACTOR_CONFIDENCE_DESIGN.md)

### 4.2 多工具结果融合

统一结果格式，加权合并、去重、排序。

**详见**: [REFACTOR_RESULT_FUSION_DESIGN.md](./REFACTOR_RESULT_FUSION_DESIGN.md)

### 4.3 工具编排器

执行工具、超时控制、错误隔离、回退级联。

**详见**: [REFACTOR_ORCHESTRATOR_DESIGN.md](./REFACTOR_ORCHESTRATOR_DESIGN.md)

### 4.4 测试关联器

在影响分析中自动关联测试文件。

**详见**: [REFACTOR_TEST_LINKER_DESIGN.md](./REFACTOR_TEST_LINKER_DESIGN.md)

### 4.5 Git 分析器

分析文件修改历史，评估修改风险。

**详见**: [REFACTOR_GIT_ANALYZER_DESIGN.md](./REFACTOR_GIT_ANALYZER_DESIGN.md)

---

## 5. CLI 命令结构

```bash
# 核心命令
codemap generate      # 生成代码地图
codemap analyze       # 全面分析（主要入口）

# 细分命令（直接调用底层能力）
codemap impact        # 影响分析
codemap deps          # 依赖查看
codemap cycles        # 循环依赖检测
codemap complexity    # 复杂度分析
codemap query         # 查询
```

### analyze 命令参数

```bash
codemap analyze \
  --intent <intent_type> \
  --keywords <关键词> \
  --targets <文件/模块路径> \
  --scope <direct|transitive> \
  --top-k <数字> \
  --json
```

---

## 6. 文件结构

```
src/
├── cli/
│   ├── commands/
│   │   ├── analyze.ts      # 统一入口
│   │   ├── impact.ts       # 现有命令
│   │   ├── deps.ts         # 现有命令
│   │   └── complexity.ts   # 现有命令
│   └── index.ts
├── orchestrator/           # 编排层
│   ├── index.ts
│   ├── types.ts           # 统一结果格式
│   ├── intent-router.ts   # 意图路由
│   ├── tool-orchestrator.ts # 工具编排 + 回退
│   ├── confidence.ts      # 置信度计算
│   ├── result-fusion.ts    # 结果融合
│   ├── adapters/           # 工具适配器
│   ├── test-linker.ts     # 测试关联
│   └── git-analyzer.ts    # Git 分析
└── ...
```

---

## 7. 实施计划

| 阶段 | 周期 | 内容 | 交付物 |
|------|------|------|--------|
| **Phase 1** | 1 天 | 定义 `UnifiedResult` 接口 + 适配器基类 | 统一格式规范 |
| **Phase 2** | 1 天 | 实现置信度计算 `calculateConfidence` | 置信度机制 |
| **Phase 3** | 1 天 | 实现 `ResultFusion` 融合逻辑 | 多工具融合 |
| **Phase 4** | 1 天 | 实现 `ToolOrchestrator` + 回退链 | 编排器 |
| **Phase 5** | 1 天 | 改造现有命令为可调用模式 | 复用能力 |
| **Phase 6** | 1 天 | 实现 `AnalyzeCommand` + 测试关联 | 统一入口 |
| **Phase 7** | 1 天 | 实现 Git 分析器 | Git 风险评分 |
| **Phase 8** | 1 天 | 测试 + 基准验证 | 30 条查询评测 |

**预计周期**：8 天

---

## 8. 验收标准

- [ ] `codemap analyze` 命令可正常执行
- [ ] 意图路由正确映射到工具
- [ ] 置信度正确计算（高/中/低三级）
- [ ] 回退级联正常工作
- [ ] 多工具结果正确融合（去重+排序）
- [ ] 测试关联基于 Jest/Vitest 配置
- [ ] Git 提交历史风险评分正常
- [ ] 现有命令保持兼容
- [ ] 输出符合 Top-K=8、每条<=160 token
- [ ] Hit@8 >= 90%
- [ ] Token 消耗降低 >= 40%

---

## 附录

### 相关文档

- 评估报告: `CODEMAP_ASSESSMENT_REPORT.md`
- 方案对比: `MULTI_TOOL_REFACTOR_OPTIONS.md`
- 需求与用户场景: `REFACTOR_REQUIREMENTS.md`

### 参考资源

- ast-grep 官方文档: https://ast-grep.github.io/
