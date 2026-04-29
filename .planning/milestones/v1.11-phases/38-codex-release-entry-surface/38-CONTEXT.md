# Phase 38: Codex release entry surface - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 38 只处理 **Codex-first** 的 non-Claude release entry surface：
- 为当前仓库补一个 Codex 可发现的 repo-local release wrapper / adapter
- 明确它与 `docs/rules/release.md`、`.claude/skills/release/SKILL.md`、`scripts/release.sh`、`.github/workflows/publish.yml` 的 authority / delegation 边界
- 保证 Codex 入口不会形成与 `/release` 并列的 competing release path

本 phase 不处理：
- Kimi parity（延后，等 Codex 模式跑通后再评估）
- GitHub Actions publish polling / structured report（Phase 39）
- release readiness gate integration（Phase 40）
- 真实 `npm publish`、tag、push 或 GitHub Release

</domain>

<decisions>
## Implementation Decisions

### Runtime Choice
- `RELF-01` 先选 Codex，而不是同时做 Codex + Kimi。
- 依据是仓库已经有 `examples/codex/codemap-agent.md`、README 和 `docs/AI_ASSISTANT_SETUP.md` 中的 `.agents/skills/*` 事实，以及当前执行环境本身就是 Codex。
- Kimi 仍是可行 follow-up，但不在本 phase 内同时扩 scope。

### Authority Boundary
- `docs/rules/release.md` 继续是 release workflow 的单一权威文档。
- `.agents/skills/release/SKILL.md` 若落地，只能是 Codex runtime adapter / thin wrapper。
- Codex wrapper 必须复用现有 refusal、双确认门、closeout / helper delegation truth；不能重写 `scripts/release.sh` 或 `.github/workflows/publish.yml` 逻辑。

### Delivery Shape
- 优先考虑 repo-local `.agents/skills/release/SKILL.md`，因为这是当前仓库治理入口，不是 npm 包面对最终用户的功能样例。
- 若 discoverability 仍不足，可在 `docs/rules/release.md` 加一小段 runtime adapter note；避免把 README / AI guide 重新膨胀成第二套 release 手册。

### Validation Strategy
- `rtk npm run docs:check`
- `rtk node dist/cli/index.js ci check-docs-sync`
- `rtk git diff --check`
- targeted grep：确认 Codex wrapper 指向 `docs/rules/release.md`，保留 `Confirmation Gate #1` / `#2`、`scripts/release.sh`、`.github/workflows/publish.yml`，且没有真实发布捷径

### the agent's Discretion
- 可决定是否在 `docs/rules/release.md` 中加入极短的 “runtime adapters” 说明，但不能复制完整 workflow。
- 可决定 Codex wrapper 是否直接复用 Claude skill 语言结构；前提是不制造双权威。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope
- `.planning/ROADMAP.md` — Phase 38 goal, requirements, and success criteria
- `.planning/REQUIREMENTS.md` — `RELF-01`, `SAFE-01`, `SAFE-02`
- `.planning/STATE.md` — current milestone state and release L3 risks
- `.planning/PROJECT.md` — current milestone context and chosen Codex-first scope

### Release Truth
- `docs/rules/release.md`
- `.claude/skills/release/SKILL.md`
- `scripts/release.sh`
- `.github/workflows/publish.yml`
- `AGENTS.md`

### Codex Runtime Shape
- `README.md`
- `docs/AI_ASSISTANT_SETUP.md`
- `examples/codex/codemap-agent.md`

</canonical_refs>

<specifics>
## Specific Ideas

- 新增 `.agents/skills/release/SKILL.md`，把 Codex release entry 固定成 repo-local thin adapter。
- 在 skill 中显式保留 dirty tree / wrong branch / missing milestone / tag conflict / missing version truth 的 refusal cases。
- 明确保留 `Confirmation Gate #1` 与 `Confirmation Gate #2`，并注明真实发布仍需显式 `/release v{X.Y}`。
- 如需要 discoverability note，只在 `docs/rules/release.md` 增加 adapter pointer，不去扩写 README / AI guide。

</specifics>

<deferred>
## Deferred Ideas

- Kimi runtime parity
- GitHub Actions publish polling / structured report
- release readiness CI / pre-release gate integration
- actual `/release v1.9` execution

</deferred>

---

*Phase: 38-codex-release-entry-surface*
*Context gathered: 2026-04-23 after reviewing release authority docs and existing Codex runtime setup paths*
