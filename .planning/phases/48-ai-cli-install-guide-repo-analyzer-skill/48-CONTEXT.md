# Phase 48: AI CLI Install Guide + repo-analyzer Skill - Context

**Gathered:** 2026-05-01
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — design doc serves as full spec)

<domain>
## Phase Boundary

增强 mycodemap 的 AI CLI 安装引导体验，并新增基于 repo-analyzer 的深度架构分析技能。

**Scope:**
1. 在 `docs/AI_ASSISTANT_SETUP.md` 中增加 "AI CLI 一键安装引导" 章节
2. 在 `examples/claude/skills/mycodemap-repo-analyzer/` 下创建衍生 skill，基于 repo-analyzer 的 8 阶段流程，替换执行层面操作为 mycodemap CLI
3. 更新 `README.md` AI 文档索引章节增加新 skill 链接

**Out of scope:** 修改现有 codemap skill 内容、创建新的 CLI 命令、修改核心功能代码。

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — infrastructure phase. Use design doc `docs/plans/2026-04-30-install-guide-and-repo-analyzer-design.md` as the authoritative spec.

### File Placement
- Skill files go under `examples/claude/skills/mycodemap-repo-analyzer/` (parallel to existing `examples/claude/codemap-skill.md`)
- References copied from upstream repo-analyzer, unmodified
- README.md AI docs table gets one new row for the skill link

### Content Strategy
- Install guide is append-only to `docs/AI_ASSISTANT_SETUP.md` (new section before "参考")
- Skill is derivative of repo-analyzer with mycodemap CLI integration at stages 1/2/4/6/7
- Keep upstream references verbatim to minimize maintenance burden

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `examples/claude/codemap-skill.md` — existing basic skill template
- `.claude/skills/codemap/SKILL.md` — project-internal full skill (7.5K)
- `docs/AI_ASSISTANT_SETUP.md` — existing 17.2K AI assistant setup guide
- `README.md` — has AI docs index table at line 114-131

### Established Patterns
- Skill format: frontmatter with `name` and `description`, then Markdown body
- AI docs in README use emoji-prefixed table rows with relative links
- `docs:check` is the docs validation gate

### Integration Points
- `docs/AI_ASSISTANT_SETUP.md` — append new section before final "参考" section
- `README.md:129` — insert new row after `docs/AI_ASSISTANT_SETUP.md` entry
- `examples/claude/skills/mycodemap-repo-analyzer/` — new directory

</code_context>

<specifics>
## Specific Ideas

See design doc `docs/plans/2026-04-30-install-guide-and-repo-analyzer-design.md` for:
- Task 1: Directory structure + reference file copies from upstream
- Task 2: SKILL.md with mycodemap CLI integration (stages 1/2/4/6/7 modified)
- Task 3: AI_ASSISTANT_SETUP.md append with 7-step install guide + rules snippet
- Task 4: README.md one-row addition to AI docs table
- Task 5: End-to-end verification (docs:check, file structure, grep checks)

Upstream references to fetch via `gh api`:
- `yzddmr6/repo-analyzer/skills/repo-analyzer/references/analysis-guide.md`
- `yzddmr6/repo-analyzer/skills/repo-analyzer/references/module-analysis-guide.md`

</specifics>

<deferred>
## Deferred Ideas

None — design doc is comprehensive and stays within phase scope.
</deferred>
