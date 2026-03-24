# Phase 3: Analyze Contract（Analyze 意图与输出契约重构） - Research

**Researched:** 2026-03-24
**Domain:** 高 blast-radius analyze public contract 收敛与 schema migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `analyze` 的目标态 public intents 只保留 `find` / `read` / `link` / `show`。
- 顶层 CLI 继续要求显式 `--intent/-i`；内部互相冲突的默认 intent 必须清掉。
- 兼容矩阵固定为 `search→find`、`impact/complexity→read`、`dependency/reference→link`、`overview/documentation→show`，`refactor` 仅弃用无映射。
- 兼容窗口固定为 2 个 minor 版本；窗口内给结构化弃用警告，窗口后统一报 `E0001_INVALID_INTENT`。
- JSON / structured 输出必须保持纯机器可读，warning 不能污染 JSON。
- `link` 首版只承诺 `reference + dependency`；更重的 history schema 延后。
- 本 phase 不能混改 `workflow`、`ship/ci`、`server/watch/report/logs` 或下线独立 `impact/deps/complexity` 命令。

### the agent's Discretion
- 结构化 warning 字段命名
- `read/link/show` typed payload 与 `results[]` 的具体嵌套方式
- 需要同步的最小 docs / guardrail 集合

### Deferred Ideas (OUT OF SCOPE)
- workflow 四阶段模型
- ship / ci 职责重排
- link 的 git-history 正式 schema
- 是否下线独立 `impact/deps/complexity` public commands

</user_constraints>

<research_summary>
## Summary

`Phase 3` 不是“把字符串从 8 个改成 4 个”那么简单；当前 analyze 契约至少分散在四处硬编码：`src/orchestrator/intent-router.ts:16`、`src/cli/commands/analyze.ts:54`、`src/orchestrator/types.ts:86`、`src/orchestrator/confidence.ts:13`。如果只改其中一层，`IntentRouter`、CLI help、schema 类型与 confidence 阈值就会立刻漂移。

第二个结论是：**当前 analyze 已经存在真实的契约自相矛盾**。顶层 CLI 在没有 `intent` 时直接显示 help（`src/cli/commands/analyze.ts:555`），但 `AnalyzeCommand.execute()` 内部又默认 `impact`（`src/cli/commands/analyze.ts:116`），`IntentRouter.parseIntent()` 则默认 `search`（`src/orchestrator/intent-router.ts:88`）。这说明 `Phase 3` 必须先收掉默认值漂移，再谈四意图收敛。

第三个结论是：**参数校验必须按 intent 分流**。当前 `validate()` 一刀切要求 `targets`（`src/cli/commands/analyze.ts:83`），可文档却明确给出 `search` 仅靠 `-k/--keywords` 的示例（`docs/ai-guide/COMMANDS.md:153`，`README.md:612`）。如果继续沿用“所有 intent 都必须 targets”，那 `find` 的 first-class 搜索能力根本无法成立。

第四个结论是：**docs/guardrail 已经把旧 analyze 契约写死**。`docs/ai-guide/COMMANDS.md:131` 和 `docs/ai-guide/OUTPUT.md:112` 仍把 analyze 描述为 8 intents 过渡态；`scripts/validate-docs.js:88` 还要求 README 包含 `overview/impact/dependency/search` 的 analyze 示例；`src/cli/__tests__/validate-docs-script.test.ts:67` 已把 analyze 语法视为 guardrail 的受检事实。Phase 3 若不同步 docs/tests，CI 会稳定失败。

第五个结论是：**`read/link` 应该复用现有独立分析命令，而不是凭空重写底层能力**。`src/cli/commands/impact.ts`、`src/cli/commands/complexity.ts`、`src/cli/commands/deps.ts` 已分别提供影响、复杂度、依赖分析；更稳的路径是先在 `analyze` 层做 contract normalization / schema aggregation，再按需要抽公共 helper。

**Primary recommendation:** 按 roadmap 的三块拆法执行：  
1. 先收掉 `types + router + analyze help/validation` 的 4-intent 入口；  
2. 再定义 `read/link/show` 的 machine schema 与 legacy-compat/warning path；  
3. 最后补 analyze CLI 回归测试、docs/guardrail 和错误码行为。
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `src/cli/commands/analyze.ts` | analyze CLI 参数解析、帮助、错误码与输出装配 | 当前 analyze public contract 总入口 |
| `src/orchestrator/types.ts` | `IntentType` / `AnalyzeArgs` / `CodemapOutput` | 新 schema 与类型契约的单一类型源 |
| `src/orchestrator/intent-router.ts` | intent 白名单与 route 归一化 | 4-intent / legacy mapping 的第一层入口 |
| `src/orchestrator/confidence.ts` | intent-specific confidence 阈值与 reason | 新旧 intent 切换后必须一起更新 |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `src/cli/commands/impact.ts` | `read` 的 impact 数据来源 | 聚合 `read` schema 时 |
| `src/cli/commands/complexity.ts` | `read` 的 complexity 数据来源 | 聚合 `read` schema 时 |
| `src/cli/commands/deps.ts` | `link` 的 dependency 数据来源 | 聚合 `link` schema 时 |
| `scripts/validate-docs.js` | 文档/命令契约 guardrail | 改 analyze docs/examples 后立即验证 |
| `node dist/cli/index.js query --search VALID_INTENTS -j` | 快速定位多处 intent 硬编码 | 评估 blast radius 时 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 先重写底层 analyzer | 先在 `analyze` 层做 schema aggregation | 前者 scope 更大，且会把独立命令一起拖进来 |
| 继续保留默认 intent | 要求显式 `--intent` 并统一 normalize | 默认值更“方便”，但会固化当前三处漂移 |
| 兼容期把 warning 直接打到 stdout | 在 JSON 中输出结构化 warning 字段 | 文本 warning 会污染机器输出，不适合 AI-first 契约 |
| 为 `link` 直接发明 history schema | 先只承接 `reference + dependency` | 当前没有稳定 history 结构，硬做会造伪契约 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Normalize once, emit new intent everywhere
**What:** 用单一 compat layer 把 legacy intent 先 normalize 到 `find/read/link/show`，之后 help、schema、confidence、docs 全部只认 normalized intent。  
**Why:** 当前旧 intent 名字散落在 router、CLI、types、confidence 四处；不先统一 normalize，后续每层都要各自记忆一套映射。  
**Evidence:** `src/orchestrator/intent-router.ts:16`, `src/cli/commands/analyze.ts:54`, `src/orchestrator/types.ts:86`, `src/orchestrator/confidence.ts:13`

### Pattern 2: Reuse existing analyzers under a new contract
**What:** `read` 复用 `impact + complexity`，`link` 复用 `dependency (+ reference path)`，`show` 包装 `overview/documentation` 的展示型结果。  
**Why:** 设计稿要求的是 public contract 收敛，不是底层能力全量重写。  
**Evidence:** `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md:121`, `src/cli/commands/impact.ts:533`, `src/cli/commands/complexity.ts:399`, `src/cli/commands/deps.ts:329`

### Pattern 3: Guardrail-backed contract migration
**What:** analyze 语法变更必须和 README / AI docs / validate-docs / docs tests 一起更新。  
**Why:** 这是项目的真实耦合点，不是“顺手文档补一下”的低风险项。  
**Evidence:** `.planning/codebase/CONCERNS.md:50`, `scripts/validate-docs.js:88`, `src/cli/__tests__/validate-docs-script.test.ts:67`

### Anti-Patterns to Avoid
- 只改 `VALID_INTENTS` 常量，不同步 `types.ts` / `confidence.ts` / docs —— 会把 contract drift 从 8 intents 变成 4 intents 的新漂移。
- 在 JSON 输出前后拼接 `[DEPRECATED]` 文本 —— 会破坏 `--json` / `--structured` 机器消费链路。
- 把 `workflow find→read→link→show` 状态机也在本 phase 一起修改 —— 直接越界到 Phase 4。
- 为 `link` 臆造 git-history 必达 schema —— 当前代码没有稳定对应结构，风险高。
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Public help 改了，内部默认值还在漂
**Failure mode:** `--help` 看起来只有四意图，但 `AnalyzeCommand` / `IntentRouter` 仍在内部默认 `impact/search`。  
**Evidence:** `src/cli/commands/analyze.ts:555`, `src/cli/commands/analyze.ts:116`, `src/orchestrator/intent-router.ts:88`

### Pitfall 2: `find` 仍被旧的 `targets` 必填规则卡死
**Failure mode:** 文档宣传 `find` 能搜索关键词，但 CLI 仍因为没有 `targets` 直接报 `E0002`。  
**Evidence:** `src/cli/commands/analyze.ts:83`, `docs/ai-guide/COMMANDS.md:153`, `README.md:612`

### Pitfall 3: Confidence 与 schema 还保留 8 intents
**Failure mode:** `read/link/show` 已经进入输出，但 confidence/test 仍只认识旧 8 intents，导致类型或结果级别判断失真。  
**Evidence:** `src/orchestrator/confidence.ts:13`, `src/orchestrator/__tests__/confidence.test.ts:171`

### Pitfall 4: Docs guardrail 继续要求旧 analyze 示例
**Failure mode:** 代码已经切到四意图，但 `npm run docs:check` 仍因为旧 `overview/impact/dependency/search` 示例缺失而失败。  
**Evidence:** `scripts/validate-docs.js:88`, `src/cli/__tests__/validate-docs-script.test.ts:67`
</common_pitfalls>

<code_examples>
## Code Examples

### Current duplicated intent whitelist
```typescript
// Sources:
// - src/orchestrator/intent-router.ts:16
// - src/cli/commands/analyze.ts:54
// - src/orchestrator/types.ts:86
// - src/orchestrator/confidence.ts:13
impact | dependency | search | documentation | complexity | overview | refactor | reference
```

### Current help still exposes 8 intents
```typescript
// Source: src/cli/commands/analyze.ts:617
analysis type (impact|dependency|search|documentation|complexity|overview|refactor|reference)
```

### Current docs guardrail still expects old analyze examples
```javascript
// Source: scripts/validate-docs.js:88
'mycodemap analyze -i overview -t src/orchestrator'
'mycodemap analyze -i impact -t src/cli/index.ts --include-tests'
'mycodemap analyze -i dependency -t src/cli/index.ts'
'mycodemap analyze -i search -k UnifiedResult'
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `node dist/cli/index.js analyze --help` — public 4-intent help / examples / options
2. `pnpm exec vitest run src/orchestrator/__tests__/intent-router.test.ts src/orchestrator/__tests__/types.test.ts src/orchestrator/__tests__/confidence.test.ts src/cli/commands/__tests__/analyze-command.test.ts` — contract regression
3. `node dist/cli/index.js analyze -i read -t src/cli/index.ts --json` — `read` JSON contract smoke test
4. `node dist/cli/index.js analyze -i link -t src/cli/index.ts --json` — `link` JSON contract smoke test
5. `npm run docs:check` — docs / guardrail consistency
6. `node dist/cli/index.js ci check-docs-sync` — CLI-level docs guardrail entry

### Recommended failure rehearsal
- 模拟旧 intent `search` / `documentation` / `refactor`：验证兼容窗口内 warning 是结构化的，且窗口外统一回到 `E0001_INVALID_INTENT`
- 模拟 `find` 仅传 `-k`：验证不会再被旧 `targets required` 逻辑误杀
</validation_architecture>

<open_questions>
## Open Questions

1. 2 个 minor 版本的 cutover 应该通过什么机制判定：显式常量、版本比较 helper，还是单独兼容配置？
2. `show` 首版是否保留通用 `results[]`，还是额外引入 `summary/export` 级 typed field？
3. `link` 中已有的 `include-tests` / `testFile` best-effort 信息是继续放在 `metadata`，还是升级为单独字段？
</open_questions>

<sources>
## Sources

### Primary
- `.planning/milestones/v1.0-phases/03-analyze-contract-analyze/03-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `/home/stark/.gstack/projects/yuanyuanyuan-mycodemap/stark-main-design-20260324-022633.md`
- `src/cli/commands/analyze.ts`
- `src/orchestrator/intent-router.ts`
- `src/orchestrator/types.ts`
- `src/orchestrator/confidence.ts`
- `src/cli/commands/impact.ts`
- `src/cli/commands/deps.ts`
- `src/cli/commands/complexity.ts`

### Secondary
- `docs/ai-guide/COMMANDS.md`
- `docs/ai-guide/OUTPUT.md`
- `README.md`
- `scripts/validate-docs.js`
- `src/cli/__tests__/validate-docs-script.test.ts`
- `src/orchestrator/__tests__/intent-router.test.ts`
- `src/orchestrator/__tests__/types.test.ts`
- `src/orchestrator/__tests__/confidence.test.ts`
- `.planning/codebase/CONCERNS.md`
- `package.json`

</sources>

---

*Phase: 03-analyze-contract-analyze*
*Research gathered: 2026-03-24*
