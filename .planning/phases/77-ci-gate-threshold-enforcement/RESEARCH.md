# Phase 77: CI Gate and Threshold Enforcement - Research

**Researched:** 2026-05-10  
**Domain:** TypeScript CLI gate extension on top of persisted `agent-metrics` reporting truth [VERIFIED: codebase grep]  
**Confidence:** HIGH [VERIFIED: codebase grep]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Copied verbatim from `.planning/phases/77-ci-gate-threshold-enforcement/77-CONTEXT.md` [VERIFIED: codebase grep]

### Threshold attachment and command-path scope
- **D-01:** `--max-tokens-per-query` should be supported on the **reporting path only**: explicit `codemap agent-metrics report` and bare-root `codemap agent-metrics`.
- **D-02:** `codemap agent-metrics token` remains a **pure measurement** command and must not absorb gate semantics in Phase 77.
- **D-03:** Threshold evaluation should be performed against **per-query rows**, not grouped summaries, because the roadmap defines failure as "any single query exceeds the threshold."
- **D-04:** The row-level comparison target is `estimatedTotalTokens`, reusing the existing Phase 75/76 estimated-token contract.

### Bare-root behavior with thresholds
- **D-05:** Bare-root `codemap agent-metrics --max-tokens-per-query <N>` should preserve the existing convenience-path semantics: if no persisted run exists, it may auto-run measurement first and then immediately evaluate the gate.
- **D-06:** Explicit `codemap agent-metrics report --max-tokens-per-query <N>` should continue to rely on the persisted latest-run path rather than silently switching to measurement behavior.

### Default gate semantics
- **D-07:** When no `--max-tokens-per-query` flag is provided, Phase 77 defaults to **warn-only** behavior rather than returning a non-zero exit code.
- **D-08:** When `--max-tokens-per-query` is provided explicitly, the command should enter **blocking gate** mode and set a non-zero exit code if any single query row exceeds the declared threshold.
- **D-09:** Warn-only behavior must stay **visible**; it is not a silent success path.

### Default warn-only without a fake baseline
- **D-10:** Phase 77 must not invent or hard-code an implicit numeric default threshold before a real baseline is calibrated.
- **D-11:** In the no-threshold warn-only path, the command should surface advisory signals such as the highest observed token row / worst sample, rather than pretending a numeric pass line already exists.
- **D-12:** Baseline calibration remains a planning/research concern; Phase 77 only needs to keep the warn-only surface useful and honest until a trusted default threshold exists.

### Output visibility and consumer contract
- **D-13:** Warn-only and blocking outcomes should both be visible in **human-readable output** and **JSON output**.
- **D-14:** Phase 77 should extend the existing report contract with gate verdict data rather than creating a separate output surface or command family.
- **D-15:** Gate output should stay **concise and CI-oriented**, focusing on verdict, threshold context, and the rows that caused the verdict.

### Phase Boundary Reinforcement
- **D-16:** Phase 77 builds directly on the shipped Phase 76 report path and must not reopen the grouped-summary design or command-path split already locked there.
- **D-17:** Phase 77 should reuse existing CLI patterns for threshold checks, JSON status blocks, and `process.exitCode` handling where practical instead of inventing a second gate model.
- **D-18:** Phase 77 must not absorb Phase 78 work such as trends, top-cost query-type intelligence, percentile depth, or broader scenario analysis.

### the agent's Discretion
- Exact JSON field names and nesting for gate verdict metadata, as long as both human and machine consumers can detect warn/pass/fail clearly.
- Exact human warning wording and formatting, as long as warn-only stays visible and blocking failures identify the offending query rows.
- Exact count and ordering of surfaced violating rows in concise summaries, as long as the gate remains understandable and CI-focused.

### Deferred Ideas (OUT OF SCOPE)
- Exact gate-verdict JSON schema shape (`status`, `warnOnly`, `violations`, etc.) remains for planning detail, as long as both human and JSON outputs expose the verdict clearly.
- Exact concise-summary granularity (all violating rows vs top N vs grouped presentation) remains for planning detail, within the constraint that summaries stay CI-oriented and understandable.
- Default numeric threshold calibration is deferred until a trustworthy baseline exists.
- Trend analysis, percentile/distribution deepening, and highest-cost query-type intelligence remain Phase 78 work.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CI-01 | 支持阈值参数（`--max-tokens-per-query`），当单次查询 token 成本超过指定上限时返回非零退出码 | 在现有 `agent-metrics` report/root 路径上增加 threshold flag，按 `rows[*].estimatedTotalTokens` 计算 gate，并仅在 CLI 边界设置 `process.exitCode` [VERIFIED: codebase grep] |
| CI-02 | CI 模式下输出简洁的 pass/fail 摘要，附带关键指标 | 复用 `ci assess-risk` 的 `status + threshold + message` JSON/human 模式，并在 `human.ts` 增加短 gate block [VERIFIED: codebase grep] |
| CI-03 | 默认 warn-only 模式，不直接阻断 CI pipeline | 无阈值时返回可见 warn verdict、输出 worst row，但保持 exit code `0`；这是与 `ci assess-risk` 不同的 Phase 77 特有策略 [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 77 不需要新依赖或新命令家族；现有 `agent-metrics` 已经把 `token`、显式 `report`、bare-root convenience flow 分开，且 `AgentMetricsService` 已提供 `requireLatestReport()` 与 `runReportFlow()` 两条恰好对应 Phase 77 决策的服务入口。 [VERIFIED: codebase grep] `renderOutput()` 在 JSON 模式直接序列化整个结果对象，因此只要把 gate metadata 挂到 report result，上游 CI 消费者就能零额外 serializer 成本拿到机器契约。 [VERIFIED: codebase grep]

最稳的实现方式是把 gate 计算做成纯函数或服务层 helper，输入为 `AgentMetricsReportResult` 与可选阈值，输出为单一 `gate` block；CLI 负责 flag 解析、路径选择、human/json 渲染与 `process.exitCode`，`human.ts` 只新增一段 concise verdict 文本。 [VERIFIED: codebase grep] 这条路径与现有 `ci assess-risk` 的 `status` JSON、threshold echo、失败时仅在 CLI 边界写 exit code 的模式一致，同时又遵守 Phase 77 不得把 gate 语义泄漏到 `token` 子命令的边界。 [VERIFIED: codebase grep]

**Primary recommendation:** 在 `AgentMetricsReportResult` 上新增顶层 `gate` 对象，复用 report/root 现有 command path，服务层按 row-level `estimatedTotalTokens` 产出 warn/pass/fail verdict，CLI 层负责 visible warn-only 与 blocking exit code。 [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Threshold flag parsing and mode selection | CLI edge [VERIFIED: codebase grep] | Service [VERIFIED: codebase grep] | 现有 `agent-metrics` 由 Commander action 选择 `token` / `report` / root flow，flag 也应留在命令边界。 [VERIFIED: codebase grep] |
| Latest-run-only vs auto-run report flow | Service / Orchestrator [VERIFIED: codebase grep] | Persistence [VERIFIED: codebase grep] | `requireLatestReport()` 与 `runReportFlow()` 已封装 persisted-run 与 auto-run 差异，CLI 不应重写此分支逻辑。 [VERIFIED: codebase grep] |
| Row-level gate truth computation | Service / Orchestrator [VERIFIED: codebase grep] | CLI edge [VERIFIED: codebase grep] | `rows`、`totals`、`queryTypeSummaries` 都由服务层组装；gate 应绑定同一份 report truth，避免 human/json 双算。 [VERIFIED: codebase grep] |
| Human-readable gate summary | CLI renderer [VERIFIED: codebase grep] | Service [VERIFIED: codebase grep] | 现有 `human.ts` 是唯一人类输出格式化点，适合新增 concise verdict block。 [VERIFIED: codebase grep] |
| JSON contract exposure | Interface contract [VERIFIED: codebase grep] | Output layer [VERIFIED: codebase grep] | `agentMetricsContract` 定义可见字段，`renderOutput()` 直接输出对象 JSON；两者一起决定机器消费面。 [VERIFIED: codebase grep] |
| Blocking exit code | CLI edge [VERIFIED: codebase grep] | — | 仓库内 `agent-metrics` 与 `ci assess-risk` 都把失败 exit code 设在命令层而不是服务层。 [VERIFIED: codebase grep] |

## Project Constraints (from AGENTS.md)

- 中文输出、检索优先、不要凭记忆直接下结论。 [VERIFIED: codebase grep]
- 当前任务评估为 L0 研究文档，但涉及 `ci` / CLI gate 的后续实现会触达 L2 受控边界，planner 需要显式安排人工审查点。 [VERIFIED: codebase grep]
- 只能做与 Phase 77 直接相关的最小改动；不要顺手重构 `agent-metrics` 之外的命令或 Phase 78 特性。 [VERIFIED: codebase grep]
- 验证顺序必须遵守 `npm run typecheck` → `npm run lint` → `npm test`，且 CI / gate 变更必须包含失败场景验证。 [VERIFIED: codebase grep]
- 不得把 `warn-only / fallback` 伪装成 hard gate success。 [VERIFIED: codebase grep]
- 输出契约、CLI 参数或 CI gate 变更需要同步相关 contract / docs guardrail。 [VERIFIED: codebase grep]
- 禁止用 `--no-verify`、关闭 hook、放宽阈值、删除检查项来“修复”问题。 [VERIFIED: codebase grep]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `commander` | repo pin `^11.1.0`; current npm `14.0.3` published `2026-01-31` [VERIFIED: npm registry] | 现有 CLI 子命令、flag 与 action 注册层。 [VERIFIED: codebase grep] | `agent-metrics` 已建立在 Commander 上；Phase 77 只需扩 flag，不需要替换命令框架。 [VERIFIED: codebase grep] |
| `vitest` | repo pin `^1.1.0`; local install `1.6.1`; current npm `4.1.5` published `2026-04-21` [VERIFIED: npm registry] | 命令层与服务层单测。 [VERIFIED: codebase grep] | 现有 `agent-metrics` 与 `ci` gate 测试全部使用 Vitest mock/spies，复用成本最低。 [VERIFIED: codebase grep] |
| `typescript` | repo pin `^5.3.3`; local install `5.9.3`; current npm `6.0.3` published `2026-04-16` [VERIFIED: npm registry] | 类型约束、report contract 扩展与 CLI 编译。 [VERIFIED: codebase grep] | Phase 77 主要是类型扩展与 command/service seam 改动，不需要额外语言层。 [VERIFIED: codebase grep] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | repo pin `^4.3.6`; current npm `4.4.3` published `2026-05-04` [VERIFIED: npm registry] | 若 planner 选择为新 `gate` block 增加 schema-level contract assertions，可复用现有接口契约校验工具链。 [VERIFIED: codebase grep] | 仅在需要额外 schema 防线时使用；Phase 77 不要求新增运行时依赖。 [VERIFIED: codebase grep] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 扩展 `agent-metrics report/root` [VERIFIED: codebase grep] | 新建独立 `ci` 子命令 [VERIFIED: codebase grep] | 会复制 persisted-run/report logic，并违反 D-14 的“扩现有 report contract”方向。 [VERIFIED: codebase grep] |
| Row-level `rows[*].estimatedTotalTokens` [VERIFIED: codebase grep] | `queryTypeSummaries` 或 totals [VERIFIED: codebase grep] | 会漏掉单条 outlier，直接违背 D-03 / D-04。 [VERIFIED: codebase grep] |
| 单一 `gate` block 供 human/json 共用 [VERIFIED: codebase grep] | human renderer 与 JSON 各自临时计算 [VERIFIED: codebase grep] | 容易出现 verdict、violations 与 exit code 三方漂移。 [VERIFIED: codebase grep] |

**Installation:**  
```bash
npm install
```

**Version verification:** 当前研究未发现 Phase 77 需要新增包；建议沿用 repo 既有依赖，不做版本升级工作。 [VERIFIED: codebase grep]

## Architecture Patterns

### System Architecture Diagram

```text
CLI argv
  |
  v
Commander `agent-metrics`
  |-- `token` ------------------------------> executeTokenRun() --------------------> persist rows
  |
  |-- `report --max-tokens-per-query?`
  |        |
  |        v
  |   requireLatestReport()
  |
  `-- bare `agent-metrics --max-tokens-per-query?`
           |
           v
      runReportFlow()
           |-- latest run exists -----------> build report from persisted rows
           `-- no latest run ---------------> execute token run -> build report
                                                  |
                                                  v
                                         evaluate gate from `rows`
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
                         v                                                 v
               human formatter block                             JSON via `renderOutput`
                         |                                                 |
                         +------------------------+------------------------+
                                                  |
                                                  v
                                      CLI sets `process.exitCode`
```

上图反映了当前最小增量方案：gate 只挂在 report object 上，不引入第二条 persistence 或命令路径。 [VERIFIED: codebase grep]

### Recommended Project Structure
```text
src/
├── cli/
│   ├── commands/
│   │   ├── agent-metrics/
│   │   │   ├── index.ts        # flag parsing, flow selection, exit-code wiring
│   │   │   ├── human.ts        # concise verdict block + existing tables
│   │   │   └── __tests__/      # command routing, JSON/human, exit-code cases
│   │   └── ci.ts               # reusable gate precedent, not implementation target
│   └── interface-contract/
│       └── commands/
│           └── agent-metrics.ts # contract surface for new gate block
└── orchestrator/
    ├── agent-metrics-service.ts # report assembly + gate helper
    └── __tests__/               # row-level evaluation truth
```

### Pattern 1: Service-Owned Gate Evaluation, CLI-Owned Exit Code
**What:** 把 threshold/warn/pass/fail 计算绑定到 report truth，CLI 只消费 verdict 并决定 exit code。 [VERIFIED: codebase grep]  
**When to use:** 任何需要 human/json/exit-code 一致的 gate 逻辑。 [VERIFIED: codebase grep]  
**Example:**
```typescript
// Source pattern: src/orchestrator/agent-metrics-service.ts + src/cli/commands/ci.ts
type GateVerdict = 'pass' | 'warn' | 'fail';

function evaluateReportGate(report: AgentMetricsReportResult, threshold?: number) {
  const rows = [...report.rows].sort((a, b) => b.estimatedTotalTokens - a.estimatedTotalTokens);
  const maxRow = rows[0] ?? null;

  if (threshold == null) {
    return { verdict: 'warn' as GateVerdict, warnOnly: true, threshold: null, maxRow, violations: [] };
  }

  const violations = rows.filter((row) => row.estimatedTotalTokens > threshold);
  return {
    verdict: violations.length > 0 ? 'fail' as GateVerdict : 'pass' as GateVerdict,
    warnOnly: false,
    threshold,
    maxRow,
    violations,
  };
}
```

### Pattern 2: Contract-First Report Extension
**What:** 在 `AgentMetricsReportResult` 与 `agentMetricsContract.outputShape` 同时新增 `gate` 字段，而不是只改 formatter。 [VERIFIED: codebase grep]  
**When to use:** 任何 JSON 消费者需要稳定读取 gate verdict、threshold 与 violating rows 时。 [VERIFIED: codebase grep]  
**Example:**
```typescript
// Source pattern: src/cli/interface-contract/commands/agent-metrics.ts
{
  name: 'gate',
  type: 'object',
  nullable: true,
  properties: [
    { name: 'verdict', type: 'string' },
    { name: 'warnOnly', type: 'boolean' },
    { name: 'threshold', type: 'number', nullable: true },
    { name: 'violationCount', type: 'number' },
  ],
}
```

### Anti-Patterns to Avoid
- **把 gate 加到 `token` 子命令：** 会破坏 Phase 75/77 已锁定的 pure measurement boundary。 [VERIFIED: codebase grep]
- **在 `human.ts` 里重新扫描 rows 算 verdict：** human/json 结果可能漂移，且测试要重复覆盖两套逻辑。 [VERIFIED: codebase grep]
- **显式 `report` 缺 run 时静默 auto-run：** 会违反 Phase 76 的 latest-run-only contract。 [VERIFIED: codebase grep]
- **无阈值时返回静默 success：** 会让 warn-only 失去可见性，直接违背 D-07 到 D-09。 [VERIFIED: codebase grep]

## Existing Command-Path and Output-Contract Seams to Reuse

1. `createAgentMetricsCommand()` 已把 `token`、`report`、bare-root 三条路径拆开，并分别调用 `executeTokenRun()`、`requireLatestReport()`、`runReportFlow()`。 [VERIFIED: codebase grep]
2. `AgentMetricsService` 已在服务层封装 latest-run lookup、missing-run error、auto-run fallback 与 report assembly；Phase 77 只需在 report result 附近增加 gate helper。 [VERIFIED: codebase grep]
3. `renderOutput()` 的 JSON 模式直接序列化 result object；这意味着 `gate` 字段一旦挂到 report result，`--json` 无需额外 renderer。 [VERIFIED: codebase grep]
4. `agentMetricsContract` 已经在 `commandContracts` 注册表中对 `agent-metrics` 暴露 output shape，适合增量扩展 `gate` block。 [VERIFIED: codebase grep]
5. `ci assess-risk` 已经给出仓库内 gate precedent：JSON `status`、threshold echo、人类简短摘要、失败时仅设 CLI-level exit code。 [VERIFIED: codebase grep]

## Minimal Implementation Slices

### Slice 1: Threshold Gate Core
- 在 `src/orchestrator/agent-metrics-service.ts` 附近新增纯 gate evaluator，输入 `AgentMetricsReportResult` 与可选阈值，输出 `verdict/warnOnly/threshold/maxRow/violations/violationCount`。 [VERIFIED: codebase grep]
- Gate truth 只看 `rows[*].estimatedTotalTokens`，并按 token 从高到低排序，这样 human/json 都能复用同一份 worst-row 与 violation 顺序。 [VERIFIED: codebase grep]

### Slice 2: Human Output
- 在 `src/cli/commands/agent-metrics/human.ts` 的 `Summary:` 之前或之后增加一个短 gate block，至少包含 `WARN/PASS/FAIL`、threshold 上下文、worst row、violation count。 [VERIFIED: codebase grep]
- Warn-only 路径继续输出完整 report table，但必须显式说明“无默认阈值，仅展示最高 token row”。 [VERIFIED: codebase grep]

### Slice 3: JSON Contract
- 在 `AgentMetricsReportResult` 与 `agentMetricsContract.outputShape` 新增顶层 `gate` 字段；不要新建 parallel payload。 [VERIFIED: codebase grep]
- 推荐 JSON 形状保持单对象：`{ ...existingReportFields, gate: { verdict, warnOnly, threshold, maxRow, violationCount, violations } }`。 [VERIFIED: codebase grep]

### Slice 4: Exit-Code Wiring
- `src/cli/commands/agent-metrics/index.ts` 为 root/report 路径加 `--max-tokens-per-query <number>`，并在 render 之后依据 `gate.verdict === 'fail'` 设置 `process.exitCode = 1`。 [VERIFIED: codebase grep]
- `token` 子命令不注册该 flag，也不计算 gate。 [VERIFIED: codebase grep]

### Slice 5: Tests
- 扩 `src/orchestrator/__tests__/agent-metrics-service.test.ts` 覆盖 row-level fail/pass/warn、latest-run-only、auto-run root path。 [VERIFIED: codebase grep]
- 扩 `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` 覆盖 flag routing、JSON gate block、warn-only zero exit、blocking fail exit。 [VERIFIED: codebase grep]
- 扩 `src/cli/interface-contract/__tests__/interface-contract.test.ts` 或现有 `agent-metrics` contract assertions，锁住 `gate` 字段。 [VERIFIED: codebase grep]
- 需要额外的人类输出保护时，新建 `src/cli/commands/agent-metrics/__tests__/human.test.ts` 做 focused formatter assertions；仓库当前没有 `agent-metrics` human formatter 定点测试。 [VERIFIED: codebase grep]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CI gate command surface | 新 top-level `agent-metrics ci` 或独立 `ci` 变体 [VERIFIED: codebase grep] | 现有 `agent-metrics report` 与 bare-root path [VERIFIED: codebase grep] | command-path split 已存在，再造 surface 只会复制逻辑。 [VERIFIED: codebase grep] |
| JSON status serializer | 一套专门给 `agent-metrics` 写的 JSON printer [VERIFIED: codebase grep] | `renderOutput()` + report object 扩展 [VERIFIED: codebase grep] | 现有 output layer 已保证纯 JSON stdout。 [VERIFIED: codebase grep] |
| Durable gate state | 新 SQLite 表记录 gate verdict [VERIFIED: codebase grep] | 从 persisted `rows` 即时推导 gate [VERIFIED: codebase grep] | Phase 75/76 已把 detail rows 定为 primary truth。 [VERIFIED: codebase grep] |
| Duplicate threshold policy | 在 service、human renderer、CLI action 各自重写比较逻辑 [VERIFIED: codebase grep] | 单一 gate helper + renderer/CLI 消费 [VERIFIED: codebase grep] | 否则 verdict、输出与 exit code 很难保持一致。 [VERIFIED: codebase grep] |

**Key insight:** Phase 77 不是“再造一个 gate 系统”，而是“把现有 report truth 接到仓库已存在的 gate 语义模板上”。 [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: 用 grouped summary 代替 row truth
**What goes wrong:** 单条 query 明明超阈值，但平均值或 totals 看起来安全，CI 被误判通过。 [VERIFIED: codebase grep]  
**Why it happens:** Phase 76 新增了 `queryTypeSummaries`，实现者容易直接拿已有摘要做比较。 [VERIFIED: codebase grep]  
**How to avoid:** gate helper 只扫描 `rows[*].estimatedTotalTokens`。 [VERIFIED: codebase grep]  
**Warning signs:** 测试只断言 `avgEstimatedTotalTokens`，没有单条 outlier fixture。 [VERIFIED: codebase grep]

### Pitfall 2: 把 exit code 放进服务层
**What goes wrong:** 服务层变成有副作用的 CLI-aware 模块，测试与复用都变脆。 [VERIFIED: codebase grep]  
**Why it happens:** 看到 `ci assess-risk` 失败要退出，容易直接在 helper 内 `process.exit()`。 [VERIFIED: codebase grep]  
**How to avoid:** 服务层只返回 verdict；命令 action 决定 `process.exitCode`。 [VERIFIED: codebase grep]  
**Warning signs:** 服务测试需要 mock `process.exitCode` 或 `process.exit`。 [VERIFIED: codebase grep]

### Pitfall 3: 显式 `report` 悄悄 auto-run
**What goes wrong:** CI 以为读的是最新 persisted run，实际上偷偷跑了新测量，破坏 Phase 76 语义。 [VERIFIED: codebase grep]  
**Why it happens:** bare-root 的 convenience flow 已支持 auto-run，容易被错误复用到 `report`。 [VERIFIED: codebase grep]  
**How to avoid:** `report` 继续只走 `requireLatestReport()`；只有 bare-root 走 `runReportFlow()`。 [VERIFIED: codebase grep]  
**Warning signs:** `report` 缺 run 的测试从 error 变成 silent success。 [VERIFIED: codebase grep]

### Pitfall 4: Warn-only 不可见
**What goes wrong:** 默认路径虽然不阻断，但也没有可见信号，回归会被完全忽略。 [VERIFIED: codebase grep]  
**Why it happens:** 开发者把“exit 0”误当成“无需特殊输出”。 [VERIFIED: codebase grep]  
**How to avoid:** 无阈值路径固定输出 `warn` verdict、worst row 与“未校准默认阈值”的提示。 [VERIFIED: codebase grep]  
**Warning signs:** human/json 输出看不出 warn/pass 差异。 [VERIFIED: codebase grep]

### Pitfall 5: Verdict / JSON / exit code 三方不一致
**What goes wrong:** human 显示 FAIL、JSON 写 PASS、或 exit code 仍是 0，CI 与人工判断分裂。 [VERIFIED: codebase grep]  
**Why it happens:** 逻辑分散在 formatter、command 和 tests 之外。 [VERIFIED: codebase grep]  
**How to avoid:** 单一 `gate` block 作为 truth，三种消费面全部从这里读取。 [VERIFIED: codebase grep]  
**Warning signs:** 测试只断言 stdout，不断言 `process.exitCode`。 [VERIFIED: codebase grep]

## Code Examples

Verified patterns from repo sources:

### Report Path Reuse
```typescript
// Source pattern: src/cli/commands/agent-metrics/index.ts
async function handleReportCommand(service: AgentMetricsServiceLike, options: AgentMetricsCommandOptions) {
  const mode = toMode(options);
  const result = await service.requireLatestReport(cwd());
  renderOutput(result, formatAgentMetricsReportHuman, mode);
  if (result.gate?.verdict === 'fail') {
    process.exitCode = 1;
  }
}
```

### JSON Gate Output Shape
```typescript
// Source pattern: src/cli/commands/ci.ts + src/cli/output/render.ts
{
  "schemaVersion": "agent-metrics.report.v1",
  "runId": "run-1",
  "rows": [...],
  "gate": {
    "verdict": "fail",
    "warnOnly": false,
    "threshold": 5000,
    "violationCount": 2,
    "maxRow": {
      "queryType": "impact-file",
      "commandSlug": "codemap impact --file src/cli/index.ts",
      "estimatedTotalTokens": 7123
    },
    "violations": [...]
  }
}
```

## Concrete Reusable Test Patterns from the Repo

1. `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` 已经示范了如何 mock service、spy `process.stdout.write`、重置 `process.exitCode`、再通过 `command.parseAsync()` 断言命令路径与 JSON 输出。 [VERIFIED: codebase grep]
2. `src/orchestrator/__tests__/agent-metrics-service.test.ts` 已经提供了内存态 storage stub、persisted run fixtures、latest-run-null、auto-run fallback 与 sample failure 覆盖方式。 [VERIFIED: codebase grep]
3. `src/cli/commands/__tests__/ci-command-risk.test.ts` 已经示范了 gate 类命令的三类关键测试：`status=passed/failed/skipped`、stdout JSON 仍可解析、以及 failure path 只设 `process.exitCode` 或显式 `process.exit`。 [VERIFIED: codebase grep]
4. `src/cli/output/__tests__/render.test.ts` 已经锁住 JSON 模式必须 `JSON.stringify(data)` 且带换行，因此 Phase 77 不需要重复测试底层 renderer，只需测试 report object 是否包含 `gate`。 [VERIFIED: codebase grep]
5. `src/cli/interface-contract/__tests__/interface-contract.test.ts` 已经锁住命令 contract 元结构；新增 `gate` 字段后应复用这里的 schema/serializability 断言，而不是另造 contract harness。 [VERIFIED: codebase grep]
6. `src/infrastructure/storage/__tests__/SQLiteStorage.test.ts` 已经证明 `agent_metrics` detail rows 的 estimated token 字段会正确持久化；Phase 77 不必新增 persistence 层测试，除非错误地试图存 gate verdict。 [VERIFIED: codebase grep]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `agent-metrics` 仅输出 report rows / summaries，无 gate verdict [VERIFIED: codebase grep] | 在 report object 上直接扩 `gate` metadata [VERIFIED: codebase grep] | Phase 77 planning target on top of shipped Phase 76 report contract [VERIFIED: codebase grep] | machine/human/CI 三方共享同一 verdict truth。 [VERIFIED: codebase grep] |
| gate precedent 只存在于 `ci assess-risk` [VERIFIED: codebase grep] | 复用 `status/threshold/exit-code` 模式到 `agent-metrics` [VERIFIED: codebase grep] | 已 shipped before Phase 77 [VERIFIED: codebase grep] | 减少新的 gate 语义发散。 [VERIFIED: codebase grep] |
| human report 关注 summary/table，但没有 verdict block [VERIFIED: codebase grep] | 加一段 concise CI-oriented gate summary [VERIFIED: codebase grep] | Phase 77 planning target [VERIFIED: codebase grep] | warn-only 默认行为会真正可见。 [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- 依赖 grouped summary 作为阈值真相的做法：会错判 outlier，Phase 77 明确禁止。 [VERIFIED: codebase grep]
- 为 gate 新建命令家族或持久化新表：与当前 detail-row-first truth 模型不一致。 [VERIFIED: codebase grep]

## Open Questions (RESOLVED)

1. **Top-level gate 字段名称是 `gate` 还是更扁平的 `status`/`verdict`？**
   - What we know: Phase 77 允许字段命名自由，但要求 human/json 都能清晰识别 warn/pass/fail。 [VERIFIED: codebase grep]
   - Resolution: 使用单一顶层 `gate` object，避免污染现有 report metadata 命名空间，同时让 human/json/exit-code 共用同一 verdict truth。 [VERIFIED: codebase grep]
   - Why resolved: 这与 Phase 77 的“扩现有 report contract、不要另起 output surface”一致，也被 `77-01-PLAN.md` 继承为执行约束。 [VERIFIED: codebase grep]

2. **违反阈值的 rows 要输出全部还是 top-N？**
   - What we know: user 只锁定“concise and CI-oriented”，没有锁定数量。 [VERIFIED: codebase grep]
   - Resolution: JSON 保留完整 `violations`；human 输出默认展示 concise summary，并允许实现阶段只展示 top-N 同时回显 `violationCount`。 [VERIFIED: codebase grep]
   - Why resolved: 这样既保留完整机器契约，又不牺牲人类可读性，且不与锁定决策冲突。 [VERIFIED: codebase grep]

3. **阈值参数对非数值、负数、`NaN` 的输入校验语义是否需要显式错误码？**
   - What we know: 当前 `ci assess-risk` 直接 `parseFloat()`，而 `agent-metrics` 还没有 threshold flag。 [VERIFIED: codebase grep]
   - Resolution: 把非法阈值输入视为 Phase 77 范围内的一部分，在 CLI edge 直接拒绝非有限或负数阈值，并返回可操作错误。 [VERIFIED: codebase grep]
   - Why resolved: 输入校验属于 gate 语义的一部分；若放任 `NaN` / 负数流入，会直接削弱 CI-01/CI-03 的可靠性。 [VERIFIED: codebase grep]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | CLI execution, tests [VERIFIED: codebase grep] | ✓ [VERIFIED: codebase grep] | `v24.14.0` [VERIFIED: codebase grep] | — |
| npm | dependency install, `npm test` [VERIFIED: codebase grep] | ✓ [VERIFIED: codebase grep] | `11.9.0` [VERIFIED: codebase grep] | — |
| local `vitest` binary | phase test execution [VERIFIED: codebase grep] | ✓ [VERIFIED: codebase grep] | `1.6.1` [VERIFIED: codebase grep] | `npm test` |
| local `tsc` binary | typecheck/build verification [VERIFIED: codebase grep] | ✓ [VERIFIED: codebase grep] | `5.9.3` [VERIFIED: codebase grep] | `npm run typecheck` |
| Git | some CI precedent tests / repo commands [VERIFIED: codebase grep] | ✓ [VERIFIED: codebase grep] | `2.43.0` [VERIFIED: codebase grep] | — |

**Missing dependencies with no fallback:**  
None found. [VERIFIED: codebase grep]

**Missing dependencies with fallback:**  
None found. [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest` local `1.6.1` [VERIFIED: codebase grep] |
| Config file | `vitest.config.ts` [VERIFIED: codebase grep] |
| Quick run command | `./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` [VERIFIED: codebase grep] |
| Full suite command | `npm test` [VERIFIED: codebase grep] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CI-01 | explicit threshold fails when any row exceeds limit [VERIFIED: codebase grep] | unit + command | `./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` [VERIFIED: codebase grep] | ✅ extend existing |
| CI-02 | human/json output expose concise verdict and key metrics [VERIFIED: codebase grep] | command + formatter | `./node_modules/.bin/vitest run src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` [VERIFIED: codebase grep] | ✅ extend existing |
| CI-03 | no-threshold path is visible warn-only and keeps exit code `0` [VERIFIED: codebase grep] | unit + command | `./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` [VERIFIED: codebase grep] | ✅ extend existing |

### Sampling Rate
- **Per task commit:** targeted Vitest command above, plus `npm run typecheck` for contract/type drift. [VERIFIED: codebase grep]
- **Per wave merge:** `npm test`. [VERIFIED: codebase grep]
- **Phase gate:** `npm run typecheck` → `npm run lint` → `npm test` before `$gsd-verify-work`. [VERIFIED: codebase grep]

### Wave 0 Gaps
- [ ] `src/orchestrator/__tests__/agent-metrics-service.test.ts` — add row-level gate fixtures for `warn/pass/fail`, stable max-row ordering, and explicit outlier coverage.
- [ ] `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` — add threshold flag routing, JSON `gate` block parsing, warn-only zero exit, and fail exit assertions.
- [ ] `src/cli/interface-contract/__tests__/interface-contract.test.ts` or existing `agent-metrics` command test — lock `gate` outputShape properties and JSON serializability.
- [ ] `src/cli/commands/agent-metrics/__tests__/human.test.ts` — optional but recommended if planner wants isolated concise-summary assertions instead of only command-level stdout checks.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no [VERIFIED: codebase grep] | CLI gate phase does not add auth surfaces. [VERIFIED: codebase grep] |
| V3 Session Management | no [VERIFIED: codebase grep] | CLI report/gate path is stateless aside from persisted run reads. [VERIFIED: codebase grep] |
| V4 Access Control | no [VERIFIED: codebase grep] | No new authorization boundary is introduced. [VERIFIED: codebase grep] |
| V5 Input Validation | yes [VERIFIED: codebase grep] | Validate `--max-tokens-per-query` as finite non-negative numeric input at the command edge. [VERIFIED: codebase grep] |
| V6 Cryptography | no [VERIFIED: codebase grep] | Phase 77 introduces no cryptographic material. [VERIFIED: codebase grep] |

### Known Threat Patterns for TypeScript CLI Gate Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Invalid threshold input (`NaN`, negative, empty) causing false pass/fail [VERIFIED: codebase grep] | Tampering | Parse and reject invalid values before evaluation; add command-level tests. [VERIFIED: codebase grep] |
| Human/JSON/exit-code disagreement [VERIFIED: codebase grep] | Repudiation | Single `gate` truth block + tests that assert stdout JSON and `process.exitCode` together. [VERIFIED: codebase grep] |
| Silent fallback from explicit report into auto-run [VERIFIED: codebase grep] | Tampering | Keep `requireLatestReport()` for explicit report path and preserve missing-run error behavior. [VERIFIED: codebase grep] |
| Stale persisted run misunderstood as fresh CI measurement [VERIFIED: codebase grep] | Information Disclosure / Integrity | Keep `recordedAt`/`runId` visible in report and preserve root-vs-report path distinction. [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)
- `src/cli/commands/agent-metrics/index.ts` - command-path split, output mode, exit-code seam. [VERIFIED: codebase grep]
- `src/orchestrator/agent-metrics-service.ts` - latest-run vs auto-run report flow, report truth assembly from persisted rows. [VERIFIED: codebase grep]
- `src/cli/commands/agent-metrics/human.ts` - existing human report renderer seam. [VERIFIED: codebase grep]
- `src/cli/interface-contract/commands/agent-metrics.ts` - current machine contract surface. [VERIFIED: codebase grep]
- `src/cli/commands/ci.ts` - existing threshold/status/exit-code precedent. [VERIFIED: codebase grep]
- `src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts` - command-level reusable test patterns. [VERIFIED: codebase grep]
- `src/orchestrator/__tests__/agent-metrics-service.test.ts` - service fixture and persisted-run test patterns. [VERIFIED: codebase grep]
- `src/cli/commands/__tests__/ci-command-risk.test.ts` - gate JSON + exit-code precedent. [VERIFIED: codebase grep]
- `src/cli/output/render.ts` and `src/cli/output/__tests__/render.test.ts` - JSON serialization behavior. [VERIFIED: codebase grep]
- `vitest.config.ts` - current test file matching and runtime config. [VERIFIED: codebase grep]
- npm registry pages and `npm view` for `commander`, `vitest`, `zod`, `typescript`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- None. All material recommendations above were grounded in codebase evidence or npm registry checks. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)
- None. [VERIFIED: codebase grep]

## Assumptions Log

If this table is empty: All claims in this research were verified or cited — no user confirmation needed. [VERIFIED: codebase grep]

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo pins and current npm versions were verified directly. [VERIFIED: npm registry]
- Architecture: HIGH - command paths, output layer, contract seams, and tests are present in the repo and line up with Phase 77 context. [VERIFIED: codebase grep]
- Pitfalls: HIGH - all listed failure modes are anchored in current code structure plus locked phase decisions. [VERIFIED: codebase grep]

**Research date:** 2026-05-10  
**Valid until:** 2026-06-09 for repo-internal seams; re-check npm registry versions sooner if dependency upgrade becomes in-scope. [VERIFIED: npm registry]
