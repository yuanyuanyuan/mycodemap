---
name: codemap
description: 项目级代码分析技能，用于 TypeScript/JavaScript 项目的结构化分析。当用户需要：(1) 理解项目结构、查找代码符号、分析模块依赖；(2) 评估文件变更影响范围；(3) 进行 CI 门禁检查（提交格式、文件头）；(4) 启动开发工作流时使用。也适用于用户明确提到 "codemap"、"代码地图"、"分析代码结构"、"查找依赖" 等场景。
---

# CodeMap 技能

> 注意：此技能使用项目内路径调用 codemap CLI：`/data/codemap/dist/cli/index.js`

## 快速开始

### CLI 调用方式

```bash
# 项目内调用（当前方式）
CODEMAP="/data/codemap/dist/cli/index.js"

# 示例：查询符号
$CODEMAP query -s "IntentRouter"

# 示例：分析影响
$CODEMAP impact -f src/cli/index.ts

# 示例：生成代码地图
$CODEMAP generate -m hybrid
```

### 常用命令速查

| 场景 | 命令 | 示例 |
|------|------|------|
| 生成代码地图 | `generate` | `$CODEMAP generate -m hybrid` |
| 查询符号 | `query -s` | `$CODEMAP query -s "IntentRouter"` |
| 查询模块 | `query -m` | `$CODEMAP query -m "src/parser"` |
| 模糊搜索 | `query -S` | `$CODEMAP query -S "cache" -l 10` |
| 依赖分析 | `deps` | `$CODEMAP deps -m "src/cache"` |
| 循环依赖 | `cycles` | `$CODEMAP cycles` |
| 复杂度分析 | `complexity` | `$CODEMAP complexity -f src/cli/index.ts` |
| 影响范围 | `impact` | `$CODEMAP impact -f src/cli/index.ts --transitive` |
| 文件监听 | `watch` | `$CODEMAP watch -d` |
| CI 检查 | `ci check-*` | `$CODEMAP ci check-commits` |

完整命令参考见 [commands.md](commands.md)

## 任务场景

### 1. 代码理解

用户需要理解项目结构、查找特定符号或模块时：

```bash
CODEMAP="/data/codemap/dist/cli/index.js"

# 查找类/函数定义
$CODEMAP query -s "ClassName"

# 查看模块详情
$CODEMAP query -m "src/parser"

# 搜索关键词
$CODEMAP query -S "cache" -l 10

# 查看依赖关系
$CODEMAP deps -m "src/orchestrator"
```

### 2. 变更影响评估

用户修改文件前需要了解影响范围时：

```bash
CODEMAP="/data/codemap/dist/cli/index.js"

# 基本影响分析
$CODEMAP impact -f "src/cli/index.ts"

# 包含传递依赖
$CODEMAP impact -f "src/cli/index.ts" -t

# JSON 格式输出
$CODEMAP impact -f "src/cli/index.ts" -j
```

### 3. CI 门禁检查

Commit 前或 CI 流水线中运行：

```bash
CODEMAP="/data/codemap/dist/cli/index.js"

# 检查提交格式
$CODEMAP ci check-commits --range origin/main..HEAD

# 检查文件头注释
$CODEMAP ci check-headers

# 风险评估
$CODEMAP ci assess-risk -f src/cache/lru-cache.ts

# 输出契约验证
$CODEMAP ci check-output-contract
```

### 4. 工作流编排

启动和管理开发工作流：

```bash
CODEMAP="/data/codemap/dist/cli/index.js"

# 启动工作流
$CODEMAP workflow start "实现用户认证模块"

# 启动 bugfix 模板
$CODEMAP workflow start "修复登录BUG" --template bugfix

# 查看状态
$CODEMAP workflow status

# 推进阶段
$CODEMAP workflow proceed

# 可视化
$CODEMAP workflow visualize
```

### 5. 统一分析入口

使用 analyze 命令进行多意图路由：

```bash
CODEMAP="/data/codemap/dist/cli/index.js"

# 自然语言意图
$CODEMAP analyze "分析 tool-orchestrator 的影响范围"

# 显式意图
$CODEMAP analyze --intent impact --file src/cli/index.ts
$CODEMAP analyze --intent dependency --file src/cli/index.ts
$CODEMAP analyze --intent search "UnifiedResult"
```

## 初始化项目

如果目标项目尚未初始化 codemap：

```bash
CODEMAP="/data/codemap/dist/cli/index.js"

# 初始化配置文件
$CODEMAP init

# 或使用默认配置
$CODEMAP init -y
```

## 输出处理

- 直接返回 CLI 原始输出
- 若需要 JSON 格式，使用 `-j` / `--json` 参数
- 复杂输出可重定向到文件：`$CODEMAP query -s "Symbol" > result.txt`

## 错误处理

常见错误：

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `command not found` | CLI 路径错误 | 检查 `/data/codemap/dist/cli/index.js` 是否存在 |
| `codemap.config.json not found` | 未初始化 | 运行 `$CODEMAP init` |
| `Module not found` | 路径错误 | 检查文件路径是否正确 |
| `Permission denied` | 权限问题 | 检查文件/目录权限 |

## 配置文件

项目根目录的 `codemap.config.json`：

```json
{
  "mode": "fast|smart|hybrid",
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules/**", "dist/**"],
  "output": ".codemap"
}
```
