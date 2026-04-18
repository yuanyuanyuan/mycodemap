---
milestone: post-v1.6
audited: 2026-04-18T17:15:27Z
status: tech_debt
scores:
  requirements: 5/5
  phases: 1/1
  integration: 4/4
  flows: 3/3
nyquist:
  compliant_phases: ["26"]
  partial_phases: []
  missing_phases: []
  overall: compliant
gaps:
  requirements: []
  integration: []
  flows: []
tech_debt:
  - phase: "26"
    items:
      - "`mcp install` 仍只有 repo-local `.mcp.json` flow，host support matrix / lifecycle 未定义。"
      - "MCP freshness identity 仍只有 `generated_at` 级别，未补 `commit_sha` / `dirty` / `graph_schema_version`。"
      - "首期 symbol query / impact 的最小质量基线仍未定义，当前主要证明的是通路与错误契约。"
      - "是否继续让 MCP 留在首期 surface 仍是显式待复盘事项。"
---

# post-v1.6 Milestone Audit

## 结论

`post-v1.6 Symbol-level graph and experimental MCP thin slice` 已达成当前 follow-up 的功能与验证目标：`5/5` 个 requirement 已被 traceability、summary frontmatter 与 phase verification 三路证据共同覆盖，`1/1` 个 phase 完成，`generate --symbol-level` → partial graph truth → experimental MCP stdio query / impact 的最小纵向链路已经跑通。  
本次审计结论为 **tech_debt**，不是因为存在 blocker，而是因为仍有一组明确登记且非阻断的后续债务：MCP host lifecycle 未定义、freshness identity 偏弱、query 质量基线尚未补齐。Nyquist validation artifact 已于本轮补齐。

## 范围

- Milestone: `post-v1.6 Symbol-level graph and experimental MCP thin slice`
- Phase: `26`
- Plans: `26-01`, `26-02`, `26-03`
- Audit sources:
  - Root planning files: `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md`, `.planning/STATE.md`
  - Phase artifacts: `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-01-SUMMARY.md`, `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-02-SUMMARY.md`, `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-03-SUMMARY.md`
  - Phase verification: `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-VERIFICATION.md`
  - Phase validation: `.planning/milestones/post-v1.6-phases/26-implement-symbol-level-graph-and-experimental-mcp-thin-slice/26-VALIDATION.md`
  - Runtime evidence: real `dist` CLI generate/install/smoke chain captured in `26-03-SUMMARY.md`

## Requirements Coverage

| Requirement | Traceability | Summary Frontmatter | Verification | Final Status |
|-------------|--------------|---------------------|--------------|--------------|
| `P26-NOW-SYMBOL-GENERATE` | checked + mapped in `.planning/REQUIREMENTS.md` | listed in `26-01-SUMMARY.md` | phase table says satisfied | satisfied |
| `P26-NOW-SQLITE-PATH` | checked + mapped in `.planning/REQUIREMENTS.md` | listed in `26-01-SUMMARY.md` | phase table says satisfied | satisfied |
| `P26-NOW-PARTIAL-GRAPH-TRUTH` | checked + mapped in `.planning/REQUIREMENTS.md` | listed in `26-02-SUMMARY.md` | phase table says satisfied | satisfied |
| `P26-NOW-MCP-STDIO` | checked + mapped in `.planning/REQUIREMENTS.md` | listed in `26-03-SUMMARY.md` | phase table says satisfied | satisfied |
| `P26-NOW-SYMBOL-IMPACT` | checked + mapped in `.planning/REQUIREMENTS.md` | listed in `26-03-SUMMARY.md` | phase table says satisfied | satisfied |

**Result:** `5/5` requirements satisfied, `0` unsatisfied, `0` orphaned.

## Phase Status

| Phase | Status | Basis | Summary |
|-------|--------|-------|---------|
| 26 Implement symbol-level graph and experimental MCP thin slice | passed | `26-VERIFICATION.md` + all 3 plan summaries | symbol-level generate、partial graph truth、experimental MCP stdio thin slice 都已落地并经真实 smoke 验证 |

## Cross-Plan Integration

| Integration Path | Status | Why it matters |
|------------------|--------|----------------|
| `generate --symbol-level` → symbol materialization → SQLite/read model | pass | 如果 symbol truth 不能进入存储层，后续 query / impact 只会停留在 parser 临时结果 |
| analyzer partial truth → graph metadata persistence → MCP envelope | pass | `graph_status` / failure metadata 必须从 analyze 一路传到对外 contract，不能中途丢失 |
| CLI `mcp start` → startup side-effect bypass → stdio transport purity | pass | 只要 CLI 欢迎信息或 runtime log 污染 `stdout`，MCP host 就无法稳定消费协议 |
| filesystem / SQLite readback → real dist smoke | pass | 真实 dogfood 已证明 serialization drift 能直接破坏 MCP metadata，因此回归链必须贯通到 child-process smoke |

## E2E Flows

| Flow | Status | Evidence Basis |
|------|--------|----------------|
| `generate --symbol-level` 生成 symbol-level graph，并保持默认 generate surface 不变 | pass | `26-01-SUMMARY.md` + `26-VERIFICATION.md` |
| partial graph truth 从 analyze 进入存储和输出，不再伪装成完整图 | pass | `26-02-SUMMARY.md` + `26-VERIFICATION.md` |
| `mcp install` → `mcp start` → `codemap_query` / `codemap_impact` 首次成功调用 | pass | `26-03-SUMMARY.md` 中的真实 `dist` smoke evidence + `26-VERIFICATION.md` |

## Nyquist Coverage

| Phase | VALIDATION.md | Compliant | Action |
|-------|---------------|-----------|--------|
| 26 | present | compliant | no further Nyquist action required |

## Non-Blocking Tech Debt

1. **MCP lifecycle / identity debt remains explicit**
   - `mcp install` 仍是 repo-local experimental flow，缺少 host support matrix、upgrade/uninstall contract
   - MCP metadata 仍只有 `generated_at`，没有更强的 graph freshness identity

2. **Quality baseline still deferred**
   - 当前已证明“通路可用 + 错误契约显式”，但还没定义“结果值得信”的最低质量基线

## Recommendation

- 可以把这次 follow-up 视为 **已交付且可审计通过**，但当前更适合标成 `tech_debt` 而不是 `passed`
- 若你的目标是尽快归档，可接受这些债务并继续 `complete-milestone`
- 若你的目标是把 planning / audit 证据链补到最完整，建议先补：
  1. MCP freshness identity decision
  2. `mcp install` host support matrix / lifecycle decision
  3. symbol query 最低质量基线
