# CLAUDE.md - CodeMap 执行清单

本文件提供给 Claude / Codex 一份最小可执行手册；仓库级硬约束以 `AGENTS.md` 为准。

## 1. 先读顺序

1. 离目标文件最近的 `AGENTS.md`
2. 根目录 `AGENTS.md`
3. 本文件 `CLAUDE.md`
4. `ARCHITECTURE.md`
5. `docs/rules/`、`docs/design-docs/`、`docs/exec-plans/` 中与任务最相关的文档
6. 代码、测试、配置与 Git 事实

当前主文档结构已落地，但仍有少量操作指南与历史文档保留在 `docs/` 根层；出现路径冲突时，以仓库当前可读文件为准。

## 1.1 任务初始化模板（Harness 规范）

AI 接受任务时，必须输出以下分析框架：

```markdown
## 任务分析
**目标**：[一句话描述]
**类型**：[新增功能/修复 Bug/重构/性能优化/文档更新]
**风险等级**：[L0/L1/L2/L3]
**影响范围**：[列举可能影响的文件/模块]

## 上下文清单
- [x] 已读取 AGENTS.md 架构约束
- [x] 已识别相关类型定义 [链接到类型文件]
- [ ] 待确认：[如有待确认项，标记为阻塞]

## 执行计划（Plan-Build-Verify-Fix）
1. [Plan] 设计接口/类型
2. [Build] 实现核心逻辑 + 单元测试（TDD）
3. [Build] 实现外围层（如需）
4. [Verify] 运行类型检查 + 单元测试 + Lint
5. [Fix] 修复发现的问题（如适用）
6. [Verify] 最终验收（见第 3 章清单）
```

## 2. 开始执行前的 5 步

- 用一句话复述目标、限制、DoD、依赖；若用户已确认，可直接继续。
- 圈定最可能受影响的模块、文件与验证范围。
- 优先使用 CodeMap CLI 做检索与影响分析。
- 先决定最小验证方案，再开始编辑。
- 只读取当前任务需要的事实，避免无边界探索。

## 3. 验收清单（Task Completion Checklist - Harness 规范）

AI 完成任务前必须自检并勾选：

```markdown
## 任务完成验收清单
- [ ] **代码实现**：功能完整，符合需求描述
- [ ] **架构合规**：无跨层违规依赖（如 Domain 层导入 CLI 模块）
- [ ] **类型安全**：`npm run typecheck` 无错误
- [ ] **测试覆盖**：新代码覆盖率 >80%，全量测试通过
- [ ] **文档同步**：如修改接口，已更新相关注释/文档
- [ ] **垃圾回收**：无 console.log 调试代码，无未使用 import
- [ ] **安全审查**：无敏感信息泄露，输入已验证
- [ ] **可信度自评**：已提供（见 AGENTS.md 5.1 格式）
```

**提交流程**：
- L0 任务：完成清单后，自动格式代码（`npm run lint -- --fix`），直接提交
- L1 及以上：完成清单后，生成 PR 描述（包含变更摘要和测试证据），暂停等待人类审查

### 3.1 Commit 策略（Harness 规范）

**核心原则**：任务完成即提交，保持提交的原子性。

| 场景 | 策略 |
|------|------|
| **单个任务完成** | 立即 commit，禁止累积多个任务 |
| **多文件变更** | 按逻辑分批 commit |
| **Commit 格式** | `[TAG] scope: message` |

**禁止**：
- ❌ 累积多个任务后才 commit
- ❌ 一个 commit 超过 10 个文件
- ❌ 使用 `--no-verify` 跳过检查

## 4. 检索优先级

### 4.1 代码检索（优先使用 CodeMap CLI）
- 首选：`node dist/cli/index.js query -s "<symbol>"`
- 首选：`node dist/cli/index.js query -m "<module>"`
- 首选：`node dist/cli/index.js deps -m "<module>"`
- 首选：`node dist/cli/index.js impact -f "<file>"`
- 首选：`node dist/cli/index.js analyze <intent>`

### 4.2 MVP3 架构层检索（按层次查找）
- **Interface 层**：`src/interface/types/`, `src/interface/config/`
- **Infrastructure 层**：`src/infrastructure/storage/`, `src/infrastructure/parser/`, `src/infrastructure/repositories/`
- **Domain 层**：`src/domain/entities/`, `src/domain/services/`, `src/domain/repositories/`
- **Server 层**：`src/server/`, `src/server/handlers/`, `src/server/routes/`
- **CLI 层**：`src/cli/commands/`, `src/cli-new/`

### 4.3 回退方案
- 回退：`rg -n`、`find`、直接读文件

若 CodeMap 失效或结果不足，记录问题并继续任务；不要因为工具问题卡死交付。

## 5. 实际可用命令

- 构建：`npm run build`
- 类型检查：`npm run typecheck`
- 测试：`npm test`
- 代码检查：`npm run lint`
- CLI 入口：`node dist/cli/index.js <command>`
- 全部检查：`npm run check:all`（类型 + 测试 + Lint）

注意：当前仓库真实输出目录是 `dist/`，不是 `build/`。

## 6. 改动策略

- 先做最小改动，再考虑扩展；优先根因修复。
- 不顺手修无关问题；发现额外问题可记录，但不要混入当前补丁。
- 保持现有风格与命名约定；不要在文档入口重复堆砌细节。
- 修改 TypeScript 非测试文件时，注意 `[META]` 与 `[WHY]` 文件头要求。
- 改动规则、设计、输出契约时，先判断是否需要同步相关 docs。

### 6.1 必须同步文档的触发条件（ checklist ）

修改以下类型代码时，**必须**检查并更新对应文档：

- [ ] **新增/修改 CLI 命令** → 同步 `CLAUDE.md`、`docs/rules/engineering-with-codex-openai.md`
- [ ] **修改类型定义/接口** → 同步相关注释、API 文档、使用示例
- [ ] **修改 CI/CD 配置** → 同步 `docs/rules/validation.md`
- [ ] **修改 Git Hooks** → 同步 `docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`
- [ ] **修改测试配置/规则** → 同步 `docs/rules/testing.md`
- [ ] **修改架构依赖关系** → 同步 `ARCHITECTURE.md`、`docs/rules/architecture-guardrails.md`
- [ ] **新增代码规范/红线** → 同步 `docs/rules/code-quality-redlines.md`
- [ ] **修改提交规范** → 同步 `AGENTS.md` 或 `docs/rules/engineering-with-codex-openai.md`
- [ ] **发现文档与代码不符** → 立即修复相关文档

**决策原则**：若改动会影响其他开发者或 AI 的行为，就必须更新文档。

## 7. 验证策略

- 先跑最小相关验证，再扩大到更广的检查。
- 没有验证就不要声称"已解决"；若无法验证，必须说清阻塞点。
- 每次任务至少给出 1 个失败场景或具体风险模式。
- 涉及 CI / hooks / 提交规则时，必须给出失败场景与修复验证证据。
- 严禁通过 `--no-verify`、禁用 hooks、删除检查来规避失败。

## 8. 回复协议

- 每条关键信息用 `[证据]`、`[推论]`、`[假设]`、`[观点]` 标记。
- 仓库事实引用格式：`path:line`。
- 外部事实引用格式：URL。
- 不确定内容只能标 `[假设]`。
- 回答应优先短、准、可执行，避免重复粘贴大段项目百科。

## 9. 交付清单

- 说明修改了哪些文件。
- 说明这样改的原因与边界。
- 说明执行了哪些验证，结果如何。
- 说明尚存风险或未验证项。
- 明确判断是否需要同步 `AGENTS.md`、`CLAUDE.md`、`README.md`、`ARCHITECTURE.md`、相关 `docs/*`。

## 10. 这份文件不该再承载什么

- 不再承载完整项目百科。
- 不再内嵌大段配置样例或问题模板。
- 不再重复 `AGENTS.md` 已经定义的强约束。
- 不再把设计文档、执行计划、产品规格写回入口文件。

当入口文档再次膨胀时，应把知识下沉到 `ARCHITECTURE.md` 或相应 `docs/*`，并把这里恢复为高信号摘要。
