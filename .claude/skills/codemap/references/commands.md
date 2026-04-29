# CodeMap 命令参考

> CLI 主名为 `mycodemap`，`codemap` 作为兼容别名。本文档统一使用 `codemap`。

## 生成与分析

### codemap generate

分析项目并生成代码地图文件。

```bash
codemap generate                    # 使用默认 hybrid 模式
codemap generate -m smart          # 使用 smart 模式（AST 深度分析）
codemap generate -m fast            # 使用 fast 模式（正则匹配）
codemap generate -o ./docs/codemap  # 指定输出目录
codemap generate --ai-context       # 为每个文件生成 AI 描述
codemap generate --symbol-level     # 额外 materialize symbol-level 调用依赖
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式：`fast`、`smart`、`hybrid` | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.mycodemap` |
| `--ai-context` | 生成 AI 描述（需配置 AI Provider） | - |
| `--symbol-level` | 额外 materialize symbol-level 调用依赖 | `false` |

### codemap init

初始化项目的 CodeMap 配置文件。

```bash
codemap init          # 交互式创建配置
codemap init -y       # 使用默认配置直接创建
codemap init --interactive  # 仅显示 reconciliation preview，不写入文件
```

---

## 查询命令

### codemap query

查询代码地图中的符号、模块和依赖信息。

```bash
codemap query -s "ModuleInfo"        # 精确查询符号
codemap query -m "src/parser"        # 查询模块信息
codemap query -d "analyzer"           # 查询依赖关系
codemap query -S "cache"              # 模糊搜索
codemap query -S "parse" -j           # JSON 格式输出
codemap query -S "plugin" -l 5        # 限制结果数量
codemap query -S "use.*Hook" --regex  # 正则表达式搜索
codemap query -s "ClassName" --include-references  # 包含引用位置
codemap query -s "ClassName" --context 3           # 显示代码上下文
codemap query -S "hook" --case-sensitive           # 大小写敏感搜索
codemap query -S "cache" --structured -j           # 结构化 JSON
codemap query -s "Symbol" --no-cache               # 禁用缓存
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-s, --symbol <name>` | 精确查询符号 | - |
| `-m, --module <path>` | 查询模块信息 | - |
| `-d, --deps <name>` | 查询依赖关系 | - |
| `-S, --search <word>` | 模糊搜索 | - |
| `-l, --limit <number>` | 限制结果数量 | `50` |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |
| `-v, --verbose` | 显示性能指标 | - |
| `-r, --regex` | 使用正则表达式搜索（仅适用于 `-S`） | - |
| `-c, --context <lines>` | 显示代码上下文行数 | `0` |
| `--case-sensitive` | 大小写敏感搜索（精确搜索默认开启） | - |
| `--include-references` | 包含符号引用位置信息 | - |
| `--deps-format <format>` | 依赖查询输出格式 (`default`\|`detailed`) | `default` |
| `--no-cache` | 禁用缓存，强制重新加载索引 | - |

### codemap deps

分析并输出模块的依赖关系树。

```bash
codemap deps                     # 查看所有模块的依赖统计
codemap deps -m "src/parser"    # 查看指定模块的依赖树
codemap deps -m "src/parser" -j # JSON 格式输出
codemap deps --structured -j    # 结构化 JSON
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --module <path>` | 查询指定模块的依赖 | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |

### codemap cycles

检测项目中的循环依赖。

```bash
codemap cycles                    # 默认检测
codemap cycles -d 10             # 指定检测深度
codemap cycles -j                # JSON 格式输出
codemap cycles --structured -j   # 结构化 JSON
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-d, --depth <number>` | 检测深度 | `5` |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |

---

## 分析命令

### codemap complexity

分析代码复杂度，输出圈复杂度、认知复杂度和可维护性指数。

```bash
codemap complexity                  # 分析整个项目的复杂度
codemap complexity -f src/cli/index.ts  # 分析指定文件
codemap complexity -d              # 显示函数级复杂度详情（AST 精确分析）
codemap complexity -j              # JSON 格式输出
codemap complexity --structured -j # 结构化 JSON
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | 查看指定文件的复杂度 | - |
| `-d, --detail` | 显示函数级复杂度详情（AST 精确分析） | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |

### codemap impact

评估指定文件或模块变更的影响范围。

```bash
codemap impact -f src/cli/index.ts         # 分析指定文件的变更影响
codemap impact -f src/cli/index.ts --transitive  # 包含传递依赖
codemap impact -f src/cli/index.ts -j     # JSON 格式输出
codemap impact -f src/cli/index.ts --structured -j  # 结构化 JSON
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | **必填** 指定要分析的文件 | - |
| `-t, --transitive` | 包含传递依赖（间接影响） | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |

### codemap analyze

统一分析入口，支持多意图路由。

```bash
codemap analyze "分析 tool-orchestrator 的影响范围"
codemap analyze --intent impact --file src/cli/index.ts
codemap analyze --intent dependency --file src/cli/index.ts
codemap analyze --intent search "UnifiedResult"
```

---

## 设计契约命令

### codemap design

设计契约工具集（子命令：validate、map、handoff、verify）。

```bash
# 验证设计契约文件
codemap design validate                  # 验证默认契约文件
codemap design validate path/to/contract.md  # 验证指定文件
codemap design validate -j              # JSON 格式输出

# 映射设计到代码范围
codemap design map                       # 映射默认契约
codemap design map path/to/contract.md -j

# 生成设计交接包
codemap design handoff                   # 生成默认契约的交接包
codemap design handoff -o ./output       # 指定输出目录
codemap design handoff -j

# 验证设计契约与交接结果
codemap design verify
codemap design verify -j
```

| 子命令 | 说明 |
|--------|------|
| `validate` | 验证设计契约文件结构和规则 |
| `map` | 将设计契约映射到候选代码范围 |
| `handoff` | 生成设计交接包（Markdown + JSON） |
| `verify` | 验证设计契约与已审查交接结果的一致性 |

---

## 契约检查命令

### codemap check

验证代码契约合规性。

```bash
codemap check --contract path/to/contract.md --against path/to/truth.md
codemap check --contract A --against B --human     # 人类可读输出
codemap check --contract A --against B --base main  # 指定 base 分支
codemap check --contract A --against B --annotation-format github --annotation-file annotations.json
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--contract <path>` | **必填** 契约文件路径 | - |
| `--against <path>` | **必填** 对比目标文件路径 | - |
| `--human` | 人类可读输出 | - |
| `--base <branch>` | 基准分支 | - |
| `--changed-files <files>` | 变更文件列表 | - |
| `--annotation-format <fmt>` | 注解格式 (`github`\|`gitlab`) | - |
| `--annotation-file <path>` | 注解输出文件路径 | - |

---

## 符号历史命令

### codemap history

查询符号的 Git 历史和风险信息。

```bash
codemap history --symbol "ClassName"
codemap history --symbol "parseModule" --human
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--symbol <name>` | **必填** 要查询的符号名 | - |
| `--human` | 人类可读输出 | - |

---

## 导出命令

### codemap export

导出代码图到各种格式。

```bash
codemap export mermaid -o graph.mmd     # 导出为 Mermaid
codemap export json -o graph.json       # 导出为 JSON
codemap export graphml -o graph.graphml # 导出为 GraphML
codemap export dot -o graph.dot         # 导出为 DOT
```

| 参数/选项 | 说明 | 默认值 |
|-----------|------|--------|
| `<format>` | **必填** 导出格式：`json`、`graphml`、`dot`、`mermaid` | - |
| `-o, --output <path>` | 输出文件路径 | 自动生成 |

---

## 发布命令

### codemap ship

一键智能发布 - 自动分析变更、计算版本、运行检查、推送 tag 并触发 GitHub Actions 发布。

```bash
codemap ship --dry-run    # 仅分析，不发布
codemap ship --verbose    # 显示详细输出
codemap ship              # 正式发布
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--dry-run` | 仅分析，不发布 | - |
| `--verbose` | 显示详细输出 | - |
| `--yes, -y` | 置信度 60-75 时自动确认（不询问） | - |

### codemap publish-status

查看发布工作流状态。

```bash
codemap publish-status --tag v1.10.0 --sha abc123
codemap publish-status --tag v1.10.0 --sha abc123 -j
codemap publish-status --tag v1.10.0 --sha abc123 --structured -j
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--tag <tag>` | **必填** Git tag | - |
| `--sha <sha>` | **必填** Git commit SHA | - |
| `--workflow-file <file>` | GitHub Actions workflow 文件名 | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |

### codemap readiness-gate

运行所有发布质量检查（三层门禁语义）。

```bash
codemap readiness-gate --dry-run    # 试运行
codemap readiness-gate --verbose    # 显示详细输出
codemap readiness-gate -j           # JSON 格式输出
codemap readiness-gate --structured -j  # 结构化 JSON
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--dry-run` | 试运行模式 | - |
| `--verbose` | 显示详细输出 | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 输出完全结构化的 JSON（需配合 `--json`） | - |

---

## MCP 命令

### codemap mcp

启动和管理本地 MCP stdio 服务器。

```bash
codemap mcp start      # 启动 MCP 服务器
codemap mcp install    # 安装 MCP 服务器到 .mcp.json
codemap mcp status     # 查看 MCP 服务器状态
```

---

## CI 门禁命令

### codemap ci

CI 阶段自动检查。

```bash
# 提交格式检查
codemap ci check-commits
codemap ci check-commits --range origin/main..HEAD
codemap ci check-commits -c 20                 # 检查最近 20 个提交
codemap ci check-commits -m "feat: add login"  # 验证单个 commit message

# 文件头注释检查
codemap ci check-headers
codemap ci check-headers -d src/               # 扫描指定目录
codemap ci check-headers -f "a.ts,b.ts"        # 精确文件列表

# 工作区检查
codemap ci check-working-tree

# 分支检查
codemap ci check-branch
codemap ci check-branch -a "main,release/*"    # 自定义允许分支

# 脚本集合检查
codemap ci check-scripts

# 风险评估
codemap ci assess-risk
codemap ci assess-risk -f src/cache/lru-cache.ts
codemap ci assess-risk --threshold 0.7
codemap ci assess-risk -j

# Commit 大小检查
codemap ci check-commit-size
codemap ci check-commit-size -m 15             # 自定义文件数上限
codemap ci check-commit-size -r origin/main..HEAD

# 输出契约验证
codemap ci check-output-contract
codemap ci check-output-contract -s v1.0.0 -k 8 -t 160

# 文档同步检查
codemap ci check-docs-sync
codemap ci check-docs-sync --root /path/to/repo
```

| 命令 | 说明 |
|------|------|
| `check-commits` | 检查提交格式 `[TAG] scope: message` |
| `check-headers` | 检查文件头 `[META]`, `[WHY]` |
| `check-working-tree` | 验证工作区是否干净 |
| `check-branch` | 验证当前分支是否允许发布前检查 |
| `check-scripts` | 运行发布前脚本集合 |
| `assess-risk` | 基于 Git 历史评估变更风险 |
| `check-commit-size` | 检查 commit 文件数量是否超过限制 |
| `check-output-contract` | 验证输出契约 |
| `check-docs-sync` | 验证文档与护栏配置同步 |

---

## 工作流命令

### codemap workflow

启动和管理分析工作流。

```bash
# 启动工作流
codemap workflow start "实现用户认证模块"
codemap workflow start "修复登录接口500" --template bugfix
codemap workflow start "重构缓存" --template refactoring
codemap workflow start "添加功能" --template feature
codemap workflow start "紧急修复" --template hotfix

# 状态与可视化
codemap workflow status
codemap workflow visualize
codemap workflow visualize --timeline
codemap workflow visualize --results

# 阶段控制
codemap workflow proceed
codemap workflow proceed --force      # 跳过验证
codemap workflow checkpoint

# 恢复与列表
codemap workflow resume
codemap workflow resume <workflow-id>
codemap workflow list

# 删除
codemap workflow delete <workflow-id>

# 模板管理
codemap workflow template list --all
codemap workflow template info bugfix
codemap workflow template apply bugfix
codemap workflow template recommend "紧急修复支付超时"
```

**工作流阶段**：
1. `find` - 参考搜索
2. `read` - 代码阅读
3. `link` - 关联分析
4. `show` - 结果展示

**内置模板**：`refactoring`、`bugfix`、`feature`、`hotfix`

---

## 已移除命令

以下命令已从公共 CLI 移除，调用会返回迁移提示：

| 移除命令 | 替代方案 |
|----------|----------|
| `watch` | 使用 `mycodemap generate` 刷新代码地图 |
| `report` | 直接读取 `.mycodemap/AI_MAP.md` 或使用 `mycodemap export` |
| `logs` | 直接读取 `.mycodemap/logs/` 下的日志文件 |
| `server` | Server Layer 为内部架构，不再公开为 CLI 命令 |

---

## 模式说明

| 模式 | 速度 | 精度 | 适用场景 |
|------|------|------|----------|
| `fast` | 极快 | 基本结构 | 日常开发、大型项目快速预览 |
| `smart` | 较慢 | 完整语义 | 深度分析、复杂度评估、类型推导 |
| `hybrid` | 自动 | 自适应 | **推荐** - 文件数<50用fast，≥50用smart |
