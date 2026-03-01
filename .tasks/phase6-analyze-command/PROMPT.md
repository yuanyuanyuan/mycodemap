# 任务：Phase 6 - 实现 AnalyzeCommand 统一入口 + 测试关联

## 背景

CodeMap 编排层重构项目需要将现有的多个 CLI 命令（impact、deps、complexity、query 等）统一封装为 `analyze` 命令，提供统一的入口和参数契约。这是实现编排层的基础，使上游 AI Agent 可以通过单一入口调用所有分析能力。

**IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for this task.**

在执行此任务前，请先查阅以下项目资源：
- 架构设计文档：`/data/codemap/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- 编排层设计：`/data/codemap/REFACTOR_ORCHESTRATOR_DESIGN.md`
- 测试关联设计：`/data/codemap/REFACTOR_TEST_LINKER_DESIGN.md`
- 现有代码结构：`/data/codemap/src/`
- 现有 CLI 命令：`/data/codemap/src/cli/commands/`

## 要求

1. **创建 AnalyzeCommand 统一入口**（`src/cli/commands/analyze.ts`）
   - 实现统一的 CLI 参数解析
   - 支持 intent 参数路由到不同执行器
   - 支持 JSON 输出模式（machine-readable）
   - 支持 human 输出模式（人类可读）

2. **定义 CLI 参数契约**
   - intent: impact | dependency | search | documentation | complexity | overview | refactor | reference
   - keywords: 搜索关键词数组
   - targets: 目标文件/模块路径数组
   - scope: direct | transitive
   - topK: 返回结果数量（默认 8，最大 100）
   - includeTests: 是否包含测试文件
   - includeGitHistory: 是否包含 Git 历史
   - json: JSON 格式输出
   - outputMode: machine | human

3. **实现测试关联器集成**（`src/orchestrator/test-linker.ts`）
   - 基于 Jest/Vitest 配置自动关联测试文件
   - 在影响分析结果中包含关联的测试文件

4. **实现错误码系统**
   - E0001: 无效 intent 值
   - E0002: 缺少必要参数
   - E0003: 目标路径不存在
   - E0004: 工具执行超时
   - E0005: 工具执行失败
   - E0006: 置信度过低

5. **编写单元测试**
   - 测试参数解析正确性
   - 测试 intent 路由正确性
   - 测试测试关联器功能

## 初始状态

基于现有命令模块创建：
- 修改 `src/cli/commands/analyze.ts`（新文件）
- 修改 `src/cli/index.ts`（注册命令）
- 创建 `src/orchestrator/test-linker.ts`（新文件）

## 约束条件

- **必须使用 TypeScript 严格模式**（strict: true）
- 所有数值字段必须明确类型（number 而非 any）
- 字符串枚举必须使用字面量联合类型
- 禁止使用 any 类型
- 必须导出所有公共类型
- 代码风格与现有 src/ 目录保持一致
- 必须遵循 REFACTOR_ORCHESTRATOR_DESIGN.md 中的编排器接口

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| AnalyzeCommand 实现 | 检查 analyze.ts | 包含所有必需参数和路由逻辑 |
| 参数契约完整 | 检查参数定义 | 包含所有 9 个参数 |
| 测试关联器集成 | 检查 test-linker.ts | 基于 Jest/Vitest 配置关联测试 |
| 错误码系统 | 检查错误处理 | 包含 E0001-E0006 |
| TypeScript 编译通过 | `npx tsc --noEmit` | 无类型错误 |
| 单元测试通过 | `npm test` | 测试覆盖率 > 80% |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 统一入口 | 多个独立命令 | 单一 analyze 命令 | positive - 简化调用 |
| 参数标准化 | 各命令参数不一致 | 统一参数契约 | positive - 降低学习成本 |
| 测试关联 | 手动查找测试 | 自动关联测试文件 | positive - 提升效率 |
| JSON 输出 | 无统一格式 | 符合 schemaVersion 规范 | positive - 便于集成 |

## 反例场景

### 反例实现 1
- **错误模式**: 使用 `any` 类型定义参数
- **后果**: 失去 TypeScript 类型检查保护
- **正确做法**: 所有参数使用明确类型定义

### 反例实现 2
- **错误模式**: 忽略测试关联器，直接返回影响分析结果
- **后果**: 用户无法快速定位相关测试
- **正确做法**: 集成 test-linker.ts，在结果中包含测试文件

### 反例实现 3
- **错误模式**: 未实现 outputMode 区分，machine 模式输出额外日志
- **后果**: JSON 解析失败
- **正确做法**: machine 模式必须保证纯 JSON 输出
