## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | pre-commit hook 包含 npm test | 15 | 代码审查 | 自动 |
| L2-1 | pre-commit hook 包含 AI 饲料生成 | 15 | 代码审查 | 自动 |
| L3-1 | GitHub Actions 包含 AI 饲料同步检查 | 15 | 代码审查 | 自动 |
| L4-1 | GitHub Actions 包含 assess-risk | 15 | 代码审查 | 自动 |
| L5-1 | GitHub Actions 包含 check-output-contract | 15 | 代码审查 | 自动 |
| L6-1 | Commit Tag 使用大写格式 | 10 | 正则匹配 | 自动 |
| L7-1 | CI 命令完整性 | 10 | 代码审查 | 自动 |
| L8-1 | Husky 集成（可选） | 5 | 存在性检查 | 自动 |

> 以上分值总和 = 100

### 评分等级
- **通过 (Pass)**: >= 70 分
- **优秀 (Excellent)**: >= 90 分
- **失败 (Fail)**: < 70 分

### 验证环境
- Node.js 版本: >= 18
- 测试框架: Vitest
- 执行命令: `pnpm test .tasks/ci-gateway-completion/EVAL.ts`

### 验证命令示例
```bash
# 自动验证
pnpm test .tasks/ci-gateway-completion/EVAL.ts

# 手动验证
# 1. 检查 .githooks/pre-commit 是否包含 npm test
# 2. 检查 .githooks/pre-commit 是否包含 codemap generate
# 3. 检查 .github/workflows/ci-gateway.yml 是否包含:
#    - codemap generate + git diff --exit-code
#    - codemap ci assess-risk --threshold=0.7
#    - codemap ci check-output-contract
# 4. 检查 .githooks/commit-msg 是否使用大写 TAG
```
