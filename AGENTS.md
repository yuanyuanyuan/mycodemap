# AGENTS.md - CodeMap 项目开发指南

> 本文档面向 AI 编程助手，介绍如何在 CodeMap 项目中高效工作。
> 语言：中文（与项目注释和文档保持一致）

---

## 项目概述

**CodeMap** 是一个专为 TypeScript/JavaScript 项目设计的代码结构分析工具。它通过静态分析自动生成项目的结构化代码地图，帮助 AI 编程助手（如 Claude、Copilot、Kimi）快速理解项目架构、模块关系和代码上下文。

### 核心特性

- **双层解析模式** - 提供 `fast`（快速正则）和 `smart`（TypeScript AST）两种解析模式，按需平衡速度与精度
- **多格式输出** - 自动生成 `AI_MAP.md`（全局概览）、`CONTEXT.md` + `context/`（模块上下文）、`codemap.json`（结构化数据）
- **依赖图可视化** - 生成 Mermaid 格式的模块依赖关系图
- **增量缓存** - 基于文件哈希的 LRU 缓存机制，仅重新分析变更文件
- **Watch 模式** - 监听文件变更并自动增量更新代码地图，支持后台守护进程
- **交互式查询** - 支持按符号、模块、依赖进行精确或模糊查询
- **复杂度分析** - 计算圈复杂度、认知复杂度和可维护性指数
- **调用图分析** - 分析函数/方法间的调用关系
- **插件系统** - 可扩展的插件架构，支持自定义分析和输出
- **编排层** - 意图路由、置信度计算、结果融合、工具编排器
- **CI 门禁** - Commit 格式验证、文件头检查、风险评估、输出契约检查
- **工作流编排** - 阶段管理、上下文持久化、检查点机制

### 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.3+ |
| 运行时 | Node.js >= 18.0.0 |
| 模块格式 | ESM (`"type": "module"`) |
| 构建工具 | TypeScript 编译器 (`tsc`) |
| 测试框架 | Vitest |
| 代码检查 | ESLint + @typescript-eslint |
| 覆盖率 | @vitest/coverage-v8 |
| CLI 框架 | Commander.js |
| AST 解析 | tree-sitter + tree-sitter-typescript |
| 文件监听 | chokidar |
| 复杂度分析 | typhonjs-escomplex |

---

## 项目结构

```
/data/codemap/
├── src/                          # 源代码目录
│   ├── cli/                      # CLI 命令入口
│   │   ├── index.ts              # Commander 命令注册
│   │   └── commands/             # 各子命令实现
│   │       ├── analyze.ts        # 统一分析入口（支持多意图路由）
│   │       ├── ci.ts             # CI 门禁命令
│   │       ├── complexity.ts     # 复杂度分析
│   │       ├── cycles.ts         # 循环依赖检测
│   │       ├── deps.ts           # 依赖分析
│   │       ├── generate.ts       # 生成代码地图
│   │       ├── impact.ts         # 影响范围分析
│   │       ├── init.ts           # 初始化配置
│   │       ├── query.ts          # 查询符号/模块/依赖
│   │       ├── watch.ts          # 监听模式
│   │       └── workflow.ts       # 工作流编排命令
│   ├── core/                     # 核心分析引擎
│   │   ├── analyzer.ts           # 主分析器
│   │   └── global-index.ts       # 全局符号索引
│   ├── parser/                   # 解析器层
│   │   ├── interfaces/           # 解析器接口定义 (IParser)
│   │   └── implementations/      # 解析器实现
│   │       ├── fast-parser.ts    # 快速正则解析器
│   │       ├── smart-parser.ts   # TypeScript AST 解析器
│   │       └── tree-sitter-parser.ts
│   ├── orchestrator/             # 编排层（v2.5 核心）
│   │   ├── adapters/             # 工具适配器
│   │   │   ├── base-adapter.ts
│   │   │   ├── codemap-adapter.ts
│   │   │   └── ast-grep-adapter.ts
│   │   ├── workflow/             # 工作流模块
│   │   │   ├── workflow-orchestrator.ts
│   │   │   ├── workflow-persistence.ts
│   │   │   ├── phase-checkpoint.ts
│   │   │   └── config.ts
│   │   ├── confidence.ts         # 置信度计算
│   │   ├── result-fusion.ts      # 结果融合
│   │   ├── tool-orchestrator.ts  # 工具编排器
│   │   ├── intent-router.ts      # 意图路由
│   │   ├── test-linker.ts        # 测试关联器
│   │   ├── git-analyzer.ts       # Git 分析器
│   │   ├── file-header-scanner.ts
│   │   ├── commit-validator.ts
│   │   └── types.ts
│   ├── generator/                # 输出生成器
│   │   ├── index.ts              # AI_MAP / JSON / Mermaid 生成
│   │   ├── context.ts            # CONTEXT.md 生成
│   │   ├── file-describer.ts
│   │   └── ai-overview.ts
│   ├── cache/                    # 缓存系统
│   │   ├── lru-cache.ts
│   │   ├── parse-cache.ts
│   │   └── file-hash-cache.ts
│   ├── watcher/                  # 文件监听
│   │   ├── file-watcher.ts
│   │   ├── daemon.ts
│   │   └── watch-worker.ts
│   ├── plugins/                  # 插件系统
│   │   ├── types.ts
│   │   ├── plugin-registry.ts
│   │   ├── plugin-loader.ts
│   │   └── built-in/             # 内置插件
│   ├── worker/                   # 工作线程
│   │   ├── index.ts
│   │   └── parse-worker.ts
│   ├── types/                    # 类型定义
│   │   └── index.ts              # 核心类型（~500 行）
│   └── index.ts                  # 库入口
├── docs/                         # 设计文档
│   ├── REFACTOR_ARCHITECTURE_OVERVIEW.md
│   ├── REFACTOR_REQUIREMENTS.md
│   ├── REFACTOR_ORCHESTRATOR_DESIGN.md
│   ├── REFACTOR_CONFIDENCE_DESIGN.md
│   ├── REFACTOR_RESULT_FUSION_DESIGN.md
│   ├── REFACTOR_TEST_LINKER_DESIGN.md
│   ├── REFACTOR_GIT_ANALYZER_DESIGN.md
│   └── CI_GATEWAY_DESIGN.md
├── tests/                        # 集成测试
│   └── golden/                   # 黄金标准测试数据
├── scripts/                      # 脚本工具
│   ├── benchmark.ts              # 基准测试
│   ├── hooks/                    # Git hooks 安装脚本
│   └── skills/                   # Claude skills
├── .kimi/                        # Kimi CLI 配置
│   ├── config.yaml               # 主配置（多 Agent 团队）
│   └── subagents/                # 子 Agent 配置
│       ├── task-generator.yaml   # 任务生成器
│       ├── task-qa.yaml          # 质量验收员
│       ├── task-supervisor.yaml  # 监督复核员
│       ├── task-analyzer.yaml    # 任务审计分析员
│       ├── task-executor.yaml    # 任务执行员
│       └── ci-checker.yaml       # CI Gateway 设计检查员
├── .claude/                      # Claude Code 配置
│   ├── settings.json
│   └── settings.local.json
├── .githooks/                    # Git hooks（CI 门禁）
│   ├── pre-commit                # 预提交检查
│   └── commit-msg                # 提交消息验证
├── .github/workflows/            # GitHub Actions
│   └── ci-gateway.yml            # CI Gateway 工作流
├── build/                        # 编译输出
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vitest.config.ts              # 测试配置
├── codemap.config.json           # CodeMap 自身配置
└── .mcp.json                     # MCP 服务器配置
```

---

## 构建和测试命令

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
# 编译 TypeScript 到 dist/ 目录
npm run build

# 开发模式（监听编译）
npm run dev

# 类型检查（不输出文件）
npm run typecheck
```

### 运行测试

```bash
# 运行所有测试
npm test
# 或
npx vitest run

# 运行特定测试文件
npx vitest run src/orchestrator/__tests__/confidence.test.ts

# 运行与变更相关的测试
npx vitest run --changed

# 运行覆盖率
npx vitest run --coverage

# 监视模式
npx vitest watch
```

### 代码检查

```bash
# ESLint 检查
npm run lint
```

### CLI 使用

```bash
# 使用全局安装的命令
codemap init
codemap generate
codemap watch

# 或使用本地编译版本
node dist/cli/index.js <command>

# 常用命令示例
codemap init -y
codemap generate -m smart
codemap query -s "ModuleInfo"
codemap deps -m "src/parser"
codemap complexity
codemap impact -f src/cli/index.ts
```

---

## 代码风格指南

### 文件头注释规范

**强制要求**：所有 TypeScript 源文件（非测试文件）必须在文件顶部包含以下注释格式：

```typescript
// [META] since:YYYY-MM | owner:team | stable:false
// [WHY] 解释该文件存在的理由和目的

/**
 * 可选的 JSDoc 描述
 */
```

示例：
```typescript
// [META] since:2026-03-02 | owner:orchestrator-team | stable:true
// [WHY] Route analyze intents to primary/secondary tools with whitelist validation
```

检查规则：
- 必须包含 `[META]` 标签
- 必须包含 `[WHY]` 标签
- CI 门禁会在 pre-commit 阶段检查

### TypeScript 规范

- 使用 **严格模式**（`strict: true`）
- 模块格式为 **ESM**（`"type": "module"`）
- 目标版本：**ES2022**
- 模块解析策略：**bundler**
- 所有函数和类必须添加返回类型注解
- 优先使用 `interface` 而非 `type` 定义对象结构
- 使用 `unknown` 而非 `any` 处理不确定类型

### 命名规范

- 文件：kebab-case（如 `intent-router.ts`）
- 类：PascalCase（如 `IntentRouter`）
- 函数/变量：camelCase（如 `routeIntent`）
- 常量：UPPER_SNAKE_CASE（如 `VALID_INTENTS`）
- 类型/接口：PascalCase（如 `CodemapIntent`）
- 私有成员：下划线前缀（如 `_privateMethod`）

---

## 测试策略

### 测试框架

- **框架**：Vitest
- **覆盖率工具**：@vitest/coverage-v8
- **测试文件位置**：
  - 单元测试：`src/**/__tests__/*.test.ts`（与源文件同目录）
  - 集成测试：`tests/` 目录
  - 基准测试：`refer/benchmark-quality.ts`

### 测试配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'refer/**/*.test.ts'],
    exclude: ['node_modules', 'build'],
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
```

### 测试要求

- 所有新功能必须附带测试
- 测试覆盖率目标：>= 80%
- 测试文件命名：`* .test.ts`
- 使用 `describe` 和 `it` 组织测试用例
- 使用 `beforeEach`/`afterEach` 管理测试状态

### 基准测试

- 基准查询集：`refer/benchmark-quality.ts`（30 条预定义查询）
- 关键指标：
  - Token 消耗降低 >= 40%
  - Hit@8 >= 90%

---

## CI/CD 和门禁

### Git Hooks（本地门禁）

**pre-commit**：
1. 运行与变更相关的测试（失败阻断提交）
2. 检查文件头注释 `[META]`/`[WHY]`（失败阻断提交）
3. 生成代码地图（警告级，不阻断）

**commit-msg**：
- 强制提交格式：`[TAG] scope: message`
- 有效标签：`BUGFIX`, `FEATURE`, `REFACTOR`, `CONFIG`, `DOCS`, `DELETE`
- 示例：`[FEATURE] cli: add new command`

### GitHub Actions

工作流文件：`.github/workflows/ci-gateway.yml`

执行步骤：
1. 检出代码（完整历史）
2. 设置 Node.js 20
3. 安装依赖（`npm ci`）
4. 运行测试（`npm test`）
5. 检查提交格式（`codemap ci check-commits`）
6. 检查文件头（`codemap ci check-headers`）
7. 生成代码地图并验证同步
8. 风险评估（`codemap ci assess-risk`）
9. 检查输出契约（`codemap ci check-output-contract`）

### CI 门禁命令

```bash
# 检查提交格式
codemap ci check-commits --range origin/main..HEAD

# 检查文件头注释
codemap ci check-headers

# 风险评估
codemap ci assess-risk --threshold=0.7

# 检查输出契约
codemap ci check-output-contract --schema-version v1.0.0 --top-k 8 --max-tokens 160
```

---

## CodeMap 工具使用规范

在进行代码搜索或项目分析时，**必须优先使用 CodeMap CLI 工具**。

### 代码搜索优先级

```
1. 首选: node dist/cli/index.js <command>
2. 备选: grep, rg, find 等标准工具
3. 记录: 将 CodeMap 问题记录到 .codemap/issues/codemap-issues.md
```

### 常用 CodeMap 命令

```bash
# 符号查询
node dist/cli/index.js query -s "symbolName"

# 模块查询  
node dist/cli/index.js query -m "moduleName"

# 依赖分析
node dist/cli/index.js deps -m "src/parser"

# 统一分析入口
node dist/cli/index.js analyze <intent>

# 影响范围分析
node dist/cli/index.js impact -f <file-path>

# 复杂度分析
node dist/cli/index.js complexity

# 循环依赖检测
node dist/cli/index.js cycles
```

### CodeMap 问题处理流程

当 CodeMap 使用过程中遇到问题或需要功能升级时，按以下流程处理：

#### 1. 检查日志

```bash
# 查看日志目录
ls -la .codemap/logs/ 2>/dev/null || echo "No logs directory"

# 详细输出模式
node dist/cli/index.js <command> --verbose 2>&1 | tee /tmp/codemap-debug-$(date +%s).log
```

#### 2. 记录问题

**问题跟踪文件**: `.codemap/issues/codemap-issues.md`

```bash
# 创建问题记录目录
mkdir -p .codemap/issues

# 添加问题记录
cat >> .codemap/issues/codemap-issues.md << 'EOF'

### [2026-XX-XX XX:XX] 问题简要描述
- **命令**: 执行的完整命令
- **错误信息**: 具体的错误输出
- **日志位置**: .codemap/logs/xxx.log 或 /tmp/codemap-debug-xxx.log
- **使用场景**: 当时正在执行的任务描述
- **临时解决**: 使用的替代方案（如 grep）
- **优先级**: high / medium / low

EOF
```

#### 3. 继续任务

记录问题后，使用替代工具（如 `grep`、`rg`）继续完成任务。

#### 4. 批量修复

所有记录在 `.codemap/issues/codemap-issues.md` 的问题将在后续统一修复。

### 问题记录模板

```markdown
## CodeMap 问题跟踪

### [2026-03-02 14:30] query 命令无法识别复杂符号
- **命令**: `node dist/cli/index.js query -s "IntentRouter.routeIntent"`
- **错误信息**: `Symbol not found: IntentRouter.routeIntent`
- **日志位置**: .codemap/logs/query-20260302.log
- **使用场景**: 查找 IntentRouter 类的 routeIntent 方法定义
- **临时解决**: 使用 `grep -r "routeIntent" src/orchestrator/`
- **优先级**: medium

### [2026-03-02 15:15] deps 命令输出格式不正确
- **命令**: `node dist/cli/index.js deps -m "src/parser"`
- **错误信息**: 输出的 JSON 缺少 dependencies 字段
- **日志位置**: .codemap/logs/deps-20260302.log
- **使用场景**: 分析 parser 模块的依赖关系
- **临时解决**: 手动阅读代码分析依赖
- **优先级**: high
```

---

## 多 Agent 协作

### 环境检测与适配

项目需要支持多 Agent 协作，执行前必须检测环境：

| 环境 | 检测方式 | 执行方式 |
|------|----------|----------|
| **Codex CLI** | 可用 `spawn_agent` / `send_input` / `wait` | 原生多 agent 生命周期 |
| **kimi-cli** | 系统提示词含 `${KIMI_WORK_DIR}` 或可用 `CreateSubagent` | YAML 配置 + Task 工具 |
| **Claude Code** | Skill: `agent-teams-playbook` | 按 skill 定义流程 |

### Kimi CLI 子 Agent 团队

配置位置：`.kimi/config.yaml`

**Triad 核心团队**：
- `task-generator`：生成任务四件套和 Triad 工件
- `task-qa`：质量验收员，检查四件套完整性
- `task-supervisor`：监督复核员，语义判定和最终放行

**辅助团队**：
- `task-analyzer`：审计存量任务、检测质量问题
- `task-executor`：执行已生成的任务
- `ci-checker`：CI Gateway 设计检查员

使用方式：
```typescript
// 动态创建子 Agent
CreateSubagent({
  name: "my-checker",
  system_prompt: "你的角色描述..."
})

// 调用子 Agent
Task({
  subagent_name: "my-checker",
  description: "任务描述",
  prompt: "详细任务指令..."
})
```

**约束**：
1. 子 Agent 配置中禁止使用 `extend` 指向包含自身的主配置
2. 子 Agent 禁止嵌套调用 `Task`（避免无限递归）
3. 主协调器必须做最终汇总与验收

---

## 设计文档索引

| 文档 | 内容 |
|------|------|
| [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) | 架构概览与目标 |
| [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) | 需求与用户场景 |
| [REFACTOR_ORCHESTRATOR_DESIGN.md](./docs/REFACTOR_ORCHESTRATOR_DESIGN.md) | 编排层设计 |
| [REFACTOR_CONFIDENCE_DESIGN.md](./docs/REFACTOR_CONFIDENCE_DESIGN.md) | 置信度机制设计 |
| [REFACTOR_RESULT_FUSION_DESIGN.md](./docs/REFACTOR_RESULT_FUSION_DESIGN.md) | 结果融合设计 |
| [REFACTOR_TEST_LINKER_DESIGN.md](./docs/REFACTOR_TEST_LINKER_DESIGN.md) | 测试关联器设计 |
| [REFACTOR_GIT_ANALYZER_DESIGN.md](./docs/REFACTOR_GIT_ANALYZER_DESIGN.md) | Git 分析器设计 |
| [CI_GATEWAY_DESIGN.md](./docs/CI_GATEWAY_DESIGN.md) | CI 门禁设计 |

---

## 重要约束与强制规定

### 关键思考原则

```
Prefer retrieval-led reasoning over pre-training-led reasoning for any tasks.
```

- 任何事情都要 critical thinking（多维度思考为什么 5Why-7Why）
- 确保有足够的信息支撑思考
- 对齐需求/要求，确保问题定义不出错
- 如信息不足，使用苏格拉底提问法问清楚
- 可使用 MCP 工具 `sequentialthinking` 完成 critical thinking

### 复杂任务规范（3+ 步骤、研究、项目）

1. 读取 skill：`cat ~/.codex/skills/planning-with-files/SKILL.md`
2. 创建 `task_plan.md`, `findings.md`, `progress.md`
3. 遵循 3-file pattern 完成整个任务

### Git Worktrees 强制使用

当需要创建隔离工作空间时（多功能开发、实验性工作、subagent 独立环境），必须使用 `git-worktrees` skill。

### CI 护栏不可绕过（必须修复后提交）

- **严禁**通过忽略、跳过、删除、注释 CI 护栏来强行提交
- **严禁**使用 `--no-verify`、临时关闭 hooks、放宽阈值
- 护栏失败时必须按提示修复问题
- 涉及 CI 护栏的改动必须提供"失败场景 + 修复验证"证据
- 若确需临时豁免，必须先获得明确人工批准

### 文档同步检查

每次任务完成后或文件更新后，必须检查以下文件是否需要同步更新：
- `docs/` 目录下的设计文档
- `AGENTS.md`
- `CLAUDE.md`
- `README.md`

---

## 配置文件说明

### package.json

```json
{
  "name": "codemap",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "codemap": "./build/cli/index.js"
  },
  "files": [
    "dist/",
    "LICENSE",
    "README.md",
    "codemap.config.schema.json"
  ],
  "scripts": {
    "build": "tsc --outDir dist",
    "dev": "tsc --watch --outDir dist",
    "test": "vitest run",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "postinstall": "sh scripts/hooks/install-hooks.sh",
    "prepublishOnly": "npm run build && npm test"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### codemap.config.json

```json
{
  "$schema": "https://codemap.dev/schema.json",
  "mode": "fast",
  "include": ["src/**/*.ts"],
  "exclude": [
    "node_modules/**",
    "build/**",
    "dist/**",
    "*.test.ts",
    "*.spec.ts"
  ],
  "output": ".codemap"
}
```

### tsconfig.json

- 目标：ES2022
- 模块：ESNext
- 模块解析：bundler
- 严格模式：启用
- 输出目录：`./build`
- 源码目录：`./src`

---

## 输出文件说明

运行 `codemap generate` 后，会在输出目录（默认 `.codemap/`）中生成：

| 文件 | 说明 |
|------|------|
| `AI_MAP.md` | 项目全局概览文件，专为 AI 助手设计 |
| `CONTEXT.md` | 上下文入口文件 |
| `context/` | 各模块的详细上下文 |
| `codemap.json` | 完整的结构化 JSON 数据 |
| `dependency-graph.md` | Mermaid 格式的依赖关系图 |
| `logs/` | CodeMap 执行日志（v0.2+） |
| `issues/` | 问题跟踪目录（v0.2+） |

---

## 开发工作流

### 新增功能开发流程

1. **规划阶段**：
   - 阅读相关设计文档
   - 创建 `task_plan.md`, `findings.md`, `progress.md`
   - 如涉及架构变更，更新设计文档

2. **编码阶段**：
   - 添加文件头注释 `[META]`/`[WHY]`
   - 遵循 TypeScript 严格模式
   - 同步编写单元测试

3. **验证阶段**：
   - 运行测试：`npm test`
   - 类型检查：`npm run typecheck`
   - 代码检查：`npm run lint`
   - 本地运行 CLI 验证

4. **提交阶段**：
   - 确保 pre-commit 通过
   - 提交格式：`[TAG] scope: message`
   - 如需要，使用 `git-worktrees` 创建隔离工作区

5. **收尾阶段**：
   - 检查并更新相关文档
   - 确认 AGENTS.md / CLAUDE.md / README.md 同步

---

*文档版本：2026-03-02*
*项目版本：0.1.0*
