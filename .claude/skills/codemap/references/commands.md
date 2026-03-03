# CodeMap 命令参考

## 生成与分析

### codemap generate

分析项目并生成代码地图文件。

```bash
codemap generate                    # 使用默认 hybrid 模式
codemap generate -m smart          # 使用 smart 模式（AST 深度分析）
codemap generate -m fast            # 使用 fast 模式（正则匹配）
codemap generate -o ./docs/codemap  # 指定输出目录
codemap generate --ai-context       # 为每个文件生成 AI 描述
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式：`fast`、`smart`、`hybrid` | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.codemap` |
| `--ai-context` | 生成 AI 描述（需配置 AI Provider） | - |

### codemap init

初始化项目的 CodeMap 配置文件。

```bash
codemap init          # 交互式创建配置
codemap init -y       # 使用默认配置直接创建
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
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-s, --symbol <name>` | 精确查询符号 | - |
| `-m, --module <path>` | 查询模块信息 | - |
| `-d, --deps <name>` | 查询依赖关系 | - |
| `-S, --search <word>` | 模糊搜索 | - |
| `-l, --limit <number>` | 限制结果数量 | `20` |
| `-j, --json` | JSON 格式输出 | - |

### codemap deps

分析并输出模块的依赖关系树。

```bash
codemap deps                     # 查看所有模块的依赖统计
codemap deps -m "src/parser"    # 查看指定模块的依赖树
codemap deps -m "src/parser" -j # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --module <path>` | 查询指定模块的依赖 | - |
| `-j, --json` | JSON 格式输出 | - |

### codemap cycles

检测项目中的循环依赖。

```bash
codemap cycles
```

---

## 分析命令

### codemap complexity

分析代码复杂度，输出圈复杂度、认知复杂度和可维护性指数。

```bash
codemap complexity                  # 分析整个项目的复杂度
codemap complexity -f src/cli/index.ts  # 分析指定文件
codemap complexity -j              # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | 查看指定文件的复杂度 | - |
| `-j, --json` | JSON 格式输出 | - |

### codemap impact

评估指定文件或模块变更的影响范围。

```bash
codemap impact -f src/cli/index.ts         # 分析指定文件的变更影响
codemap impact -f src/cli/index.ts --transitive  # 包含传递依赖
codemap impact -f src/cli/index.ts -j     # JSON 格式输出
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-f, --file <path>` | **必填** 指定要分析的文件 | - |
| `-t, --transitive` | 包含传递依赖（间接影响） | - |
| `-j, --json` | JSON 格式输出 | - |

### codemap analyze

统一分析入口，支持多意图路由。

```bash
codemap analyze "分析 tool-orchestrator 的影响范围"
codemap analyze --intent impact --file src/cli/index.ts
codemap analyze --intent dependency --file src/cli/index.ts
codemap analyze --intent search "UnifiedResult"
```

---

## 监听命令

### codemap watch

监听文件变更并自动增量更新代码地图。

```bash
codemap watch                 # 前台运行
codemap watch -d              # 以后台守护进程运行
codemap watch -s              # 停止后台守护进程
codemap watch -t              # 查看守护进程状态
codemap watch -m smart        # 使用 smart 模式监听
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-m, --mode <mode>` | 分析模式 (fast/smart/hybrid) | `hybrid` |
| `-o, --output <dir>` | 输出目录 | `.codemap` |
| `-d, --detach` | 以后台守护进程方式运行 | - |
| `-s, --stop` | 停止后台守护进程 | - |
| `-t, --status` | 查看后台守护进程状态 | - |

---

## 工作流命令

### codemap workflow

启动和管理 6 阶段智能工作流。

```bash
# 启动工作流
codemap workflow start "实现用户认证模块"
codemap workflow start "修复登录接口500" --template bugfix

# 状态与可视化
codemap workflow status
codemap workflow visualize
codemap workflow visualize --timeline
codemap workflow visualize --results

# 阶段控制
codemap workflow proceed
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
1. `reference` - 参考搜索
2. `impact` - 影响分析
3. `risk` - 风险评估
4. `implementation` - 代码实现
5. `commit` - 提交验证
6. `ci` - CI 验证

---

## CI 门禁命令

### codemap ci

CI 阶段自动检查。

```bash
# 提交格式检查
codemap ci check-commits
codemap ci check-commits --range origin/main..HEAD

# 文件头注释检查
codemap ci check-headers

# 风险评估
codemap ci assess-risk
codemap ci assess-risk -f src/cache/lru-cache.ts
codemap ci assess-risk --threshold 0.7

# 输出契约验证
codemap ci check-output-contract
```

| 命令 | 说明 |
|------|------|
| `check-commits` | 检查提交格式 `[TAG] scope: message` |
| `check-headers` | 检查文件头 `[META]`, `[WHY]` |
| `assess-risk` | 基于 Git 历史评估变更风险 |
| `check-output-contract` | 验证输出契约 |

---

## 模式说明

| 模式 | 速度 | 精度 | 适用场景 |
|------|------|------|----------|
| `fast` | 极快 | 基本结构 | 日常开发、大型项目快速预览 |
| `smart` | 较慢 | 完整语义 | 深度分析、复杂度评估、类型推导 |
| `hybrid` | 自动 | 自适应 | **推荐** - 文件数<50用fast，≥50用smart |
