## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | AI 饲料生成器文件存在 | 20 | 检查 src/orchestrator/ai-feed-generator.ts | 自动 |
| L2-1 | 文件头 [META] 解析 | 15 | 检查解析逻辑 | 自动 |
| L2-2 | 文件头 [WHY] 解析 | 15 | 检查解析逻辑 | 自动 |
| L2-3 | 三维评分 gravity/heat/impact | 20 | 检查评分计算 | 自动 |
| L2-4 | 输出 .codemap/ai-feed.txt | 10 | 检查输出路径 | 自动 |
| L3-1 | 集成 Git 分析器 | 10 | 检查调用 | 自动 |
| L4-1 | 不硬编码风险公式 | 10 | 检查公式引用 | 自动 |

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
pnpm test .tasks/phase8-ai-feed-generator/EVAL.ts

# 手动验证
node -e "const { AIFeedGenerator } = require('./dist/orchestrator/ai-feed-generator'); console.log(new AIFeedGenerator().generate())"
```
