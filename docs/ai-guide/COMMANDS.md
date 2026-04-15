# AI Guide - 命令参考

> 完整的 CLI 命令详解
>
> CodeMap 是 AI-first 代码地图工具。以下文档记录当前公开命令，并补充已移除命令的迁移提示。  
> 当前 CLI 过渡现实：多数命令显式使用 `--json` 输出机器可读结果；`analyze` 额外支持 `--output-mode machine|human`。

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

**插件运行时说明**:
- `generate` 不提供独立 `--plugin` flags；插件通过 `mycodemap.config.json` 的 `plugins` 段声明。
- 只有显式存在 `plugins` 段时，`generate` 才会加载插件并运行 analyze / generate hooks。
- `AI_MAP.md` 会增加 `Plugin Summary`，`codemap.json` 会增加 `pluginReport`，stdout 会输出插件诊断摘要。

**图存储运行时说明**:
- `generate` 会读取 `mycodemap.config.json.storage`，并把 CodeGraph 写入所选后端。
- `storage.type` 支持 `filesystem`、`kuzudb`、`memory`、`auto`；默认是 `filesystem`。
- 旧的 `neo4j` 配置会直接报迁移错误；缺少 `kuzu` 时也会直接报错，不会静默 fallback 到 `filesystem`。
- `storage.type = "auto"` 当前仍保守走 `filesystem`；阈值字段是配置契约，不代表自动切换已完成。

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

### 当前公共契约：4 种分析意图

| 维度 | 当前公共契约 | 兼容说明 |
|------|--------------|----------|
| 输出契约 | 多数命令显式 `--json`，`analyze` 额外提供 `--output-mode machine|human` | `--structured --json` 会移除自然语言 `content` |
| analyze 意图 | `find` / `read` / `link` / `show` | legacy alias 会在输出中返回 `warnings[]`；`refactor` 直接报 `E0001_INVALID_INTENT` |

<!-- BEGIN GENERATED: analyze-commands-intents -->
```bash
# 1. find - 查找符号 / 文本
mycodemap analyze -i find -k "UnifiedResult"
mycodemap analyze -i find -t "src/orchestrator" -k "IntentRouter" --topK 20

# 2. read - 阅读文件（影响 + 复杂度）
mycodemap analyze -i read -t "src/index.ts"
mycodemap analyze -i read -t "src/index.ts" --scope transitive
mycodemap analyze -i read -t "src/index.ts" --include-tests

# 3. link - 关联关系（依赖 + 引用）
mycodemap analyze -i link -t "src/orchestrator"
mycodemap analyze -i link -t "src/interface/types.ts" --json

# 4. show - 模块概览 / 文档
mycodemap analyze -i show -t "src/"
mycodemap analyze -i show -t "src/domain/services" --output-mode human
```
<!-- END GENERATED: analyze-commands-intents -->

### 输出选项

<!-- BEGIN GENERATED: analyze-commands-output -->
```bash
# JSON 输出
mycodemap analyze -i read -t "src/index.ts" --json

# 纯结构化（移除自然语言字段）
mycodemap analyze -i link -t "src/index.ts" --structured --json

# 机器可读模式
mycodemap analyze -i show -t "src/index.ts" --output-mode machine

# 人类可读模式
mycodemap analyze -i show -t "src/index.ts" --output-mode human
```
<!-- END GENERATED: analyze-commands-output -->

### 通用选项

<!-- BEGIN GENERATED: analyze-commands-options -->
| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-i, --intent <type>` | 分析类型：`find`/`read`/`link`/`show`（必填） | - |
| `-t, --targets <paths...>` | 目标路径（`read`/`link`/`show` 必填，`find` 可选） | - |
| `-k, --keywords <words...>` | 搜索关键词（主要用于 `find`） | - |
| `-s, --scope <scope>` | 范围：`direct`（直接）/`transitive`（传递） | `direct` |
| `-n, --topK <number>` | 返回结果数量 | `8` |
| `--include-tests` | 包含测试文件关联 | - |
| `--include-git-history` | 包含 Git 历史分析 | - |
| `--json` | JSON 格式输出 | - |
| `--structured` | 纯结构化输出（移除自然语言字段，配合 `--json` 使用） | - |
| `--output-mode <mode>` | 输出模式：`machine`/`human` | `human` |
<!-- END GENERATED: analyze-commands-options -->

### legacy 兼容映射

- `search` → `find`
- `impact` / `complexity` → `read`
- `dependency` / `reference` → `link`
- `overview` / `documentation` → `show`
- `refactor` → `E0001_INVALID_INTENT`

---

## design - 设计契约输入、范围映射与验证

> `design` 为 human-authored design contract 提供正式输入面。默认文件名是 `mycodemap.design.md`，canonical 模板位于 `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`。

### validate

```bash
# 使用默认文件名
mycodemap design validate mycodemap.design.md --json

# 显式指定文件
mycodemap design validate docs/designs/login.design.md
```

### 必填 sections

| Section | 作用 |
|---------|------|
| `Goal` | 定义本次要达成的结果 |
| `Constraints` | 定义边界、兼容性和约束 |
| `Acceptance Criteria` | 定义可验证的成功标准 |
| `Non-Goals` | 明确本次不做什么，防止 scope drift |

### 输出与失败语义

- `--json` 输出纯结构化 diagnostics
- 缺失必填 section、重复 section、空 section、未知 heading 都会被显式报告
- blocker diagnostics 存在时命令返回非零 exit code

### map

```bash
# 先校验，再映射 candidate scope
mycodemap design validate mycodemap.design.md --json
mycodemap design map mycodemap.design.md --json
```

- `design map` 返回 `summary`、`candidates`、`diagnostics`、`unknowns`
- `candidates[]` 会同时暴露 `kind`、`path`、`reasons`、`dependencies`、`testImpact`、`risk`、`confidence`
- blocker diagnostics 包括 `no-candidates`、`over-broad-scope`、`high-risk-scope`
- 若 diagnostics 中存在 blocker，命令返回非零 exit code

### handoff

```bash
# 先固定 design input / scope，再生成 handoff package
mycodemap design validate mycodemap.design.md --json
mycodemap design map mycodemap.design.md --json
mycodemap design handoff mycodemap.design.md --json
```

- `design handoff` 返回 `readyForExecution`、`approvals`、`assumptions`、`openQuestions`
- human mode 默认写入 `.mycodemap/handoffs/{stem}.handoff.md|json`
- `--json` 保持纯 JSON，不混入 prose
- review-needed 通过 `readyForExecution=false` 表达；只有 blocker diagnostics 才返回非零 exit code

### verify

```bash
# 使用 reviewed handoff truth 做 checklist / drift 校验
mycodemap design validate mycodemap.design.md --json
mycodemap design map mycodemap.design.md --json
mycodemap design handoff mycodemap.design.md --json
mycodemap design verify mycodemap.design.md --json
```

- `design verify` 返回 `summary`、`checklist`、`drift`、`diagnostics`
- `checklist[]` 直接来自 `Acceptance Criteria`，并保留 `status` + `evidenceRefs`
- `drift[]` 至少区分 `scope-extra`、`acceptance-unverified`、`handoff-missing`
- review-needed 通过 `readyForExecution=false` + warning diagnostics 表达；只有 `ok=false` 或 blocker diagnostics 才返回非零 exit code

---

## ci - CI 门禁

### 子命令

```bash
# 验证工作区是否干净
mycodemap ci check-working-tree

# 验证当前分支是否允许执行发布前检查
mycodemap ci check-branch
mycodemap ci check-branch --allow "main,release/*"

# 运行发布前脚本集合
mycodemap ci check-scripts

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

> `ci check-docs-sync` 会串联 `scripts/validate-docs.js` 与 `scripts/sync-analyze-docs.js --check`，同时校验文档护栏和 analyze generated block。

# 验证输出契约
mycodemap ci check-output-contract
mycodemap ci check-output-contract -s v1.0.0 -k 8 -t 160

# 检查提交文件数量
mycodemap ci check-commit-size
mycodemap ci check-commit-size -m 15
```

> `ship` 的 CHECK 阶段会复用 `ci check-working-tree`、`ci check-branch`、`ci check-scripts` 这三条发布前 gate checks。
> `ci check-branch --allow` 支持 `*` 通配；`ci check-headers -d` 与 `generate` / `analyze` 共享同一套 `.gitignore` 感知排除规则，在没有 `.gitignore` 时回退到默认 `exclude`。

### 支持的提交 TAG

`[REFACTOR]`, `[TEST]`, `[DOCS]`, `[FEAT]`, `[FIX]`, `[CHORE]`, `[PERF]`, `[SECURITY]`, `[BREAKING]`, `[HOTFIX]`, `[MIGRATION]`, `[WIP]`

---

## workflow - 分析型工作流编排

> `workflow` 只保留 `find → read → link → show` 四个分析阶段；代码实现、commit 检查与 CI 运行不再作为 workflow phase 建模。

### 阶段模型

| 阶段 | 对应 analyze 意图 | 用途 |
|------|-------------------|------|
| `find` | `analyze -i find` | 查找候选符号、文件与关键词线索 |
| `read` | `analyze -i read` | 阅读影响范围、复杂度与上下文 |
| `link` | `analyze -i link` | 汇总依赖、引用与关联关系 |
| `show` | `analyze -i show` | 生成概览、摘要与展示型结果 |

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

> 所有内置模板复用同一 4 阶段顺序，只调整描述与阶段阈值。

---

## 已移除的公共命令

以下命令已从 public CLI 移除；直接调用时，CLI 会显式失败并给出迁移提示，而不是继续执行旧功能。

| 命令 | 当前状态 | 迁移方式 |
|------|----------|----------|
| `server` | 已从 public CLI 移除 | `Server Layer` 仍是内部架构层，不等于公开 `mycodemap server` 命令 |
| `watch` | 已从 public CLI 移除 | 改用一次性的 `mycodemap generate` 刷新代码地图 |
| `report` | 已从 public CLI 移除 | 直接读取 `.mycodemap/AI_MAP.md`，或使用 `mycodemap export <format>` |
| `logs` | 已从 public CLI 移除 | 直接读取 `.mycodemap/logs/` 下的日志文件 |

### export - 导出代码图

```bash
mycodemap export json                        # JSON 格式
mycodemap export graphml                     # GraphML (Gephi)
mycodemap export dot                         # DOT (Graphviz)
mycodemap export mermaid                     # Mermaid 语法
mycodemap export json -o ./output.json       # 指定输出
```

- `export json|graphml|dot` 会从 `mycodemap.config.json.storage` 指定的后端读取 CodeGraph。
- `export mermaid` 仍直接读取 `.mycodemap/codemap.json`，这是当前保留的文件出口，不代表 graph backend 未接入主路径。
- 图存储后端收口不等于重新开放公共 `mycodemap server` 产品面；`Server Layer` 仍是内部层。

---

### ship - 一键智能发布（非代码地图首屏能力）

> `ship` 负责发布整合，不是 AI-first 代码地图工具的首屏入口；首次接触项目时优先使用分析命令而非发布命令。

```bash
mycodemap ship                              # 完整发布流程
mycodemap ship --dry-run                   # 仅分析，不发布
mycodemap ship --verbose                   # 显示详细输出
mycodemap ship --yes                       # 置信度 60-75 时自动确认
```

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--dry-run` | 仅分析变更，不执行发布 | `false` |
| `--verbose` | 显示详细输出 | `false` |
| `--yes, -y` | 置信度 60-75 时自动确认 | `false` |

**发布流程:**
1. **ANALYZE** - 分析 git commits，检测变更类型
2. **VERSION** - 基于 conventional commits 计算版本号
3. **CHECK** - mustPass/shouldPass 检查 + 置信度评分
4. **PUBLISH** - 创建版本提交 + git tag + push 触发 GitHub Actions
5. **MONITOR** - GitHub Actions CI 状态监控

**置信度判定:**
- `>= 75`: 自动发布
- `60-75`: 需确认
- `< 60`: 阻止发布

**前置条件:**
- 工作区干净
- 在 main/master 分支
- 所有检查通过（由 `ci check-working-tree`、`ci check-branch`、`ci check-scripts` 统一提供）

---

## 全局选项

所有命令支持：

| 选项 | 说明 |
|------|------|
| `-V, --version` | 显示版本号 |
| `-h, --help` | 显示帮助信息 |
| `--no-cache` | 禁用缓存（部分命令） |
