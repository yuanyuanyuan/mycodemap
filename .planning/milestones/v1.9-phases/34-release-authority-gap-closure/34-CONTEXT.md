# Phase 34: Release authority gap closure - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 34 只关闭 `v1.9` milestone audit 指出的 release authority drift：
- 清理 `docs/rules/pre-release-checklist.md` 中 helper-first 竞争入口
- 统一 release closeout 命令示例
- 重新运行 docs / docs-sync / pre-release 验证并恢复 milestone closeout-ready 规划状态

本 phase 不扩展到真实 `/release` dogfood、远程 tag 冲突实现、非 Claude runtime wrapper，或 Phase 31-33 的 Nyquist backfill。

</domain>

<decisions>
## Implementation Decisions

### Scope Guardrails
- 只修正 audit 已确认的 authority drift，不顺手扩展 release 能力
- `/release vX.Y` 必须继续是唯一推荐入口；`scripts/release.sh` 只能作为 Gate #2 之后的机械 helper
- 手动例外流可以保留，但必须明确依附于与 `/release` 等价的 closeout + 双确认门，而不是新的主入口

### Validation Strategy
- 重新运行 `rtk npm run docs:check`
- 重新运行 `rtk npm run docs:check:pre-release`
- 重新运行 `rtk node dist/cli/index.js ci check-docs-sync`
- 重新运行 `rtk proxy git diff --check`
- 在本 phase verification 中显式记录“helper-first drift”作为 failure rehearsal，避免 `VAL-01` 再次漏检

### the agent's Discretion
- 若 `docs/rules/pre-release-checklist.md` 的手动例外示例需要与 `release.md` helper 表达对齐，可统一为 `rtk ./scripts/release.sh {X.Y}.0` 或清晰注明 `npm run release` 只是包装器
- 若 `docs/rules/release.md` 的 closeout 命令写法与当前 skill 约定不一致，优先对齐到 `$gsd-complete-milestone`

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `docs/rules/release.md` 已定义 `/release` 的 authority chain、两道确认门与 helper delegation
- `docs/rules/deployment.md` 已明确 `/release` 是 milestone-bound release 的统一入口
- `.claude/skills/release/SKILL.md` 已固定运行时 closeout / Gate #1 / Gate #2 / helper delegation 模板
- `scripts/validate-docs.js`、`scripts/pre-release-check.js` 与 `dist/cli/index.js ci check-docs-sync` 已提供可复用的验证面

### Established Patterns
- release governance 真相集中写在 `docs/rules/release.md`
- checklist 只应补充 readiness / manual exception，不应重新定义主入口
- 规划状态以 `.planning/ROADMAP.md`、`.planning/STATE.md`、`.planning/REQUIREMENTS.md` 为真相

### Integration Points
- `docs/rules/pre-release-checklist.md` 与 `docs/rules/release.md` / `docs/rules/deployment.md` 的 authority 描述必须一致
- Phase 34 完成后需要把 `.planning/ROADMAP.md`、`.planning/STATE.md`、`.planning/PROJECT.md`、`.planning/REQUIREMENTS.md` 恢复为 4 phases complete / ready for closeout
- 完成后应重跑 milestone audit，确认 `REL-01`、`DOC-02`、`VAL-01` 不再 partial

</code_context>

<specifics>
## Specific Ideas

- 把 `docs/rules/pre-release-checklist.md` 第 8 节从“推荐直跑 helper”改成“推荐 `/release vX.Y`，手动流仅作受控例外”
- 顺手对齐 `docs/rules/release.md` 中 `/gsd-complete-milestone v{X.Y}` 的命令示例，避免与 skill / roadmap 中的 `$gsd-complete-milestone` 约定漂移
- 在 verification 中把这次 audit 发现写成明确的 drift detector，而不是只记录命令通过

</specifics>

<deferred>
## Deferred Ideas

- 为 Phase 31-33 补写 `*-VALIDATION.md`
- 远程 tag conflict 的真实 `/release` dogfood 证据
- 非 Claude runtime 的 `/release` wrapper

</deferred>

---

*Phase: 34-release-authority-gap-closure*
*Context gathered: 2026-04-22 after v1.9 milestone audit gaps were planned*
