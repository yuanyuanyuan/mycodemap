## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | Git 分析器文件存在 | 20 | 检查 src/orchestrator/git-analyzer.ts | 自动 |
| L1-2 | HeatScore 接口定义 | 15 | 检查 types.ts | 自动 |
| L2-1 | freq30d 计算实现 | 15 | 检查修改频率统计 | 自动 |
| L2-2 | lastType 分析实现 | 10 | 检查提交类型统计 | 自动 |
| L2-3 | 风险评级计算 | 15 | 检查 gravity/heat 评分 | 自动 |
| L3-1 | 非 Git 仓库处理 | 10 | 检查错误处理逻辑 | 自动 |
| L4-1 | 不使用外部 CLI | 15 | 检查代码中无 exec/spawn | 自动 |

> 以上分值可按任务调整，但**总分必须为 100**。

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境
- Node.js 版本: >= 18
- 测试框架: Vitest
- 执行命令: `pnpm test`

### 验证命令示例
```bash
# 自动验证
pnpm test .tasks/phase7-git-analyzer/EVAL.ts

# 手动验证
# 1. 测试 Git 分析器
node -e "const { GitAnalyzer } = require('./dist/orchestrator/git-analyzer'); console.log(new GitAnalyzer().analyze('src/'))"
```
