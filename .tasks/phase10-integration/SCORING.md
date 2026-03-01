## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | 集成测试文件存在 | 15 | 检查 tests/integration/ | 自动 |
| L1-2 | 基准验证脚本存在 | 15 | 检查 scripts/benchmark.ts | 自动 |
| L2-1 | 测试完整分析流程 | 15 | 检查测试覆盖 analyze→orchestrate→fuse | 自动 |
| L2-2 | 测试多工具回退 | 10 | 检查 CodeMap→ast-grep→rg | 自动 |
| L3-1 | 执行 30 条基准查询 | 15 | 检查 benchmark.ts | 自动 |
| L3-2 | 计算 Hit@8 指标 | 10 | 检查命中计算逻辑 | 自动 |
| L4-1 | Token 统计使用 cl100k_base | 10 | 检查编码统计 | 自动 |
| L4-2 | Golden Files 目录存在 | 10 | 检查 tests/golden/ | 自动 |

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
pnpm test .tasks/phase10-integration/EVAL.ts

# 手动验证
# 1. 运行集成测试
pnpm test tests/integration/
# 2. 运行基准测试
node scripts/benchmark.ts
# 3. 检查 Hit@8 指标
cat results/benchmark.json | jq '.hitAt8'
```
