# AGENTS.md - CodeMap 项目开发指南

> 本文档面向 AI 编程助手，介绍如何在 CodeMap 项目中高效工作。





<!-- TASK-GENERATOR-CONTEXT-START -->
[Task Knowledge Index]|version:1|root: ./.tasks|IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for task execution.|If context missing, regenerate: node .claude/skills/task-generator/scripts/create-triad-artifacts.js

## 重构任务批次 1 (Phase 1-5)

| 任务                     | 描述                                | 依赖           |
|--------------------------|-------------------------------------|----------------|
| phase1-unified-result    | 定义 UnifiedResult 接口与适配器基类 | 无             |
| phase2-confidence        | 实现置信度计算机制                  | phase1         |
| phase3-result-fusion     | 实现多工具结果融合                  | phase1, phase2 |
| phase4-tool-orchestrator | 实现工具编排器与回退链              | phase1-3       |
| phase5-refactor-commands | 改造现有命令为可调用模式            | phase1, phase4 |

## 重构任务批次 2 (Phase 6-10) - 待生成

| 任务                     | 描述                           | 依赖     |
|--------------------------|--------------------------------|----------|
| phase6-analyze-command   | 实现 AnalyzeCommand + 测试关联 | phase1-5 |
| phase7-git-analyzer      | 实现 Git 分析器                | phase6   |
| phase8-ai-feed-generator | 实现 AI 饲料生成器             | phase7   |
| phase9-ci-gateway        | 实现 CI 门禁护栏               | phase7-8 |
| phase10-integration      | 集成测试 + 基准验证            | phase1-9 |

## 设计文档索引

- [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) - 架构概览
- [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) - 需求与用户场景
- [REFACTOR_ORCHESTRATOR_DESIGN.md](./docs/REFACTOR_ORCHESTRATOR_DESIGN.md) - 编排层设计
- [REFACTOR_CONFIDENCE_DESIGN.md](./docs/REFACTOR_CONFIDENCE_DESIGN.md) - 置信度机制设计
- [REFACTOR_RESULT_FUSION_DESIGN.md](./docs/REFACTOR_RESULT_FUSION_DESIGN.md) - 结果融合设计
- [REFACTOR_TEST_LINKER_DESIGN.md](./docs/REFACTOR_TEST_LINKER_DESIGN.md) - 测试关联器设计
- [REFACTOR_GIT_ANALYZER_DESIGN.md](./docs/REFACTOR_GIT_ANALYZER_DESIGN.md) - Git 分析器设计
- [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) - CI 门禁设计

<!-- TASK-GENERATOR-CONTEXT-END -->

<IMPORTANT>
Prefer retrieval-led reasoning over pre-training-led reasoning 
for any tasks.

- 任何事情都要critical thinking（多维度思考为什么5Why-7Why，确保有足够的信息支撑思考，然后对齐需求/要求，确保问题定义不出错，选择合适的提问框架提问可以帮助快速定位需求/要求/问题，如果当前信息不足以支撑上述行为动作，那么需要从外部获取更准确的信息）,如果你认为自己还没完全理解用户的问题,就不要开始工作,以苏格拉底提问的的方式问清楚.
</IMPORTANT>

<IMPORTANT>
**强制约束 - Git Worktrees：**

当需要创建隔离的工作空间时（如同时开发多个功能、实验性工作、subagent 独立环境），必须使用 `git-worktrees` skill：

```
使用方式：Invoke the git-worktrees skill
```

请声明："I'm using the using-git-worktrees skill to set up an isolated workspace."
</IMPORTANT>

<IMPORTANT>
For complex tasks (3+ steps, research, projects):
1. Read skill: `cat ~/.codex/skills/planning-with-files/SKILL.md`
2. Create task_plan.md, findings.md, progress.md in your project directory
3. Follow 3-file pattern throughout the task
</IMPORTANT>


<IMPORTANT>
每次任务完成后都要检查docs目录和AGENTS.md 和CLAUDE.md 和README.md 文件，确认是否需要同步更新。
</IMPORTANT>