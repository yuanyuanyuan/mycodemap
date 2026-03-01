# 任务：ast-grep 适配器实现

## 背景

CodeMap 项目的 ast-grep 适配器当前完成度 0%，完全未实现。根据 `DEEP_REVIEW_REPORT.md` 分析：

- `src/orchestrator/adapters/ast-grep-adapter.ts` 缺失
- 影响 `search/documentation/overview/refactor` 意图执行
- 架构设计要求 AstGrepAdapter 作为 ToolAdapter 接口的实现

ast-grep 是一个基于 AST 的代码搜索工具，可以提供比文本搜索更精确的结果。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**

> 在执行此任务前，请先查阅以下项目资源：
> - 项目上下文文件：`AGENTS.md` / `CLAUDE.md`
> - 架构文档：`docs/REFACTOR_ARCHITECTURE_OVERVIEW.md`
> - 适配器基类：`src/orchestrator/adapters/base-adapter.ts`
> - 现有适配器实现：`src/orchestrator/adapters/codemap-adapter.ts`

> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖

## 要求

1. **实现 AstGrepAdapter 类**
   - 继承 ToolAdapter 基类
   - 实现 `search(pattern, options)` 方法
   - 实现 `index(files)` 方法（可选）

2. **实现 AST 搜索功能**
   - 支持 TypeScript/JavaScript 代码搜索
   - 支持基于 AST 节点的精确匹配
   - 返回结构化搜索结果

3. **实现结果转换**
   - 将 ast-grep 输出转换为 UnifiedResult 格式
   - 包含 file path、line、content、score 等字段

4. **配置集成**
   - 在 ToolOrchestrator 中注册适配器
   - 配置权重（设计文档建议 1.0）

## 初始状态

- `src/orchestrator/adapters/base-adapter.ts` - 适配器基类已存在
- `src/orchestrator/adapters/codemap-adapter.ts` - 参考实现
- `src/orchestrator/tool-orchestrator.ts` - 工具编排器

## 约束条件

- 必须实现 ToolAdapter 接口
- 必须遵循项目 ESM 模块规范
- 必须查阅现有适配器实现后再实现
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| AstGrepAdapter 类存在 | 代码审查 | 继承 ToolAdapter |
| search 方法实现 | 代码审查 | 支持 pattern 搜索 |
| 结果转换为 UnifiedResult | 代码审查 | 符合类型定义 |
| ToolOrchestrator 集成 | 代码审查 | 已注册适配器 |
| 单元测试通过 | `pnpm test` | 相关测试通过 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| ast-grep 适配器 | 不存在 | 完整实现 | positive |
| 搜索精度 | 文本匹配 | AST 精确匹配 | positive |
| 工具回退链 | 不完整 | 完整支持 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 使用非 TypeScript 项目
- **场景**: 项目不包含 .ts 文件
- **原因**: ast-grep 主要用于 TypeScript 分析

### 反例用户 2
- **用户特征**: 未安装 ast-grep
- **场景`: `npx ast-grep` 无法运行
- **原因**: 需要作为项目依赖或使用 npx 调用

### 反例实现（AI 常见错误）
- **错误模式**: 未实现 ToolAdapter 接口方法
- **后果**: 与 ToolOrchestrator 集成失败
- **正确做法**: 参考 codemap-adapter.ts 的接口实现
