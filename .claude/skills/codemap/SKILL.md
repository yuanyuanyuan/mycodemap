---
name: codemap
description: 项目级代码分析技能，用于 TypeScript/JavaScript 项目的结构化分析。当用户需要：(1) 理解项目结构、查找代码符号、分析模块依赖；(2) 评估文件变更影响范围；(3) 进行 CI 门禁检查（提交格式、文件头、输出契约）；(4) 设计契约验证与映射；(5) 一键智能发布；(6) 启动开发工作流时使用。也适用于用户明确提到 "codemap"、"mycodemap"、"代码地图"、"分析代码结构"、"查找依赖" 等场景。
---

# CodeMap 技能

> CLI 主名为 `mycodemap`，`codemap` 作为兼容别名。
> 如果当前项目是 CodeMap 本体仓库（开发者模式），使用 `node dist/cli/index.js` 代替 `mycodemap`。

## 快速开始

### CLI 调用方式

```bash
# 标准调用（用户安装后）
mycodemap query -s "IntentRouter"

# 开发者模式（CodeMap 本体仓库内）
node dist/cli/index.js query -s "IntentRouter"
```

> **判断规则**：如果当前工作目录是 CodeMap 源码仓库（存在 `src/cli/index.ts`），使用 `node dist/cli/index.js`；否则使用全局安装的 `mycodemap`。

### 常用命令速查

| 场景 | 命令 | 示例 |
|------|------|------|
| 生成代码地图 | `generate` | `mycodemap generate -m hybrid` |
| 查询符号 | `query -s` | `mycodemap query -s "IntentRouter"` |
| 查询模块 | `query -m` | `mycodemap query -m "src/parser"` |
| 模糊搜索 | `query -S` | `mycodemap query -S "cache" -l 10` |
| 依赖分析 | `deps` | `mycodemap deps -m "src/cache"` |
| 循环依赖 | `cycles` | `mycodemap cycles` |
| 复杂度分析 | `complexity` | `mycodemap complexity -f src/cli/index.ts` |
| 影响范围 | `impact` | `mycodemap impact -f src/cli/index.ts --transitive` |
| 设计契约验证 | `design validate` | `mycodemap design validate` |
| 设计契约映射 | `design map` | `mycodemap design map` |
| 契约检查 | `check` | `mycodemap check --contract A --against B` |
| 符号历史 | `history` | `mycodemap history --symbol "ClassName"` |
| 导出代码图 | `export` | `mycodemap export mermaid -o graph.mmd` |
| 智能发布 | `ship` | `mycodemap ship --dry-run` |
| 发布状态 | `publish-status` | `mycodemap publish-status --tag v1.0 --sha abc123` |
| 就绪门禁 | `readiness-gate` | `mycodemap readiness-gate --dry-run` |
| MCP 服务器 | `mcp` | `mycodemap mcp start` |
| CI 检查 | `ci check-*` | `mycodemap ci check-commits` |

完整命令参考见 [commands.md](references/commands.md)

## 任务场景

### 1. 代码理解

用户需要理解项目结构、查找特定符号或模块时：

```bash
# 查找类/函数定义
mycodemap query -s "ClassName"

# 查看模块详情
mycodemap query -m "src/parser"

# 搜索关键词（支持正则）
mycodemap query -S "cache" -l 10
mycodemap query -S "use.*Hook" --regex

# 查看依赖关系
mycodemap deps -m "src/orchestrator"

# 查看符号历史
mycodemap history --symbol "ClassName"
```

### 2. 变更影响评估

用户修改文件前需要了解影响范围时：

```bash
# 基本影响分析
mycodemap impact -f "src/cli/index.ts"

# 包含传递依赖
mycodemap impact -f "src/cli/index.ts" -t

# JSON 格式输出
mycodemap impact -f "src/cli/index.ts" -j

# 结构化 JSON（不含自然语言）
mycodemap impact -f "src/cli/index.ts" --structured -j
```

### 3. 设计契约工作流

验证和映射设计契约文件：

```bash
# 验证设计契约
mycodemap design validate
mycodemap design validate path/to/contract.md -j

# 映射设计到代码范围
mycodemap design map
mycodemap design map -j

# 生成设计交接包
mycodemap design handoff
mycodemap design handoff -o ./handoff-output

# 验证设计契约与交接结果
mycodemap design verify
```

### 4. CI 门禁检查

Commit 前或 CI 流水线中运行：

```bash
# 检查提交格式
mycodemap ci check-commits --range origin/main..HEAD

# 检查文件头注释
mycodemap ci check-headers

# 检查工作区干净度
mycodemap ci check-working-tree

# 检查分支
mycodemap ci check-branch

# 检查脚本集合
mycodemap ci check-scripts

# 风险评估
mycodemap ci assess-risk -f src/cache/lru-cache.ts

# 检查 commit 文件数量
mycodemap ci check-commit-size

# 输出契约验证
mycodemap ci check-output-contract

# 文档同步检查
mycodemap ci check-docs-sync

# 契约检查
mycodemap check --contract path/to/contract.md --against path/to/truth.md
```

### 5. 工作流编排

启动和管理开发工作流：

```bash
# 启动工作流
mycodemap workflow start "实现用户认证模块"

# 启动 bugfix 模板
mycodemap workflow start "修复登录BUG" --template bugfix

# 查看状态
mycodemap workflow status

# 推进阶段
mycodemap workflow proceed

# 可视化
mycodemap workflow visualize
mycodemap workflow visualize --timeline
mycodemap workflow visualize --results

# 模板管理
mycodemap workflow template list --all
mycodemap workflow template info bugfix
mycodemap workflow template recommend "紧急修复"
```

### 6. 统一分析入口

使用 analyze 命令进行多意图路由：

```bash
# 自然语言意图
mycodemap analyze "分析 tool-orchestrator 的影响范围"

# 显式意图
mycodemap analyze --intent impact --file src/cli/index.ts
mycodemap analyze --intent dependency --file src/cli/index.ts
mycodemap analyze --intent search "UnifiedResult"
```

### 7. 智能发布

一键发布流程：

```bash
# 试运行（仅分析不发布）
mycodemap ship --dry-run

# 正式发布
mycodemap ship

# 查看发布状态
mycodemap publish-status --tag v1.10.0 --sha abc123

# 就绪门禁检查
mycodemap readiness-gate --dry-run
```

### 8. 导出代码图

```bash
# 导出为 Mermaid
mycodemap export mermaid -o graph.mmd

# 导出为 JSON
mycodemap export json -o graph.json

# 导出为 GraphML
mycodemap export graphml -o graph.graphml

# 导出为 DOT
mycodemap export dot -o graph.dot
```

## 初始化项目

如果目标项目尚未初始化 codemap：

```bash
# 初始化配置文件
mycodemap init

# 或使用默认配置
mycodemap init -y

# 仅预览 reconciliation（不写入文件）
mycodemap init --interactive
```

## 输出处理

- 直接返回 CLI 原始输出
- 若需要 JSON 格式，使用 `-j` / `--json` 参数
- 若需要结构化 JSON（不含自然语言描述），使用 `--structured` 配合 `--json`
- 复杂输出可重定向到文件：`mycodemap query -s "Symbol" > result.txt`

## 错误处理

常见错误：

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `command not found` | 未安装 mycodemap | 运行 `npm install -g @mycodemap/mycodemap` |
| `mycodemap.config.json not found` | 未初始化 | 运行 `mycodemap init` |
| `Module not found` | 路径错误 | 检查文件路径是否正确 |
| `Permission denied` | 权限问题 | 检查文件/目录权限 |
| 命令已移除提示 | 使用了已移除的命令 | `watch`/`report`/`logs`/`server` 已移除，改用 `generate` 或 `export` |

## 配置文件

项目根目录的 `.mycodemap/config.json`（通过 `mycodemap init` 生成）：

```json
{
  "mode": "fast|smart|hybrid",
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules/**", "dist/**"],
  "output": ".mycodemap"
}
```

## 已移除命令

以下命令已从公共 CLI 移除，调用会返回迁移提示：

| 移除命令 | 替代方案 |
|----------|----------|
| `watch` | 使用 `mycodemap generate` 刷新代码地图 |
| `report` | 直接读取 `.mycodemap/AI_MAP.md` 或使用 `mycodemap export` |
| `logs` | 直接读取 `.mycodemap/logs/` 下的日志文件 |
| `server` | Server Layer 为内部架构，不再公开为 CLI 命令 |
