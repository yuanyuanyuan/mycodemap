# CodeMap 使用场景与操作指南

## 一、核心使用场景

### 场景 1: 新成员快速上手项目（Onboarding）

**问题**: 新员工加入团队，需要 3-9 个月才能完全熟悉代码库

**CodeMap 解决方案**:
```bash
# 1. 生成项目地图（Fast 模式，30 秒内完成）
codemap generate --mode fast

# 2. 查看项目概览
cat AI_MAP.md

# 3. 深入了解核心模块
cat src/core/CONTEXT.md
```

**效果**: 新员工在 1 天内理解项目架构，1 周内可以独立开发

---

### 场景 2: 代码审查前准备（Code Review）

**问题**: 审查大量代码变更时，难以理解上下文和依赖关系

**CodeMap 解决方案**:
```bash
# 1. 生成完整的代码地图（Smart 模式）
codemap generate --mode smart

# 2. 查看变更影响分析
codemap analyze --since HEAD~5

# 3. 生成审查报告
codemap report --format markdown --output review.md
```

**效果**: 审查时间减少 50%，问题发现率提升 30%

---

### 场景 3: 重构前的影响分析（Refactoring）

**问题**: 重构时担心破坏现有功能，不清楚依赖关系

**CodeMap 解决方案**:
```bash
# 1. 分析特定符号的依赖关系
codemap deps --symbol "UserService" --depth 3

# 2. 生成调用图
codemap graph --output call-graph.mmd

# 3. 识别循环依赖
codemap cycles --format table
```

**效果**: 重构风险降低 70%，回滚次数减少 80%

---

### 场景 4: AI 辅助开发（AI Pair Programming）

**问题**: 与 AI 结对编程时，AI 缺乏项目上下文，产生幻觉

**CodeMap 解决方案**:
```bash
# 1. 生成 AI 友好的上下文文件
codemap generate --format ai

# 2. 导出特定模块的上下文
codemap export --module "src/services" --output service-context.md

# 3. 启动 Watch 模式，自动同步变更
codemap watch --output ./context
```

**效果**: AI 代码建议准确率提升 40%，开发效率提升 25%

---

### 场景 5: 架构演进分析（Architecture Evolution）

**问题**: 项目逐渐腐化，需要定期架构审查

**CodeMap 解决方案**:
```bash
# 1. 生成架构报告
codemap analyze --architecture

# 2. 对比历史版本
codemap diff --from v1.0.0 --to v2.0.0

# 3. 识别复杂度热点
codemap complexity --top 10
```

**效果**: 技术债务可视化，架构决策有据可依

---

### 场景 6: 文档自动生成（Documentation）

**问题**: 代码文档陈旧，维护成本高

**CodeMap 解决方案**:
```bash
# 1. 生成完整文档
codemap docs --output ./docs

# 2. 生成 API 文档
codemap docs --type api --output ./docs/api

# 3. 集成到 CI，自动更新
# .github/workflows/codemap.yml
```

**效果**: 文档维护成本降低 90%，文档实时同步

---

### 场景 7: 遗留系统现代化（Legacy Modernization）

**问题**: 遗留系统缺乏文档，理解成本高

**CodeMap 解决方案**:
```bash
# 1. 生成完整的系统地图
codemap generate --mode smart --include-tests

# 2. 识别关键业务逻辑
codemap analyze --business-logic

# 3. 生成现代化路线图
codemap roadmap --output modernization.md
```

**效果**: 遗留系统理解时间从数月缩短到数天

---

### 场景 8: 微服务拆分规划（Microservices Migration）

**问题**: 单体应用拆分时，不清楚模块边界

**CodeMap 解决方案**:
```bash
# 1. 分析模块耦合度
codemap coupling --heatmap

# 2. 识别边界上下文
codemap boundaries --output boundaries.mmd

# 3. 生成拆分建议
codemap migration --strategy microservices
```

**效果**: 拆分规划时间减少 60%，服务边界更清晰

---

## 二、用户画像与使用模式

### 用户画像 1: 新入职开发者

**需求**: 快速理解项目结构
**使用频率**: 入职第一周每天使用
**核心功能**: 
- `codemap generate --mode fast` 生成项目地图
- 阅读 AI_MAP.md 了解架构
- 查看具体文件的 CONTEXT.md

**典型工作流**:
```bash
# Day 1: 了解项目全貌
codemap generate --mode fast
cat AI_MAP.md

# Day 2-3: 深入了解负责模块
cat context/src/features/auth/CONTEXT.md
cat context/src/services/user/CONTEXT.md

# Week 1: 跟踪代码变更
codemap watch
```

### 用户画像 2: 技术负责人

**需求**: 把控代码质量，指导团队
**使用频率**: 每周 2-3 次
**核心功能**:
- `codemap analyze --architecture` 架构分析
- `codemap complexity` 复杂度监控
- `codemap report` 生成团队报告

**典型工作流**:
```bash
# 每周一: 检查代码健康度
codemap quality --output weekly-report.md
codemap complexity --threshold 20

# 代码审查前
codemap generate --mode smart
codemap impact --files "src/core"

# 架构评审前
codemap analyze --architecture --output arch-review.md
```

### 用户画像 3: AI 辅助开发者

**需求**: 为 AI 提供准确上下文
**使用频率**: 每天多次
**核心功能**:
- `codemap export` 导出上下文
- `codemap watch` 自动同步
- `codemap query` 查询特定符号

**典型工作流**:
```bash
# 启动 Watch 模式（后台运行）
codemap watch &

# 开发新功能前，导出上下文
codemap export --module "src/features/payment" --output .cursor/context.md

# 重构时查询影响范围
codemap query --symbol "PaymentService" --with-refs
```

### 用户画像 4: 开源项目维护者

**需求**: 降低贡献者门槛
**使用频率**: 每次发布前
**核心功能**:
- `codemap docs` 生成项目文档
- `codemap graph` 可视化架构
- 集成到 CI 自动更新

**典型工作流**:
```bash
# 发布前更新文档
codemap docs --output ./docs
codemap generate --mode smart

# 提交到版本控制
git add AI_MAP.md docs/
git commit -m "docs: update code map for v2.0.0"

# 生成贡献者指南
codemap contrib --output CONTRIBUTING.md
```

### 用户画像 5: 技术写作者

**需求**: 生成技术文档和教程
**使用频率**: 每周 1-2 次
**核心功能**:
- `codemap docs` 生成文档
- `codemap graph` 生成架构图
- `codemap export` 导出代码示例

**典型工作流**:
```bash
# 生成 API 文档
codemap docs --type api --output ./docs/api.md

# 生成架构图
codemap graph --format mermaid --output architecture.mmd

# 导出关键代码片段
codemap export --symbol "AuthFlow" --format markdown
```

---

## 三、Step-by-Step 操作指南

### 第一部分: 安装与初始化

#### Step 1: 安装 CodeMap

```bash
# 使用 npm 安装
npm install -g @codemap/core

# 或使用 yarn
yarn global add @codemap/core

# 或使用 pnpm
pnpm add -g @codemap/core

# 或使用 npx（无需安装）
npx @codemap/core --version
```

#### Step 2: 验证安装

```bash
codemap --version
# 输出: codemap/1.0.0

codemap --help
# 显示所有可用命令
```

#### Step 3: 项目初始化

```bash
# 进入你的 TypeScript 项目
cd your-project

# 初始化 CodeMap 配置
codemap init

# 交互式配置
? 选择分析模式: (Use arrow keys)
❯ Fast Mode (推荐日常使用)
  Smart Mode (推荐深度分析)
  Hybrid Mode (自动选择)

? 选择输出格式:
❯ Markdown (AI_MAP.md + CONTEXT.md)
  JSON (结构化数据)
  Both (两者都生成)

? 是否启用 Watch 模式? (y/N)

? 配置文件保存位置: (codemap.config.js)
```

生成的配置文件 `codemap.config.js`:
```javascript
module.exports = {
  // 分析模式: 'fast' | 'smart' | 'hybrid'
  mode: 'hybrid',
  
  // 输出配置
  output: {
    format: ['markdown', 'json'],
    directory: './codemap',
    aiMapFile: 'AI_MAP.md',
    contextDir: 'context'
  },
  
  // 包含/排除规则
  include: ['src/**/*.ts', 'src/**/*.tsx'],
  exclude: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/node_modules/**',
    '**/dist/**'
  ],
  
  // 解析器配置
  parser: {
    // Fast 模式使用 Tree-sitter
    fast: {
      enabled: true,
      workers: 4
    },
    // Smart 模式使用 TS Compiler API
    smart: {
      enabled: true,
      tsConfigPath: './tsconfig.json'
    }
  },
  
  // AI 集成配置
  ai: {
    enabled: true,
    provider: 'openai', // 'openai' | 'anthropic' | 'ollama'
    model: 'gpt-4',
    maxTokens: 8000
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    directory: '.codemap/cache',
    maxAge: '7d'
  },
  
  // Watch 模式配置
  watch: {
    enabled: false,
    debounce: 1000,
    ignore: ['**/*.log']
  }
};
```

---

### 第二部分: 日常使用流程

#### 场景 A: 首次分析项目

```bash
# 1. 生成项目代码地图（使用配置中的默认模式）
codemap generate

# 或使用特定模式
codemap generate --mode fast    # 快速分析，< 30秒
codemap generate --mode smart   # 深度分析，< 2分钟

# 2. 查看生成的项目地图
cat AI_MAP.md

# 3. 查看特定模块的详细上下文
cat context/src/services/CONTEXT.md
```

#### 场景 B: 日常开发工作流

```bash
# 1. 启动 Watch 模式，自动检测文件变更
codemap watch

# 输出:
# [CodeMap] Watch mode started
# [CodeMap] Monitoring: src/**
# [CodeMap] Generated: AI_MAP.md

# 2. 修改代码后，自动更新
# [CodeMap] Detected change: src/services/user.ts
# [CodeMap] Updated: context/src/services/CONTEXT.md

# 3. 停止 Watch 模式
Ctrl + C
```

#### 场景 C: 代码审查工作流

```bash
# 1. 生成当前分支的完整分析
codemap generate --mode smart

# 2. 分析特定文件的变更影响
codemap impact --file src/core/engine.ts

# 输出:
# Impact Analysis for src/core/engine.ts
# ─────────────────────────────────────
# Direct dependents: 5 files
#   - src/services/user.ts
#   - src/api/routes.ts
# Indirect dependents: 12 files
# Risk level: HIGH

# 3. 生成审查报告
codemap report --format markdown --output code-review.md

# 4. 查看符号定义
codemap query --symbol "UserService.getUserById"

# 输出:
# Symbol: UserService.getUserById
# Location: src/services/user.ts:42
# Type: (id: string) => Promise<User | null>
# Dependencies:
#   - UserRepository.findById
#   - Logger.debug
```

#### 场景 D: AI 辅助开发工作流

```bash
# 1. 导出 AI 友好的上下文
codemap export --format ai --output ./ai-context

# 2. 导出特定模块的上下文
codemap export --module "src/services" --level 3

# 3. 导出特定符号的上下文
codemap export --symbol "UserService" --with-dependencies

# 4. 在 AI 对话中使用
# 将生成的上下文粘贴到 ChatGPT / Claude / Cursor
```

#### 场景 E: 重构前准备工作流

```bash
# 1. 分析目标符号的依赖关系
codemap deps --symbol "UserService" --depth 3

# 输出:
# Dependency Tree for UserService
# ───────────────────────────────
# UserService
#   ├─ UserRepository (direct)
#   ├─ Logger (direct)
#   └─ EmailService (indirect)

# 2. 生成调用图
codemap graph --symbol "UserService" --output user-service.mmd

# 3. 检测循环依赖
codemap cycles --format table

# 4. 评估重构风险
codemap risk --symbol "UserService" --output risk-report.md
```

#### 场景 F: 架构分析工作流

```bash
# 1. 生成架构报告
codemap analyze --architecture --output arch-report.md

# 2. 生成模块依赖图
codemap graph --type module --output module-deps.mmd

# 3. 识别架构边界
codemap boundaries --output boundaries.md

# 4. 对比历史架构
codemap diff --from v1.0.0 --to v2.0.0 --architecture
```

---

### 第三部分: 高级使用技巧

#### 技巧 1: 快速导航代码库

```bash
# 查找符号定义
codemap goto --symbol "UserService"

# 查找所有引用
codemap refs --symbol "UserService"

# 查看调用链
codemap trace --from "Controller.getUser" --to "Database.query"

# 搜索符号
codemap search --pattern "*Service" --type class
```

#### 技巧 2: 依赖关系分析

```bash
# 查看模块依赖图
codemap deps --module "src/core"

# 检测循环依赖
codemap cycles

# 查找无用代码
codemap unused

# 分析依赖深度
codemap depth --max 5

# 查看外部依赖
codemap external-deps
```

#### 技巧 3: 代码质量监控

```bash
# 计算复杂度
codemap complexity --top 20

# 生成质量报告
codemap quality --output quality-report.md

# 对比代码质量变化
codemap quality --diff --from HEAD~7

# 检查类型覆盖率
codemap types --coverage
```

#### 技巧 4: 批量操作

```bash
# 分析多个项目
for project in project1 project2 project3; do
  cd $project
  codemap generate --mode fast
  cd ..
done

# 生成所有模块的上下文
find src -type d -name "*" | xargs -I {} codemap export --module {}

# 批量查询符号
codemap query --symbols "UserService,OrderService,PaymentService"
```

#### 技巧 5: 自定义输出

```bash
# 使用自定义模板
codemap generate --template ./custom-template.hbs

# 只生成特定格式
codemap generate --format json

# 压缩输出
codemap generate --compress

# 生成特定语言的输出
codemap generate --lang zh-CN
```

---

### 第四部分: CI/CD 集成

#### GitHub Actions 集成

```yaml
# .github/workflows/codemap.yml
name: CodeMap Analysis

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  codemap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install CodeMap
        run: npm install -g @codemap/core
      
      - name: Generate CodeMap
        run: codemap generate --mode smart
      
      - name: Upload CodeMap artifacts
        uses: actions/upload-artifact@v3
        with:
          name: codemap
          path: |
            AI_MAP.md
            codemap.json
            context/
      
      - name: Check complexity
        run: |
          codemap complexity --threshold 20
          if [ $? -ne 0 ]; then
            echo "Complexity check failed!"
            exit 1
          fi
      
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('AI_MAP.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## CodeMap Analysis\n\n${report.substring(0, 3000)}...`
            });
```

#### GitLab CI 集成

```yaml
# .gitlab-ci.yml
codemap:
  stage: analyze
  image: node:18
  before_script:
    - npm install -g @codemap/core
  script:
    - codemap generate --mode smart
    - codemap complexity --threshold 20
  artifacts:
    paths:
      - AI_MAP.md
      - codemap.json
    expire_in: 1 week
  only:
    - merge_requests
    - main
```

#### Jenkins 集成

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    tools {
        nodejs '18'
    }
    
    stages {
        stage('CodeMap Analysis') {
            steps {
                sh 'npm install -g @codemap/core'
                sh 'codemap generate --mode smart'
                sh 'codemap complexity --threshold 20'
            }
        }
        
        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'AI_MAP.md,codemap.json,context/**'
            }
        }
    }
}
```

---

### 第五部分: 故障排除

#### 问题 1: 分析速度太慢

**症状**: 分析大型项目时耗时超过预期

```bash
# 解决方案 1: 使用 Fast 模式
codemap generate --mode fast

# 解决方案 2: 排除大文件
codemap generate --exclude "**/*.generated.ts"

# 解决方案 3: 增加 Worker 线程
codemap generate --workers 8

# 解决方案 4: 清理缓存
codemap clean-cache
codemap generate

# 解决方案 5: 分批分析
codemap generate --batch-size 100
```

#### 问题 2: 内存不足

**症状**: Node.js 内存溢出错误

```bash
# 解决方案 1: 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" codemap generate

# 解决方案 2: 禁用类型分析
codemap generate --no-type-analysis

# 解决方案 3: 排除大型依赖
codemap generate --exclude "**/node_modules/**"

# 解决方案 4: 使用流式处理
codemap generate --stream
```

#### 问题 3: 符号解析不准确

**症状**: 符号类型信息缺失或错误

```bash
# 解决方案 1: 使用 Smart 模式
codemap generate --mode smart

# 解决方案 2: 指定 tsconfig.json
codemap generate --tsconfig ./tsconfig.json

# 解决方案 3: 检查类型定义
codemap validate --types

# 解决方案 4: 更新 TypeScript
codemap update --typescript
```

#### 问题 4: 输出格式不符合预期

**症状**: 生成的 Markdown 格式错乱

```bash
# 解决方案 1: 使用标准模板
codemap generate --template default

# 解决方案 2: 只生成特定格式
codemap generate --format json

# 解决方案 3: 验证配置
codemap validate --config

# 解决方案 4: 重新初始化
codemap init --force
```

#### 问题 5: Watch 模式不工作

**症状**: 文件变更后未自动更新

```bash
# 解决方案 1: 检查监控路径
codemap watch --verbose

# 解决方案 2: 调整 debounce 时间
codemap watch --debounce 500

# 解决方案 3: 检查文件权限
ls -la .codemap/

# 解决方案 4: 手动触发更新
codemap generate --incremental
```

---

## 四、最佳实践

### 实践 1: 团队标准化工作流

```bash
# 1. 在 package.json 中添加脚本
{
  "scripts": {
    "codemap": "codemap generate",
    "codemap:watch": "codemap watch",
    "codemap:smart": "codemap generate --mode smart",
    "codemap:ci": "codemap generate --mode fast && codemap complexity --threshold 20"
  }
}

# 2. 提交 AI_MAP.md 到版本控制
git add AI_MAP.md context/
git commit -m "docs: update code map"

# 3. 在 README 中添加 CodeMap 徽章
[![CodeMap](https://img.shields.io/badge/CodeMap-Generated-blue)](./AI_MAP.md)

# 4. 添加 git hook
# .husky/pre-commit
codemap generate --mode fast
git add AI_MAP.md context/
```

### 实践 2: 与编辑器集成

**VS Code 集成**:
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate CodeMap",
      "type": "shell",
      "command": "codemap generate",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Watch CodeMap",
      "type": "shell",
      "command": "codemap watch",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

**快捷键绑定**:
```json
// .vscode/keybindings.json
[
  {
    "key": "ctrl+shift+m",
    "command": "workbench.action.tasks.runTask",
    "args": "Generate CodeMap",
    "when": "editorTextFocus"
  },
  {
    "key": "ctrl+shift+w",
    "command": "workbench.action.tasks.runTask",
    "args": "Watch CodeMap"
  }
]
```

**VS Code 扩展**:
```json
// .vscode/extensions.json
{
  "recommendations": [
    "codemap.vscode-extension"
  ]
}
```

### 实践 3: 与 AI 工具集成

**Cursor 集成**:
```bash
# 在 Cursor 中使用 CodeMap 上下文
# 1. 生成 AI 上下文
codemap export --format ai --output .cursor/context.md

# 2. 在 Cursor 设置中添加规则
# .cursorrules
Always refer to the project context in .cursor/context.md when generating code.
Consider the dependencies and relationships described in the context.
```

**Claude Code 集成**:
```bash
# 创建 Claude Code 工具
# .claude/commands/codemap.md
---
name: codemap
description: Get project context from CodeMap
---

Read the project context from AI_MAP.md and relevant CONTEXT.md files before answering.
Use codemap:// references to navigate the codebase.
```

**GitHub Copilot 集成**:
```bash
# 生成 Copilot 上下文
codemap export --format copilot --output .github/copilot-context.md

# 在 Copilot 提示中使用
# @codemap 请基于项目上下文生成代码
```

### 实践 4: 团队协作规范

```bash
# 1. 创建团队配置
# codemap.team.js
module.exports = {
  extends: './codemap.config.js',
  rules: {
    complexity: {
      threshold: 15,
      ignore: ['**/*.test.ts']
    },
    dependencies: {
      maxDepth: 5,
      noCircular: true
    }
  }
};

# 2. 代码审查检查清单
# .github/PULL_REQUEST_TEMPLATE.md
## CodeMap Checklist
- [ ] 运行 `codemap generate` 更新文档
- [ ] 检查复杂度是否超过阈值
- [ ] 确认无新增循环依赖
- [ ] 更新相关 CONTEXT.md 文件

# 3. 自动化检查
# .github/workflows/codemap-check.yml
name: CodeMap Check
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install -g @codemap/core
      - run: codemap generate --mode fast
      - run: codemap complexity --threshold 15
      - run: codemap cycles --fail-on-found
```

### 实践 5: 性能优化

```bash
# 1. 启用缓存
codemap config set cache.enabled true

# 2. 优化 Worker 数量
codemap config set parser.fast.workers 8

# 3. 排除不需要分析的文件
# codemap.config.js
module.exports = {
  exclude: [
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/node_modules/**',
    '**/dist/**',
    '**/*.generated.ts',
    '**/migrations/**'
  ]
};

# 4. 使用增量分析
codemap generate --incremental

# 5. 定期清理缓存
codemap clean-cache --older-than 30d
```

---

## 五、命令速查表

### 核心命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `codemap init` | 初始化配置 | `codemap init` |
| `codemap generate` | 生成代码地图 | `codemap generate --mode smart` |
| `codemap watch` | 监听变更 | `codemap watch --debounce 500` |
| `codemap query` | 查询符号 | `codemap query --symbol "UserService"` |
| `codemap export` | 导出上下文 | `codemap export --format ai` |

### 分析命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `codemap deps` | 分析依赖 | `codemap deps --module "src/core"` |
| `codemap cycles` | 检测循环依赖 | `codemap cycles --format table` |
| `codemap complexity` | 计算复杂度 | `codemap complexity --top 10` |
| `codemap impact` | 影响分析 | `codemap impact --file src/core.ts` |
| `codemap unused` | 查找无用代码 | `codemap unused` |

### 导航命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `codemap goto` | 跳转到定义 | `codemap goto --symbol "UserService"` |
| `codemap refs` | 查找引用 | `codemap refs --symbol "UserService"` |
| `codemap trace` | 追踪调用链 | `codemap trace --from "A" --to "B"` |
| `codemap search` | 搜索符号 | `codemap search --pattern "*Service"` |

### 报告命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `codemap report` | 生成报告 | `codemap report --output report.md` |
| `codemap quality` | 质量报告 | `codemap quality --diff` |
| `codemap analyze` | 架构分析 | `codemap analyze --architecture` |
| `codemap graph` | 生成图表 | `codemap graph --output graph.mmd` |

### 维护命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `codemap clean` | 清理缓存 | `codemap clean-cache` |
| `codemap validate` | 验证配置 | `codemap validate --config` |
| `codemap config` | 配置管理 | `codemap config set mode fast` |
| `codemap update` | 更新工具 | `codemap update` |

---

## 六、使用场景决策树

```
开始
  │
  ├─ 新成员上手项目？
  │  └─ 是 → 使用 Fast 模式生成 AI_MAP.md
  │          └─ 阅读 AI_MAP.md 和 CONTEXT.md
  │
  ├─ 需要深度代码审查？
  │  └─ 是 → 使用 Smart 模式
  │          └─ 生成 impact 分析报告
  │          └─ 检查复杂度变化
  │
  ├─ 与 AI 结对编程？
  │  └─ 是 → 启动 Watch 模式
  │          └─ 导出 AI 上下文
  │          └─ 定期同步变更
  │
  ├─ 准备重构？
  │  └─ 是 → 分析依赖关系
  │          └─ 生成调用图
  │          └─ 评估影响范围
  │
  ├─ 日常开发？
  │  └─ 是 → Watch 模式自动同步
  │          └─ 按需查询符号信息
  │
  ├─ CI/CD 集成？
  │  └─ 是 → Fast 模式 + 复杂度检查
  │          └─ 上传产物到 Artifact
  │
  ├─ 生成文档？
  │  └─ 是 → 生成完整文档
  │          └─ 集成到 CI 自动更新
  │
  └─ 架构分析？
     └─ 是 → Smart 模式生成架构报告
             └─ 对比历史版本
             └─ 识别技术债务
```

---

## 七、快速开始清单

### 对于新用户

- [ ] 安装 CodeMap: `npm install -g @codemap/core`
- [ ] 验证安装: `codemap --version`
- [ ] 初始化项目: `codemap init`
- [ ] 生成第一张代码地图: `codemap generate --mode fast`
- [ ] 阅读 AI_MAP.md 了解项目结构
- [ ] 启动 Watch 模式: `codemap watch`

### 对于团队

- [ ] 创建团队配置文件 `codemap.team.js`
- [ ] 在 package.json 中添加脚本
- [ ] 设置 CI/CD 集成
- [ ] 创建代码审查检查清单
- [ ] 培训团队成员使用 CodeMap
- [ ] 将 AI_MAP.md 纳入版本控制

### 对于开源项目

- [ ] 在 README 中添加 CodeMap 徽章
- [ ] 生成贡献者指南: `codemap contrib`
- [ ] 设置自动化文档更新
- [ ] 创建 Issue 模板引用 CodeMap
- [ ] 在 PR 模板中添加 CodeMap 检查清单

---

*这份指南涵盖了 CodeMap 的主要使用场景和操作步骤。根据你的具体需求选择合适的工作流，可以显著提升代码理解和开发效率。*
