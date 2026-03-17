# AGENTS.md - CodeMap 仓库级 AI 协议

> 目标：把入口文档收敛为"强约束 + 路由"，细节下沉到架构文档与 `docs/`。
> 语言：中文。默认面向 AI 编程助手与自动化代理。

## 1. 作用域与优先级

- 本文件作用于仓库根目录及其全部子目录；若子目录存在更近的 `AGENTS.md`，以后者为准。
- 指令优先级：系统 / 开发者 / 用户 > 更近的 `AGENTS.md` > 本文件 > `CLAUDE.md` > 其他文档。
- 目标不是复述所有知识，而是给出最低歧义的执行协议。

## 2. 文档职责分层

- `AGENTS.md`：仓库级强约束、交互协议、执行与验证底线。
- `CLAUDE.md`：Claude / Codex 的启动清单、检索顺序、最小操作手册。
- `ARCHITECTURE.md`：系统地图、模块边界、关键数据流、核心依赖关系。
- `docs/rules/`：开发、测试、验证、部署规则。
- `docs/design-docs/`：设计意图、权衡、验证状态、待决问题。
- `docs/exec-plans/`：活跃计划、复盘记录、技术债跟踪。
- `docs/generated/`：生成内容，如 schema、快照、报告。
- `docs/product-specs/`：产品规格、需求边界、验收标准。
- `docs/references/`：技术参考、外部资料、设计系统、工具链说明。
- 若上述目标文件或目录尚未落地，视为迁移中；不得臆造其内容，必须回退到当前存在的 `docs/` 与代码事实。

## 3. 开始任务前

- 先明确四件事：目标、限制条件、验收标准、依赖关系。
- 若任务目标不够清楚，先用一句话复述你的理解并请求确认；若用户已确认或当前回合只是延续执行，可直接继续。
- 先找离目标文件最近的 `AGENTS.md`，再读最相关的事实来源，不要全仓漫游。
- 置信度低于 95% 时，每轮最多问 1 个问题。

## 3.1 任务分级与自主权边界（Harness 规范）

根据任务风险等级，AI 拥有不同的自主权：

| 等级 | 场景示例 | 人类审查点 | AI 权限 |
|------|---------|-----------|--------|
| **L0-自主** | 函数重构、单元测试编写、文档更新、类型修复 | 无需审查，直接提交 | 完整读写，自动提交 |
| **L1-监督** | 新 API 端点、组件开发、配置变更 | 架构合规性检查 | 可生成，需标记 PR 供审查 |
| **L2-受控** | 核心算法修改、CLI 命令变更、CI/CD 调整 | 逻辑正确性 + 安全审查 | 生成后暂停，等待人类确认 |
| **L3-禁止** | 生产环境密钥修改、版本号变更、发布操作 | 完全禁止自主执行 | 仅提供方案，禁止执行 |

**执行规则**：
- 任务开始时，AI 必须根据上述分类自评等级并声明："当前任务评估为 L[X] 级"
- 禁止擅自降低风险等级以绕过审查
- 遇到模糊边界（如"修改分析器"涉及核心架构时），自动上溯至更高等级

## 3.2 Commit 策略（Harness 规范）

**核心原则**：任务完成即提交，保持提交的原子性和可追溯性。

| 场景 | Commit 策略 |
|------|------------|
| **单个任务完成** | 立即 commit，禁止累积多个任务后再提交 |
| **任务涉及多个文件变更** | 按逻辑分批 commit，每批一个独立提交 |
| **L0 任务** | 完成验收清单后直接 `git commit` + `git push` |
| **L1+ 任务** | 完成验收清单后 commit，生成 PR 描述，暂停等待审查 |

**Commit 格式**：
```
[TAG] scope: message

- 变更详情 1
- 变更详情 2
```

**禁止行为**：
- ❌ 累积多个任务后才 commit
- ❌ 一个 commit 包含超过 10 个文件（`.githooks/commit-msg` 会拦截）
- ❌ 使用 `git commit --no-verify` 跳过检查

## 4. 执行循环

- 采用单线程执行；任务尽量原子化，单次交付以 1 天内可完成为上限。
- 遵循"滑板原则"：每一步都交付最小可用成果，而不是空转规划。
- 优先修复根因，不做表面补丁；避免顺手修改无关问题。
- 出现僵局时，先换视角：缩小范围、放大架构、或回到第一原则。
- 连续 6 轮仍未澄清时，给出 2~4 个推测路径；若用户仍不选，执行最可能路径并显式告知风险。

## 5. 证据协议

- 所有回复必须显式使用标签：`[证据]`、`[推论]`、`[假设]`、`[观点]`。
- 事实必须附来源：仓库事实用 `path:line`，外部事实用 URL。
- 未核实内容只能标记为 `[假设]`，不得伪装成事实。
- 结论若来自推导，必须说明是从哪些证据得出。
- 默认采用 retrieval-led reasoning，不把记忆当作最终事实。

## 5.1 可信度自评要求（Harness 规范）

每次任务完成前，AI 必须输出以下格式的可信度评估：

```markdown
## 可信度自评
- **确定信息**（基于代码/文档验证）： [如：类型检查通过，测试覆盖 90%]
- **推测信息**（基于模式匹配）： [如：假设用户输入符合 Schema，未验证边界情况]
- **需验证信息**（未确认/无法确认）： [如：未在生产环境测试性能]
- **风险标记**： [如：使用了 any 类型绕过，建议人工审查第 45 行]
```

## 6. 检索与分析优先级

- 涉及代码搜索、项目分析、影响评估时，优先使用本仓库 CodeMap CLI。
- 首选命令：`node dist/cli/index.js query|analyze|deps|impact`。
- CodeMap 不足或失败时，再回退到 `rg`、`find` 等标准工具。
- 若因 CodeMap 缺陷被迫回退，应把问题记录到 `.codemap/issues/codemap-issues.md`（若该流程在当前任务中适用）。

## 7. 代码与改动规则

- 保持最小改动面，优先与现有风格一致。
- TypeScript 源文件（非测试）必须保留文件头中的 `[META]` 与 `[WHY]` 约束。
- 默认遵守严格模式、ESM、ES2022、返回类型显式、`unknown` 优于 `any`。
- 改动设计、规则或输出契约时，先检查是否需要同步相关文档。
- 不得通过删除、注释、绕过护栏来"修复"问题。

## 7.1 代码生成红线（Harness 规范）

AI 生成代码时，以下模式触发**硬性阻断**：

| 红线规则 | 检测方式 | 自动修复策略 |
|---------|---------|-------------|
| 敏感信息硬编码 | 检测 `password`, `secret`, `api_key`, `token` 字面量 | 替换为 `process.env` 读取 + 类型检查 |
| `any` 类型使用 | TypeScript 编译器 `noImplicitAny` | 推导具体类型或使用 `unknown` + 守卫 |
| 函数超过 50 行 | 静态分析行数 | 拆分为子函数，保持单一职责 |
| 未处理 Promise | ESLint `@typescript-eslint/no-floating-promises` | 添加 `await` 或 `.catch()` 处理 |
| `console.log` 遗留 | ESLint `no-console`（允许 `src/cli/runtime-logger.ts`） | 使用 `runtime-logger` 替代 |
| 未使用 import | ESLint `@typescript-eslint/no-unused-vars` | 自动删除或标记为使用 |

## 8. 验证与失败预演

- 动手前先定义可验证的 DoD；交付前必须回到 DoD 逐条自检。
- 必须至少模拟 1 个失败场景或风险模式，而不是只证明成功路径。
- 验证顺序：先最小相关测试，再扩大到更广范围。
- 涉及 CI、规则、生成契约、提交护栏的改动，必须提供"失败场景 + 修复验证"证据。
- 严禁使用 `--no-verify`、临时关闭 hooks、放宽阈值、删除检查项来过关。

## 9. 交付与文档同步

### 9.1 必须更新文档的触发条件

以下情况**必须**同步更新相关文档：

| 触发条件 | 必须更新的文档 | 示例 |
|---------|--------------|------|
| **新增/修改 CLI 命令** | `CLAUDE.md`、`docs/rules/engineering-with-codex-openai.md` | 新增 `codemap analyze` 子命令 |
| **新增/修改配置项** | `README.md`、`docs/rules/*.md` | 新增 `mycodemap.config.json` 配置 |
| **修改架构分层** | `ARCHITECTURE.md`、`docs/rules/architecture-guardrails.md` | 新增 orchestrator 层 |
| **修改 CI/CD 流程** | `.github/workflows/*.yml`、`docs/rules/validation.md` | 新增 CI 检查步骤 |
| **修改 Git Hooks** | `.githooks/*`、`docs/rules/validation.md` | 修改 commit-msg 格式要求 |
| **修改代码规范** | `docs/rules/code-quality-redlines.md` | 新增 ESLint 规则 |
| **修改测试规则** | `docs/rules/testing.md` | 变更覆盖率阈值 |
| **修改提交格式** | `docs/rules/engineering-with-codex-openai.md` | 新增 commit tag 类型 |
| **发现文档与代码不符** | 相关文档 | README 示例代码与实际 CLI 输出不一致 |
| **引入新的依赖项** | `ARCHITECTURE.md`（如影响分层） | 新增 dependency-cruiser |

### 9.2 文档更新决策流程

```
修改完成
    ↓
是否影响接口/契约？ ──是──→ 更新 API 文档 + 使用示例
    ↓ 否
是否影响开发流程？ ──是──→ 更新 docs/rules/ + CLAUDE.md
    ↓ 否
是否影响架构分层？ ──是──→ 更新 ARCHITECTURE.md + architecture-guardrails.md
    ↓ 否
是否影响用户使用？ ──是──→ 更新 README.md + SETUP_GUIDE.md
    ↓ 否
是否修改了规则？ ───是──→ 更新 AGENTS.md / CLAUDE.md
    ↓ 否
无需更新文档
```

### 9.3 交付要求

- 交付时至少说明：改了什么、为什么改、如何验证、还剩什么风险。
- 每次任务结束都要自问：是否需要同步 `AGENTS.md`、`CLAUDE.md`、`README.md`、`ARCHITECTURE.md` 与相关 `docs/*`。
- 若判断"不需要更新"，也要明确写出原因。
- 若发现入口文档重复承载了细节知识，应优先把知识下沉到对应文档，而不是继续堆在入口文件中。

## 9.1 技术债务标记规范（Harness 规范）

若因时间压力（如 MVP 需求）必须暂时绕过约束，必须按以下格式标记：

```typescript
// TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:MVP需求]
// 问题：使用了 any 类型绕过复杂泛型推导
// 风险：可能丢失类型安全
// 偿还计划：V1.1 重构时引入正确的条件类型
function temporaryBypass(data: any): any {
  // 实现...
}
```

**债务追踪**：项目维护 `docs/exec-plans/tech-debt/` 目录，记录所有此类标记，每 Sprint 审查。

## 10. 当前仓库过渡说明

- 目标结构是：`ARCHITECTURE.md` + `docs/rules` + `docs/design-docs` + `docs/exec-plans` + `docs/generated` + `docs/product-specs` + `docs/references`。
- 当前新文档结构已落地；历史归档仍保留在 `docs/archive/`，少量操作指南仍在 `docs/` 根层，执行时以"实际存在的文件"为准。
- 当前 CLI 构建输出目录是 `dist/`，CLI bin 指向 `dist/cli/index.js`；不要把 `build/` 当成事实默认值。
- 入口文档应保持短小；长命令清单、问题模板、配置大段样例应下沉到对应文档。
