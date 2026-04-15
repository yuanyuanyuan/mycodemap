# Phase 19: Handoff Package & Human Gates - Research

**Researched:** 2026-03-25
**Domain:** design / mapping truth → human-readable + machine-readable handoff package
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- handoff 仍然必须走 purpose-built 的 `design` sidecar surface，不能扩写 `analyze` public intent，也不能恢复 `workflow` 的 `commit` / `ci` phase。
- Phase 19 只能消费 validated design contract 与 successful design mapping truth；不能在 invalid / blocked scope 上继续猜测 handoff。
- markdown summary 与 machine JSON 必须来自同一份 canonical truth，而不是两套分叉构建逻辑。
- 默认 artifact path 必须复用现有 output helper，落在 `.mycodemap/handoffs/`（可显式 override），避免继续制造 path drift。
- handoff 必须显式跟踪 approvals、assumptions、open questions；unresolved items 不能被伪装成已批准事实。
- 本 phase 只同步与 `design handoff` 直接相关的最小 docs / guardrail，不提前越界到 Phase 20 的 drift / e2e docs closure。

### the agent's Discretion
- `DesignHandoff*` 类型与 diagnostics 的精确 shape
- markdown summary 的版式与 heading 命名
- 附加 flags 的取舍（除 `--json` / `--output` 外）
- `readyForExecution` 的细粒度判定规则

### Deferred Ideas (OUT OF SCOPE)
- design-vs-implementation drift report / acceptance execution
- handoff / drift / docs / CI 的完整闭环叙事与端到端示例
- 外部设计输入集成（Figma / issue tracker / PR system）

</user_constraints>

<research_summary>
## Summary

第一个结论是：**最稳的 public surface 仍然是在现有 `design` 命令下新增 `handoff` 子命令。** 证据来自 `Phase 17/18` 的连续收口：`design validate` 与 `design map` 已证明 design-driven 能力应该走独立 `design` seam，而 `analyze` / `workflow` 仍是高 blast-radius 入口；此时再开 top-level `handoff` 或回塞进 `workflow`，只会重演 public contract 漂移。

第二个结论是：**Phase 19 必须引入一份 canonical `DesignHandoff` truth object，再从这份 truth 同时渲染 markdown 与 JSON。** 只要 human summary 与 machine payload 不是同源，`HOF-01` 与 `HOF-02` 最终一定会发生 drift。Phase 18 已经证明“structured primary + short summary”是仓库接受的模式；Phase 19 只是把这套 dual-render pattern 提升为正式 handoff artifact。

第三个结论是：**默认 artifact path 最适合复用 `resolveOutputDir()`，在 `.mycodemap/handoffs/` 下生成 deterministic sidecars。** 仓库已经有 `generate` / `report` 等写文件 precedent，并通过 `src/cli/paths.ts` 把 `.mycodemap` 作为默认输出 truth；如果 Phase 19 再随手落在仓库根目录或 `.planning/`，只会重新放大 path drift。

第四个结论是：**human gate 应该通过 artifact state 表达，而不是把“需要 review”与 CLI 失败混为一谈。** mapping blocker 当然应 hard fail；但若只是存在 assumptions / open questions，最有价值的行为是生成完整 handoff artifact 并标记 `readyForExecution=false` / `approval.status=needs-review`，让 reviewer 与 downstream agent 明确知道为什么 not-ready，而不是拿不到 artifact。

第五个结论是：**`HOF-03` 的关键不是“多几个字段”，而是 provenance-first traceability。** `approvals`、`assumptions`、`openQuestions` 必须分离建模，并都保留 design section / candidate path / diagnostics 的 source refs。否则后续 agent 只能看到一个“好像重要”的文本列表，却无法审计来源，也无法判断哪些是人类批准事实、哪些只是暂时假设。

第六个结论是：**只要 `design handoff` 进入 public CLI，最小 docs sync 就不能等到 Phase 20。** Phase 20 负责完整闭环，但 Phase 19 只要新增了 `design handoff`，README / AI docs / OUTPUT contract / guardrail 就必须同步，否则 docs truth 当天就会再次失真。

**Primary recommendation:**  
1. 新增 `src/interface/types/design-handoff.ts`，定义 canonical handoff contract、trace items 与 gate state；  
2. 新增 `src/cli/design-handoff-builder.ts`，消费 `loadDesignContract()` + `resolveDesignScope()`，构建同源 markdown / json truth；  
3. 默认用 `resolveOutputDir()` 写入 `.mycodemap/handoffs/{stem}.handoff.md|json`，同时允许 `--output` override；  
4. `design handoff` human mode 打印 summary + artifact paths，`--json` 保持纯 JSON；  
5. 最小同步 README / AI docs / rules / docs guardrail，但不提前写完整 drift / e2e narrative。
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `src/interface/types/design-contract.ts` | design input truth | Phase 19 继续复用 Phase 17 的 section 语义 |
| `src/interface/types/design-mapping.ts` | mapping truth | Phase 18 的 candidates / unknowns / diagnostics 是 handoff 上游事实源 |
| `src/interface/types/design-handoff.ts` | handoff output contract | 承载 human + machine dual artifact 的正式类型 |
| `src/cli/design-contract-loader.ts` | validated design input | 已有低风险 loader seam |
| `src/cli/design-scope-resolver.ts` | scope / tests / risk / unknowns | handoff touched files 与 risks 的直接来源 |
| `src/cli/design-handoff-builder.ts` | canonical handoff truth + renderer orchestration | 最小 blast-radius 的构建落点 |
| `src/cli/commands/design.ts` | `design handoff` CLI surface | 已存在 `design validate` / `design map`，最自然的扩展点 |
| `src/cli/paths.ts` | output path helper | `.mycodemap` / `.codemap` path 决策既有事实源 |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `src/cli/commands/__tests__/design-map-command.test.ts` | 参考 design subcommand regression pattern | 新增 `design handoff` 命令测试时 |
| `src/cli/__tests__/design-handoff-builder.test.ts` | 新增 builder-focused regression | 锁住 artifact shape / gate state / path decisions |
| `src/cli/commands/__tests__/design-handoff-command.test.ts` | CLI surface / write-to-disk 回归 | 锁住 human/json dual output |
| `tests/fixtures/design-contracts/*` | success / review-needed / blocked fixtures | 覆盖 `design handoff` happy path 与 failure/gate path |
| `README.md`, `AI_GUIDE.md`, `docs/ai-guide/*`, `docs/rules/*` | public contract docs | 新 public subcommand 的最小同步 |
| `scripts/validate-docs.js` | docs contract guardrail | 防止 `design handoff` 文档再次漂移 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `design handoff` 子命令 | 新 top-level `handoff` | 需要新增 public surface 与 discoverability/docs 维护成本 |
| `.mycodemap/handoffs` | 仓库根目录 sidecar | 输出更显眼，但会放大 path clutter 与 helper 漂移 |
| Explicit readiness state | unresolved 即 CLI failure | reviewer 无法看到完整 artifact，也不利于后续排查 why-not-ready |
| Structured trace lists | prose-only handoff note | downstream agent 难以稳定消费，审计来源也困难 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Extend the existing `design` seam, not broad public contracts
**What:** 在 `src/cli/commands/design.ts` 下新增 `handoff` 子命令。  
**Why:** `design` 已是 design-driven public seam；继续沿此处扩展，比碰 `analyze` / `workflow` 成本更低。  
**Evidence:** `src/cli/commands/design.ts`, `.planning/phases/17-design-contract-surface/17-CONTEXT.md`, `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md`

### Pattern 2: Single-source truth with dual renderers
**What:** 先构建 `DesignHandoffResult` / `DesignHandoffPayload`，再由 markdown renderer 与 JSON serializer 消费。  
**Why:** 这是同时满足 `HOF-01` 与 `HOF-02` 的最低风险做法。  
**Evidence:** `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md`, `docs/ai-guide/OUTPUT.md`

### Pattern 3: Provenance-first traceability
**What:** `approvals`、`assumptions`、`openQuestions` 分离建模，并全部携带 source refs。  
**Why:** `HOF-03` 的关键是“可追踪”，不是“字段看起来够多”。  
**Evidence:** `.planning/REQUIREMENTS.md`, `src/interface/types/design-contract.ts`, `src/interface/types/design-mapping.ts`

### Pattern 4: Explicit gate state over silent promotion
**What:** unresolved assumptions / open questions 让 artifact 标记 `readyForExecution=false`，而不是 silent pass 或 CLI crash。  
**Why:** 这样既保留 human gate，又不牺牲 artifact 可审查性。  
**Evidence:** `.planning/PROJECT.md`, `.planning/STATE.md`, `.planning/phases/18-design-to-code-mapping/18-UAT.md`

### Pattern 5: Reuse output-path helpers instead of inventing new artifact roots
**What:** handoff artifact 默认写到 `resolveOutputDir()` 下的 `handoffs/` 子目录。  
**Why:** 当前仓库已有 `.mycodemap` precedence；复用 helper 才能避免新的 path drift。  
**Evidence:** `src/cli/paths.ts`, `src/cli/commands/generate.ts`, `src/cli/commands/report.ts`

### Anti-Patterns to Avoid
- 给 `analyze` 增加 `handoff` / `package` intent
- 把 `workflow` 再次扩成多阶段工程编排以承载 handoff
- 分别手写 markdown summary 与 JSON payload，导致两套 truth
- 把 unresolved `openQuestions` / `unknowns` 默认当成已批准事实
- 新增 `design handoff` 后不更新 docs / guardrail
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: markdown / JSON 分叉实现
**Failure mode:** 人类 summary 与 machine JSON 分别拼接字段，最终 touched files、risks、open questions 对不上。  
**Impact:** `HOF-01` / `HOF-02` 同时失真，后续 reviewer 与 agent 看到的是两个不同 handoff。

### Pitfall 2: 把 review-needed 当成 CLI failure
**Failure mode:** 只要存在 `Open Questions` 或 `unknowns` 就直接失败退出，不生成 artifact。  
**Impact:** 人类反而拿不到完整 handoff 做 review，why-not-ready 也无法被稳定记录。

### Pitfall 3: 用随机路径或 repo root 持久化 artifact
**Failure mode:** handoff 文件有时写仓库根目录，有时写 `.planning/`，有时写 `.mycodemap/`。  
**Impact:** path drift 重新出现，脚本、docs、agent 都很难稳定发现 artifact。

### Pitfall 4: 把 assumptions / open questions 混成 prose
**Failure mode:** artifact 只有“Notes”段落，没有结构化 trace item。  
**Impact:** downstream agent 无法区分“已批准事实”和“暂时假设”，语义漂移风险极高。

### Pitfall 5: 新 public command 不做 docs sync
**Failure mode:** `design handoff` 能跑，但 README / AI docs / guardrail 仍停在 `design validate → design map`。  
**Impact:** 当天就重演 docs drift。
</common_pitfalls>

<code_examples>
## Code Examples

### Recommended CLI entry
```bash
mycodemap design handoff mycodemap.design.md --json
```

### Recommended artifact paths
```text
.mycodemap/handoffs/mycodemap.handoff.md
.mycodemap/handoffs/mycodemap.handoff.json
```

### Recommended machine-readable shape
```json
{
  "ok": true,
  "filePath": "mycodemap.design.md",
  "outputDir": ".mycodemap/handoffs",
  "readyForExecution": false,
  "artifacts": {
    "markdownPath": ".mycodemap/handoffs/mycodemap.handoff.md",
    "jsonPath": ".mycodemap/handoffs/mycodemap.handoff.json"
  },
  "summary": {
    "touchedFileCount": 4,
    "testCount": 3,
    "approvalCount": 2,
    "assumptionCount": 1,
    "openQuestionCount": 1,
    "requiresReview": true
  },
  "handoff": {
    "constraints": ["Keep workflow four-phase semantics"],
    "touchedFiles": ["src/cli/commands/design.ts"],
    "tests": ["src/cli/commands/__tests__/design-handoff-command.test.ts"],
    "approvals": [
      {
        "id": "design-contract-approved",
        "status": "approved",
        "sourceRefs": ["goal", "constraints", "acceptanceCriteria", "nonGoals"]
      }
    ],
    "assumptions": [
      {
        "id": "assumption-01",
        "text": "reviewer will inspect markdown artifact before execution",
        "sourceRefs": ["candidate:src/cli/commands/design.ts"]
      }
    ],
    "openQuestions": [
      {
        "id": "open-question-01",
        "text": "Should low-risk pending assumptions still require explicit approval?",
        "sourceRefs": ["design:openQuestions"]
      }
    ]
  },
  "diagnostics": []
}
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `pnpm exec vitest run src/cli/__tests__/design-handoff-builder.test.ts src/cli/commands/__tests__/design-handoff-command.test.ts` — builder / command happy path 与 gate-state regression
2. `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts` — 上游 mapping truth seam regression
3. `node dist/cli/index.js design handoff tests/fixtures/design-contracts/handoff-basic.design.md --json` — success / pending-review JSON smoke test
4. `node dist/cli/index.js design handoff tests/fixtures/design-contracts/no-match.design.md --json` — mapping blocker handoff smoke test
5. `npm run docs:check:human` — `design handoff` docs / guardrail sync
6. `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts` — docs guardrail regression

### Recommended failure rehearsal
- design contract 含 `Open Questions` 或 mapping `unknowns`：artifact 必须生成，但 `readyForExecution=false`
- mapping 命中 `no-candidates` / `over-broad-scope` / `high-risk-scope`：handoff 不得伪造 touched files，必须返回 blocker diagnostics
- human mode 指定临时 output dir：必须同时写出 `.handoff.md` 与 `.handoff.json`
- 移除 README / OUTPUT / COMMANDS 中的 `design handoff`：docs guardrail 必须失败
</validation_architecture>

<open_questions>
## Open Questions

1. `design handoff` 是否需要 `--dry-run` / `--no-write`，还是先只做持久化 artifact + `--json` 两条路径？
2. `readyForExecution` 的阈值是否对所有 assumptions 一刀切，还是允许低风险 assumptions 保持 ready-with-review？
3. human summary 是否需要内嵌 candidate-level reason chain，还是只引用 touched files + risk summaries 即可？
</open_questions>

<sources>
## Sources

### Primary
- `.planning/phases/19-handoff-package-human-gates/19-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `src/cli/commands/design.ts`
- `src/cli/paths.ts`
- `src/interface/types/design-contract.ts`
- `src/interface/types/design-mapping.ts`
- `src/cli/design-contract-loader.ts`
- `src/cli/design-scope-resolver.ts`
- `src/cli/commands/generate.ts`
- `src/cli/commands/report.ts`

### Secondary
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/phases/17-design-contract-surface/17-CONTEXT.md`
- `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md`
- `.planning/phases/18-design-to-code-mapping/18-UAT.md`
- `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`
- `docs/ai-guide/COMMANDS.md`
- `docs/ai-guide/OUTPUT.md`
- `scripts/validate-docs.js`
</sources>

---

*Phase: 19-handoff-package-human-gates*
*Research gathered: 2026-03-25*
