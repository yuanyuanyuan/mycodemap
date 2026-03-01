# 任务：测试关联器核心功能实现

## 背景

CodeMap 项目的测试关联器 (TestLinker) 当前完成度仅 35%，核心功能缺失严重。根据 `DEEP_REVIEW_REPORT.md` 的分析，需要实现以下缺失功能：

- `buildMapping()` - 构建源文件到测试文件的映射
- `findRelatedTests()` - 查找相关测试文件
- `scanTestImports()` - 扫描测试文件的 import 语句
- 多策略测试关联（文件名匹配、目录匹配、import 扫描）

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**

> 在执行此任务前，请先查阅以下项目资源：
> - 项目上下文文件：`AGENTS.md` / `CLAUDE.md`
> - 设计文档：`docs/REFACTOR_TEST_LINKER_DESIGN.md`
> - 现有实现：`src/orchestrator/test-linker.ts`
> - 适配器模式参考：`src/orchestrator/adapters/base-adapter.ts`

> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖

## 要求

1. **实现 `buildMapping(projectRoot, codemap)` 方法**
   - 基于测试框架配置构建源文件到测试文件的映射
   - 扫描所有测试文件并建立关联

2. **实现 `findRelatedTests(sourceFiles)` 方法**
   - 根据源文件列表查找相关测试文件
   - 支持直接映射和目录级别匹配

3. **实现 `scanTestImports(testFile)` 方法**
   - 扫描测试文件的 import 语句
   - 提取被导入的源文件路径

4. **实现目录级别匹配 `findDirLevelTests(sourceFile)`**
   - 支持 `src/cache/__tests__/*.test.ts` 格式
   - 支持 `src/cache/test/*.test.ts` 格式

5. **完善 `TestConfig` 接口**
   - 对齐设计文档的接口定义
   - 添加 `loadConfig()` 完整实现

## 初始状态

`src/orchestrator/test-linker.ts` 已存在基础结构：
- `TestLinker` 类骨架
- `initialize()` 方法
- `hasConfig()` 方法
- `getDefaultPatterns()` 方法
- `resolveTestFile()` 方法

## 约束条件

- 必须使用 TypeScript 严格模式
- 遵循项目的错误处理模式
- 必须查阅项目文档和现有代码模式后再实现
- **禁止使用训练数据中已知但项目未采用的新 API**

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| buildMapping 方法实现完整 | 代码审查 | 包含测试文件扫描、源文件推断、import 扫描 |
| findRelatedTests 方法实现完整 | 代码审查 | 支持直接映射和目录级别匹配 |
| scanTestImports 方法实现完整 | 代码审查 | 正确解析 TypeScript import 语句 |
| TestConfig 接口对齐设计 | 接口对比 | 与 docs/REFACTOR_TEST_LINKER_DESIGN.md 一致 |
| 单元测试通过 | `pnpm test` | 相关测试用例全部通过 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| 测试关联功能 | 35% 完成，无法查找相关测试 | 100% 完成，自动关联测试文件 | positive |
| 多策略关联 | 仅文件名匹配 | 文件名+目录+import 扫描 | positive |
| 配置加载 | 部分实现 | 完整支持 vitest/jest 配置 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 使用非标准测试目录结构的项目
- **场景**: 测试文件放在 `tests/unit/` 而非 `__tests__/`
- **原因**: 默认模式可能无法匹配

### 反例用户 2
- **用户特征**: 使用动态 import 的测试文件
- **场景**: `const module = await import(path)`
- **原因**: 静态分析无法捕获动态 import

### 反例实现（AI 常见错误）
- **错误模式**: 使用 `require()` 而非 ESM `import`
- **后果**: 项目使用 ESM 模块系统，代码无法运行
- **正确做法**: 参考项目中现有的 `import` 语法和 `fs.promises` 用法
