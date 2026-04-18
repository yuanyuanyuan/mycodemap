# Phase 20: Design Drift Verification & Docs Sync - Research

**Researched:** 2026-03-26
**Domain:** acceptance-driven verification checklist + design-vs-implementation drift report + docs/CI full closure
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- verification 必须继续挂在 purpose-built `design` seam 下，不能回塞 `analyze` public intent，也不能重开 `workflow` / `ci` phase 语义。
- `Acceptance Criteria` 是 verification checklist 的唯一 canon；每条 criteria 都要映射成带状态和证据的 checklist item。
- reviewed handoff scope 是“计划内 vs 漂移”的边界；超出 scope 的实现或文档声明必须作为 drift 暴露。
- docs sync 在 Phase 20 必须从“最小 sync”升级为完整闭环：README、AI docs、rules、guardrail scripts/tests 与 CI 叙事统一到真实链路。
- 验证策略必须覆盖至少三类失败模式：缺失 design sections、scope blocker、handoff/docs/command contract drift。
- 端到端证据优先走 fixture-driven、repo-local 路线；ready-path 需要补一份零未决项 fixture。

### the agent's Discretion
- verification result / checklist / drift item 的精确字段命名
- verify 是否默认只输出 stdout，还是同时支持 artifact 持久化
- 证据引用的最小粒度（文件、测试、diagnostic、artifact path 的组合）

### Deferred Ideas (OUT OF SCOPE)
- approval mutation command / 审批账本
- autonomous executor / `ship` / workflow mutation 与 verify 直连
- 外部设计输入集成（Figma / issue tracker / PR system）
- ArcadeDB 可行性评估（`Phase 21`）

</user_constraints>

<research_summary>
## Summary

第一个结论是：**Phase 20 最稳的 public surface 仍然是 `design verify`，而不是扩写 `handoff`、`workflow` 或 `ci`。** 证据来自前三个 phase 的连续收口：`design validate`、`design map`、`design handoff` 已经形成 purpose-built sidecar 链；任何把 verification 再塞回 `analyze` / `workflow` 的做法，都会重新放大高 blast-radius surface 与 workflow docs drift。

第二个结论是：**verify 不应该假装“自动理解任意 acceptance text”，而应该做 conservative evidence aggregation。** 最小可行做法是：把每条 `Acceptance Criteria` 固定成 checklist item；只有当存在直接 probe 证据时才标记 `satisfied`，否则保持 `needs-review`；遇到 blocker inputs 或明确冲突时标记 `violated/blocked`。这比“全部自动通过”更诚实，也更符合当前 milestone 的人类 ownership。

第三个结论是：**reviewed handoff JSON 应优先作为 verification 的 scope boundary truth。** 如果 handoff artifact 已存在，就应该优先读取它来确定 approved scope；如果 artifact 缺失或尚未 ready，就显式降级为 `needs-review` 或 blocker，而不是静默重新构建一份“看起来差不多”的 handoff 再继续验证。否则 verification 将再次把未经批准的推导伪装成事实。

第四个结论是：**Phase 20 的 docs closure 必须覆盖 README、AI_GUIDE、`docs/ai-guide/COMMANDS.md`、`OUTPUT.md`、`PATTERNS.md`、`docs/rules/*`、guardrail 脚本与相关 tests。** 前两个 phase 故意只做最小 sync；到了 Phase 20，再只改 README/AI_GUIDE 就是在逃避 `DOC-07`。尤其 `PATTERNS.md` 和 `workflow` 边界文案，如果没有和 `design verify` 一起锁住，会立刻复发“设计链路写对了，workflow 叙事却又漂了”的老问题。

第五个结论是：**ready-path 需要新增零未决项 fixture，不能继续复用 `handoff-basic.design.md`。** 现有 baseline fixture 会因为 `Open Questions` 进入 non-blocking `review-required` 路径；如果不补一个真正 `readyForExecution=true` 的 fixture，`VAL-04` 的 success path 与 `20-03` 的端到端闭环就只能靠口头描述。

第六个结论是：**`VAL-05` 必须被编码为自动化证据，而不是留在 UAT 里口述。** 当前仓库已经具备 design fixture、docs guardrail fixture、CLI command regression 三套基础设施；最优路线是复用现有 `missing-acceptance.design.md`、`no-match.design.md` / `over-broad.design.md` / `high-risk.design.md` 与 docs drift fixture tests，把三类失败模式直接纳入 automated regression。

**Primary recommendation:**  
1. 新增 `src/interface/types/design-verification.ts` 与 `src/cli/design-verification-builder.ts`，实现 conservative checklist/drift truth；  
2. 在 `src/cli/commands/design.ts` 暴露 `design verify [file]`，`--json` 维持纯 JSON，human mode 输出 checklist / drift summary；  
3. 读取 deterministic handoff JSON 作为 approved scope boundary，缺失时显式降级，不 silent rebuild 后自证成功；  
4. 同步完整 docs/rules/guardrail，明确真实链路为 `design validate → design map → design handoff → design verify`，同时继续锁住 workflow 四阶段边界；  
5. 用 zero-unresolved ready fixture + 既有 failure fixtures 完成 E2E / failure rehearsal / milestone evidence。
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library / Module | Purpose | Why Standard |
|------------------|---------|--------------|
| `src/interface/types/design-contract.ts` | design section truth | checklist item 的唯一上游语义来自 contract sections |
| `src/interface/types/design-handoff.ts` | approved scope / review gate truth | verification 需要读取 `readyForExecution`、`approvals`、`assumptions`、`openQuestions` |
| `src/interface/types/design-verification.ts` | verification / drift output contract | Phase 20 的新正式 output shape |
| `src/cli/design-contract-loader.ts` | validated design input | 保持 contract parsing 单一事实源 |
| `src/cli/design-scope-resolver.ts` | candidate scope / risk / tests / blocker diagnostics | drift evidence 与 blocked path 的上游来源 |
| `src/cli/design-handoff-builder.ts` | handoff truth + deterministic artifact path | verify 读取 reviewed boundary 的首选入口 |
| `src/cli/design-verification-builder.ts` | checklist / drift aggregation | Phase 20 的核心实现落点 |
| `src/cli/commands/design.ts` | `design verify` CLI surface | 继续沿 `design` seam 扩展 |

### Supporting
| Tool / Module | Purpose | When to Use |
|---------------|---------|-------------|
| `src/cli/__tests__/design-verification-builder.test.ts` | builder-focused regression | 锁住 checklist status、drift items、artifact fallback 语义 |
| `src/cli/commands/__tests__/design-verify-command.test.ts` | CLI surface regression | 锁住 `design verify` human/json/blocker semantics |
| `src/cli/__tests__/design-verify-e2e.test.ts` | full-chain success/failure evidence | 覆盖 `validate → map → handoff → verify` 闭环 |
| `tests/fixtures/design-contracts/verify-ready.design.md` | zero-unresolved ready-path fixture | 证明 success path 可以真正 `ready` |
| `tests/fixtures/design-contracts/missing-acceptance.design.md` | missing section blocker fixture | 覆盖 design input failure |
| `tests/fixtures/design-contracts/no-match.design.md`, `over-broad.design.md`, `high-risk.design.md` | scope blocker fixtures | 覆盖 mapping / handoff blocked path |
| `scripts/validate-docs.js` + docs tests | docs contract guardrail | 锁住 verify 文档与 workflow 边界 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `design verify` | 把 verify 合并进 `design handoff` | 命令更少，但 pre-implementation artifact 和 post-implementation verification 语义混杂 |
| conservative checklist states | 只要 handoff ready 就自动通过全部 acceptance items | 实现快，但会把缺证据项伪装成 satisfied |
| persisted handoff truth | 每次 verify 都重跑 handoff 并直接相信新结果 | 会绕过“人类先审核 handoff”的边界 |
| full docs/rules closure | 只更新 README / AI_GUIDE | 省工作量，但无法满足 `DOC-07`，也挡不住 docs drift 复发 |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Extend the design-sidecar pipeline, not high-blast-radius surfaces
**What:** 新增 `design verify`，保持 `design validate → design map → design handoff → design verify`。  
**Why:** 这是当前最小 blast-radius 且最容易被 docs guardrail 锁住的路线。  
**Evidence:** `src/cli/commands/design.ts`, `.planning/phases/17-design-contract-surface/17-CONTEXT.md`, `.planning/phases/19-handoff-package-human-gates/19-CONTEXT.md`

### Pattern 2: Conservative status model over false certainty
**What:** checklist item 只在有直接证据时标 `satisfied`；证据不足时标 `needs-review`；阻断条件标 `violated/blocked`。  
**Why:** acceptance text 不是可执行测试脚本，Phase 20 不能靠过度推断制造“全绿幻觉”。  
**Evidence:** `.planning/REQUIREMENTS.md`, `docs/product-specs/DESIGN_CONTRACT_TEMPLATE.md`

### Pattern 3: Approved scope comes from handoff truth, not fresh guesses
**What:** 优先读取 persisted `.handoff.json`；缺失或 not-ready 时显式诊断。  
**Why:** verification 的价值在于检查“实现是否符合已批准 scope”，而不是重新生成 scope 再自证合理。  
**Evidence:** `src/cli/design-handoff-builder.ts`, `src/interface/types/design-handoff.ts`

### Pattern 4: Docs truth lives in scripts/tests as much as prose
**What:** 同步 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/*`、`docs/rules/*`，并扩展 `scripts/validate-docs.js` 与相关 tests。  
**Why:** 当前仓库的 docs guardrail 才是真实 contract enforcement；只改 prose 不改脚本，等于没改。  
**Evidence:** `scripts/validate-docs.js`, `src/cli/__tests__/validate-docs-script.test.ts`, `src/cli/commands/__tests__/ci-docs-sync.test.ts`

### Pattern 5: Fixture-first E2E evidence
**What:** 使用 zero-unresolved ready fixture + 既有 failure fixtures 做 full-chain regression。  
**Why:** milestone audit 需要可重复事实，而不是“本地我试过一次”的口头保证。  
**Evidence:** `.planning/phases/19-handoff-package-human-gates/19-UAT.md`, `.planning/codebase/TESTING.md`

### Anti-Patterns to Avoid
- 只要 handoff builder 没报错，就把全部 acceptance criteria 自动标绿
- handoff artifact 缺失时静默 fallback 到 fresh build，并把结果当 approved truth
- 在 README 加了 verify 命令，却没同步 `PATTERNS.md` / rules / guardrail tests
- 用 success-only demo 代替 failure rehearsal
- 把 verify 描述成 workflow 的新增阶段
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: 把“有 checklist”误当成“已验证完成”
**Failure mode:** 每条 acceptance item 只是被抄成 checklist，却没有状态和 evidence refs。  
**Impact:** `VAL-04` 名义满足，实际上仍然无法判断 drift。

### Pitfall 2: handoff missing 仍默认继续 verify
**Failure mode:** `.handoff.json` 不存在时，verify 静默自建 scope 并给出 satisfied 结论。  
**Impact:** 人类审核边界被绕过，approved scope 不再可信。

### Pitfall 3: docs 只补入口，不补 guardrail
**Failure mode:** README / AI_GUIDE 有 `design verify`，`scripts/validate-docs.js` 与 tests 却不检查。  
**Impact:** 下一次文档漂移将再次静默进入主线。

### Pitfall 4: ready-path fixture 缺失
**Failure mode:** 所有 success 演示都复用含 `Open Questions` 的 fixture。  
**Impact:** 永远只能验证 `needs-review` 路径，无法证明真正 ready 的闭环存在。

### Pitfall 5: 失败预演只写在 UAT 文本里
**Failure mode:** `VAL-05` 只在人工验收文档中描述，自动化测试不覆盖。  
**Impact:** 回归时最先失守的就是 failure semantics。
</common_pitfalls>

<code_examples>
## Code Examples

### Recommended CLI entry
```bash
mycodemap design verify mycodemap.design.md --json
```

### Recommended status model
```typescript
type DesignVerificationStatus =
  | "satisfied"
  | "needs-review"
  | "violated"
  | "blocked";

interface DesignVerificationChecklistItem {
  id: string;
  text: string;
  status: DesignVerificationStatus;
  evidenceRefs: string[];
  note?: string;
}

interface DesignDriftItem {
  kind: "scope-extra" | "acceptance-unverified" | "handoff-missing" | "docs-sync-drift";
  severity: "warning" | "error";
  message: string;
  sourceRefs: string[];
}
```

### Recommended machine-readable shape
```json
{
  "ok": true,
  "filePath": "/repo/mycodemap.design.md",
  "readyForExecution": true,
  "summary": {
    "checklistCount": 3,
    "satisfiedCount": 3,
    "needsReviewCount": 0,
    "driftCount": 0
  },
  "checklist": [
    {
      "id": "ac-1",
      "text": "`design verify --json` 返回机器可读 checklist",
      "status": "satisfied",
      "evidenceRefs": [
        "candidate:src/cli/commands/design.ts",
        "test:src/cli/commands/__tests__/design-verify-command.test.ts"
      ]
    }
  ],
  "drift": [],
  "diagnostics": []
}
```
</code_examples>

<validation_architecture>
## Validation Architecture

### Required checks for this phase
1. `pnpm exec vitest run src/cli/__tests__/design-verification-builder.test.ts src/cli/commands/__tests__/design-verify-command.test.ts` — builder / command focused regressions
2. `node dist/cli/index.js design verify tests/fixtures/design-contracts/verify-ready.design.md --json` — ready-path structured smoke
3. `(node dist/cli/index.js design verify tests/fixtures/design-contracts/no-match.design.md --json >/tmp/phase20-no-match.json 2>&1; test $? -ne 0 && rg -n '"code": "blocked-mapping"|"code": "no-candidates"' /tmp/phase20-no-match.json)` — blocked-path smoke
4. `npm run docs:check:human` — docs / rules / guardrail closure
5. `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts src/cli/commands/__tests__/ci-docs-sync.test.ts src/cli/__tests__/design-verify-e2e.test.ts` — docs drift + E2E evidence
6. `npm test && npm run docs:check:human` — pre-verify-work full suite

### Why this is enough
- focused tests 锁住新类型、builder、command 与 docs drift
- ready-path + blocked-path smoke 覆盖 success / failure 两端
- full suite 把 verify 能力纳入现有 CI / docs guardrail 主链
</validation_architecture>
