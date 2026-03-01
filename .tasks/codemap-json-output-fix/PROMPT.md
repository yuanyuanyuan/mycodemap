# Task: Fix CodeMap CLI JSON Output Pollution

## Background

CodeMap CLI 是一个代码分析工具，支持通过 `--json` 参数输出 JSON 格式的分析结果。然而，当前实现存在一个严重问题：当使用 `--json` 参数时，JSON 输出中混杂了日志信息（console.debug/console.warn/console.error），导致下游工具无法正确解析 JSON。

**问题根源**: 在 `src/orchestrator/tool-orchestrator.ts` 文件中，多处使用了 console 输出，这些输出直接写入 stdout，与 JSON 输出流混在一起。

**影响范围**: 任何使用 `analyze --json` 命令的自动化流程都会因为 JSON 解析失败而中断。

## Requirements

1. **阅读源文件**: 阅读 `/data/codemap/src/orchestrator/tool-orchestrator.ts` 文件
2. **移除日志输出**: 注释或删除所有 `console.debug`, `console.warn`, `console.error` 调用
3. **保持功能完整**: 确保代码的业务逻辑保持不变，仅移除调试日志
4. **构建验证**: 运行 `npm run build` 确保项目可以成功构建
5. **功能验证**: 运行 `node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json` 验证输出为纯净 JSON

## Initial State

**文件位置**: `/data/codemap/src/orchestrator/tool-orchestrator.ts`

**需要移除的日志位置**:
- 第 104 行: `console.debug(`执行工具: ${tool}, 超时: ${timeout}ms`);`
- 第 108 行: `console.warn(`工具 ${tool} 未注册，返回空结果`);`
- 第 114 行: `console.warn(`工具 ${tool} 不可用，返回空结果`);`
- 第 146 行: `console.debug(`工具 ${tool} 执行成功，返回 ${results.length} 条结果`);`
- 第 150 行: `console.warn(`工具 ${tool} 执行超时 (${timeout}ms)`);`
- 第 152 行: `console.error(`工具 ${tool} 执行失败: ${error}`);`
- 第 176 行: `console.error(`工具 ${tool} 执行异常:`, error);`
- 第 204 行: `console.debug(`主工具 ${primaryTool} 置信度: ${confidence.score.toFixed(2)} (${confidence.level})`);`
- 第 215 行: `console.warn(`跳过已执行的工具: ${fallbackTool}`);`
- 第 220 行: `console.warn(`[LOW CONFIDENCE] ${primaryTool} confidence...`);`
- 第 235 行: `console.debug(`回退工具 ${fallbackTool} 置信度...`);`

**工作目录**: `/data/codemap`

## Constraints

1. **仅修改指定文件**: 只能修改 `tool-orchestrator.ts` 文件，不得修改其他文件
2. **不得改变业务逻辑**: 只能移除日志输出，不能修改任何业务逻辑代码
3. **注释方式**: 建议使用 `//` 注释而不是直接删除，以便未来需要时可以恢复
4. **构建必须通过**: 修改后的代码必须通过 TypeScript 编译
5. **JSON 输出必须纯净**: 验证命令的输出必须是有效的 JSON，不含任何日志前缀
6. **Prefer retrieval-led reasoning over pre-training-led reasoning**: 在执行任务时，优先通过读取实际文件内容来理解问题，而不是依赖预训练的知识假设

## Acceptance Criteria

### AC1: 构建成功
- 运行 `npm run build` 成功完成，无编译错误

### AC2: 日志已移除
- tool-orchestrator.ts 文件中不存在任何 `console.debug`, `console.warn`, `console.error` 调用
- 建议使用 grep 验证: `grep -n "console\." src/orchestrator/tool-orchestrator.ts` 应无匹配

### AC3: JSON 输出纯净
- 运行 `node dist/cli/index.js analyze -i impact -t src/index.ts --output-mode machine --json`
- 输出必须是有效的 JSON 格式
- 输出中不能包含任何 "执行工具"、"未注册"、"不可用"、"执行成功"、"执行超时"、"执行失败"、"执行异常"、"置信度"、"跳过已执行" 等日志字样

### AC4: 功能正常
- 工具执行的核心逻辑未被破坏
- analyze 命令能够正常完成分析并返回结果

## User Value

修复此问题后：
- 自动化脚本可以可靠地解析 CodeMap 的 JSON 输出
- CI/CD 流水线可以集成 CodeMap CLI 进行代码分析
- 其他工具可以通过管道接收纯净的 JSON 数据进行进一步处理

## Anti-Patterns (Anti-Examples)

### ❌ 错误做法 1: 修改其他文件
```bash
# 不要修改不相关的文件
vim src/cli/index.ts  # ❌ 超出范围
```

### ❌ 错误做法 2: 删除业务逻辑代码
```typescript
// 原代码
console.debug(`执行工具: ${tool}, 超时: ${timeout}ms`);
const result = await this.executeTool(tool, query);  // 这一行不能删除！

// 错误修改 - 删除了业务逻辑
// console.debug(`执行工具: ${tool}, 超时: ${timeout}ms`);
// 结果把下面一行也删了 ❌
```

### ❌ 错误做法 3: 构建不验证
修改代码后没有运行 `npm run build` 验证编译是否通过。

### ❌ 错误做法 4: JSON 验证不充分
只检查命令是否运行，不验证输出是否为纯净 JSON。

## Retrieval-Led Guidance

在修复此问题时：
1. 首先读取 `/data/codemap/src/orchestrator/tool-orchestrator.ts` 文件，确认实际的日志位置和行号
2. 检查文件当前的实际内容，因为行号可能随代码变更而变化
3. 使用 `grep -n "console\."` 快速定位所有 console 调用
4. 修改后使用同样的 grep 命令验证所有 console 调用已被移除
5. 实际运行验证命令检查 JSON 输出是否纯净

Prefer retrieval-led reasoning over pre-training-led reasoning - 始终以实际读取的文件内容为准。
