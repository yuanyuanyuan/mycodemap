## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | AnalyzeCommand 文件存在 | 15 | 检查 src/cli/commands/analyze.ts | 自动 |
| L1-2 | 测试关联器文件存在 | 15 | 检查 src/orchestrator/test-linker.ts | 自动 |
| L2-1 | 参数契约完整（9个参数） | 20 | 检查参数定义完整性 | 自动 |
| L2-2 | intent 路由实现 | 10 | 检查 intent 路由逻辑 | 自动 |
| L3-1 | 错误码系统（E0001-E0006） | 15 | 检查错误码定义 | 自动 |
| L3-2 | outputMode 区分 | 10 | 检查 machine/human 模式 | 自动 |
| L4-1 | 无 any 类型 | 10 | 检查代码中无 any | 自动 |
| L4-2 | 测试关联器集成 | 5 | 检查与编排器集成 | 自动 |

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
pnpm test .tasks/phase6-analyze-command/EVAL.ts

# 手动验证
# 1. 检查 analyze 命令是否可执行
node dist/cli/index.js analyze --intent impact --targets src/ --json
# 2. 检查输出是否为有效 JSON
echo $?
```
