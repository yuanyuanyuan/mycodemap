## 评分标准

| ID | 检查点 | 分值 | 验证方法 | 自动/手动 |
|----|--------|------|----------|----------|
| L1-1 | 类型定义文件存在 (types.ts, workflow-context.ts) | 10 | `test [L1-1]` | 自动 |
| L1-2 | 核心类文件存在 (workflow-orchestrator.ts, workflow-persistence.ts, phase-checkpoint.ts) | 10 | `test [L1-2]` | 自动 |
| L1-3 | CLI 命令文件存在 (workflow.ts) | 10 | `test [L1-3]` | 自动 |
| L2-1 | WorkflowPhase 为字面量联合类型 | 10 | `test [L2-1]` | 自动 |
| L2-2 | PhaseStatus 包含所有状态 | 5 | `test [L2-2]` | 自动 |
| L2-3 | WorkflowContext 包含关键字段 | 5 | `test [L2-3]` | 自动 |
| L2-4 | WorkflowOrchestrator 包含必需方法 | 5 | `test [L2-4]` | 自动 |
| L2-5 | WorkflowPersistence 包含必需方法 | 5 | `test [L2-5]` | 自动 |
| L3-1 | 状态机正确处理阶段流转 | 5 | `test [L3-1]` | 自动 |
| L3-2 | 持久化正确处理 Map/Set 序列化 | 5 | `test [L3-2]` | 自动 |
| L3-3 | PhaseCheckpoint 实现 validate 方法 | 5 | `test [L3-3]` | 自动 |
| L3-4 | CLI 实现所有工作流子命令 | 5 | `test [L3-4]` | 自动 |
| L4-1 | 未将 WorkflowPhase 定义为 string | 5 | `test [L4-1]` | 自动 |
| L4-2 | 未直接 JSON.stringify Map | 5 | `test [L4-2]` | 自动 |
| L4-3 | 有 nextPhase 边界检查 | 7 | `test [L4-3]` | 自动 |
| L4-4 | 未硬编码阶段定义 | 3 | `test [L4-4]` | 自动 |

> 以上分值总和 = 100

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
pnpm test .tasks/phase11-workflow-orchestrator/EVAL.ts

# 手动验证 - 检查文件存在
ls -la src/orchestrator/workflow/
ls -la src/cli/commands/workflow.ts

# 手动验证 - 编译检查
npx tsc --noEmit src/orchestrator/workflow/*.ts

# 手动验证 - 功能测试
node dist/cli/index.js workflow start "测试任务"
node dist/cli/index.js workflow status
node dist/cli/index.js workflow proceed
```

### 评分计算

```typescript
// 每个测试通过的得分
test('[L1-1]') // +10 分
test('[L1-2]') // +10 分
test('[L1-3]') // +10 分
test('[L2-1]') // +10 分
test('[L2-2]') // +5 分
test('[L2-3]') // +5 分
test('[L2-4]') // +5 分
test('[L2-5]') // +5 分
test('[L3-1]') // +5 分
test('[L3-2]') // +5 分
test('[L3-3]') // +5 分
test('[L3-4]') // +5 分
test('[L4-1]') // +5 分
test('[L4-2]') // +5 分
test('[L4-3]') // +7 分
test('[L4-4]') // +3 分

// 总分 = 100
```
