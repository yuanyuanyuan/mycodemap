# MyCodeMap NPM 发布设计方案

> 版本: 2.0
> 日期: 2026-03-04
> 状态: 最终方案（待实施）

---

## 1. 概述

### 1.1 目标

将 CodeMap 工具发布到 NPM，使用户可以通过 `npx @mycodemap/mycodemap` 方式在其他项目中使用，同时建立完善的日志反馈机制便于问题排查。

### 1.2 核心设计原则

1. **开箱即用** - tree-sitter 自带预编译 binary，覆盖主流平台
2. **友好引导** - 首次使用提供交互式配置向导
3. **问题可追踪** - 完整的日志系统 + 一键上报机制
4. **品牌一致** - 所有内容统一使用 `mycodemap`
5. **日志增强** - 命令导出 + 错误提示

---

## 2. 包配置

### 2.1 命名规范

| 项目 | 命名 |
|------|------|
| npm 包名 | `@mycodemap/mycodemap` |
| CLI 命令 | `mycodemap` |
| 配置文件 | `mycodemap.config.json` |
| Schema 文件 | `mycodemap.config.schema.json` |
| 输出目录 | `.mycodemap` |
| 日志目录 | `.mycodemap/logs` |

### 2.2 package.json 变更

```json
{
  "name": "@mycodemap/mycodemap",
  "version": "0.1.0",
  "description": "TypeScript 代码地图工具 - 为 AI 辅助开发提供结构化上下文",
  "main": "dist/index.js",
  "type": "module",
  "bin": {
    "mycodemap": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "LICENSE",
    "README.md",
    "mycodemap.config.schema.json",
    "CHANGELOG.md"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit",
    "benchmark": "bash scripts/run-benchmark.sh",
    "test:all": "npm run test && npm run benchmark",
    "prepublishOnly": "npm run build && npm test"
  },
  "keywords": [
    "typescript",
    "mycodemap",
    "codemap",
    "code-analysis",
    "ai",
    "developer-tools",
    "static-analysis"
  ],
  "author": "<需要填写>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/<your-github-username>/mycodemap.git"
  },
  "bugs": {
    "url": "https://github.com/<your-github-username>/mycodemap/issues"
  },
  "homepage": "https://github.com/<your-github-username>/mycodemap#readme",
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

---

## 3. 代码改动清单

### 3.1 环境变量（全部重命名）

| 原名 | 新名 | 文件位置 |
|------|------|----------|
| `CODEMAP_RUNTIME_LOG_ENABLED` | `MYCODEMAP_RUNTIME_LOG_ENABLED` | src/cli/runtime-logger.ts |
| `CODEMAP_RUNTIME_LOG_DIR` | `MYCODEMAP_RUNTIME_LOG_DIR` | src/cli/runtime-logger.ts |
| `CODEMAP_RUNTIME_LOG_RETENTION_DAYS` | `MYCODEMAP_RUNTIME_LOG_RETENTION_DAYS` | src/cli/runtime-logger.ts |
| `CODEMAP_RUNTIME_LOG_MAX_FILES` | `MYCODEMAP_RUNTIME_LOG_MAX_FILES` | src/cli/runtime-logger.ts |
| `CODEMAP_RUNTIME_LOG_MAX_SIZE_MB` | `MYCODEMAP_RUNTIME_LOG_MAX_SIZE_MB` | src/cli/runtime-logger.ts |

### 3.2 日志配置

| 项目 | 原值 | 新值 | 文件位置 |
|------|------|------|----------|
| 日志目录 | `.codemap/logs` | `.mycodemap/logs` | src/cli/runtime-logger.ts:10 |
| 日志前缀 | `codemap-` | `mycodemap-` | src/cli/runtime-logger.ts:14 |

### 3.3 CLI 配置

| 项目 | 原值 | 新值 | 文件位置 |
|------|------|------|----------|
| CLI 名称 | `codemap` | `mycodemap` | src/cli/index.ts:25 |
| 默认输出目录 | `.codemap` | `.mycodemap` | src/cli/index.ts:39,47 |

### 3.4 配置文件

| 项目 | 原值 | 新值 | 文件位置 |
|------|------|------|----------|
| 配置文件名 | `codemap.config.json` | `mycodemap.config.json` | src/cli/commands/init.ts:8,37 |
| Schema URL | `https://codemap.dev/schema.json` | `./mycodemap.config.schema.json` | src/cli/commands/init.ts:21 |
| 默认输出目录 | `.codemap` | `.mycodemap` | src/cli/commands/init.ts:31 |

### 3.5 输出目录（所有引用）

| 文件 | 改动 |
|------|------|
| src/cli/commands/init.ts | 配置文件名、schema URL、输出目录、提示信息全部更新 |
| src/generator/index.ts | `codemap.json` → `mycodemap.json` |
| src/orchestrator/workflow/ci-executor.ts | `codemap.json` → `mycodemap.json` |
| src/cli/commands/generate.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/watch.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/watch-foreground.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/query.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/deps.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/cycles.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/complexity.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/impact.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/analyze.ts | `.codemap` → `.mycodemap` |
| src/cli/commands/init.ts | `.codemap` → `.mycodemap` |
| src/cache/index.ts | `.codemap` → `.mycodemap` |
| src/generator/file-describer.ts | `.codemap` → `.mycodemap` |
| src/orchestrator/adapters/codemap-adapter.ts | `.codemap` → `.mycodemap` |
| src/orchestrator/workflow/config.ts | `.codemap` → `.mycodemap` |
| src/orchestrator/workflow/workflow-persistence.ts | `.codemap` → `.mycodemap` |
| src/orchestrator/workflow/workflow-orchestrator.ts | `.codemap` → `.mycodemap` |
| src/orchestrator/workflow/templates.ts | `.codemap` → `.mycodemap` |
| src/orchestrator/workflow/ci-executor.ts | `.codemap` → `.mycodemap` |

---

## 4. 新增文件

### 4.1 mycodemap.config.schema.json

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MyCodeMap Configuration",
  "description": "Configuration schema for MyCodeMap - TypeScript code analysis tool",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "$schema": {
      "type": "string",
      "description": "JSON Schema reference"
    },
    "mode": {
      "type": "string",
      "enum": ["fast", "smart", "hybrid"],
      "default": "hybrid",
      "description": "Analysis mode: fast (regex), smart (AST), or hybrid (auto-select)"
    },
    "include": {
      "type": "array",
      "items": { "type": "string" },
      "default": ["src/**/*.ts"],
      "description": "Glob patterns for files to include in analysis"
    },
    "exclude": {
      "type": "array",
      "items": { "type": "string" },
      "default": ["node_modules/**", "dist/**", "build/**", "*.test.ts", "*.spec.ts"],
      "description": "Glob patterns for files to exclude from analysis"
    },
    "output": {
      "type": "string",
      "default": ".mycodemap",
      "description": "Output directory for generated code maps"
    },
    "plugins": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of plugins to enable"
    },
    "complexity": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "maxComplexity": { "type": "number", "default": 10 }
      }
    }
  }
}
```

### 4.2 .npmignore

```
# 开发/构建产物
src/
tests/
coverage/
*.ts
!*.d.ts
tsconfig*.json
vitest*.config.*
*.map

# 项目特有
.agents
.claude/
.git/
.githooks/
.github/
.gitignore
.vscode/
.idea/

# 临时文件
*.log
*.tmp
.DS_Store

# 文档（仅保留根目录的 README.md）
docs/
*.md
!README.md
```

### 4.3 CHANGELOG.md

```markdown
# Changelog

## [0.1.0] - 2026-03-04

### Added
- 初始发布
- 双层解析模式 (fast/smart)
- 代码地图生成 (AI_MAP.md, mycodemap.json)
- 依赖图分析
- 复杂度分析
- 循环依赖检测
- 变更影响分析
- CI 门禁集成
- 运行日志系统
```

---

## 5. 脚本和 CI 更新

### 5.1 scripts/hooks/pre-commit

```
npx mycodemap generate --quiet >/dev/null 2>&1 &
```

### 5.2 .githooks/pre-commit

```
npx mycodemap generate --quiet >/dev/null 2>&1 &
```

### 5.2 .github/workflows/ci-gateway.yml

```yaml
- run: npx mycodemap ci check-commits --range origin/main..HEAD
- run: npx mycodemap ci check-headers
- run: npx mycodemap generate
- run: npx mycodemap ci assess-risk --threshold=0.7
- run: npx mycodemap ci check-output-contract --schema-version v1.0.0 --top-k 8 --max-tokens 160
```

---

## 6. .gitignore 更新

添加以下条目：

```
.mycodemap
.mycodemap/
*.mycodemap.json
```

---

## 7. 日志功能增强

### 7.1 命令行功能

```bash
mycodemap logs          # 查看日志列表
mycodemap logs export  # 导出日志为 zip
mycodemap logs clear   # 清理日志
```

### 7.2 错误提示增强

当程序出错时，自动提示：

```
❌ 出错了！请将以下信息提交到 issue:
   - 日志文件: .mycodemap/logs/mycodemap-2026-03-04.log
   - 运行命令: mycodemap generate
   - 复现步骤: ...
```

---

## 8. 发布流程

### 8.1 发布前检查清单

```bash
# 1. 构建项目
npm run build

# 2. 运行测试
npm test

# 3. 生成代码地图（自检）
node dist/cli/index.js generate
```

### 8.2 发布命令

```bash
# 登录 npm（首次需要）
npm login

# 发布
npm publish --access public
```

### 8.3 发布后验证

```bash
# 验证包是否发布成功
npm view @mycodemap/mycodemap

# 本地测试 npx 方式运行
npx @mycodemap/mycodemap --version
```

---

## 9. 改动统计

| 类别 | 数量 |
|------|------|
| 环境变量 | 5 |
| 日志配置 | 2 |
| CLI 配置 | 2 |
| 配置文件 | 2 |
| 输出目录 | ~20 |
| 脚本更新 | 2 |
| CI 更新 | 5 |
| 新增文件 | 3 |

---

## 10. 待填写信息

发布前需要填写以下信息：

- [ ] author: npm 账号名称和邮箱
- [ ] repository.url: GitHub 仓库地址
- [ ] bugs.url: GitHub Issues 地址
- [ ] homepage: 项目主页地址
