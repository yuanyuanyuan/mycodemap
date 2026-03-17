# docs/exec-plans/

本目录存放执行计划与落地过程，不存放长期稳定规则。

## 当前结构

- `active/`：当前活跃计划
- `completed/`：已完成或已归档的历史计划
- `tech-debt/`：技术债、待处理项、批量修复清单

## 当前状态

- `active/` 当前为空，后续进行中的计划应写入这里。
- `completed/` 当前包含：
  - `2026-03-03-deps-path-extension-fix.md`
  - `2026-03-03-post-task-plan.md`
- `tech-debt/` 当前包含：
  - `2026-03-15-lint-guardrail-gap.md`

## 写作边界

- 计划要写目标、限制、DoD、依赖、风险。
- 复盘要写实际结果、偏差、残留问题。
- 技术债要可排序、可追踪、可关闭。

## 迁移说明

- 旧 `docs/plans/` 已停止作为新增计划入口；历史文件已迁入 `docs/archive/plans/`。
- 新计划优先写入本目录；不要在 `docs/` 根层或其他自定义目录另开平行计划线。
