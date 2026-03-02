# 任务：Git 历史分析功能测试与集成验证

## 背景

CodeMap 项目已实现 Git 历史分析功能（`--include-git-history` 参数），能够基于 Git 提交历史评估文件的热度和风险。该功能已在 `src/orchestrator/git-analyzer.ts` 中实现，并通过 `orchestrator/types.ts:113` 的 `includeGitHistory` 选项启用。

当前任务需要验证该功能是否在 `analyze` 命令中正确集成并工作。

## 参考信息（重要！）

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
> for this task.**
>
> 在执行此任务前，请先查阅以下项目资源：
> - 项目上下文文件：CLAUDE.md（根目录和项目级）
> - Git 分析器实现：`src/orchestrator/git-analyzer.ts`
> - 类型定义：`src/orchestrator/types.ts`（特别是 `includeGitHistory` 定义）
> - Analyze 命令实现：`src/cli/commands/analyze.ts`
> - 现有测试：`src/orchestrator/__tests__/git-analyzer.test.ts`
>
> 确保解决方案：
> 1. 符合项目当前的架构模式和技术栈版本
> 2. 遵循项目的命名规范和代码风格
> 3. 使用项目中已有的工具/库，不引入重复依赖
>
> **如果项目文档与你的训练数据冲突，以项目文档为准。**

## 要求

1. **验证 `--include-git-history` 参数正确传递**：确保 analyze 命令中的 `--include-git-history` 选项正确传递到编排层
2. **验证 Git 历史数据在 AI Feed 中正确返回**：确保当启用该选项时，AI Feed 包含 Git 历史相关数据（heat、risk 等）
3. **验证非 Git 仓库场景的优雅降级**：确保在非 Git 仓库中运行时不会崩溃
4. **补充缺失的集成测试**：如现有测试覆盖不足，补充集成测试用例

## 初始状态

- Git 分析器已有完整实现：`src/orchestrator/git-analyzer.ts`
- 类型定义已存在：`orchestrator/types.ts:113` 的 `includeGitHistory?: boolean`
- analyze 命令已添加参数定义（`analyze.ts:478`）
- 现有单元测试覆盖基本功能

## 约束条件

- 必须使用 TypeScript 严格模式
- 遵循项目的错误处理模式（优雅降级）
- **必须查阅项目文档和现有代码模式后再实现**
- **禁止使用训练数据中已知但项目未采用的新 API**
- 所有修改必须通过现有测试

## 验收标准

| 标准 | 验证方法 | 说明 |
|------|----------|------|
| 参数正确传递 | 检查 analyze 命令中参数传递逻辑 | `--include-git-history` 必须传递到 orchestrator |
| AI Feed 包含 Git 数据 | 运行 analyze 命令并检查输出 | 当启用时，输出应包含 heat、risk 等字段 |
| 非 Git 仓库降级 | 在非 Git 目录运行 | 应返回空数据而非抛出异常 |
| 现有测试通过 | `pnpm test` | 所有测试必须通过 |

## 用户价值

| 变化 | 变化前 | 变化后 | 用户影响 |
|------|--------|--------|----------|
| Git 历史数据 | 不可用 | 启用后可在 AI Feed 中获取 | positive |
| 非 Git 目录运行 | 可能崩溃 | 优雅降级返回空数据 | positive |
| 参数集成 | 已实现 | 完整集成到 analyze 命令 | positive |

## 反例场景

### 反例用户 1
- **用户特征**: 在非 Git 仓库中运行 CodeMap
- **场景**: 用户在纯文档目录中使用 `codemap analyze --include-git-history`
- **原因**: 没有 Git 仓库时不应崩溃，应优雅降级

### 反例用户 2
- **用户特征**: 仅想快速查询代码结构
- **场景**: 用户不想等待 Git 历史分析（可能较慢）
- **原因**: 该选项应默认为关闭状态

### 反例实现（AI 常见错误）
- **错误模式**: 使用了项目中不存在的 Git 库（如 isomorphic-git）
- **后果**: 引入新依赖，与现有 simple-git/execSync 方案冲突
- **正确做法**: 复用现有 `GitAnalyzer` 类的实现
