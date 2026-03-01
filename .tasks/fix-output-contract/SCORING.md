## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | CI check-output-contract 运行 analyze 并解析 JSON | 20 | EVAL.ts [L1] | 自动 |
| L1-2 | CI 校验添加 E0010 错误码 | 10 | EVAL.ts [L1] | 自动 |
| L2-1 | analyze machine 输出包含 schemaVersion | 15 | EVAL.ts [L2] | 自动 |
| L2-2 | analyze machine 输出包含 tool 字段 | 10 | EVAL.ts [L2] | 自动 |
| L2-3 | analyze machine 输出包含 confidence 对象 | 15 | EVAL.ts [L2] | 自动 |
| L3-1 | 定义 CodemapOutput 接口 | 15 | EVAL.ts [L3] | 自动 |
| L3-2 | 实现 isCodemapOutput 类型守卫 | 10 | EVAL.ts [L3] | 自动 |
| L4-1 | human 输出模式未被破坏 | 5 | EVAL.ts [L4-负面] | 自动 |

> 以上分值按任务调整，**总分 = 100**。

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
pnpm test .tasks/fix-output-contract/EVAL.ts

# 手动验证 - 测试 CI 校验
npx ts-node src/cli/index.ts ci check-output-contract

# 手动验证 - 测试 analyze machine 输出
npx ts-node src/cli/index.ts analyze -i impact -t src/index.ts --output-mode machine --json | jq

# 检查类型定义
grep -A 20 "interface CodemapOutput" src/orchestrator/types.ts
```

### 评分说明

**CI 校验实现 (30分)**:
- 必须实际运行 analyze 命令获取输出，而非仅检查 package.json
- 必须解析 JSON 并校验字段
- 必须添加 E0010 错误码用于契约校验失败

**analyze 输出字段 (40分)**:
- schemaVersion: 必须设为 "v1.0.0"
- tool: 必须标识使用的工具（如 "codemap" 或 "ast-grep"）
- confidence: 必须包含 score (0-1) 和 level (high/medium/low)

**类型定义 (25分)**:
- CodemapOutput 接口必须完整定义
- 必须实现类型守卫函数进行运行时校验

**负面检查 (5分)**:
- human 输出模式不应被修改
- 不应引入新的依赖
- 现有错误码不应被移除
