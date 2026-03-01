## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | ToolOrchestrator 实例化 | 20 | `new ToolOrchestrator()` 存在 | 自动 |
| L1-2 | ToolOrchestrator 方法调用 | 15 | 调用 `executeWithFallback` 或 `executeParallel` | 自动 |
| L2-1 | ResultFusion 实例化 | 15 | `new ResultFusion()` 存在 | 自动 |
| L2-2 | ResultFusion fuse 调用 | 10 | 调用 `.fuse()` 方法 | 自动 |
| L3-1 | 8 个 intent 支持 | 20 | switch/case 覆盖 impact/dependency/complexity/search/overview/documentation/refactor/reference | 自动 |
| L4-1 | 向后兼容性 | 10 | 保留原有错误码、VALID_INTENTS、CLI 参数解析 | 自动 |
| L4-2 | 代码质量 | 10 | TypeScript 类型注解、访问修饰符 | 自动 |

> 总分 = 100 分

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 评分细则

#### ToolOrchestrator 集成 (35 分)
- **完全实现 (35 分)**: 正确实例化并使用 `executeWithFallback` 或 `executeParallel`
- **部分实现 (20 分)**: 实例化但未正确使用编排方法
- **未实现 (0 分)**: 未集成 ToolOrchestrator

#### ResultFusion 融合 (25 分)
- **完全实现 (25 分)**: 正确实例化并调用 `fuse()` 融合多工具结果
- **部分实现 (15 分)**: 实例化但未正确调用融合方法
- **未实现 (0 分)**: 未使用 ResultFusion

#### Intent 支持 (20 分)
- **完全实现 (20 分)**: 8 个 intent 全部支持
- **部分实现 (每缺少1个扣3分)**: 支持部分 intent
- **未实现 (0 分)**: 仅保留原有 3 个 intent

#### 向后兼容 (10 分)
- **完全兼容 (10 分)**: 错误码、VALID_INTENTS、CLI 参数保持不变
- **部分兼容 (5 分)**: 部分兼容但有细微变化
- **不兼容 (0 分)**: 破坏性变更

#### 代码质量 (10 分)
- **优秀 (10 分)**: 完整的类型注解、访问修饰符、错误处理
- **良好 (7 分)**: 基本符合 TypeScript 严格模式
- **较差 (0-5 分)**: 缺少类型安全

### 验证环境
- Node.js 版本: >= 18
- 测试框架: Vitest
- 执行命令: `npm test`

### 验证命令示例

```bash
# 自动验证
npm test .tasks/fix-analyze-orchestrator-integration/EVAL.ts

# 手动验证 - 检查 ToolOrchestrator 集成
grep -n "ToolOrchestrator" src/cli/commands/analyze.ts

# 手动验证 - 检查 ResultFusion 集成
grep -n "ResultFusion" src/cli/commands/analyze.ts

# 手动验证 - 检查 intent 支持
grep -n "case '" src/cli/commands/analyze.ts
```
