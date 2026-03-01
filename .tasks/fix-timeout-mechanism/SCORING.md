## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | ToolAdapter 接口包含 signal 参数 | 20 | `grep -E "signal\?:\s*AbortSignal" src/orchestrator/tool-orchestrator.ts` | 自动 |
| L2-1 | 使用 Promise.race 实现硬超时 | 25 | `grep "Promise.race" src/orchestrator/tool-orchestrator.ts` | 自动 |
| L3-1 | adapter.execute 调用传递 signal | 25 | `grep -E "adapter\.execute\(.*signal" src/orchestrator/tool-orchestrator.ts` | 自动 |
| L3-2 | 超时后返回空数组触发回退 | 15 | 检查 catch 块包含 `return []` | 自动 |
| L4-1 | signal 参数保持可选（向后兼容） | 15 | 验证 `signal?:` 而非 `signal:` | 自动 |

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
pnpm test .tasks/fix-timeout-mechanism/EVAL.ts

# 手动验证 - 检查 Promise.race 实现
grep -n "Promise.race" src/orchestrator/tool-orchestrator.ts

# 手动验证 - 检查 signal 参数
grep -n "signal" src/orchestrator/tool-orchestrator.ts | head -20

# 类型检查
pnpm typecheck

# 运行完整测试
pnpm test
```
