# GitAnalyzer 单元测试摘要

## 测试文件
`src/orchestrator/__tests__/git-analyzer.test.ts`

## 测试结果
- **总测试数**: 43
- **通过**: 43 ✅
- **失败**: 0
- **跳过**: 0

## 测试覆盖率
| 指标 | 覆盖率 |
|------|--------|
| 语句 (Stmts) | 56.2% |
| 分支 (Branch) | 87.5% |
| 函数 (Funcs) | 31.25% |
| 行 (Lines) | 56.2% |

## 测试覆盖的功能模块

### 1. parseCommitTag (提交标签解析)
- ✅ BUGFIX 标签解析
- ✅ FEATURE 标签解析
- ✅ REFACTOR 标签解析
- ✅ CONFIG 标签解析
- ✅ DOCS 标签解析
- ✅ DELETE 标签解析
- ✅ 无效标签格式处理
- ✅ 未知标签类型处理
- ✅ 空 scope 处理（默认 general）

### 2. calculateRiskLevel (简单风险等级计算)
- ✅ 高风险场景 (gravity=25, freq=15, impact=60)
- ✅ 中等风险场景
- ✅ 低风险场景 (gravity=2, freq=1, impact=5)
- ✅ 不稳定文件风险增加
- ✅ BUGFIX 标签权重最高
- ✅ REFACTOR vs FEATURE 标签权重
- ✅ 未知标签类型处理
- ✅ gravity 封顶 (max 1.0)
- ✅ impact 封顶 (max 1.0)
- ✅ 极端值处理

### 3. calculateRiskScore (完整风险评分)
- ✅ 高 gravity 文件风险计算
- ✅ 中等参数风险计算
- ✅ 低 gravity 文件风险计算
- ✅ 不稳定文件风险增加
- ✅ 各标签权重应用
- ✅ 空 feed 数据处理
- ✅ gravity 封顶
- ✅ impact 封顶
- ✅ 风险因素计算
- ✅ 多文件计算

### 4. validateCommitMessage (提交信息验证)
- ✅ BUGFIX 消息验证
- ✅ FEATURE 消息验证
- ✅ 缺失标签拒绝
- ✅ 未知标签拒绝
- ✅ 空 scope 拒绝
- ✅ 空 subject 拒绝

### 5. Edge Cases (边界条件)
- ✅ Git 仓库检测（是/否）
- ✅ 特殊字符处理

### 6. Type Guards (类型守卫)
- ✅ CommitTag 结构验证
- ✅ HeatScore 结构验证
- ✅ RiskLevel 值验证
- ✅ RiskScore 结构验证

## 未覆盖的场景 (需要补充)

以下功能需要更复杂的 mock 设置或集成测试：

1. **analyzeFileHeat** - 文件热度分析
   - 需要模拟 git log 输出格式

2. **analyzeDirectoryHeat** - 目录热度分析
   - 需要模拟目录文件列表

3. **findRelatedCommits** - 相关提交查找
   - 关键词搜索
   - 文件搜索
   - 结果去重和排序

4. **isGitRepository** - Git 仓库检测
   - 已部分覆盖

## 使用的测试技术

- **Mock**: `vi.mock` 模拟 `child_process.execFile`
- **测试框架**: Vitest
- **断言风格**: Jest 风格 (expect, toBe, toContain 等)

## 风险评分公式验证

测试验证了以下公式计算：
```
score = gravityNorm * 0.30 + 
        freqNorm * 0.15 + 
        tagWeight * 0.10 + 
        stableBoost + 
        impactNorm * 0.10

其中:
- gravityNorm = min(gravity / 20, 1)
- freqNorm = min(freq30d / 10, 1)
- tagWeight: BUGFIX=0.9, REFACTOR=0.8, FEATURE=0.7, CONFIG=0.5, DOCS=0.2, DELETE=0.1
- stableBoost = stable ? 0 : 0.15
- impactNorm = min(impact / 50, 1)

等级划分:
- high: score > 0.7
- medium: score > 0.4
- low: score <= 0.4
```
