# CodeMap 编排层重构设计方案 - 概要设计

> 版本: 2.5
> 日期: 2026-02-28
> 状态: 已完成 (v2.5 工作流编排器已实现)

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
| **CI 门禁护栏** | **[CI_GATEWAY_DESIGN.md](./CI_GATEWAY_DESIGN.md)** (v2.4 新增) |
| **工作流编排器** | **[REFACTOR_ORCHESTRATOR_DESIGN.md](./REFACTOR_ORCHESTRATOR_DESIGN.md)** (v2.5 已实现 ✅) |

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

**约束**：
- **禁止 grep 体系**：所有用户可见输出必须走 CodeMap 语义链路
- rg 仅作为**内部调试工具**（默认关闭），不暴露给上游 AI Agent

#### 本地兜底校验层

即使上游 AI 理解正确，本地仍需三重校验防止故障放大：

| 校验层 | 检查内容 | 失败处理 |
|--------|----------|----------|
| **Intent 白名单** | 请求的 intent 是否在允许列表 | 返回 E0001，提示有效 intent |
| **参数完整性** | 必填参数是否存在、类型正确 | 返回 E0002，提示缺少参数 |
| **低置信度降级** | 输出置信度低于阈值时 | 返回 E0006 + 建议，而非错误 |

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
| Commit 格式 | `[TAG] scope: message` | 强制标签化 (v2.4 新增) |
| 文件头注释 | `[META]`/`[WHY]` 必填 | CI 门禁 (v2.4 新增) |
| AI 饲料 | `.mycodemap/ai-feed.txt` | 自动生成 (v2.4 新增) |

### 2.3 Benchmark 协议

#### 数据集位置
- 基准查询集: `refer/benchmark-quality.ts` (30 条预定义查询)
- 测试项目: `/data/codemap` 自身作为测试目标

#### 执行命令
```bash
# 基准测试（直接运行）
npx ts-node refer/benchmark-quality.ts

# 基准测试（Vitest 集成）
npx vitest run refer/benchmark-quality.test.ts

# Token 消耗测量
node dist/cli/index.js analyze --intent search --keywords <keyword> --json | \
  jq '[.results[].content] | map(. | split(" ") | length) | add'

# 对比基准 (rg)
rg <keyword> --json | jq '[.[] | .lines | split(" ") | length] | add'
```

#### Token 统计方法
- 使用 cl100k_base 估算
- 统计公式: `输出 token = sum(result.content.split(/\s/) | length)`

#### 固定版本
- Node.js: v20.x LTS
- TypeScript: 5.x
- codemap: 当前版本 (通过 `codemap --version` 获取)

### 2.3 技术约束

- 入口：单 CLI 编排（优先快速落地）
- 集成方式：fork 子进程调用外部工具

### 2.4 版本范围

#### v1.0 范围（本期实施）

| 维度 | 支持范围 | 非目标 |
|------|----------|--------|
| **语言** | TypeScript、JavaScript、Markdown | Python、Go、Rust 等 |
| **文件类型** | `.ts`、`.tsx`、`.js`、`.jsx`、`.md` | 二进制、配置(yaml/json) |
| **Intent** | impact, dependency, search, documentation, complexity, overview, refactor, reference | - |
| **工具链** | CodeMap 核心 + ast-grep | qmd 其他外部工具 |

#### v2.0 扩展开关（规划中）

```typescript
// 配置开关 - v2.0 启用
interface ExpansionConfig {
  enableMultiLanguage: boolean;    // 多语言支持
  enableBinaryAnalysis: boolean;   // 二进制分析
  enableMoreTools: string[];      // 扩展工具列表
}
```

> ⚠️ **注意**：ast-grep 本身支持多语言，但 v1.0 聚焦 TS/JS 场景，其他语言作为可选扩展。

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
│   CodeMap 核心   │ │  ast-grep   │ │   内部工具      │
│  (依赖/复杂度/  │ │ (代码搜索/  │ │ (rg 仅调试用)   │
│   影响评估/概览) │ │  AST分析)   │ │   默认关闭      │
└─────────────────┘ └─────────────┘ └─────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    结果归一化 + 输出裁剪                     │
│                  统一格式 + Top-K + Token 限制               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI 饲料生成器 (v2.4 新增)                    │
│         扫描文件头 → 分析 Git 历史 → 生成 ai-feed.txt        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  CI 门禁护栏 (v2.4 新增)                     │
│       本地 Hook (pre-commit) + 服务端 CI (GitHub Actions)    │
│          Commit 格式验证 → 文件头检查 → 风险评估              │
└─────────────────────────────────────────────────────────────┘
```

### 工具职责划分

| 工具 | 职责 | 调用方式 | 权重 | 可见性 |
|------|------|----------|------|--------|
| **CodeMap 核心** | 代码结构提取、依赖图生成、复杂度分析、影响评估、项目概览 | 本地调用 | 0.9 | 用户可见 |
| **ast-grep** | 代码模式匹配、语义搜索、AST 分析（v1 聚焦 TS/JS） | fork 子进程 | 1.0 | 用户可见 |
| **rg-internal** | 内部兜底文本搜索（默认关闭） | fork 子进程 | 0.7 | **仅内部** |
| **AI 饲料** | 结构化代码元数据、风险评估数据 | 本地调用 | 0.85 | 用户可见 (v2.4 新增) |

### 输出协议版本化

#### 统一输出格式

```typescript
interface CodemapOutput {
  schemaVersion: string;      // 格式: "v1.0.0"
  intent: string;             // 执行的 intent 类型
  tool: string;              // 主要工具
  confidence: {
    score: number;           // 0-1
    level: 'high' | 'medium' | 'low';
  };
  results: UnifiedResult[]; // 结果列表
  metadata?: {
    executionTime: number;   // 毫秒
    resultCount: number;
  };
}
```

#### 稳定字段列表（向后兼容）

| 字段 | 兼容性 | 说明 |
|------|--------|------|
| `schemaVersion` | **必须** | 版本标识 |
| `intent` | **必须** | intent 类型 |
| `confidence.score` | **必须** | 置信度分数 |
| `confidence.level` | **必须** | 置信度级别 |
| `results[].id` | **必须** | 唯一标识 |
| `results[].file` | **必须** | 文件路径 |
| `results[].content` | **必须** | 内容（可能被截断） |

#### 向后兼容策略

1. **新增字段**：可选字段，旧版本忽略
2. **废弃字段**：先标记弃用 (deprecated)，下个主版本移除
3. **破坏性变更**：仅在主版本号升级时（如 v1 → v2）

#### Golden Files 测试

```bash
# 测试用例位置
tests/golden/
  ├── v1.0.0-impact.json     # 影响分析输出
  ├── v1.0.0-search.json     # 搜索输出
  ├── v1.0.0-dependency.json # 依赖输出
  └── ...
```

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

### 4.6 AI 饲料生成器 (v2.4 新增)

生成结构化 AI 消费数据，包含文件元数据、依赖复杂度、修改热度等维度。

**功能**:
- 扫描文件头注释 `[META]`/`[WHY]`/`[DEPS]`
- 分析 Git 历史（30天修改频率、标签分布）
- 计算 GRAVITY/HEAT/IMPACT 三维评分
- 输出 `.mycodemap/ai-feed.txt`

> 风险评分公式统一以 `../product-specs/REFACTOR_REQUIREMENTS.md` 第 8.6 节为单一真源。

**详见**: [REFACTOR_GIT_ANALYZER_DESIGN.md](./REFACTOR_GIT_ANALYZER_DESIGN.md) 第4节

### 4.7 CI 门禁护栏 (v2.4 新增)

双层次 CI 门禁：本地 pre-commit hook + 服务端 GitHub Actions。

**功能**:
- Commit 格式验证 `[TAG]`
- 文件头注释强制检查
- 危险置信度评估
- AI 饲料同步验证

**详见**: [CI_GATEWAY_DESIGN.md](./CI_GATEWAY_DESIGN.md)

### 4.8 工作流编排器 (v2.5 规划)

串联所有模块的"粘合剂"，提供开发流程的阶段管理、上下文传递和检查点机制。

**功能**:
- 阶段状态机管理（pending → running → completed → verified）
- 阶段间上下文持久化（WorkflowContext）
- 阶段交付物检查点（PhaseCheckpoint）
- 交互式工作流引导（WorkflowCLI）

**详见**: [工作流编排器设计](./REFACTOR_ORCHESTRATOR_DESIGN.md#8-工作流编排器设计-v25-规划)

---

## 5. CLI 命令结构

```bash
# 核心命令
codemap generate      # 生成代码地图（含 AI 饲料）
codemap analyze       # 全面分析（主要入口）

# 细分命令（直接调用底层能力）
codemap impact        # 影响分析
codemap deps          # 依赖查看
codemap cycles        # 循环依赖检测
codemap complexity    # 复杂度分析
codemap query         # 查询

# CI 门禁命令 (v2.4 新增)
codemap ci check-commits          # 验证 Commit 格式
codemap ci check-headers         # 验证文件头注释
codemap ci assess-risk           # 评估危险置信度
codemap ci check-output-contract # 验证输出契约（schemaVersion、Top-K、token限制）

# 工作流命令 (v2.5 规划)
codemap workflow start            # 启动交互式工作流
codemap workflow status          # 查看当前工作流状态
codemap workflow visualize       # 可视化当前工作流
codemap workflow proceed         # 推进到下一阶段
codemap workflow resume          # 恢复中断的工作流
codemap workflow checkpoint      # 手动创建检查点
codemap workflow template ...    # 模板管理与应用
```

### analyze 命令参数

#### 参数契约（JSON Schema）

```typescript
// CLI 参数契约
const AnalyzeArgsSchema = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: ['impact', 'dependency', 'search', 'documentation', 'complexity', 'overview', 'refactor', 'reference'],
      default: 'search',
      description: '意图类型'
    },
    keywords: {
      type: 'array',
      items: { type: 'string', maxLength: 100 },
      maxItems: 10,
      description: '搜索关键词'
    },
    targets: {
      type: 'array',
      items: { type: 'string' },
      description: '目标文件/模块路径'
    },
    scope: {
      type: 'string',
      enum: ['direct', 'transitive'],
      default: 'direct',
      description: '搜索范围'
    },
    topK: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 8,
      description: '返回结果数量'
    },
    includeTests: {
      type: 'boolean',
      default: false,
      description: '是否包含测试文件'
    },
    includeGitHistory: {
      type: 'boolean',
      default: false,
      description: '是否包含 Git 历史'
    },
    json: {
      type: 'boolean',
      default: false,
      description: 'JSON 格式输出'
    },
    outputMode: {
      type: 'string',
      enum: ['machine', 'human'],
      default: 'human',
      description: '输出模式。machine 模式禁止额外日志，保证纯 JSON'
    }
  },
  required: []
} as const;
```

> 当 `json=true` 时，必须自动切换或强制要求 `outputMode='machine'`，以确保输出可被 `JSON.parse` 直接消费。

#### 错误码表

| 错误码 | 含义 | 用户提示 | 可观测字段 |
|--------|------|----------|------------|
| E0001 | 无效 intent 值 | `无效的 intent: ${value}，允许值: ${enum}` | `intent`, `validIntents` |
| E0002 | 缺少必要参数 | `缺少必要参数: ${param}` | `missingParams` |
| E0003 | 目标路径不存在 | `目标路径不存在: ${path}` | `path` |
| E0004 | 工具执行超时 | `${tool} 执行超时 (${timeout}ms)` | `tool`, `timeout` |
| E0005 | 工具执行失败 | `${tool} 执行失败: ${error}` | `tool`, `error` |
| E0006 | 置信度过低 | `结果置信度过低 (${score})，建议调整关键词` | `confidence`, `suggestion` |
| **E0007** | **Commit 格式错误** | **提交信息必须以 [TAG] 开头** | **message** (v2.4 新增) |
| **E0008** | **文件头缺失** | **文件缺少 [META] 或 [WHY] 注释** | **file** (v2.4 新增) |
| **E0009** | **高风险文件** | **修改高风险文件需说明缓解措施** | **file, riskLevel** (v2.4 新增) |

#### CLI 示例

```bash
# 影响分析
codemap analyze --intent impact --targets src/cache/ --scope transitive --include-tests

# 代码搜索
codemap analyze --intent search --keywords parser --top-k 8 --json

# 依赖分析
codemap analyze --intent dependency --targets src/core/

# 文档搜索
codemap analyze --intent documentation --keywords "系统架构"
```

---

## 6. 文件结构

```
src/
├── cli/
│   ├── commands/
│   │   ├── analyze.ts           # 统一入口
│   │   ├── ci.ts                # CI 门禁 (v2.4 新增)
│   │   ├── impact.ts            # 现有命令
│   │   ├── deps.ts              # 现有命令
│   │   └── complexity.ts        # 现有命令
│   └── index.ts
├── orchestrator/                # 编排层
│   ├── index.ts
│   ├── types.ts                 # 统一结果格式
│   ├── intent-router.ts         # 意图路由
│   ├── tool-orchestrator.ts     # 工具编排 + 回退
│   ├── confidence.ts            # 置信度计算
│   ├── result-fusion.ts         # 结果融合
│   ├── adapters/                # 工具适配器
│   ├── test-linker.ts           # 测试关联
│   ├── git-analyzer.ts          # Git 分析
│   ├── ai-feed-generator.ts     # AI 饲料生成 (v2.4 新增)
│   ├── file-header-scanner.ts   # 文件头扫描 (v2.4 新增)
│   └── commit-validator.ts      # Commit 验证 (v2.4 新增)
└── ...

# CI 配置文件 (v2.4 新增)
.github/
└── workflows/
    └── ci-gateway.yml           # GitHub Actions 门禁
.git/hooks/                      # 本地 Hook (v2.4 新增)
├── commit-msg                   # Commit 格式验证
└── pre-commit                   # 测试 + 文件头检查

---

## 7. 实施计划

| 阶段 | 周期 | 内容 | 交付物 | DoD (Definition of Done) | 阻塞条件 | 回滚点 |
|------|------|------|--------|--------------------------|----------|--------|
| **Phase 1** | 1 天 | 定义 `UnifiedResult` 接口 + 适配器基类 | 统一格式规范 | TypeScript 接口定义完成，单元测试覆盖 | - | 本阶段回滚：删除新增文件 |
| **Phase 2** | 1 天 | 实现置信度计算 `calculateConfidence` | 置信度机制 | 置信度计算函数实现，三级阈值可配置 | Phase 1 完成 | 本阶段回滚：保留接口定义 |
| **Phase 3** | 1 天 | 实现 `ResultFusion` 融合逻辑 | 多工具融合 | 加权合并、去重、排序逻辑测试通过 | Phase 2 完成 | 本阶段回滚：保留置信度模块 |
| **Phase 4** | 1 天 | 实现 `ToolOrchestrator` + 回退链 | 编排器 | 超时控制、错误隔离、回退触发测试通过 | Phase 3 完成 | 本阶段回滚：保留融合逻辑 |
| **Phase 5** | 1 天 | 改造现有命令为可调用模式 | 复用能力 | 现有命令模块化，可被编排器调用 | Phase 4 完成 | 本阶段回滚：保留编排器 |
| **Phase 6** | 1 天 | 实现 `AnalyzeCommand` + 测试关联 | 统一入口 | CLI 入口测试通过，测试关联功能正常 | Phase 5 完成 | 本阶段回滚：保留模块化命令 |
| **Phase 7** | 1 天 | 实现 Git 分析器 | Git 风险评分 | Git 历史分析、风险评分功能正常 | Phase 6 完成 | 本阶段回滚：保留入口命令 |
| **Phase 8** | 1 天 | 实现 AI 饲料生成器 | `.mycodemap/ai-feed.txt` | 生成结构化 AI 消费数据 | Phase 7 完成 | 本阶段回滚：保留 Git 分析 |
| **Phase 9** | 1 天 | 实现 CI 门禁护栏 | CI Gateway | Commit 格式、文件头检查、风险评级 | Phase 8 完成 | 本阶段回滚：保留 AI 饲料 |
| **Phase 10** | 1 天 | 测试 + 基准验证 | 30 条查询评测 | Hit@8 >= 90%, Token 降低 >= 40% | Phase 9 完成 | 本阶段回滚：保留完整功能 |

**预计周期**：10 天 (v2.4 新增 CI 门禁阶段)

### 门禁规则

- **进入条件**：上一阶段 DoD 验收通过
- **退出条件**：本阶段交付物 + 最小验收测试通过
- **阻塞处理**：若阶段阻塞超过 2 天，启动回滚

---

## 8. 验收标准

- [ ] `codemap analyze` 命令可正常执行
- [ ] 意图路由正确映射到工具
- [ ] 置信度正确计算（高/中/低三级）
- [ ] 回退级联正常工作
- [ ] 多工具结果正确融合（去重+排序）
- [ ] 测试关联基于 Jest/Vitest 配置
- [ ] Git 提交历史风险评分正常
- [ ] **AI 饲料生成正常 (v2.4 新增)**
- [ ] **CI 门禁本地 Hook 正常工作 (v2.4 新增)**
- [ ] **CI 门禁服务端检查通过 (v2.4 新增)**
- [ ] **Commit 格式 `[TAG]` 验证通过 (v2.4 新增)**
- [ ] **文件头注释 `[META]`/`[WHY]` 完整 (v2.4 新增)**
- [ ] 现有命令保持兼容
- [ ] 输出符合 Top-K=8、每条<=160 token
- [ ] Hit@8 >= 90%
- [ ] Token 消耗降低 >= 40%

---

## 附录

### 相关文档

- 评估报告: `CODEMAP_ASSESSMENT_REPORT.md`
- 方案对比: `MULTI_TOOL_REFACTOR_OPTIONS.md`
- 需求与用户场景: `../product-specs/REFACTOR_REQUIREMENTS.md`
- **CI 门禁设计: `CI_GATEWAY_DESIGN.md` (v2.4 新增)**

### 参考资源

- ast-grep 官方文档: https://ast-grep.github.io/
