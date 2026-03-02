## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L0-1 | 使用项目现有的 Git 分析实现 | 10 | 检查 git-analyzer.ts 存在且包含 GitAnalyzer 类 | 自动 |
| L0-2 | includeGitHistory 类型定义存在 | 10 | 检查 types.ts 中的类型定义 | 自动 |
| L1-1 | analyze 命令定义参数 | 15 | 检查 analyze.ts 包含参数定义 | 自动 |
| L2-1 | 参数正确传递到编排层 | 15 | 检查参数传递逻辑 | 自动 |
| L3-1 | 项目成功构建 | 10 | npm run build 成功 | 自动 |
| L4-1 | 不引入新依赖 | 10 | 检查 package.json 无新 Git 库 | 自动 |
| L5-1 | 现有测试通过 | 10 | pnpm test git-analyzer.test.ts | 自动 |
| L6-1 | CLI 参数正确解析 | 20 | analyze --help 显示参数 | 自动 |

> **总分：100 分**

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境
- Node.js 版本: >= 18
- 测试框架: Vitest
- 执行命令: `pnpm test .tasks/git-history-integration/EVAL.ts`

### 验证命令示例
```bash
# 自动验证
pnpm test .tasks/git-history-integration/EVAL.ts

# 手动验证
node dist/cli/index.js analyze --include-git-history -S "GitAnalyzer"
```
