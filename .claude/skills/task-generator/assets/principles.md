# 核心原则与防错规则

## 8 条核心原则

1. **先调研后设计**：先拿到项目技术栈、约定、文档入口，再写任务。
2. **先用户后技术**：先定义业务价值与验收标准，再拆实现细节。
3. **先测试后输出**：检查点必须可验证，避免“描述正确但不可验收”。
4. **先对齐后生成**：先与用户对齐能力边界、陷阱和评分分布。
5. **先门禁后交付**：交付前运行质量门禁脚本。
6. **先检索后记忆**：任务中显式要求优先使用项目内检索信息。
7. **先持久后依赖**：关键约束写入 `AGENTS.md` 或 `CLAUDE.md` 的 marker 块。
8. **先压缩后注入**：上下文块写索引，不写全文，控制体积。
9. **先模板后生成**：优先使用固定脚本与模板创建任务与 triad 工件。
10. **先 agent 后执行**：先确认 `.agents` 里存在三角色定义，再进入生成流水线。
11. **监督先语义后放行**：supervisor 必须先完成独立语义判定引擎，再决定是否批准。

## 5 条防错规则（硬约束）

1. **不得跳过 Phase 4（检查点与测试）**：每个检查点都要有测试代码。
2. **总分必须为 100**：`SCORING.md` 的分值行总和必须等于 100。
3. **必须通过质量门禁**：运行 `.tasks/scripts/task-quality-gate.ts`。
4. **不得缺失检索优先指令**：`PROMPT.md` 和上下文块都要包含 retrieval-led 语句。
5. **上下文注入必须带 marker**：使用 `TASK-GENERATOR-CONTEXT-START/END`，并幂等替换。
6. **单次生成数量必须 <=5**：任何 `>5` 的请求都必须被阻断。
7. **必须完成三角色闭环**：`generator`、`qa`、`supervisor` 三角色状态都必须是 completed。
8. **必须存在三角色 agent 资产**：`.agents/{generator|qa|supervisor}.agent.md` 必须存在。
9. **supervisor 必须有独立语义引擎模板**：`.agents/{supervisor}.semantic.prompt.md` 必须存在并参与判定。

## 推荐门禁命令

```bash
pnpm exec tsc .claude/skills/task-generator/scripts/task-quality-gate.ts \
  --target ES2022 --module Node16 --moduleResolution Node16 \
  --types node --outDir /tmp/task-quality-gate

node /tmp/task-quality-gate/task-quality-gate.js \
  --tasks-dir .tasks \
  --require-context \
  --context-file AGENTS.md
```
