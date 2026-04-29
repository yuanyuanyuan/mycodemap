# Phase 36: Validation trust alignment - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 36 只统一 validation 相关 live docs 的 truth：
- `README.md`
- `AI_GUIDE.md`
- `docs/rules/validation.md`
- `docs/rules/engineering-with-codex-openai.md`
- `scripts/validate-docs.js` 中对应 guardrail

目标是让维护者从这四处读到同一套 minimum validation truth，而不是从不同入口拼语义。

</domain>

<decisions>
## Implementation Decisions

### Scope Guardrails
- 不改 CI / hook 逻辑，只改 live docs truth 和 guardrail 断言
- quick-truth 保持短小，只覆盖最容易漂移的四件事：`docs:check` first pass、`check-docs-sync` 统一入口、`report-only` 非阻断、`warn-only / fallback` 不是 hard gate success

### Validation Strategy
- `rtk npm run docs:check`
- `rtk node dist/cli/index.js ci check-docs-sync`
- `rtk proxy git diff --check`
- targeted grep 验证四份文档都含同一组 quick-truth 句子

### the agent's Discretion
- 可直接复用完全相同的句子，优先降低 future drift
- 不把 quick-truth 写成长 checklist，避免 README / AI_GUIDE 再膨胀

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/rules/validation.md` 已有完整 validation truth，只缺 concise cross-entry summary
- `docs/rules/engineering-with-codex-openai.md` 已记录 docs:check / check-docs-sync / pre-commit / CI 事实
- `README.md` 与 `AI_GUIDE.md` 已有零散 validation 入口说明
- `scripts/validate-docs.js` 可继续作为 truth lock

### Integration Points
- README quick guide
- AI guide quick guide
- rules validation baseline
- engineering execution baseline

</code_context>

<specifics>
## Specific Ideas

- 用同一组 4 条 bullets 固定 validation quick truth
- 让 `scripts/validate-docs.js` 对这 4 条句子做 cross-doc consistency 校验
- verification 里把 “把 report-only 写成 hard gate / 把 fallback 写成 success” 当作 failure rehearsal

</specifics>

<deferred>
## Deferred Ideas

- hook / CI 实现层改动
- archive/live identity cleanup
- release follow-up

</deferred>

---

*Phase: 36-validation-trust-alignment*
*Context gathered: 2026-04-23 after reviewing validation truth across README, AI guide, rules, and engineering docs*
