# Triad Acceptance - ast-grep-adapter

## Hard Constraints
- [x] 任务四件套完整 (PROMPT.md, EVAL.ts, SCORING.md, task-metadata.yaml)
- [x] PROMPT.md 包含所有必需章节
- [x] SCORING.md 总分 = 100
- [x] 遵循项目技术栈 (TypeScript, Node.js, Vitest)
- [x] 符合项目架构模式

## Artifact Checklist
- [x] PROMPT.md - 背景、要求、初始状态、约束条件、验收标准、用户价值、反例场景
- [x] EVAL.ts - 包含 Level 1-8 检查点
- [x] SCORING.md - 8 个检查点，总分 100
- [x] task-metadata.yaml - 完整的任务元数据
- [x] TRIAD_ROLES.yaml - 三角色状态
- [x] TRIAD_WORKFLOW.md - 工作流定义

## Automated Validation
```bash
# 编译
pnpm exec tsc .claude/skills/task-generator/scripts/task-quality-gate.ts \
  --target ES2022 --module Node16 --moduleResolution Node16 \
  --types node --outDir /tmp/task-quality-gate

# 校验
node /tmp/task-quality-gate/task-quality-gate.js \
  --tasks-dir .tasks \
  --require-context \
  --context-file AGENTS.md

# 运行测试
pnpm test .tasks/ast-grep-adapter/EVAL.ts
```
