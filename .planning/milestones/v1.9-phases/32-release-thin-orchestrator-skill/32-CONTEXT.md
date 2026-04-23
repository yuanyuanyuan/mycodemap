# Phase 32: Release thin orchestrator skill - Context

**Gathered:** 2026-04-22
**Status:** Ready for execution
**Depends on:** Phase 31 release governance contract

<domain>

## Phase Boundary

Phase 32 把 Phase 31 已锁定的 `/release` contract 落成 Claude runtime 可调用的 `.claude/skills/release/SKILL.md`。
它只实现 skill 层的步骤、拒绝条件、确认门与委托边界，不执行真实版本 bump、tag、push、npm publish 或 GitHub Release。

</domain>

<decisions>

## Implementation Decisions

### Thin Orchestration

- skill 必须复用 `docs/rules/release.md` 作为单一权威，而不是复制第二份发布手册
- skill 必须委托 `$gsd-complete-milestone`、`scripts/release.sh` 与 `.github/workflows/publish.yml`
- skill 不得把机械发布逻辑展开成新的实现

### Safety

- skill 必须显式声明 L3 边界
- skill 必须包含 **Confirmation Gate #1** 与 **Confirmation Gate #2**
- Gate #2 只接受明确的 `y` / `Y`
- `0.5.2-beta.1 → 1.9.0` 的 major jump 必须在 skill 内成为展示模板

### Runtime Truth

- 当前默认发布分支是 `main`
- 当前工作树检查使用 `git status --short`
- 本地 tag 冲突检查使用 `git tag -l "v{X.Y}.0"`
- docs guardrail 与 docs-sync 仍是 release readiness 的最低自动验证面

</decisions>

<canonical_refs>

## Canonical References

- `docs/rules/release.md`
- `docs/rules/deployment.md`
- `docs/rules/pre-release-checklist.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `package.json`
- `scripts/release.sh`
- `.github/workflows/publish.yml`

</canonical_refs>

<specifics>

## Specific Ideas

- 用“适用场景 / 绝对边界 / 先读事实 / 工作流 / 失败处理 / 禁止事项”来组织 skill
- 在 skill 中直接给出 Gate #1 / Gate #2 的模板文案
- 用 `rtk` 前缀展示 preflight 命令
- 明确 `scripts/release.sh` 自带确认提示，但它只是 helper 附加交互，不能替代 Gate #2

</specifics>

<deferred>

## Deferred Ideas

- 非 Claude runtime 的 release wrapper
- 自动轮询 GitHub Actions 发布状态
- 真实执行 release dogfood

</deferred>

---

*Phase: 32-release-thin-orchestrator-skill*
*Context gathered: 2026-04-22 after Phase 31 completion*
