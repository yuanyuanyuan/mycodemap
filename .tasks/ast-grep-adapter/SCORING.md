## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | AstGrepAdapter 类存在 | 15 | 文件存在性 | 自动 |
| L2-1 | 继承 ToolAdapter 基类 | 15 | 代码审查 | 自动 |
| L3-1 | search 方法实现 | 20 | 代码审查 | 自动 |
| L4-1 | UnifiedResult 转换 | 15 | 代码审查 | 自动 |
| L5-1 | 错误处理 | 10 | 代码审查 | 自动 |
| L6-1 | ToolOrchestrator 集成 | 15 | 代码审查 | 自动 |
| L7-1 | 无反模式 | 5 | 代码审查 | 自动 |
| L8-1 | 权重配置 | 5 | 代码审查 | 自动 |

> 以上分值总和 = 100

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境
- Node.js 版本: >= 18
- 测试框架: Vitest
- 执行命令: `pnpm test .tasks/ast-grep-adapter/EVAL.ts`

### 验证命令示例
```bash
# 自动验证
pnpm test .tasks/ast-grep-adapter/EVAL.ts

# 手动验证
# 1. 检查 src/orchestrator/adapters/ast-grep-adapter.ts 是否存在
# 2. 检查是否继承 ToolAdapter 基类
# 3. 检查是否实现 async search(pattern, options) 方法
# 4. 检查是否将结果转换为 UnifiedResult 格式
# 5. 检查是否在 ToolOrchestrator 中注册
# 6. 检查权重配置是否为 1.0
```
