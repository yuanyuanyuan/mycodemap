# docs/archive/

本目录存放历史文档、迁移遗留和过期方案。这里的内容只用于复盘与对照，不作为当前执行依据。

## 使用规则

- 归档文档必须写明：归档时间、归档原因、当前依据、状态。
- 当前事实优先顺序：`AGENTS.md` -> `CLAUDE.md` -> `ARCHITECTURE.md` -> `docs/rules/` -> `docs/exec-plans/` -> 代码与配置事实。
- 如果需要重启旧方案，不直接“复活”归档文档，而是在现行目录重新建文档并按当前模板收敛。

## 归档索引

| 文件 | 归档时间 | 归档原因 | 当前依据 |
|---|---|---|---|
| `AI_INTEGRATION_GUIDE_ARCHIVED.md` | 2026-03-15 | 旧版 AI 集成指南，被当前统一指南替代 | `docs/AI_ASSISTANT_SETUP.md` |
| `MYCLAUDE_GUIDE.md` | 2026-03-15 | 外部工具调研笔记，非当前仓库规则 | `docs/references/README.md` |
| `PUBLISH_NPM_DESIGN_V1.md` | 2026-03-15 | 历史发布草案 | `docs/rules/deployment.md`、`package.json` |
| `PUBLISH_NPM_DESIGN_V2.md` | 2026-03-15 | 历史发布草案 | `docs/rules/deployment.md`、`package.json` |
| `TASK_DESIGN_COVERAGE_REPORT.md` | 2026-03-15 | 历史覆盖率报告，部分结论已过期 | `docs/exec-plans/completed/2026-03-03-post-task-plan.md`、`src/cli/commands/workflow.ts` |
| `design-docs/CI_GATEWAY_DESIGN.md` | 2026-03-15 | 历史 CI 设计稿 | `docs/rules/engineering-with-codex-openai.md`、`.github/workflows/ci-gateway.yml` |
| `design-docs/PUBLISH_NPM_DESIGN_FINAL.md` | 2026-03-15 | 历史迁移设计稿 | `docs/rules/deployment.md`、`.github/workflows/publish.yml` |
| `design-docs/REFACTOR_ARCHITECTURE_OVERVIEW.md` | 2026-03-15 | 历史重构概要设计，状态冲突 | `ARCHITECTURE.md`、`src/cli/commands/workflow.ts` |
| `design-docs/REFACTOR_CONFIDENCE_DESIGN.md` | 2026-03-15 | 历史置信度设计稿，结构已偏离实现 | `src/orchestrator/confidence.ts`、`src/orchestrator/types.ts` |
| `design-docs/REFACTOR_GIT_ANALYZER_DESIGN.md` | 2026-03-15 | 历史 Git 分析设计稿 | `src/orchestrator/git-analyzer.ts`、`docs/rules/engineering-with-codex-openai.md` |
| `design-docs/REFACTOR_ORCHESTRATOR_DESIGN.md` | 2026-03-15 | 历史编排设计稿，仍混入规划态与旧路径 | `src/cli/commands/workflow.ts`、`src/orchestrator/workflow/` |
| `design-docs/REFACTOR_RESULT_FUSION_DESIGN.md` | 2026-03-15 | 历史结果融合设计稿 | `src/orchestrator/result-fusion.ts`、`src/orchestrator/types.ts` |
| `design-docs/REFACTOR_TEST_LINKER_DESIGN.md` | 2026-03-15 | 历史测试关联设计稿 | `docs/rules/testing.md`、`src/orchestrator/test-linker.ts` |
| `plans/2026-03-14-go-language-support-design.md` | 2026-03-15 | 迁移遗留计划，原目录已废弃且方案未落地 | `docs/exec-plans/README.md` |
| `product-specs/REFACTOR_REQUIREMENTS.md` | 2026-03-15 | 历史需求草稿，状态仍为待实施 | `ARCHITECTURE.md`、`docs/rules/*`、`src/cli/index.ts` |
