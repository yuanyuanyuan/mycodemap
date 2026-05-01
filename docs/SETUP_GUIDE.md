# MyCodeMap 安装与配置指南

> 面向人类开发者的完整安装、配置和使用指南

---

## 目录

1. [快速开始](#快速开始)
2. [安装方式](#安装方式)
3. [初始化配置](#初始化配置)
4. [日常使用](#日常使用)
5. [AI 助手集成](#ai-助手集成)
6. [CI/CD 集成](#cicd-集成)
7. [故障排除](#故障排除)

---

## 快速开始

### 5 分钟上手

```bash
# 1. 安装
npm install -g @mycodemap/mycodemap

# 2. 在项目根目录初始化
mycodemap init -y

# 3. 生成代码地图
mycodemap generate

# 4. 查看结果
ls .mycodemap/
```

---

## 安装方式

### 方式一：全局安装（推荐）

```bash
npm install -g @mycodemap/mycodemap
```

**优点**：
- 所有项目可用
- 直接使用 `mycodemap` 命令

### 方式二：项目本地安装

```bash
npm install --save-dev @mycodemap/mycodemap
```

**使用**：
```bash
npx mycodemap --help
```

**优点**：
- 版本锁定
- 团队协作一致
- 可作为 npm 脚本使用

### 方式三：使用 npx（无需安装）

```bash
npx @mycodemap/mycodemap --help
```

**适用场景**：
- 临时使用
- CI/CD 环境

---

## 初始化配置

### 交互式初始化

```bash
mycodemap init
```

默认会显示 reconciliation preview，并说明哪些资产会被创建、迁移、跳过或需要人工处理。

### 使用默认配置

```bash
mycodemap init -y
```

执行后会收敛 canonical 配置 `.mycodemap/config.json`，并把 receipt 写入 `.mycodemap/status/init-last.json`。

`init` 会同步 `.mycodemap/hooks/` 与 `.mycodemap/rules/`，但不会自动改写 `CLAUDE.md` / `AGENTS.md`；相关引用片段会通过 receipt 提示你手动加入。

生成的 canonical 配置文件 `.mycodemap/config.json`：

```json
{
  "$schema": "https://mycodemap.dev/schema/config.json",
  "mode": "hybrid",
  "include": ["src/**/*.ts"],
  "exclude": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/*.d.ts"
  ],
  "output": ".mycodemap",
  "watch": false,
  "storage": {
    "type": "filesystem",
    "outputPath": ".mycodemap/storage"
  },
  "plugins": {
    "builtInPlugins": true,
    "plugins": [],
    "debug": false
  }
}
```

### 配置选项详解

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `mode` | string | `"hybrid"` | 分析模式：`fast`（快速正则）、`smart`（AST深度分析）、`hybrid`（自动选择） |
| `include` | string[] | `["src/**/*.ts"]` | 包含的文件 glob 模式 |
| `exclude` | string[] | 见上 | 排除的文件 glob 模式 |
| `output` | string | `".mycodemap"` | 输出目录路径 |
| `watch` | boolean | `false` | 监听模式预留配置 |
| `storage.type` | string | `"filesystem"` | 图存储后端类型：`filesystem` / `sqlite` / `memory` / `auto` |
| `storage.outputPath` | string | `".mycodemap/storage"` | 文件系统存储目录 |
| `storage.databasePath` | string | `".mycodemap/governance.sqlite"` | SQLite 数据库文件路径（相对项目根目录，建议放在 `.mycodemap/` 下） |
| `plugins.builtInPlugins` | boolean | `true` | 是否启用内置插件 |
| `plugins.pluginDir` | string | - | 额外插件目录 |
| `plugins.plugins` | string[] | `[]` | 显式加载的插件名称列表 |
| `plugins.debug` | boolean | `false` | 是否输出插件调试日志 |

### 图存储后端配置

- `generate` 会把 CodeGraph 写入 `storage` 指定的后端；`export json|graphml|dot` 会从同一后端读取。
- 选择 `sqlite` 时建议落盘到 `.mycodemap/governance.sqlite`；也可通过 `storage.databasePath` 覆盖。
- 旧的 `neo4j` / `kuzudb` 配置已不再受支持，会返回显式迁移错误，不会静默 fallback 到 `filesystem`。
- 显式选择 `sqlite` 且运行时缺少 `better-sqlite3` 或 Node.js `<20` 时，会返回显式错误。
- `storage.type = "auto"` 当前优先选择 `sqlite`；仅当 SQLite 运行时不可用时才 warning 后回退到 `filesystem`。

---

## 日常使用

### 生成代码地图

```bash
# 默认 hybrid 模式
mycodemap generate

# 指定模式
mycodemap generate -m smart

# 指定输出目录
mycodemap generate -o ./docs/codemap
```

### 查询代码

```bash
# 查询符号
mycodemap query -s "ModuleInfo"

# 查询模块
mycodemap query -m "src/parser"

# 模糊搜索
mycodemap query -S "cache" -l 10

# JSON 输出
mycodemap query -s "IntentRouter" -j
```

### 依赖分析

```bash
# 查看所有依赖
mycodemap deps

# 查看指定模块依赖
mycodemap deps -m "src/parser"

# 检测循环依赖
mycodemap cycles
```

### 影响范围分析

```bash
# 分析文件变更影响
mycodemap impact -f src/cli/index.ts

# 包含传递依赖
mycodemap impact -f src/cli/index.ts --transitive
```

### 统一分析（analyze）

```bash
# 搜索符号或文件
mycodemap analyze -i find -k "UnifiedResult" --topK 10

# 读取代码范围
mycodemap analyze -i read -t src/cli/index.ts
mycodemap analyze -i read -t src/cli/index.ts --scope transitive --include-tests

# 查看模块依赖关系
mycodemap analyze -i link -t src/orchestrator

# 展示项目概览或复杂度
mycodemap analyze -i show -t src/

# JSON 结构化输出
mycodemap analyze -i find -k "UnifiedResult" --json --structured
```

### 工作流编排（workflow）

```bash
# 启动工作流
mycodemap workflow start "实现用户认证模块"
mycodemap workflow start "修复登录接口 500" --template bugfix

# 查看当前状态
mycodemap workflow status

# 可视化工作流
mycodemap workflow visualize

# 推进到下一阶段
mycodemap workflow proceed

# 列出所有工作流
mycodemap workflow list
```

### CI 门禁（ci）

```bash
# 检查提交格式
mycodemap ci check-commits
mycodemap ci check-commits -c 5

# 检查文件头注释
mycodemap ci check-headers
mycodemap ci check-headers -d src/domain

# 评估变更风险
mycodemap ci assess-risk
mycodemap ci assess-risk -t 0.5

# 验证输出契约
mycodemap ci check-output-contract

# 检查提交文件数量
mycodemap ci check-commit-size
```

### 已移除的公共 CLI 命令

以下命令已从 public CLI 移除；如果旧脚本仍在调用，请按下表迁移：

| 已移除命令 | 迁移方式 |
|------------|----------|
| `watch` | 改用一次性的 `mycodemap generate` 刷新代码地图 |
| `report` | 直接读取 `.mycodemap/AI_MAP.md`，或使用 `mycodemap export <format>` |
| `logs` | 直接读取 `.mycodemap/logs/` 下的日志文件 |
| `server` | 公共 CLI 已移除；`Server Layer` 仍是内部架构层，不等于公开 `mycodemap server` 命令 |

---

## AI 助手集成

MyCodeMap 可以与多种 AI 编程助手集成，提升代码理解效率。

### 支持的 AI 助手

| AI 助手 | 配置方式 | 详细文档 |
|---------|----------|----------|
| Kimi CLI | Skill 配置 | [AI_ASSISTANT_SETUP.md](./AI_ASSISTANT_SETUP.md#kimi-cli) |
| Claude Code | Skill 配置 | [AI_ASSISTANT_SETUP.md](./AI_ASSISTANT_SETUP.md#claude-code) |
| Codex CLI | Agent 配置 | [AI_ASSISTANT_SETUP.md](./AI_ASSISTANT_SETUP.md#codex-cli) |
| GitHub Copilot | 提示词模板 | [AI_ASSISTANT_SETUP.md](./AI_ASSISTANT_SETUP.md#github-copilot) |

### 快速配置

#### Kimi CLI

```bash
# 复制示例配置到项目
cp node_modules/@mycodemap/mycodemap/examples/kimi/codemap-skill.md .kimi/skills/codemap/SKILL.md
```

#### Claude Code

```bash
# 复制示例配置
cp node_modules/@mycodemap/mycodemap/examples/claude/codemap-skill.md .claude/skills/codemap/SKILL.md
```

#### Codex CLI

```bash
# 复制示例配置
cp node_modules/@mycodemap/mycodemap/examples/codex/codemap-agent.md .agents/skills/codemap/SKILL.md
```

详细配置步骤请参考 [AI_ASSISTANT_SETUP.md](./AI_ASSISTANT_SETUP.md)。

---

## CI/CD 集成

### Git Hooks（本地门禁）

#### 自动安装

```bash
# 安装 Git hooks
npm run postinstall  # 如果 package.json 中配置了

# 或手动安装
sh scripts/hooks/install-hooks.sh
```

#### 手动配置

如果项目没有提供 hooks 安装脚本，可以手动配置：

```bash
# 创建 .githooks 目录
mkdir -p .githooks

# 创建 pre-commit hook
cat > .githooks/pre-commit << 'EOF'
#!/bin/sh
# MyCodeMap pre-commit check

if ! command -v mycodemap &> /dev/null; then
    exit 0
fi

# 可选：运行测试
# npm test

# 可选：当改动 README / docs / CLI 示例时检查文档护栏
# npm run docs:check

# 可选：检查文件头
# mycodemap ci check-headers

exit 0
EOF

chmod +x .githooks/pre-commit

# 配置 git 使用自定义 hooks 目录
git config core.hookspath .githooks
```

### GitHub Actions

创建 `.github/workflows/codemap.yml`：

```yaml
name: CodeMap CI

on: [push, pull_request]

jobs:
  codemap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci

      - name: Validate docs sync
        run: npm run docs:check

      - name: Run typecheck
        run: npm run typecheck
      
      - name: Run tests
        run: npm test
      
      - name: Check commits
        run: npx mycodemap ci check-commits --range origin/main..HEAD

      - name: Check docs sync via CLI
        run: npx mycodemap ci check-docs-sync
      
      - name: Check commit size
        run: npx mycodemap ci check-commit-size --range origin/main..HEAD
      
      - name: Check headers
        run: npx mycodemap ci check-headers

      - name: Assess risk
        run: npx mycodemap ci assess-risk --threshold=0.7
      
      - name: Generate AI feed
        run: npx mycodemap generate
      
      - name: Check AI feed sync
        run: git diff --exit-code .mycodemap/ai-feed.txt

      - name: Check output contract
        run: npx mycodemap ci check-output-contract --schema-version v1.0.0 --top-k 8 --max-tokens 160
```

### 其他 CI 平台

参考 [CI_GATEWAY_DESIGN.md](./design-docs/CI_GATEWAY_DESIGN.md) 了解所有检查项。

---

## 故障排除

### 常见问题

#### 1. 命令未找到

```bash
# 检查是否安装
which mycodemap

# 全局安装后可能需要刷新 shell hash
hash -r

# 或使用 npx
npx mycodemap --help
```

#### 2. 配置文件未找到

```bash
# 确认 canonical 配置文件存在
ls .mycodemap/config.json

# 重新初始化
mycodemap init -y
```

#### 3. 权限问题

```bash
# 检查文件权限
ls -la .mycodemap/

# 修复权限
chmod -R u+rw .mycodemap/
```

#### 4. tree-sitter 构建失败

某些环境可能需要安装构建工具：

```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# macOS
xcode-select --install
```

### 获取帮助

```bash
# 查看帮助
mycodemap --help

# 查看子命令帮助
mycodemap generate --help

# 查看版本
mycodemap --version
```

### 日志与调试

CLI 运行日志默认写入 `.mycodemap/logs/mycodemap-YYYY-MM-DD.log`

环境变量：
- `CODEMAP_RUNTIME_LOG_ENABLED=false`：关闭运行日志
- `CODEMAP_RUNTIME_LOG_DIR=<dir>`：自定义日志目录
- `CODEMAP_RUNTIME_LOG_RETENTION_DAYS=<days>`：设置保留天数

---

## 下一步

- 了解 [AI 助手配置](./AI_ASSISTANT_SETUP.md)
- 查看 [CLI 完整命令参考](../README.md#cli-命令)
- 阅读 [架构设计文档](./design-docs/REFACTOR_ARCHITECTURE_OVERVIEW.md)
