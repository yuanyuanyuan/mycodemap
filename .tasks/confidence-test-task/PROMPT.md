# Task: confidence.ts 模块测试用例生成

## 背景
为 `src/orchestrator/confidence.ts` 模块生成完整的 Vitest 测试用例，确保测试覆盖率达到100%。该模块负责计算搜索结果的置信度评分，是 codemap 系统的核心组件。

## 要求

### 功能需求
1. **测试所有导出函数**：
   - `clamp(value, min, max)` - 限制数值范围
   - `getRelevance(result)` - 获取结果相关度
   - `getMatchCount(result)` - 获取匹配次数
   - `getThreshold(intent, level)` - 获取阈值
   - `calculateConfidence(results, intent)` - 核心置信度计算

2. **测试常量**：
   - `CONFIDENCE_THRESHOLDS` - 8种intent的阈值配置

3. **测试所有类型**：
   - `IntentType` - 8种意图类型
   - `SearchResult` - 搜索结果接口
   - `ConfidenceResult` - 置信度结果接口

### 测试场景

#### 边界条件测试
- clamp: 正常值、边界值(0, 1)、超出范围(-0.1, 1.1)
- getRelevance: 使用relevance字段、toolScore字段、score字段、无字段
- getMatchCount: 有keywords数组、空数组、无keywords
- 空结果数组
- 结果数量边界(0, 1-5, >5)
- 质量评分边界(0, 0.5, 1)

#### Intent类型测试
测试所有8种intent类型的场景评分逻辑：
- `search` - 对数量敏感
- `impact` / `dependency` - 对质量敏感
- `documentation` - 宽松
- `overview` - 需要更多结果
- `complexity` - 依赖质量
- `refactor` - 需要高质量+多个结果
- `reference` - 适中

#### 置信度级别测试
- high级别：分数 >= high阈值
- medium级别：medium阈值 <= 分数 < high阈值
- low级别：分数 < medium阈值

### 约束条件
1. 使用 Vitest 测试框架
2. 使用 `it.each` 测试多组数据
3. 不使用 mock（纯函数无需mock）
4. 所有断言必须有描述性错误信息
5. 测试文件路径：`src/orchestrator/__tests__/confidence.test.ts`
6. 包含 `Prefer retrieval-led reasoning over pre-training-led reasoning` 注释

## 初始状态
- 源文件：`src/orchestrator/confidence.ts`（已实现）
- 类型定义：`src/orchestrator/types.ts`
- 测试目录：`src/orchestrator/__tests__/`（需创建）

## 验收标准
1. ✅ 所有98个测试通过
2. ✅ 代码覆盖率达到100%（Statements, Branches, Functions, Lines）
3. ✅ 包含所有边界条件测试
4. ✅ 包含所有8种intent类型的测试
5. ✅ 包含高/中/低置信度场景的测试
6. ✅ 测试文件包含完整的类型导入

## 用户价值
- 确保置信度计算模块的可靠性
- 防止回归错误
- 提供模块使用的示例代码
- 支持后续重构的安全网

## 反例场景
❌ 以下情况将导致任务失败：
- 测试覆盖率低于100%
- 缺少任何导出函数的测试
- 缺少任何intent类型的测试
- 使用jest而非vitest
- 测试断言过于宽松（如只检查undefined）
- 没有测试边界条件
