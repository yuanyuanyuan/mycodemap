# Phase 33: Release validation and dry-run readiness - Context

**Gathered:** 2026-04-22
**Status:** Ready for execution
**Depends on:** Phase 32 release thin orchestrator skill

<domain>

## Phase Boundary

Phase 33 负责验证 release docs、routing 与 skill wiring 的可信度，并记录 failure rehearsal。
它不执行真实版本 bump、tag、push、npm publish 或 GitHub Release；只运行文档和状态层验证。

</domain>

<decisions>

## Verification Decisions

- 自动验证至少包含：`rtk proxy git diff --check`、`rtk npm run docs:check`、`rtk npm run docs:check:pre-release`、`rtk node dist/cli/index.js ci check-docs-sync`
- 需要记录至少三个失败场景：无 active/completed milestone、工作区不干净、major version jump
- 若验证发现 docs/skill 仍有主入口冲突，应优先修正文档真相，而不是在 verification 里“解释过去”

</decisions>

<canonical_refs>

## Canonical References

- `docs/rules/release.md`
- `docs/rules/deployment.md`
- `docs/rules/pre-release-checklist.md`
- `docs/rules/README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.claude/skills/release/SKILL.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/REQUIREMENTS.md`
- `package.json`
- `scripts/release.sh`
- `.github/workflows/publish.yml`

</canonical_refs>

<specifics>

## Specific Ideas

- 用真实 `git status --short` 证明当前工作树是 dirty，因此 `/release` 应拒绝继续
- 用 `package.json` 的 `0.5.2-beta.1` 与目标 `1.9.0` 证明 major jump 警告不是抽象要求
- 用 `git tag -l 'v1.9.0'` 结果记录当前 tag 冲突状态
- 用 verification report 汇总 docs / skill / routing / validation evidence

</specifics>

<deferred>

## Deferred Ideas

- 真实 `/release v1.9` dogfood
- GitHub Actions 轮询与结构化运行结果
- 非 Claude runtime 的 release wrapper 验证

</deferred>

---

*Phase: 33-release-validation-and-dry-run-readiness*
*Context gathered: 2026-04-22 after Phase 32 completion*
