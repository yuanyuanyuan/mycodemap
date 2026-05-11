---
phase: 77
slug: ci-gate-threshold-enforcement
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-10T22:14:47+08:00
---

# Phase 77 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| persisted report rows -> gate verdict | Gate 必须只消费真实 report rows，不能被聚合摘要替代 | persisted `rows[*].estimatedTotalTokens` and row metadata |
| shared report truth -> human/JSON renderer | human、JSON、exit code 都必须基于同一份 verdict truth，避免语义漂移 | `gate`, `rows`, `queryTypeSummaries`, `totals` |
| CLI threshold flag -> report/root path selection | 阈值 flag 只能作用于 bare/report 路径，不能污染 `token` 测量路径 | CLI flags, command mode, persisted latest-run lookup |
| verdict -> exit code | 非零退出只能在 CLI 边界、渲染之后发生，避免中间层静默阻断 | final rendered report and `process.exitCode` |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-77-01 | Integrity | threshold truth source | mitigate | `evaluateAgentMetricsGate()` 只基于 `rows` 排序和比较；服务测试固定“group average 通过但单行超阈值仍 fail”。Evidence: [src/orchestrator/agent-metrics-service.ts](/data/codemap/src/orchestrator/agent-metrics-service.ts:217), [src/orchestrator/__tests__/agent-metrics-service.test.ts](/data/codemap/src/orchestrator/__tests__/agent-metrics-service.test.ts:319) | closed |
| T-77-02 | Reliability | explicit report path | mitigate | `requireLatestReport()` 仍保留 latest-run-only 语义，CLI `report` 路径继续调用它；命令测试验证带阈值时仍返回缺失 persisted run 的原有 remediation。Evidence: [src/orchestrator/agent-metrics-service.ts](/data/codemap/src/orchestrator/agent-metrics-service.ts:391), [src/cli/commands/agent-metrics/index.ts](/data/codemap/src/cli/commands/agent-metrics/index.ts:115), [src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts](/data/codemap/src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts:276) | closed |
| T-77-03 | Drift | human/JSON/exit parity | mitigate | canonical `gate` 挂在 report truth 上，human 渲染器和 CLI exit 只消费共享结果；命令测试与 UAT 都覆盖 warn/fail/pass。 Evidence: [src/orchestrator/agent-metrics-service.ts](/data/codemap/src/orchestrator/agent-metrics-service.ts:414), [src/cli/commands/agent-metrics/index.ts](/data/codemap/src/cli/commands/agent-metrics/index.ts:83), [src/cli/commands/agent-metrics/human.ts](/data/codemap/src/cli/commands/agent-metrics/human.ts:37), [src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts](/data/codemap/src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts:236), [77-UAT.md](/data/codemap/.planning/phases/77-ci-gate-threshold-enforcement/77-UAT.md:18) | closed |
| T-77-04 | Scope creep | command-family boundary | mitigate | threshold option 虽注册在命令家族文档层，但实现上只有 bare/report handler 解析并应用阈值；`token` handler 不解析 gate、实际 UAT 也确认 token 输出无 `gate` 字段。 Evidence: [src/cli/commands/agent-metrics/index.ts](/data/codemap/src/cli/commands/agent-metrics/index.ts:96), [src/cli/interface-contract/commands/agent-metrics.ts](/data/codemap/src/cli/interface-contract/commands/agent-metrics.ts:26), [77-UAT.md](/data/codemap/.planning/phases/77-ci-gate-threshold-enforcement/77-UAT.md:27) | closed |
| T-77-05 | Tampering | invalid threshold input | mitigate | `resolveMaxTokensPerQuery()` 在 CLI 边界拒绝非有限值和负数，并返回显式错误码；命令测试覆盖非法输入。 Evidence: [src/cli/commands/agent-metrics/index.ts](/data/codemap/src/cli/commands/agent-metrics/index.ts:60), [src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts](/data/codemap/src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts:290) | closed |

*Status: open · closed*  
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-10 | 5 | 5 | 0 | Codex |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-10
