# docs/ - 文档信息架构

本目录采用“入口文档短、细节文档分层”的结构。

## 目录职责

- `docs/rules/`：开发、测试、验证、发布规则。
- `docs/design-docs/`：当前仍有效的设计文档。
- `docs/exec-plans/`：活跃计划、已完成计划、技术债跟踪。
- `docs/generated/`：生成内容与归档说明。
- `docs/product-specs/`：当前仍有效的产品规格与验收边界。
- `docs/references/`：外部参考、设计系统、工具链资料。
- `docs/archive/`：历史方案、迁移遗留、过期文档索引。

## 当前状态

- `docs/` 根层当前只保留仍在使用的操作指南：`AI_ASSISTANT_SETUP.md`、`SETUP_GUIDE.md`。
- 2026-03-15 已把历史重构设计、历史需求草稿、Go 支持计划和过期计划统一移入 `docs/archive/`。
- `docs/design-docs/` 与 `docs/product-specs/` 当前不再保留旧稿；历史内容请从 `docs/archive/README.md` 进入。
- 新增内容优先写入分层目录，不再把新设计或新计划继续堆到根层。

## 建议阅读顺序

1. `../AGENTS.md`
2. `../CLAUDE.md`
3. `../ARCHITECTURE.md`
4. 与任务最相关的 `docs/rules/*`
5. 与任务最相关的现行文档；如需历史背景，再看 `docs/archive/README.md`
6. 如需过程信息，再看 `docs/exec-plans/*`

## 维护规则

- 入口文档只做导航，不复述大段细节。
- 规则进 `docs/rules/`，设计理由进 `docs/design-docs/`，计划进 `docs/exec-plans/`。
- 需求与验收进 `docs/product-specs/`，生成物说明进 `docs/generated/`，外部资料进 `docs/references/`。
- 历史文档进入 `docs/archive/`，并补全归档时间、归档原因、当前依据。
- 若文档更新影响执行协议或入口路径，要同步检查 `AGENTS.md`、`CLAUDE.md`、`ARCHITECTURE.md`、`README.md`。
