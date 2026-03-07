# docs/ - 文档信息架构

本目录采用“入口文档短、细节文档分层”的结构。

## 目录职责

- `docs/rules/`：开发、测试、验证、发布规则。
- `docs/design-docs/`：设计文档、核心信念、验证状态。
- `docs/exec-plans/`：活跃计划、已完成计划、技术债跟踪。
- `docs/generated/`：生成内容与归档说明。
- `docs/product-specs/`：产品规格、用户场景、验收标准。
- `docs/references/`：外部参考、设计系统、工具链资料。

## 当前状态

- 设计文档已开始迁入 `docs/design-docs/`。
- 计划文档已开始迁入 `docs/exec-plans/`。
- `docs/` 根层仍保留部分操作指南、调试报告与历史文档。
- 新增内容优先写入分层目录，不再把新设计或新计划继续堆到根层。

## 建议阅读顺序

1. `../AGENTS.md`
2. `../CLAUDE.md`
3. `../ARCHITECTURE.md`
4. 与任务最相关的 `docs/rules/*`
5. 与任务最相关的 `docs/design-docs/*` / `docs/product-specs/*`
6. 如需过程信息，再看 `docs/exec-plans/*`

## 维护规则

- 入口文档只做导航，不复述大段细节。
- 规则进 `docs/rules/`，设计理由进 `docs/design-docs/`，计划进 `docs/exec-plans/`。
- 需求与验收进 `docs/product-specs/`，生成物说明进 `docs/generated/`，外部资料进 `docs/references/`。
- 若文档更新影响执行协议或入口路径，要同步检查 `AGENTS.md`、`CLAUDE.md`、`ARCHITECTURE.md`、`README.md`。
