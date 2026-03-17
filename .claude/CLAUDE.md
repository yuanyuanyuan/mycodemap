# CLAUDE.md - CodeMap 项目特定指令

> 本文件供 Claude Code 自动读取，作为项目级执行约束。

## 强制执行规则

### 1. 任务开始前必须执行

- [ ] **阅读 AGENTS.md**：`cat AGENTS.md` - 了解仓库级强约束
- [ ] **阅读 CLAUDE.md**：`cat CLAUDE.md` - 了解执行清单
- [ ] **评估任务等级**：根据 AGENTS.md 3.1 节评估 L0-L3 等级
- [ ] **声明任务等级**：输出 "当前任务评估为 L[X] 级"

### 2. 任务执行必须遵循

- **遵循 TDD 流程**（测试先行）：
  1. 红阶段：编写失败的测试
  2. 绿阶段：编写最小实现使测试通过
  3. 重构阶段：优化实现，保持测试通过

- **遵循分层架构**（见 `docs/rules/architecture-guardrails.md`）：
  - core 层禁止导入 cli/orchestrator 层
  - 使用依赖注入而非直接实例化
  - 接口定义在被依赖方

- **遵守代码质量红线**（见 `docs/rules/code-quality-redlines.md`）：
  - 禁止敏感信息硬编码
  - 禁止 `any` 类型（边界文件除外）
  - 函数不超过 50 行
  - 必须处理 Promise 错误
  - 禁止 `console.log` 遗留（使用 runtime-logger）

### 3. 任务完成必须执行

- [ ] **运行验证**：`npm run check:all`
- [ ] **填写验收清单**（见 CLAUDE.md 第 3 节）
- [ ] **提供可信度自评**（见 AGENTS.md 5.1 节格式）
- [ ] **L0 任务**：直接提交
- [ ] **L1+ 任务**：生成 PR 描述，暂停等待审查

## 禁止行为

- ❌ 不要生成未测试的代码
- ❌ 不要在 core/parser 层引入 CLI 依赖
- ❌ 不要提交包含 `console.log` 的代码
- ❌ 不要使用 `--no-verify` 跳过 hooks
- ❌ 不要通过 `@ts-ignore` 绕过类型错误
- ❌ 不要擅自降低任务等级
- ❌ 不要累积多个任务后才 commit

## Commit 策略

**核心原则**：任务完成即提交。

- 单个任务完成 → 立即 commit
- 多文件变更 → 按逻辑分批 commit
- Commit 格式 → `[TAG] scope: message`
- 文件数量 → 单个 commit 不超过 10 个文件

## 首选模式

- ✅ 纯函数优先，副作用隔离
- ✅ 依赖注入而非直接实例化
- ✅ 显式类型而非 `any`
- ✅ 检索优先于记忆（使用 CodeMap CLI）
- ✅ 最小改动优先

## 快速参考

### 常用命令

```bash
# 验证
npm run check:all          # 类型 + 测试 + Lint
npm run typecheck          # 仅类型检查
npm test                   # 仅测试
npm run lint               # 仅 Lint

# CLI 工具
node dist/cli/index.js query -s "symbolName"
node dist/cli/index.js deps -m "src/core/analyzer"
node dist/cli/index.js impact -f "src/types/index.ts"

# AI 任务钩子
npm run ai:pre-task        # 任务前检查
npm run ai:post-task       # 任务后检查+修复
```

### 文件模板

**TypeScript 源文件头**：
```typescript
// [META] since:2026-03 | owner:team | stable:false
// [WHY] 解释此文件存在的理由
```

**技术债务标记**：
```typescript
// TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:说明]
// 问题：具体问题描述
// 风险：潜在风险
// 偿还计划：何时如何修复
```

## 相关文档

- `AGENTS.md` - 仓库级强约束、任务分级、可信度自评
- `CLAUDE.md` - 执行清单、验收标准
- `ARCHITECTURE.md` - 系统地图、模块边界
- `docs/rules/architecture-guardrails.md` - 架构依赖规则
- `docs/rules/code-quality-redlines.md` - 代码质量红线
- `docs/rules/engineering-with-codex-openai.md` - 工程规则

## 任务初始化模板

每次接受任务时，使用以下模板开始：

```markdown
## 任务分析
**目标**：[一句话描述]
**类型**：[新增功能/修复 Bug/重构/性能优化/文档更新]
**风险等级**：[L0/L1/L2/L3]
**影响范围**：[列举可能影响的文件/模块]

## 上下文清单
- [x] 已读取 AGENTS.md 架构约束
- [x] 已识别相关类型定义
- [ ] 待确认：[如有]

## 执行计划（Plan-Build-Verify-Fix）
1. [Plan] 设计接口/类型
2. [Build] 实现核心逻辑 + 单元测试
3. [Build] 实现外围层
4. [Verify] 运行类型检查 + 单元测试 + Lint
5. [Fix] 修复发现的问题
6. [Verify] 最终验收
```
