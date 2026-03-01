## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | Commit 验证器文件存在 | 15 | 检查 src/orchestrator/commit-validator.ts | 自动 |
| L1-2 | 文件头扫描器文件存在 | 15 | 检查 src/orchestrator/file-header-scanner.ts | 自动 |
| L2-1 | 支持 feat/fix/refactor 等 TAG | 15 | 检查 commit-validator.ts | 自动 |
| L2-2 | 输出 E0007/E0008/E0009 错误码 | 15 | 检查错误码定义 | 自动 |
| L3-1 | GitHub Actions 工作流存在 | 10 | 检查 .github/workflows/ci-gateway.yml | 自动 |
| L3-2 | 支持 [META]/[WHY] 标签检查 | 10 | 检查 file-header-scanner.ts | 自动 |
| L4-1 | 无 any 类型 | 10 | 检查代码中无 any | 自动 |
| L4-2 | Hook 使用相对路径 | 10 | 检查 .git/hooks/ 脚本 | 自动 |

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
pnpm test .tasks/phase9-ci-gateway/EVAL.ts

# 手动验证
# 1. 检查 Commit 验证器
node dist/cli/index.js ci check-commits
# 2. 检查文件头扫描器
node dist/cli/index.js ci check-headers
# 3. 检查 GitHub Actions
cat .github/workflows/ci-gateway.yml
```
