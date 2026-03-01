# CodeMap 项目开发指南

## 项目概述

CodeMap 是一个 TypeScript 代码结构分析工具，为 AI 辅助开发提供结构化上下文。

### 开发命令

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
# 或
npx vitest run

# 运行 CLI
node dist/cli/index.js <command>
```

## 项目结构

```
src/
├── cli/           # 命令行接口
├── core/          # 核心分析器
├── parser/        # 解析器实现
├── generator/     # 文档生成器
├── cache/         # 缓存系统
├── watcher/       # 文件监听
├── plugins/       # 插件系统
├── ai/            # AI 集成
└── types/         # 类型定义
```

## 常用操作

- 添加新 CLI 命令：在 `src/cli/commands/` 创建文件并在 `src/cli/index.ts` 注册
- 添加解析器：在 `src/parser/implementations/` 实现
- 运行测试：`npx vitest run`
- 构建发布：`npm run build`




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

## 重构任务批次 2 (Phase 6-10) - 已完成

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
For complex tasks (3+ steps, research, projects):
1. Load skill: planning-with-files
2. Create task_plan.md, findings.md, progress.md in your project directory
3. Follow 3-file pattern throughout the task
</IMPORTANT>


<IMPORTANT>
每次任务完成后都要检查docs目录和AGENTS.md 和CLAUDE.md 和README.md 文件，确认是否需要同步更新。
</IMPORTANT>