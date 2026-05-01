# AGENTS.md - CodeMap 仓库级 AI 协议

> 目标：让入口文档稳定收敛为 **`AGENTS.md = constitution` / `CLAUDE.md = router` / `.claude/CLAUDE.md = Claude adapter`**。
> 语言：中文。默认面向 AI 编程助手与自动化代理。

## 1. 作用域与优先级

- 本文件作用于仓库根目录及其全部子目录；若子目录存在更近的 `AGENTS.md`，以后者为准。
- 指令优先级：系统 / 开发者 / 用户 > 更近的 `AGENTS.md` > 本文件 > `CLAUDE.md` > 其他文档。
- 本文件只保留仓库级治理协议；若某条细则在 live doc 已定权，这里只保留原则与路由，不重复正文。

## 2. 文档职责分层

- `AGENTS.md`：仓库级强约束、交互协议、证据协议、改动边界、验证/交付底线。
- `CLAUDE.md`：入口路由；告诉 agent 下一份该读什么、哪份文档定权、规则该改哪一份。
- `.claude/CLAUDE.md`：Claude adapter；只解释 Claude 自动读取与 shared truth 的关系。
- `ARCHITECTURE.md`：系统地图、模块边界、关键数据流、核心依赖关系。
- `docs/rules/`：开发、测试、验证、发布、工程执行规则正文。
- `docs/rules/harness.md`：agent harness 的上下文装配、工具权限、反馈回路、验证门与升级路径参考。
- `docs/design-docs/`：设计意图、权衡、验证状态、待决问题。
- `docs/exec-plans/`：活跃计划、复盘记录、技术债跟踪。
- `docs/generated/`：生成内容，如 schema、快照、报告。
- `docs/product-specs/`：产品规格、需求边界、验收标准。
- `docs/references/`：技术参考、外部资料、工具链说明。
- `AI_GUIDE.md` 与 `docs/ai-guide/*`：CodeMap CLI / MCP / AI 使用指南、输出契约、模式与提示词模板。
- 若目标文档尚未落地，必须回退到当前存在的 `docs/` 与代码事实；不得臆造。

## 3. 开始任务前

- 先明确四件事：目标、限制条件、验收标准、依赖关系。
- 任务目标不清楚时，先用一句话复述理解再请求确认；若用户已确认或是延续执行，可直接继续。
- 先找离目标文件最近的 `AGENTS.md`，再读最相关的事实来源，不要全仓漫游。
- 置信度低于 95% 时，每轮最多问 1 个问题。

## 3.1 任务分级与自主权边界（Harness 规范）

| 等级        | 场景示例                             | 人类审查点            | AI 权限             |
|-------------|--------------------------------------|-----------------------|---------------------|
| **L0-自主** | 函数重构、单元测试、文档更新、类型修复  | 无需审查，直接提交     | 完整读写            |
| **L1-监督** | 新 API 端点、组件开发、配置变更        | 架构合规性检查        | 可生成，需人工审查   |
| **L2-受控** | 核心算法修改、CLI 命令变更、CI/CD 调整 | 逻辑正确性 + 安全审查 | 生成后暂停，等待确认 |
| **L3-禁止** | 生产密钥修改、版本号变更、发布操作     | 完全禁止自主执行      | 仅提供方案          |

**执行规则：**

- 任务开始时，必须声明：`当前任务评估为 L[X] 级`。
- 禁止擅自降低风险等级以绕过审查。
- 遇到模糊边界时，自动上溯到更高等级。
- `/release` 属于发布操作；即使流程文档完备，也必须遵守 `docs/rules/release.md` 中定义的双确认门，不得自主完成版本号变更、tag 或 push。

## 4. 执行底线

- 采用单线程执行；任务尽量原子化，单次交付以 1 天内可完成为上限。
- 遵循“滑板原则”：每一步都交付最小可用成果，而不是空转规划。
- 优先修复根因，不做表面补丁；避免顺手修改无关问题。
- 只改与任务直接相关的文件；若发现无关问题，只记录，不顺手清理。
- 默认采用 retrieval-led reasoning，不把记忆当作最终事实。
- 连续多轮仍未澄清时，显式列出可行路径与风险，而不是静默猜测。

## 5. 证据协议

- 所有回复必须显式使用标签：`[证据]`、`[推论]`、`[假设]`、`[观点]`。
- 事实必须附来源：仓库事实用 `path:line`，外部事实用 URL。
- 未核实内容只能标记为 `[假设]`，不得伪装成事实。
- 结论若来自推导，必须说明是从哪些证据得出。
- 默认采用 retrieval-led reasoning，不把记忆当作最终事实。

## 5.1 可信度自评要求（Harness 规范）

每次任务完成前，必须输出以下结构：

```markdown
## 可信度自评
- **确定信息**（基于代码/文档验证）： ...
- **推测信息**（基于模式匹配）： ...
- **需验证信息**（未确认/无法确认）： ...
- **风险标记**： ...
```

## 6. 检索与分析优先级

- 涉及代码搜索、项目分析、影响评估时，必须先尝试 CodeMap CLI：`node dist/cli/index.js query|analyze|deps|impact`；不要把 `grep` / `rg` 作为第一搜索工具。
- 常用映射：找符号用 `query --symbol "<Name>" --json`；模糊找代码用 `query --search "<keyword>" --json`；读代码范围用 `analyze -i read -t "<path>" --json`；影响分析用 `impact -f "<file>" --transitive --json`。
- 只有 CodeMap 结果不足、CLI 失败，或目标是 CodeMap 未覆盖的纯文档/配置文本时，才回退到 `rg`、`find` 等标准工具。
- 若因 CodeMap 缺陷被迫回退，且当前任务适用，应记录到 `.mycodemap/issues/codemap-issues.md`。

### 6.1 mycodemap-rules-bundle

<!-- mycodemap-rules-bundle:start -->
- `@.mycodemap/rules/commit/default.md`
- `@.mycodemap/rules/test/default.md`
- `@.mycodemap/rules/lint/default.md`
- `@.mycodemap/rules/docs/default.md`
- `@.mycodemap/rules/validation/default.md`
<!-- mycodemap-rules-bundle:end -->

## 7. 代码与改动规则

- 保持最小改动面，优先与现有风格一致。
- TypeScript 源文件（非测试）必须保留文件头中的 `[META]` 与 `[WHY]`。
- 默认遵守严格模式、ESM、ES2022、返回类型显式、`unknown` 优于 `any`。
- 改动设计、规则、输出契约时，先检查是否需要同步相关文档。
- 不得通过删除、注释、绕过护栏来“修复”问题。


## 8. 验证与失败预演

- 动手前先定义可验证的 DoD；交付前必须逐条回到 DoD 自检。
- 必须至少模拟 1 个失败场景或风险模式，而不是只证明成功路径。
- 验证顺序：先最小相关测试，再扩大到更广范围。
- 涉及 CI、规则、生成契约、提交护栏的改动，必须提供“失败场景 + 修复验证”证据。
- 严禁使用 `--no-verify`、关闭 hooks、放宽阈值、删除检查项来过关。

### 8.1 真实场景验证阈值

真实场景验证为**宪法级硬约束**。最低阈值要求：

- **真实 filesystem + 真实 subprocess 或真实 transport**（非纯 mock）
- **禁止**：仅 mock 依赖后断言函数返回值；仅 `toEqual` 断言无真实端到端触发；在已污染环境中声称"通过"；无失败场景验证
- **要求**：每个修复/功能至少 1 个失败场景验证证据
- **分级执行控制**：pre-commit warn-only → CI blocking → pre-release 必过

详细规则正文 → `docs/rules/testing.md`  
发布门检查 → `docs/rules/pre-release-checklist.md` #12

### 8.2 豁免条款


## 9. 交付与文档同步底线

- 交付时至少说明：改了什么、为什么改、如何验证、还剩什么风险。
- 若改动会影响接口、CLI、配置、架构、规则、验证流程、输出契约或 agent 路由，必须同步对应的 authoritative docs。
- 详细文档同步触发条件、AI 友好文档 authoring 规则、任务模板与交付 checklist 统一在 `docs/rules/engineering-with-codex-openai.md` 定权。
- AI 友好文档的**结构清晰要求**、**决策树要求**、**速查表要求**、**代码可复现要求**、**类型定义要求**与**提示词模板要求**统一在 `docs/rules/engineering-with-codex-openai.md` 定权。
- 若判断“不需要更新文档”，也要明确写出原因。
- 每次任务结束都要自问：是否需要同步 `AGENTS.md`、`CLAUDE.md`、`README.md`、`ARCHITECTURE.md`、`AI_GUIDE.md`、`docs/rules/*` 与 `docs/ai-guide/*`。

## 10. 当前仓库过渡说明

- 当前 CLI 构建输出目录是 `dist/`，CLI bin 指向 `dist/cli/index.js`；不要把 `build/` 当成事实默认值。
- 命名统一：产品/项目名写 `CodeMap`；公开 CLI 命令首选写 `mycodemap`；`codemap` 仅作为兼容别名或内部 MCP tool 名称出现，不作为新文档、新示例、新提示词的首选命令名。
- 入口文档应保持短小；长命令清单、默认值、任务模板、产品使用说明应下沉到对应 live docs。
- 历史归档位于 `docs/archive/` 与 `.planning/milestones/`；执行时以 live docs 和当前代码事实为准。


如果遇到代码运行问题，尽量添加更多调试日志，最好是包含有问题的位置的代码的整个执行日志，查阅日志来检查错误，而不是盲目测试和修改代码。

@/home/stark/.codex/RTK.md
