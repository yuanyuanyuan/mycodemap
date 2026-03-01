# 任务：Phase 10 - 集成测试 + 基准验证

## 背景

CodeMap 编排层重构项目进入收尾阶段，需要对前 9 个阶段的功能进行集成测试，并使用 30 条预定义查询进行基准验证，确保 Hit@8 >= 90%，Token 消耗降低 >= 40%。

**IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**

在执行此任务前，请先查阅以下项目资源：
- 架构设计文档：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- 基准协议定义：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md` 第 2.3 节
- 基准查询集：`/data/codemap/refer/benchmark.ts`
- 所有前期阶段代码：`/data/codemap/src/orchestrator/`

## 要求

1. **创建集成测试套件**
   - 测试完整分析流程：analyze → orchestrate → fuse → output
   - 测试多工具回退：CodeMap → ast-grep → rg-internal
   - 测试置信度计算和降级逻辑
   - 测试错误处理和边界条件

2. **实现基准验证脚本**
   - 执行 30 条预定义查询
   - 计算 Hit@8 指标
   - 统计 Token 消耗
   - 对比 rg 基准

3. **验证关键指标**
   - Hit@8 >= 90%（Top-8 结果包含用户期望结果）
   - Token 消耗降低 >= 40%
   - 执行时间合理（< 5 秒/查询）

4. **修复集成测试中发现的问题**
   - 工具回退链问题
   - 结果融合排序问题
   - 输出格式问题

5. **更新 Golden Files**
   - 创建 tests/golden/ 目录
   - 存储标准输出格式

## 初始状态

基于前 9 个阶段创建的代码进行测试：
- 测试 `src/cli/commands/analyze.ts`
- 测试 `src/orchestrator/` 所有模块

## 约束条件

- **必须使用 TypeScript 严格模式**（strict: true）
- 所有数值字段必须明确类型（number 而非 any）
- 禁止使用 any 类型
- 测试框架使用 Vitest（项目现有）
- 基准验证必须使用项目定义的 30 条查询

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| 集成测试覆盖 | 检查测试文件 | 覆盖主要流程 |
| Hit@8 >= 90% | 执行 benchmark.ts | 30 条查询测试 |
| Token 降低 >= 40% | 对比 rg 基准 | 统计输出 token |
| 执行时间 < 5s | 计时测试 | 每条查询 |
| 所有单元测试通过 | `npm test` | 无 regression |
| Golden Files 更新 | 检查 tests/golden/ | 标准输出格式 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 集成验证 | 无系统验证 | 自动基准测试 | positive - 质量保证 |
| 性能优化 | 模糊优化 | 量化指标验证 | positive - 承诺可兑现 |
| 回归防护 | 手动测试 | 自动测试覆盖 | positive - 持续质量 |

## 反例场景

### 反例实现 1
- **错误模式**: 基准测试使用自定义查询
- **后果**: 无法与历史对比
- **正确做法**: 使用项目定义的 30 条 benchmark 查询

### 反例实现 2
- **错误模式**: Hit@8 不达标但强行通过
- **后果**: 用户体验差
- **正确做法**: 分析失败查询，优化搜索算法

### 反例实现 3
- **错误模式**: Token 统计不准确
- **后果**: 误导性能判断
- **正确做法**: 使用 cl100k_base 编码统计
