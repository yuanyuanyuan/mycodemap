---
name: task-generator
description: 任务与测试设计专家。生成 AI 评估任务四件套（PROMPT/EVAL/SCORING/metadata）并注入持久上下文块。触发词：创建任务、设计任务、生成任务。
---

# task-generator

## 交付目标

1. **任务四件套**：`.tasks/{task-name}/PROMPT.md`、`EVAL.ts`、`SCORING.md`、`task-metadata.yaml`
2. **持久上下文块**：写入 `AGENTS.md` 或 `CLAUDE.md`，使用 marker 幂等更新

## 7 阶段流程

| Phase | 说明 |
|-------|------|
| 0 | 收集项目上下文（技术栈、约定、文档入口） |
| 1 | 明确能力维度 |
| 2 | 设计真实场景 |
| 3 | 设计陷阱与反例 |
| 4 | 设计分层检查点与测试代码 |
| 5 | 设计评分标准 |
| 6 | 生成输出并执行质量门禁 |

## 强制规则

1. 不得跳过 Phase 4；每个检查点必须有测试代码。
2. `SCORING.md` 分值总和必须等于 100。
3. `PROMPT.md` 与上下文块必须包含：`Prefer retrieval-led reasoning over pre-training-led reasoning`。
4. 持久上下文必须使用以下 marker 且成对出现一次：
   - `<!-- TASK-GENERATOR-CONTEXT-START -->`
   - `<!-- TASK-GENERATOR-CONTEXT-END -->`
5. 交付前必须运行 `scripts/task-quality-gate.ts`。

## 质量门禁（强制）

```bash
# 编译
pnpm exec tsc .claude/skills/task-generator/scripts/task-quality-gate.ts \
  --target ES2022 --module Node16 --moduleResolution Node16 \
  --types node --outDir /tmp/task-quality-gate

# 校验任务四件套 + 持久上下文（默认 AGENTS.md）
node /tmp/task-quality-gate/task-quality-gate.js \
  --tasks-dir .tasks \
  --require-context \
  --context-file AGENTS.md
```

> 如果项目把上下文写在 `CLAUDE.md`，将 `--context-file` 改为 `CLAUDE.md`。

## 输出规范

### 目录结构

```text
.tasks/{task-name}/
├── PROMPT.md
├── EVAL.ts
├── SCORING.md
└── task-metadata.yaml
```

### PROMPT.md 必备章节

1. 背景
2. 要求
3. 初始状态
4. 约束条件
5. 验收标准
6. 用户价值
7. 反例场景

### 上下文块最小结构

```markdown
<!-- TASK-GENERATOR-CONTEXT-START -->
[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: <project-command>
<!-- TASK-GENERATOR-CONTEXT-END -->
```

## 模板与参考文件

| 文件 | 位置 |
|------|------|
| PROMPT 模板 | `assets/templates/prompt-template.md` |
| EVAL 模板 | `assets/templates/eval-template.ts` |
| SCORING 模板 | `assets/templates/scoring-template.md` |
| metadata 模板 | `assets/templates/metadata-template.yaml` |
| context 模板 | `assets/templates/context-template.md` |
| 原则说明 | `assets/principles.md` |
| 研究依据 | `assets/research.md` |

## 执行入口（Phase 0）

开始时向用户收集三项信息：

1. 项目类型和技术栈
2. 架构约定与代码规范
3. 文档入口与代码地图位置
