# CodeMap 项目开发指南

## 项目概述

CodeMap 是一个 TypeScript 代码结构分析工具，为 AI 辅助开发提供结构化上下文。

### 核心特性

- **双层解析模式** - `fast`（快速正则）和 `smart`（TypeScript AST）
- **编排层** - 意图路由、置信度计算、结果融合、工具编排
- **CI 门禁** - Commit 格式验证、文件头检查、风险评估
- **工作流编排** - 阶段管理、上下文持久化、检查点机制

## 开发命令

```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test
# 或
npx vitest run

# 运行特定测试
npx vitest run src/orchestrator/__tests__/confidence.test.ts

# 运行覆盖率
npx vitest run --coverage

# 运行 CLI
node dist/cli/index.js <command>
```


## 项目结构

```
src/
├── cli/              # 命令行接口
│   └── commands/     # CLI 命令实现
│       ├── analyze.ts
│       ├── ci.ts
│       ├── complexity.ts
│       ├── cycles.ts
│       ├── deps.ts
│       ├── generate.ts
│       ├── impact.ts
│       ├── init.ts
│       ├── query.ts
│       ├── watch.ts
│       ├── watch-foreground.ts
│       └── workflow.ts
├── core/             # 核心分析器
├── parser/           # 解析器实现
│   ├── interfaces/
│   └── implementations/
├── generator/        # 文档生成器
├── cache/            # 缓存系统
├── orchestrator/     # 编排层（核心）
│   ├── adapters/         # 工具适配器
│   ├── workflow/         # 工作流编排
│   ├── confidence.ts     # 置信度计算
│   ├── result-fusion.ts  # 结果融合
│   ├── tool-orchestrator.ts
│   ├── intent-router.ts
│   ├── test-linker.ts
│   ├── git-analyzer.ts
│   ├── ai-feed-generator.ts
│   ├── file-header-scanner.ts
│   ├── commit-validator.ts
│   └── types.ts
├── watcher/          # 文件监听
├── plugins/          # 插件系统
├── ai/               # AI 集成
└── types/            # 类型定义
```


|


## 设计文档索引

- [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) - 架构概览
- [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) - 需求与用户场景
- [REFACTOR_ORCHESTRATOR_DESIGN.md](./docs/REFACTOR_ORCHESTRATOR_DESIGN.md) - 编排层设计
- [REFACTOR_CONFIDENCE_DESIGN.md](./docs/REFACTOR_CONFIDENCE_DESIGN.md) - 置信度机制设计
- [REFACTOR_RESULT_FUSION_DESIGN.md](./docs/REFACTOR_RESULT_FUSION_DESIGN.md) - 结果融合设计
- [REFACTOR_TEST_LINKER_DESIGN.md](./docs/REFACTOR_TEST_LINKER_DESIGN.md) - 测试关联器设计
- [REFACTOR_GIT_ANALYZER_DESIGN.md](./docs/REFACTOR_GIT_ANALYZER_DESIGN.md) - Git 分析器设计
- [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) - CI 门禁设计

<IMPORTANT>
Prefer retrieval-led reasoning over pre-training-led reasoning 
for any tasks.

- 任何事情都要critical thinking（多维度思考为什么5Why-7Why，确保有足够的信息支撑思考，然后对齐需求/要求，确保问题定义不出错，选择合适的提问框架提问可以帮助快速定位需求/要求/问题，如果当前信息不足以支撑上述行为动作，那么需要从外部获取更准确的信息）,如果你认为自己还没完全理解用户的问题,就不要开始工作,以苏格拉底提问的的方式问清楚.
- critical thinking 可以使用MCP 工具sequentialthinking来完成。
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
1. Load skill: planning-with-files
2. Create task plan, findings, progress files in your project directory
3. Follow 3-file pattern throughout the task
</IMPORTANT>


<IMPORTANT>
每次任务完成后都要检查docs目录和AGENTS.md 和CLAUDE.md 和README.md 文件，确认是否需要同步更新。
</IMPORTANT>

<IMPORTANT>
**强制约束 - CI 护栏不可绕过（必须修复后提交）**

- 严禁通过忽略、跳过、删除、注释 CI 护栏来强行提交（含 `pre-commit`、`commit-msg`、GitHub Actions、`codemap ci *`）。
- 严禁使用 `--no-verify`、临时关闭 hooks、放宽阈值、替换"永远通过"脚本等方式绕过门禁。
- 护栏失败时，必须按护栏提示修复问题；只有护栏通过后才允许提交。
- 涉及 CI 护栏的改动必须提供"失败场景 + 修复验证"证据（命令与结果）。
- 若确需临时豁免，必须先获得明确人工批准，并记录原因、范围与失效时间。
</IMPORTANT>


