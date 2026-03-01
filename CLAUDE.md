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

## Codemap 自我维护规范

> 每次任务完成后都要执行以下维护命令，确保代码健康度

### 开发前：更新代码地图
```bash
# 构建项目后生成代码地图
npm run build && node dist/cli/index.js generate
```

### 开发中：监听变更
```bash
# 启动后台守护进程，自动增量更新
node dist/cli/index.js watch -d

# 查看守护进程状态
node dist/cli/index.js watch -t
```

### 修改文件前：评估影响范围
```bash
# 评估变更影响（包含传递依赖）
node dist/cli/index.js impact -f <file-path> --transitive

# 检测循环依赖
node dist/cli/index.js cycles

# 查看模块依赖树
node dist/cli/index.js deps -m <module-path>
```

### 提交前：CI 门禁检查（强制）
```bash
# 1. 检查 commit 格式
node dist/cli/index.js ci check-commits

# 2. 检查文件头注释
node dist/cli/index.js ci check-headers

# 3. 评估变更风险
node dist/cli/index.js ci assess-risk
```

### 日常查询
```bash
# 模糊搜索符号
node dist/cli/index.js query -S "<keyword>"

# 精确查询模块
node dist/cli/index.js query -m "<module-path>"

# 分析代码复杂度
node dist/cli/index.js complexity -f <file-path>

# 统一分析入口（支持自然语言）
node dist/cli/index.js analyze "分析 confidence.ts 的影响范围"
```

### 工作流编排
```bash
# 启动工作流
node dist/cli/index.js workflow start

# 查看状态
node dist/cli/index.js workflow status

# 创建检查点
node dist/cli/index.js workflow checkpoint
```

> **注意**：由于是项目自身，使用 `node dist/cli/index.js <command>` 而非全局的 `codemap <command>`

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

## 测试覆盖

### 当前测试统计

| 模块 | 测试文件数 | 测试数量 | 状态 |
|------|-----------|----------|------|
| orchestrator | 11 | 408 | ✅ 通过 |
| adapters | 4 | 100 | ✅ 通过 |
| workflow | 6 | 142 | ✅ 通过 |
| cli/commands | 9 | 91 | ⚠️ 部分 |
| parser | 2 | 20 | ✅ 通过 |
| cache | 2 | 44 | ✅ 通过 |
| core | 1 | 10 | ✅ 通过 |
| generator | 1 | 10 | ✅ 通过 |
| plugins | 1 | 9 | ✅ 通过 |
| **总计** | **~37** | **~834** | **actively growing** |

### 最新测试生成任务

位于 `.tasks/` 目录：

| 任务组 | 目标模块 | 生成测试数 | 状态 |
|--------|----------|-----------|------|
| group-a-core | confidence.ts, types.ts | 166 | ✅ 完成 |
| group-b-adapters-v2 | adapters/* | 100 | ✅ 完成 |
| group-c-cli | cli/commands/* | 91 | ⚠️ 部分 |
| group-d-workflow | workflow/* | 142 | ✅ 完成 |

## 任务技能闭环流程

完整工作流：**生成 → 验收 → 审核 → 执行 → 分析 → 改进**

| 阶段 | 技能 | 用途 | 触发词 |
|------|------|------|--------|
| 生成 | `task-generator` | 生成任务四件套 | 创建任务 |
| 验收 | `task-qa` | 质量验收 | 验收任务 |
| 审核 | `task-supervisor` | 4维度语义审核 | 审核任务 |
| 执行 | `task-executor` | 执行任务四件套 | 执行任务 |
| 分析 | `task-analyzer` | 分析审计任务质量 | 审计任务 |
| 改进 | - | 根据审计结果重新生成 | - |

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   生成任务    │ -> │   质量验收    │ -> │   最终审核    │
│task-generator│    │   task-qa    │    │task-supervisor│
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
┌──────────────┐    ┌──────────────┐          │
│   审计分析    │ <- │   执行任务    │ <-  批准执行
│task-analyzer │    │task-executor │
└──────────────┘    └──────────────┘
       │
       └──────────────── 发现问题，改进优化
```

> **重要**: 五个技能必须配套使用，形成完整的任务管理闭环。

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

<IMPORTANT>
**强制约束 - 必须使用 CodeMap 工具（禁止绕过）**

在本项目的任何代码文件操作中，**只要能够使用 codemap 工具的地方，都必须优先使用 codemap**，禁止直接使用 `grep`、`rg`、`find` 等传统工具。

### ✅ 必须使用 codemap 的场景

| 场景 | 禁止命令 | 必须使用 |
|------|----------|----------|
| 搜索符号/函数 | `grep -r "functionName"` | `node dist/cli/index.js query -S "functionName"` |
| 查找文件 | `find . -name "*.ts"` | `node dist/cli/index.js query -f "*.ts"` |
| 查看模块结构 | `rg "export class"` | `node dist/cli/index.js query -m "module-path"` |
| 分析依赖关系 | 手动追踪 import | `node dist/cli/index.js deps -m "module-path"` |
| 评估变更影响 | 人工分析依赖 | `node dist/cli/index.js impact -f <file>` |
| 检查循环依赖 | `grep` 组合命令 | `node dist/cli/index.js cycles` |
| 代码复杂度分析 | 目测估算 | `node dist/cli/index.js complexity -f <file>` |

### 🎯 核心原则

1. **默认优先**：任何代码查询操作，首先考虑 codemap 是否能完成
2. **大量高频**：在每次代码文件操作时**大量使用** codemap，确保工具得到充分验证
3. **发现问题**：通过高频使用主动发现 codemap 的 bug、性能问题和功能缺失
4. **积累数据**：每次使用都是数据积累，帮助改进工具的准确性和覆盖度
5. **绝不禁用**：严禁为了"方便"而绕过 codemap 直接使用传统工具

### ⚠️ 例外情况（极少）

仅在以下情况允许使用传统工具：
- codemap 工具尚未构建（`dist/` 不存在）
- codemap 本身出现严重故障，需要紧急排查
- 需要搜索非代码文件（如 `.md`, `.json` 配置文件）

### 📊 使用统计

每次会话应记录 codemap 使用次数，确保高频使用：
- 查询操作：≥80% 使用 codemap
- 依赖分析：100% 使用 codemap
- 影响评估：100% 使用 codemap

> **目的**：通过在本项目中**强制高频使用** codemap，主动暴露工具问题，持续改进工具质量。
</IMPORTANT>
