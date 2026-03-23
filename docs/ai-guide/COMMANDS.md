# AI Guide - 命令参考

> 完整的 CLI 命令详解

---

## 核心命令

### generate - 生成代码地图

```bash
mycodemap generate                          # hybrid 模式（推荐）
mycodemap generate -m smart                 # AST 深度分析
mycodemap generate -m fast                  # 快速正则分析
mycodemap generate -o ./output              # 指定输出目录
mycodemap generate --ai-context             # 生成 AI 描述
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式: fast/smart/hybrid | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.mycodemap` |
| `--ai-context` | 为每个文件生成描述 | - |

**模式说明**:
- `fast`: 正则匹配，极快，适合大型项目
- `smart`: AST 分析，较慢，信息完整
- `hybrid`: 自动选择，文件<50用fast，≥50用smart

---

### query - 查询代码

```bash
mycodemap query -s "SymbolName"             # 精确查询符号
mycodemap query -m "src/parser"             # 查询模块
mycodemap query -d "analyzer"               # 查询依赖
mycodemap query -S "cache" -l 10            # 模糊搜索
mycodemap query -s "Symbol" -j              # JSON 输出
mycodemap query -s "Symbol" --include-references  # 包含引用
mycodemap query -S "pattern" -r             # 正则搜索
mycodemap query -c 5                        # 显示上下文5行
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-s, --symbol <name>` | 精确查询符号 | - |
| `-m, --module <path>` | 查询模块 | - |
| `-d, --deps <name>` | 查询依赖 | - |
| `-S, --search <word>` | 模糊搜索 | - |
| `-l, --limit <number>` | 限制结果数量 | `50` |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出 | - |
| `-r, --regex` | 使用正则表达式 | - |
| `-c, --context <lines>` | 显示代码上下文 | `0` |
| `--include-references` | 包含引用位置 | - |

---

### deps - 依赖分析

```bash
mycodemap deps                              # 全部依赖
mycodemap deps -m "src/domain"              # 指定模块
mycodemap deps -m "src/domain" -j           # JSON 输出
mycodemap deps -m "src/domain" --structured # 纯结构化
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --module <path>` | 查询指定模块 | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出 | - |

---

### impact - 影响分析

```bash
mycodemap impact -f "src/cli/index.ts"      # 文件变更影响
mycodemap impact -f "src/cli/index.ts" -t   # 包含传递依赖
mycodemap impact -f "src/cli/index.ts" -j   # JSON 输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | **必填** 指定文件 | - |
| `-t, --transitive` | 包含传递依赖 | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出 | - |

---

### complexity - 复杂度分析

```bash
mycodemap complexity                        # 项目整体
mycodemap complexity -f "src/cli/index.ts"  # 指定文件
mycodemap complexity -d                     # 函数级详情
mycodemap complexity -j                     # JSON 输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | 指定文件 | - |
| `-d, --detail` | 函数级详情 | - |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出 | - |

---

### cycles - 循环依赖检测

```bash
mycodemap cycles                            # 检测所有循环依赖
mycodemap cycles -d 5                       # 指定检测深度
mycodemap cycles -j                         # JSON 输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-d, --depth <number>` | 检测深度 | `5` |
| `-j, --json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出 | - |

---

## analyze - 统一分析入口

### 8 种分析意图

```bash
# 1. 影响分析
mycodemap analyze -i impact -t "src/index.ts"
mycodemap analyze -i impact -t "src/index.ts" --scope transitive
mycodemap analyze -i impact -t "src/index.ts" --include-tests

# 2. 依赖分析
mycodemap analyze -i dependency -t "src/orchestrator"

# 3. 复杂度分析
mycodemap analyze -i complexity -t "src/domain"

# 4. 搜索分析
mycodemap analyze -i search -k "UnifiedResult"
mycodemap analyze -i search -k "keyword" --topK 20

# 5. 项目概览
mycodemap analyze -i overview -t "src/"

# 6. 重构建议
mycodemap analyze -i refactor -t "src/cache"

# 7. 引用查找
mycodemap analyze -i reference -t "src/interface/types"

# 8. 文档生成
mycodemap analyze -i documentation -t "src/domain/services"
```

### 输出选项

```bash
# JSON 输出
mycodemap analyze -i impact -t "src/index.ts" --json

# 纯结构化（移除自然语言字段）
mycodemap analyze -i impact -t "src/index.ts" --structured --json

# 机器可读模式
mycodemap analyze -i impact -t "src/index.ts" --output-mode machine

# 人类可读模式（默认）
mycodemap analyze -i impact -t "src/index.ts" --output-mode human
```

### 通用选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-i, --intent <type>` | 分析类型 | `impact` |
| `-t, --targets <paths...>` | 目标路径（必填） | - |
| `-k, --keywords <words...>` | 搜索关键词 | - |
| `-s, --scope <scope>` | 范围: direct/transitive | `direct` |
| `-n, --topK <number>` | 返回结果数量 | `8` |
| `--include-tests` | 包含测试文件关联 | - |
| `--include-git-history` | 包含 Git 历史 | - |
| `--json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出 | - |
| `--output-mode <mode>` | 输出模式: machine/human | `human` |

---

## ci - CI 门禁

### 子命令

```bash
# 验证提交格式（[TAG] scope: message）
mycodemap ci check-commits
mycodemap ci check-commits -c 5             # 最近 5 个提交
mycodemap ci check-commits -r "origin/main..HEAD"

# 验证文件头注释（[META] [WHY]）
mycodemap ci check-headers
mycodemap ci check-headers -d "src/domain"  # 指定目录
mycodemap ci check-headers -f "file1.ts,file2.ts"

# 评估变更风险
mycodemap ci assess-risk
mycodemap ci assess-risk -t 0.5             # 设置阈值 0.5
mycodemap ci assess-risk -f "changed.ts"

# 验证文档同步
mycodemap ci check-docs-sync
mycodemap ci check-docs-sync --root "/path"

# 验证输出契约
mycodemap ci check-output-contract
mycodemap ci check-output-contract -s v1.0.0 -k 8 -t 160

# 检查提交文件数量
mycodemap ci check-commit-size
mycodemap ci check-commit-size -m 15
```

### 支持的提交 TAG

`[REFACTOR]`, `[TEST]`, `[DOCS]`, `[FEAT]`, `[FIX]`, `[CHORE]`, `[PERF]`, `[SECURITY]`, `[BREAKING]`, `[HOTFIX]`, `[MIGRATION]`, `[WIP]`

---

## workflow - 工作流编排

### 生命周期管理

```bash
# 启动工作流
mycodemap workflow start "实现用户认证模块"
mycodemap workflow start "修复登录接口" --template bugfix

# 查看状态
mycodemap workflow status

# 可视化
mycodemap workflow visualize
mycodemap workflow visualize --timeline
mycodemap workflow visualize --results

# 推进阶段
mycodemap workflow proceed
mycodemap workflow proceed --force

# 检查点
mycodemap workflow checkpoint

# 列出/删除
mycodemap workflow list
mycodemap workflow delete "workflow-id"

# 恢复
mycodemap workflow resume
mycodemap workflow resume "workflow-id"
```

### 模板管理

```bash
mycodemap workflow template list              # 列出模板
mycodemap workflow template list --all        # 包含内置模板
mycodemap workflow template info bugfix       # 模板详情
mycodemap workflow template apply bugfix      # 应用模板
mycodemap workflow template recommend "任务"  # 推荐模板
```

### 内置模板

- `refactoring` - 重构任务
- `bugfix` - 缺陷修复
- `feature` - 新功能开发
- `hotfix` - 紧急修复

---

## server - HTTP 服务器

```bash
mycodemap server                             # 默认端口 3000
mycodemap server -p 8080                     # 指定端口
mycodemap server -h 127.0.0.1                # 指定主机
mycodemap server --cors                      # 启用 CORS
mycodemap server --open                      # 自动打开浏览器
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-p, --port <number>` | 服务器端口 | `3000` |
| `-h, --host <string>` | 服务器主机 | `0.0.0.0` |
| `--cors` | 启用 CORS | `false` |
| `--open` | 自动打开浏览器 | `false` |

### API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/health` | 健康检查 |
| GET | `/api/v1/stats` | 项目统计 |
| GET | `/api/v1/search/symbols?q=` | 符号搜索 |
| GET | `/api/v1/modules/:id` | 模块详情 |
| GET | `/api/v1/symbols/:id` | 符号详情 |
| POST | `/api/v1/analysis/impact` | 影响分析 |
| GET | `/api/v1/analysis/cycles` | 循环依赖检测 |
| GET | `/api/v1/graph` | 依赖图数据 |
| GET | `/api/v1/export/:format` | 数据导出 |

---

## 其他命令

### watch - 监听模式

```bash
mycodemap watch                              # 前台监听
mycodemap watch -d                           # 后台守护进程
mycodemap watch -s                           # 停止守护进程
mycodemap watch -t                           # 查看状态
mycodemap watch -m smart                     # 指定模式
```

### report - 生成报告

```bash
mycodemap report                             # 最近 7 天
mycodemap report -d 14                       # 最近 14 天
mycodemap report -o ./reports                # 输出目录
mycodemap report -j                          # JSON 输出
```

### logs - 日志管理

```bash
mycodemap logs list                          # 列出日志
mycodemap logs list -l 20                    # 限制 20 条
mycodemap logs list --level ERROR            # 仅错误
mycodemap logs export -d 30                  # 导出 30 天
mycodemap logs clear -d 30 --confirm         # 清理 30 天前
```

### export - 导出代码图

```bash
mycodemap export json                        # JSON 格式
mycodemap export graphml                     # GraphML (Gephi)
mycodemap export dot                         # DOT (Graphviz)
mycodemap export mermaid                     # Mermaid 语法
mycodemap export json -o ./output.json       # 指定输出
```

---

## 全局选项

所有命令支持：

| 选项 | 说明 |
|------|------|
| `-V, --version` | 显示版本号 |
| `-h, --help` | 显示帮助信息 |
| `--no-cache` | 禁用缓存（部分命令） |
