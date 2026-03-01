# 任务：Phase 7 - 实现 Git 分析器

## 背景

CodeMap 需要分析文件的 Git 提交历史，评估修改风险（gravity/heat 评分），为 AI 提供代码热度信息。这与 AI 饲料生成器配合，为 AI 大模型提供代码结构化元数据。

**IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**

在执行此任务前，请先查阅以下项目资源：
- 架构设计文档：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- Git 分析器设计：`/data/codemap/REFACTOR_GIT_ANALYZER_DESIGN.md`
- 现有代码结构：`/data/codemap/src/`
- 编排层代码：`/data/codemap/src/orchestrator/`

## 要求

1. **实现 Git 分析器类**（`src/orchestrator/git-analyzer.ts`）
   - 分析文件/目录的 Git 提交历史
   - 计算 30 天内修改频率（freq30d）
   - 分析最后提交类型分布（lastType）
   - 计算最后修改日期（lastDate）

2. **实现风险评分计算**
   - GRAVITY: 文件重要性评分（基于依赖数量、导出符号数）
   - HEAT: 文件热度评分（基于修改频率）
   - 综合风险评级（low/medium/high/critical）

3. **实现 HeatScore 接口**
   ```typescript
   interface HeatScore {
     freq30d: number;      // 30天修改次数
     lastType: string;    // 最后提交标签（feat/fix/refactor/docs/chore）
     lastDate: Date;       // 最后修改日期
   }
   ```

4. **创建 git-analyzer 测试**
   - 测试 Git 历史解析
   - 测试风险评分计算
   - 测试边界条件（无 Git 仓库、空白仓库）

## 初始状态

从零开始创建：
- `src/orchestrator/git-analyzer.ts`
- `src/orchestrator/types.ts`（扩展 HeatScore）

## 约束条件

- **必须使用 TypeScript 严格模式**（strict: true）
- 所有数值字段必须明确类型（number 而非 any）
- 禁止使用 any 类型
- 必须导出所有公共类型
- 代码风格与现有 src/ 目录保持一致
- 使用 simple-git 库（已在项目中）或原生 Git 命令

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| Git 分析器实现 | 检查 git-analyzer.ts | 包含历史分析和评分逻辑 |
| HeatScore 接口 | 检查 types.ts | 三个字段齐全 |
| 风险评级计算 | 检查评分逻辑 | low/medium/high/critical 四级 |
| TypeScript 编译通过 | `npx tsc --noEmit` | 无类型错误 |
| 单元测试通过 | `npm test` | 测试覆盖率 > 80% |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| Git 历史分析 | 无历史数据 | 30天修改频率统计 | positive - 了解代码变化趋势 |
| 风险评级 | 主观判断 | 自动计算 gravity/heat | positive - 量化风险评估 |
| 提交类型统计 | 手动查看 | 自动分析标签分布 | positive - 理解代码变更性质 |

## 反例场景

### 反例实现 1
- **错误模式**: 使用外部 Git CLI 而非库函数
- **后果**: 跨平台兼容性问题，Windows 下可能失败
- **正确做法**: 使用 simple-git 库或 execa 封装

### 反例实现 2
- **错误模式**: 未处理非 Git 仓库情况
- **后果**: 运行时崩溃
- **正确做法**: 检查 .git 目录存在，优雅降级

### 反例实现 3
- **错误模式**: 频繁调用 Git 命令导致性能问题
- **后果**: 分析大型仓库超时
- **正确做法**: 实现缓存机制，批量查询
