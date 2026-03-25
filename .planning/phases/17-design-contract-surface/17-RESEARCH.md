# Phase 17: Design Contract Surface - Research

**Researched:** 2026-03-25
**Domain:** 人类可写 design contract、CLI diagnostics、docs drift 收敛
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 新能力必须作为 purpose-built `design` surface 出现，不能通过扩写 `analyze` intent 或恢复 `workflow` 六阶段偷渡实现。
- design contract 必须先解决“人类如何明确表达目标/限制/验收/非目标”，而不是让 AI 继续猜自由文本。
- CLI / loader 必须对缺字段、重复段、空段、歧义 heading 等输入问题给出机器可读 diagnostics。
- 默认设计输入文件需要有明确路径约定；找不到文件时必须返回 actionable error。
- README / AI docs / rules / docs guardrail 必须与真实命令面同步，且要顺手修复当前 workflow docs drift。
- 本 phase 不做 code mapping、handoff package、审批状态持久化或 design drift verification。

### the agent's Discretion
- Markdown contract 的 heading 命名与 alias 集合
- diagnostics 类型细节与错误码命名
- section parser 的具体实现（只要不引入不必要复杂度）
- canonical template 放在 `docs/product-specs/` 还是 `docs/references/`

### Deferred Ideas (OUT OF SCOPE)
- design-to-code mapping
- machine-readable handoff JSON 与 human review summary
- acceptance criteria → drift report 的验证链路
- workflow 阶段扩展、HTTP API、设计编辑器 UI

</user_constraints>

<research_summary>
## Summary

第一个结论是：**Phase 17 不能把 design 语义继续塞进 `analyze` / `workflow`。** 当前 `workflow` 的 CLI help 与 orchestrator 运行时都已经收敛成 analysis-only 四阶段，而 `docs/ai-guide/PATTERNS.md` 仍保留 `commit` / `ci` 两个阶段漂移。如果本 phase 再用“顺手多塞一点”方式引入 design 输入，只会把现有 docs drift 放大成新的 public contract drift。

第二个结论是：**设计输入格式应当优先服务“人类负责设计”而不是“机器最容易解析”。** 当前仓库没有现成的 Markdown contract parser / frontmatter pipeline，也没有必要在第一步就把人类 authoring 体验降级成手写 JSON。更稳的路线是：人类编写 Markdown sections，CLI 用 lightweight section parser 负责结构化验证与 diagnostics。

第三个结论是：**`src/cli/config-loader.ts` 提供了直接可复用的产品化样板。** 它已经证明：文件发现、默认路径、归一化、硬失败策略和 CLI-owned normalization seam 可以在不污染 domain/core 的前提下稳定交付。Phase 17 应该用同样方式做 `design-contract-loader.ts`，而不是重开一套散落逻辑。

第四个结论是：**docs sync 必须和 design surface 同批交付，而不是延后。** `scripts/validate-docs.js` 与相关 tests 已把 public contract 变更变成强耦合问题；`docs/ai-guide/PATTERNS.md` 的现存漂移也说明 guardrail 覆盖并不完整。若 Phase 17 只交代码、不交 docs / tests，下一轮 phase 将继续建立在错误入口文档之上。

第五个结论是：**最小可信产品面只需要 `design validate`，不需要一开始就做 `design generate-handoff` 或 `design resolve-scope`。** 当前 milestone 的第一步目标是让 design input 成为可信事实源，而不是立刻把整个 handoff 流水线做完。把子命令压到单一 `validate`，能把风险和 blast radius 明显压小。

**Primary recommendation:** 按 roadmap 的三块拆法推进：  
1. 先定义 design contract 的类型、section schema、默认路径和 canonical template；  
2. 再实现 loader / validator / diagnostics 与 `design validate` CLI；  
3. 最后补齐 README / AI docs / rules / docs guardrail，并顺手清掉 workflow docs drift。
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `src/interface/types/` | design contract 正式类型与共享语义 | 未来 Phase 18/19 需要复用同一 contract |
| `src/cli/index.ts` | top-level `design` 命令注册 | 当前公开 CLI 入口事实源 |
| `src/cli/config-loader.ts` | loader / normalization seam 样板 | 已有成熟模式，最贴近本 phase |
| `src/cli/commands/` | `design validate` 子命令落点 | 与现有命令结构一致 |
| `scripts/validate-docs.js` | docs / command contract guardrail | 新 surface 必须被自动锁住 |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `src/cli/__tests__/index-help.test.ts` | 顶层 help surface 回归 | 新增 `design` 命令时 |
| `src/cli/__tests__/validate-docs-script.test.ts` | docs guardrail fixture 回归 | 文档新增 design snippets 时 |
| `src/cli/commands/__tests__/ci-docs-sync.test.ts` | CLI docs sync guardrail | 扩展 `ci check-docs-sync` 覆盖范围时 |
| `docs/ai-guide/COMMANDS.md` | 命令文档事实源 | 记录 `design validate` 使用方式 |
| `docs/ai-guide/OUTPUT.md` | 输出契约事实源 | 记录 diagnostics schema |
| `docs/product-specs/` | 设计模板和样例的高信号归档点 | 放 canonical template |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown contract | JSON / YAML contract | 更易解析，但会把“人类负责设计”降级成配置编辑，不利 adoption |
| 独立 `design` 命令 | 给 `analyze` 新增 `design` intent | 直接破坏已锁定的 analyze public contract |
| CLI-owned loader | 把解析逻辑塞进 `core` / `orchestrator` | 会在 Phase 17 过早扩大架构改动面 |
| 轻量 section parser | 引入重型 Markdown AST 依赖 | 初期收益低、复杂度高、测试面更大 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Human-authored markdown, machine-enforced diagnostics
**What:** 人类写 Markdown sections，CLI 解析并输出结构化 diagnostics / normalized contract。  
**Why:** 保留 human-authoring 体验，同时把机器消费的稳定性移到 validator 层。  
**Evidence:** `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `src/cli/config-loader.ts`

### Pattern 2: Interface owns semantics, CLI owns file loading
**What:** `src/interface` 定义 `DesignContract` / `Diagnostic` 等正式类型，`src/cli` 负责默认路径、读取文件、解析和用户提示。  
**Why:** 既符合 MVP3 layering，也与现有 config surface 成功样板一致。  
**Evidence:** `AGENTS.md`, `src/cli/config-loader.ts`, `src/interface/types/index.ts`

### Pattern 3: Purpose-built command surface over overloaded legacy surfaces
**What:** 新能力用 `mycodemap design validate [file]` 暴露，而不是扩写 `analyze` / `workflow`。  
**Why:** 可以把新 contract 限定在一条最短路径，控制 docs/test blast radius。  
**Evidence:** `.planning/PROJECT.md`, `.planning/STATE.md`, `src/cli/index.ts`, `src/cli/commands/workflow.ts`

### Pattern 4: Guardrail-backed documentation launch
**What:** 设计输入模板、命令说明、输出契约和 PATTERNS 修复一起入 guardrail。  
**Why:** 当前 docs 已出现 workflow stage drift；不在第一批锁住，会继续扩散。  
**Evidence:** `docs/ai-guide/PATTERNS.md`, `scripts/validate-docs.js`, `src/cli/__tests__/validate-docs-script.test.ts`

### Anti-Patterns to Avoid
- 把 `design` 作为 `analyze` 新 intent 或让 `workflow` 恢复 `commit/ci`
- 解析失败后继续 best-effort 猜设计意图
- 在 `--json` 输出里混入说明性 prose
- 只改 README，不同步 AI docs / rules / guardrail tests
- 为了 Phase 17 引入复杂 Markdown 生态依赖，却没有真实必需性
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 设计输入格式可写，但不可判错
**Failure mode:** CLI 读到了文件，却对缺少 `Acceptance Criteria`、重复 `Goal` 等情况没有 blocker diagnostics。  
**Impact:** AI 仍然会在不完整设计上继续推理，放大 scope drift。

### Pitfall 2: 新命令进了 CLI，顶层 help 和 docs 没同步
**Failure mode:** `src/cli/index.ts` 已增加 `design`，但 `README.md` / `AI_GUIDE.md` / `COMMANDS.md` 仍无入口说明。  
**Impact:** 用户和 agent 都无法把它当正式产品面。

### Pitfall 3: 修了 design docs，却没修 workflow docs drift
**Failure mode:** 新 surface 文档正确，但 `docs/ai-guide/PATTERNS.md` 还在声称 workflow 有 `commit` / `ci`。  
**Impact:** 入口说明互相冲突，降低整体信任度。

### Pitfall 4: `design validate --json` 混入自然语言
**Failure mode:** 为了“更友好”在 JSON 前后打印说明语句。  
**Impact:** 机器消费链路直接被污染，不再适合 AI / CI 使用。
</common_pitfalls>

<code_examples>
## Code Examples

### Recommended v1 contract shape
```markdown
# Design Contract: Feature Name

## Goal
- 目标描述

## Constraints
- 技术/产品/时间限制

## Acceptance Criteria
- 可验证结果 1
- 可验证结果 2

## Non-Goals
- 明确不做什么
```

### Recommended CLI entry
```bash
mycodemap design validate mycodemap.design.md --json
```

### Current docs drift to remove
```text
5. `commit` - 提交验证
6. `ci` - CI 验证
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `node dist/cli/index.js design validate --help` — top-level command / subcommand help
2. `pnpm exec vitest run src/cli/__tests__/index-help.test.ts src/cli/__tests__/design-contract-loader.test.ts src/cli/commands/__tests__/design-command.test.ts` — command surface 与 loader diagnostics regression
3. `node dist/cli/index.js design validate tests/fixtures/design-contracts/valid-basic.design.md --json` — valid contract JSON smoke test
4. `node dist/cli/index.js design validate tests/fixtures/design-contracts/missing-acceptance.design.md --json` — failure-path diagnostics smoke test
5. `npm run docs:check` — README / AI docs / PATTERNS / rules / guardrail consistency
6. `node dist/cli/index.js ci check-docs-sync` — CLI-level docs guardrail entry

### Recommended failure rehearsal
- 模拟缺失 `## Acceptance Criteria`：必须返回 blocker diagnostics，而不是隐式成功
- 模拟重复 `## Goal` / 未知 heading：必须显式标记 contract 结构歧义
- 模拟 `docs/ai-guide/PATTERNS.md` 重新写回 `commit` / `ci`：guardrail 必须失败
</validation_architecture>

<open_questions>
## Open Questions

1. 必填段的 heading alias 要宽松到什么程度，才能兼顾 human authoring 与 diagnostics 明确性？
2. diagnostics 是沿用现有 `E00xx` 风格，还是先用 `missing-section` / `duplicate-section` 这类稳定字符串 code？
3. canonical template 是否需要同时提供“空白模板”和“带示例模板”两个版本，还是先只保留一个高信号样板？
</open_questions>

<sources>
## Sources

### Primary
- `.planning/phases/17-design-contract-surface/17-CONTEXT.md`
- `.planning/PROJECT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/codebase/CONCERNS.md`
- `src/cli/index.ts`
- `src/cli/config-loader.ts`
- `src/cli/commands/workflow.ts`
- `src/orchestrator/workflow/workflow-orchestrator.ts`
- `docs/ai-guide/PATTERNS.md`
- `scripts/validate-docs.js`

### Secondary
- `src/cli/__tests__/index-help.test.ts`
- `src/cli/__tests__/validate-docs-script.test.ts`
- `src/cli/commands/__tests__/ci-docs-sync.test.ts`
- `src/interface/types/index.ts`
- `src/infrastructure/parser/index.ts`

</sources>

---

*Phase: 17-design-contract-surface*
*Research gathered: 2026-03-25*
