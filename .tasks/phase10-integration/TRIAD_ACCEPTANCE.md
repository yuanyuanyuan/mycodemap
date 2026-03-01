# Triad Acceptance Criteria - phase10-integration

## 验收标准

### Generator 验收

| 检查项 | 标准 | 状态 |
|--------|------|------|
| PROMPT.md 存在 | 文件存在 | ⏳ |
| EVAL.ts 存在 | 文件存在 | ⏳ |
| SCORING.md 存在 | 文件存在 | ⏳ |
| task-metadata.yaml 存在 | 文件存在 | ⏳ |
| SCORING 总分 | = 100 | ⏳ |
| retrieval-led 指令 | 包含 "Prefer retrieval-led" | ⏳ |

### QA 验收

| 检查项 | 标准 | 状态 |
|--------|------|------|
| L0 检查 | 项目约定合规 | ⏳ |
| L1 检查 | 存在性验证 | ⏳ |
| L2 检查 | 结构验证 | ⏳ |
| L3 检查 | 模式验证 | ⏳ |
| L4 检查 | 负向断言 | ⏳ |
| 三角色状态 | workflow 可追溯 | ⏳ |

### Supervisor 验收

| 检查项 | 标准 | 状态 |
|--------|------|------|
| 任务完整性 | 25分 | ⏳ |
| 陷阱设计有效性 | 25分 | ⏳ |
| 评分合理性 | 25分 | ⏳ |
| 上下文一致性 | 25分 | ⏳ |
| **总分** | >= 85 | ⏳ |
| **Critical Failures** | = 0 | ⏳ |

## 放行条件

- [ ] Generator: 四件套齐全，SCORING 总分 = 100
- [ ] QA: 所有 L0-L4 检查通过
- [ ] Supervisor: semantic_score >= 85 且 critical_failures = 0
- [ ] **全部满足**: workflow.approved = true

## 质量门禁命令

```bash
# 编译质量门禁脚本
pnpm exec tsc .claude/skills/task-generator/scripts/task-quality-gate.ts \
  --target ES2022 --module Node16 --moduleResolution Node16 \
  --types node --outDir /tmp/task-quality-gate

# 校验任务四件套
node /tmp/task-quality-gate/task-quality-gate.js \
  --tasks-dir .tasks \
  --require-context
```
