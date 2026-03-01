# task-generator 技能模板索引

## 模板文件

| 文件 | 用途 |
|------|------|
| `templates/prompt-template.md` | PROMPT.md 完整模板 |
| `templates/eval-template.ts` | EVAL.ts 测试用例模板 |
| `templates/scoring-template.md` | SCORING.md 评分标准模板 |
| `templates/metadata-template.yaml` | task-metadata.yaml 元数据模板 |
| `templates/context-template.md` | 持久上下文块模板 |
| `templates/triad-roles-template.yaml` | 三角色定义模板（角色/输入/输出/验收标准） |
| `templates/triad-workflow-template.md` | 三角色工作内容模板（执行顺序与完成定义） |
| `templates/triad-acceptance-template.md` | 三角色验收模板（硬约束/检查清单/验证标准） |
| `templates/agents/generator-agent-template.md` | generator agent 固定角色模板 |
| `templates/agents/qa-agent-template.md` | qa agent 固定角色模板 |
| `templates/agents/supervisor-agent-template.md` | supervisor agent 固定角色模板 |
| `templates/agents/supervisor-semantic-engine-template.md` | supervisor 深语义判定引擎 prompt 模板 |

> 元数据模板包含强制 `workflow.triad`（generator/qa/supervisor）结构，且单次 `requested_count` 必须 `<=5`。
> 已生成任务的分析与审计由独立技能 `task-analyzer` 负责。

## 详细文档

| 文件 | 用途 |
|------|------|
| `principles.md` | 核心原则和防错规则详解 |
| `research.md` | Vercel 研究参考和数据 |

## 脚本

| 文件 | 用途 |
|------|------|
| `.tasks/scripts/task-quality-gate.ts` | 质量门禁脚本 |
| `scripts/create-triad-artifacts.js` | 用固定模板为任务生成 triad 工件 |
| `scripts/bootstrap-triad-agents.js` | 用固定模板初始化 `.tasks/agents` 三角色并通过符号链接暴露到 `.agents` |
| `scripts/backfill-triad-semantic.js` | 对已生成任务回填 agent_definition 与 supervisor 语义评审报告 |
| `.tasks/scripts/skills/init-runtime-skills.js` | 运行时判断与适配目录初始化（claude/codex/kimi） |
