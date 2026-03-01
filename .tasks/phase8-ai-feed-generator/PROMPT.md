# 任务：Phase 8 - 实现 AI 饲料生成器

## 背景

CodeMap 需要生成结构化的 AI 消费数据（ai-feed.txt），为 AI 大模型提供代码元数据、依赖复杂度、修改热度等信息。这使 AI Agent 能够更智能地理解和处理代码。

**IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**

在执行此任务前，请先查阅以下项目资源：
- 架构设计文档：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- Git 分析器设计：`/data/codemap/REFACTOR_GIT_ANALYZER_DESIGN.md`（第4节 AI 饲料格式）
- 编排层代码：`/data/codemap/src/orchestrator/`
- 输出格式规范：`/data/codemap/REFACTOR_REQUIREMENTS.md` 第 8.6 节

## 要求

1. **实现 AI 饲料生成器**（`src/orchestrator/ai-feed-generator.ts`）
   - 扫描文件头注释 `[META]`/`[WHY]`/`[DEPS]`
   - 分析 Git 历史（30天修改频率、标签分布）
   - 计算 GRAVITY/HEAT/IMPACT 三维评分
   - 输出 `.codemap/ai-feed.txt`

2. **定义输出格式**
   ```
   # AI Feed - CodeMap
   # Generated: {timestamp}

   ## File: {path}
   - type: {file/symbol/code/documentation}
   - meta: {file header meta content}
   - why: {file header why content}
   - deps: {file header deps content}
   - gravity: {0-100}
   - heat: {0-100}
   - impact: {0-100}
   - risk: {low/medium/high/critical}
   - lastModified: {date}
   - commitCount: {number}
   - dependencies: {count}
   ```

3. **集成 Git 分析器**
   - 调用 git-analyzer 获取修改历史
   - 集成风险评级计算

4. **创建测试**
   - 测试文件头解析
   - 测试评分计算
   - 测试输出格式

## 初始状态

从零开始创建：
- `src/orchestrator/ai-feed-generator.ts`

## 约束条件

- **必须使用 TypeScript 严格模式**（strict: true）
- 所有数值字段必须明确类型（number 而非 any）
- 禁止使用 any 类型
- 必须导出所有公共类型
- 代码风格与现有 src/ 目录保持一致
- 输出文件路径为 `.codemap/ai-feed.txt`
- 风险评分公式必须符合 REFACTOR_REQUIREMENTS.md 第 8.6 节

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| AI 饲料生成器实现 | 检查 ai-feed-generator.ts | 包含文件扫描和评分逻辑 |
| 文件头解析 | 检查 [META]/[WHY]/[DEPS] 解析 | 支持三种注释标签 |
| 三维评分 | 检查 gravity/heat/impact 计算 | 符合 REQUIREMENTS 定义 |
| 输出格式 | 检查 .codemap/ai-feed.txt | 符合规范格式 |
| TypeScript 编译通过 | `npx tsc --noEmit` | 无类型错误 |
| 单元测试通过 | `npm test` | 测试覆盖率 > 80% |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| AI 饲料生成 | 无结构化数据 | 自动生成 ai-feed.txt | positive - 为 AI 提供上下文 |
| 文件元数据 | 手动阅读 | 自动提取 [META]/[WHY] | positive - 理解代码意图 |
| 风险量化 | 主观判断 | gravity/heat/impact 评分 | positive - 量化评估代码 |

## 反例场景

### 反例实现 1
- **错误模式**: 硬编码风险评分公式
- **后果**: 与需求文档定义不一致
- **正确做法**: 引用 REFACTOR_REQUIREMENTS.md 第 8.6 节公式

### 反例实现 2
- **错误模式**: 输出格式不标准
- **后果**: AI 无法解析
- **正确做法**: 使用结构化格式（YAML/JSON-like）

### 反例实现 3
- **错误模式**: 每次运行都重新扫描整个仓库
- **后果**: 性能差，大仓库耗时过长
- **正确做法**: 实现增量更新或缓存机制
