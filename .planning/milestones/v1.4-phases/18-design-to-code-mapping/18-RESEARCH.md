# Phase 18: Design-to-Code Mapping - Research

**Researched:** 2026-03-25
**Domain:** design contract → candidate code scope / risk / test impact mapping
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- mapping 仍然必须走 purpose-built 的 `design` / handoff 旁路，不能扩写 `analyze` public intent，也不能恢复 `workflow` 的 `commit` / `ci` phase。
- design contract 继续是唯一输入真相；mapping 不得退回自由文本猜测。
- candidate 识别必须是 boundary-first、多信号、带 reason chain，而不是模糊搜索结果拼盘。
- 输出必须同时包含 `dependencies`、`test impact`、`risk`、`confidence`、`unknowns`，足以支持人类 review。
- no-match / over-broad / high-risk 必须 hard block，并返回“需要人类补充设计”的明确 diagnostics。
- 本 phase 不做完整 handoff package、approval tracking、design drift verification，也不让 `Phase 21` 抢占主线。

### the agent's Discretion
- mapping 对外 subcommand 的精确命名
- ranking / threshold 的具体数值
- reason chain 的序列化格式
- mapping artifact 的最终路径与 human-readable summary 细节

### Deferred Ideas (OUT OF SCOPE)
- 完整 handoff package 与 machine-readable handoff JSON
- approvals / assumptions / open questions 的持久化追踪
- design-vs-implementation drift report / acceptance checklist
- 外部设计输入集成（Figma / issue tracker / PR system）

</user_constraints>

<research_summary>
## Summary

第一个结论是：**最稳的 public surface 是在现有 `design` 命令下新增 `map` 子命令，而不是改 `analyze` / `workflow`。** 证据很直接：顶层 CLI 已经把 `design` 作为独立入口注册，而 `src/cli/index.ts` 与 `src/cli/commands/analyze.ts` 都是高 blast-radius 入口；在现有 `design` command 内新增 `map`，可以把改动面压到最低，同时延续 Phase 17 的 design-first 路线。

第二个结论是：**不能直接把 `CodemapOutput` / `UnifiedResult` 当成 Phase 18 的最终 mapping contract。** 现有结构确实已经有 `dependencies`、`riskLevel`、`confidence` 和 `testFile` 等字段，但它没有 `unknowns`，也没有表达“candidate kind + reason chain + blocker diagnostics”的正式 shape；更关键的是 `testFile` 只有单值，离“test impact”还差一层抽象。Phase 18 需要自己的 mapping types，而不是把 analyze 输出硬冒充 handoff-ready contract。

第三个结论是：**resolver 最适合先做成 CLI-owned seam，而不是现在就强行抽成完整 domain/infrastructure 组合。** 仓库仍是 hybrid architecture；当前 design loader 已经在 `src/cli/` 证明了“CLI-owned seam + shared interface types”是低风险路线。Phase 18 更适合沿用这条路：在 `src/interface/types/` 定义 mapping contract，在 `src/cli/design-scope-resolver.ts` 组合 `loadDesignContract`、`AnalyzeCommand`、`ImpactCommand` 与 `resolveTestFile(s)`。

第四个结论是：**`MAP-03` 不能只是“当结果不好时打印 warning”。** 现有设计输入链路已经明确采用 failure-first 原则；如果 mapping 在 no-match、over-broad 或 high-risk 命中时继续往下走，只会把 Phase 17 刚建立的 design trust 再次击穿。应该显式引入 blocker diagnostics，例如 `no-candidates`、`over-broad-scope`、`high-risk-scope`，并提供 fixtures 覆盖这三类失败模式。

第五个结论是：**如果 `design` public surface 增加了 `map`，最小 docs sync 不能等到 Phase 20。** Phase 20 负责的是 design drift verification 与整个 handoff 闭环的 docs/CI 固化；但只要本 phase 新增或修改了 public CLI 命令，就必须最小化同步 README / AI docs / rules / docs guardrail，否则 guardrail 与实际命令面会再次漂移。

**Primary recommendation:**  
1. 在 `src/cli/commands/design.ts` 下新增 `design map [file] --json`；  
2. 新建 `src/interface/types/design-mapping.ts` 定义 `DesignMappingResult` / `DesignMappingCandidate` / `DesignMappingDiagnostic`；  
3. 新建 `src/cli/design-scope-resolver.ts`，按“显式 anchors → exact/module hits → analyze find → enrich with read/link/impact/test-linker”的顺序构建 candidates；  
4. 用 blocker diagnostics + focused fixtures 锁定 `MAP-03`；  
5. 只做与 `design map` 直接相关的最小 docs sync，把完整 drift / handoff docs closure 留给 Phase 20。
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `src/interface/types/design-contract.ts` | design input contract | Phase 18 必须复用同一套 section 语义 |
| `src/interface/types/design-mapping.ts` | mapping output contract | `unknowns` / reason chain / blocker diagnostics 需要正式类型 |
| `src/cli/design-contract-loader.ts` | normalized design input | 已验证的 CLI-owned seam |
| `src/cli/design-scope-resolver.ts` | mapping orchestration | 最小 blast-radius 的 resolver 落点 |
| `src/cli/commands/design.ts` | `design map` command surface | 已存在 `design validate`，最自然的扩展点 |
| `src/cli/commands/analyze.ts` | `find/read/link/show` 聚合与 confidence/risk/test enrichment | Phase 18 的主要内部积木 |
| `src/cli/commands/impact.ts` | dependent / blast-radius analysis | over-broad / high-risk 判断的关键证据 |
| `src/orchestrator/test-linker.ts` | source→test mapping | `test impact` 的自然复用点 |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `src/cli/commands/__tests__/analyze-command.test.ts` | 分析 contract 回归 | 复用 `analyze` 结果 shape 时 |
| `src/cli/__tests__/design-contract-loader.test.ts` | design input regression | 需要稳定 loader 前提时 |
| `src/cli/__tests__/index-help.test.ts` | top-level help 回归 | 若 `design` 帮助文本变化波及顶层 discoverability |
| `tests/fixtures/design-contracts/*` | success/failure fixtures | `design map` happy path 与 blocker path |
| `README.md`, `AI_GUIDE.md`, `docs/ai-guide/*`, `docs/rules/*` | public contract docs | 新 subcommand 必需最小同步 |
| `scripts/validate-docs.js` | docs contract guardrail | 防止 `design map` 文档漂移 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `design map` 子命令 | 新增 `analyze` intent | 直接扩大 public contract blast radius |
| CLI-owned resolver | 立即抽成 full domain service + infra adapter | 更“纯”但当前仓库仍是 hybrid，过度设计风险高 |
| dedicated mapping types | 直接暴露 `CodemapOutput` | 缺 `unknowns` / blocker diagnostics / candidate kind |
| hard block failures | warning 后继续 | 会把猜测伪装成 scope，违背 `MAP-03` |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Extend the existing `design` seam, not legacy public contracts
**What:** 在 `src/cli/commands/design.ts` 下增加 `map` 子命令。  
**Why:** `design` command 已存在，且 `src/cli/index.ts` 把它作为独立 public surface 注册；继续沿这个 seam 扩展，比改 `analyze` / `workflow` 风险更低。  
**Evidence:** `src/cli/index.ts`, `src/cli/commands/design.ts`, `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md`

### Pattern 2: Dedicated mapping contract over wrapped analysis primitives
**What:** 使用 `DesignMappingResult` 包裹 `AnalyzeCommand` / `ImpactCommand` / `test-linker` 的证据，而不是裸露内部结果。  
**Why:** 现有 `CodemapOutput` 足以做内部 enrichment，但不够表达 `unknowns`、candidate kind、reason chain 与 blocker diagnostics。  
**Evidence:** `src/orchestrator/types.ts`, `src/cli/commands/analyze.ts`

### Pattern 3: Boundary-first signal fusion
**What:** 先处理 design contract 的显式 anchors（路径、模块、符号、关键词、non-goals），再做 broad search 和 impact enrichment。  
**Why:** 这样能把 false positive 压到最低，并天然支持 reason chain。  
**Evidence:** `.planning/REQUIREMENTS.md`, `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md`, `src/cli/design-contract-schema.ts`

### Pattern 4: Failure-first mapping diagnostics
**What:** 明确区分 success output 与 `no-candidates` / `over-broad-scope` / `high-risk-scope` 这三类 blocker。  
**Why:** `MAP-03` 不是“最好有警告”，而是“必须阻断并要求补设计”。  
**Evidence:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/17-design-contract-surface/17-CONTEXT.md`

### Anti-Patterns to Avoid
- 给 `analyze` 增加 `map`/`scope` intent
- 把 `UnifiedResult.metadata.testFile` 当成完整 `test impact`
- 无视 `Non-Goals` / exclusions，只要关键词命中就纳入 candidates
- 以 warning 方式继续放行 high-risk hits
- 新增 `design map` 后不更新 docs / guardrail
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 复用 analyze 输出，但漏掉 mapping 语义
**Failure mode:** JSON 里只有 files / relevance / risk，没有 `reason chain`、`unknowns`、`diagnostics`。  
**Impact:** 结果看起来结构化，实际上仍然不足以支持 human review 或下一阶段 handoff。

### Pitfall 2: 把单一 `testFile` 误当成完整 test impact
**Failure mode:** resolver 只转抄 `metadata.testFile`。  
**Impact:** 容易漏掉多测试文件场景，也无法说明“没有测试命中”本身就是一个 unknown。

### Pitfall 3: broad query 误命中高 blast-radius 文件
**Failure mode:** 模糊搜索把 `src/cli/index.ts`、`src/cli/commands/analyze.ts`、`src/orchestrator/workflow/workflow-orchestrator.ts` 一起打进结果。  
**Impact:** 如果不 block，人类会在错误 scope 上继续推进计划。

### Pitfall 4: `Non-Goals` 不参与 negative filtering
**Failure mode:** design contract 明确排除了某个 surface，但 resolver 仍把该 surface 当高分命中。  
**Impact:** mapping 失去“design constrains implementation”的核心价值。

### Pitfall 5: public subcommand 已改，文档没锁
**Failure mode:** `design map` 可执行，但 README / AI docs / docs guardrail 仍只知道 `design validate`。  
**Impact:** 新一轮 docs drift 立刻重演。
</common_pitfalls>

<code_examples>
## Code Examples

### Recommended CLI entry
```bash
mycodemap design map mycodemap.design.md --json
```

### Recommended output shape
```json
{
  "ok": true,
  "filePath": "mycodemap.design.md",
  "summary": {
    "candidateCount": 3,
    "blocked": false
  },
  "candidates": [
    {
      "kind": "file",
      "path": "src/cli/commands/design.ts",
      "reasons": [
        {
          "section": "goal",
          "matchedText": "design",
          "evidenceType": "keyword-match"
        }
      ],
      "dependencies": ["src/cli/design-contract-loader.ts"],
      "testImpact": ["src/cli/commands/__tests__/design-map-command.test.ts"],
      "risk": "low",
      "confidence": { "score": 0.82, "level": "high" },
      "unknowns": []
    }
  ],
  "diagnostics": []
}
```

### Recommended blocker codes
```text
no-candidates
over-broad-scope
high-risk-scope
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `pnpm exec vitest run src/cli/__tests__/design-scope-resolver.test.ts src/cli/commands/__tests__/design-map-command.test.ts` — resolver / command happy path 与 blocker path
2. `pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/cli/__tests__/design-contract-loader.test.ts` — reuse seam regression
3. `node dist/cli/index.js design map tests/fixtures/design-contracts/mapping-basic.design.md --json` — success-path JSON smoke test
4. `node dist/cli/index.js design map tests/fixtures/design-contracts/no-match.design.md --json` — no-match blocker smoke test
5. `node dist/cli/index.js design map tests/fixtures/design-contracts/over-broad.design.md --json` — over-broad blocker smoke test
6. `node dist/cli/index.js design map tests/fixtures/design-contracts/high-risk.design.md --json` — high-risk blocker smoke test
7. `npm run docs:check:human` — minimal docs / guardrail sync for new `design map` surface

### Recommended failure rehearsal
- fixture 只给宽泛关键词、不含明确 scope anchors：应返回 `over-broad-scope`
- fixture 指向不存在或无命中的目标：应返回 `no-candidates`
- fixture 明确命中 `src/cli/commands/analyze.ts` / `src/cli/index.ts` 这类高 blast-radius 入口：应返回 `high-risk-scope`
- fixture 在 `Non-Goals` 里排除 CLI surface：resolver 不应再把 `src/cli/` 命中进 candidate set
</validation_architecture>

<open_questions>
## Open Questions

1. `design map` 是否需要 `--strict` / `--top-k` 一类调优参数，还是先保持最小 surface？
2. over-broad 的阈值是否只看 candidate 数量，还是要结合 risk 权重与子系统跨度？
3. `unknowns` 是否只记录“缺测试 / 低置信 / open questions”，还是也要包含“命中了 partial implementation”这类仓库债务信号？
</open_questions>

<sources>
## Sources

### Primary
- `.planning/phases/18-design-to-code-mapping/18-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `src/cli/index.ts`
- `src/cli/commands/design.ts`
- `src/cli/design-contract-loader.ts`
- `src/cli/design-contract-schema.ts`
- `src/cli/commands/analyze.ts`
- `src/cli/commands/impact.ts`
- `src/orchestrator/types.ts`
- `src/orchestrator/test-linker.ts`

### Secondary
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/phases/17-design-contract-surface/17-RESEARCH.md`
- `.planning/phases/17-design-contract-surface/17-VALIDATION.md`
- `package.json`
- `vitest.config.ts`
</sources>

---

*Phase: 18-design-to-code-mapping*
*Research gathered: 2026-03-25*
