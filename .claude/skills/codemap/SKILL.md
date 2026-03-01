---
name: codemap
description: CodeMap 项目专用 CLI 辅助工具。用于查询代码结构、执行 CI 门禁检查、分析依赖关系。当用户需要：(1) 查询符号/模块/依赖信息；(2) 执行 commit 前检查；(3) 分析变更影响范围；(4) 检测循环依赖时使用此 skill。提供半自动交互模式，先执行分析再列出问题供用户确认处理方式。
---

# Codemap 代码分析助手

## 概述

这个 skill 为 CodeMap 项目 CLI 提供统一的交互入口。执行分析后列出发现的问题，让用户确认处理方式。

**执行方式**：直接运行 `node dist/cli/index.js <command>`（无需切换目录）

## 核心功能

### 1. 快速代码查询

| 用户意图 | CLI 命令 | 说明 |
|----------|----------|------|
| 搜索符号 | `query -S <关键词>` | 模糊搜索符号名 |
| 查询模块 | `query -m <模块路径>` | 查看模块结构 |
| 查依赖 | `query -d <模块名>` | 查看模块的依赖方 |
| 精确符号 | `query -s <符号名>` | 精确查找符号 |

**使用示例**：
```bash
# 搜索包含 "query" 的符号
node dist/cli/index.js query -S "query"

# 查看 orchestrator 模块结构
node dist/cli/index.js query -m "orchestrator"
```

### 2. CI 门禁检查

| 检查项 | CLI 命令 | 说明 |
|--------|----------|------|
| Commit 格式 | `ci check-commits` | 验证 commit 信息格式 |
| 文件头注释 | `ci check-headers` | 检查文件头 [META][WHY] 注释 |
| 变更风险 | `ci assess-risk` | 评估变更风险级别 |

**执行流程**：
1. 运行 `node dist/cli/index.js ci <子命令>`
2. 分析输出结果
3. 列出发现的问题
4. 询问用户如何处理

**使用示例**：
```bash
# 完整三件套检查
node dist/cli/index.js ci check-commits
node dist/cli/index.js ci check-headers
node dist/cli/index.js ci assess-risk
```

### 3. 依赖分析

| 功能 | CLI 命令 | 说明 |
|------|----------|------|
| 模块依赖 | `deps -m <模块路径>` | 查看指定模块的依赖树 |
| 循环依赖 | `cycles` | 检测循环依赖 |
| 变更影响 | `impact -f <文件> --transitive` | 分析文件影响范围 |

**使用示例**：
```bash
# 查看 orchestrator 模块的依赖
node dist/cli/index.js deps -m "orchestrator"

# 检测循环依赖
node dist/cli/index.js cycles

# 分析文件影响（包含传递依赖）
node dist/cli/index.js impact -f "src/orchestrator/confidence.ts" --transitive
```

### 4. 代码复杂度

```bash
# 查看文件复杂度
node dist/cli/index.js complexity -f <文件路径>
```

## 工作流程

### 半自动交互模式

1. **接收用户请求**：理解用户想要执行的分析类型
2. **执行分析**：调用对应的 CodeMap CLI 命令
3. **解析结果**：分析命令输出，提取关键信息
4. **列出问题**：以清晰格式展示发现的问题
5. **请求确认**：询问用户如何处理每个问题

### 常见场景

**场景 1：PR 提交前检查**
```
用户：帮我检查一下这次改动
→ 执行 ci check-commits, ci check-headers, ci assess-risk
→ 列出发现的问题
→ 询问：需要我帮你修复这些问题吗？
```

**场景 2：查询代码结构**
```
用户：找到 confidence 相关的代码
→ 执行 query -S "confidence"
→ 展示匹配的符号和位置
→ 询问：需要查看哪个文件的详细信息？
```

**场景 3：评估重构影响**
```
用户：我想重构 orchestrator/types.ts
→ 执行 impact -f "src/orchestrator/types.ts" --transitive
→ 展示受影响的文件和模块
→ 询问：需要我分析这些依赖的具体影响吗？
```

## 输出格式

CLI 输出格式：
- 默认：人类可读格式
- JSON：`--json` 或 `-j` 参数

skill 会智能解析输出，转换为更友好的格式展示。

## 注意事项

1. **确保构建**：使用前确认 `npm run build` 已执行
2. **工作目录**：已在 CodeMap 项目目录，直接执行命令
3. **JSON 模式**：复杂分析建议使用 `--json` 便于解析
4. **传递依赖**：影响分析使用 `--transitive` 获得完整视图
