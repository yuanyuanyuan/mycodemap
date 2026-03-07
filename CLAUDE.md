# CLAUDE.md - CodeMap 执行清单

本文件提供给 Claude / Codex 一份最小可执行手册；仓库级硬约束以 `AGENTS.md` 为准。

## 1. 先读顺序

1. 离目标文件最近的 `AGENTS.md`
2. 根目录 `AGENTS.md`
3. 本文件 `CLAUDE.md`
4. `ARCHITECTURE.md`
5. `docs/rules/`、`docs/design-docs/`、`docs/exec-plans/` 中与任务最相关的文档
6. 代码、测试、配置与 Git 事实

当前主文档结构已落地，但仍有少量操作指南与历史文档保留在 `docs/` 根层；出现路径冲突时，以仓库当前可读文件为准。

## 2. 开始执行前的 5 步

- 用一句话复述目标、限制、DoD、依赖；若用户已确认，可直接继续。
- 圈定最可能受影响的模块、文件与验证范围。
- 优先使用 CodeMap CLI 做检索与影响分析。
- 先决定最小验证方案，再开始编辑。
- 只读取当前任务需要的事实，避免无边界探索。

## 3. 检索优先级

- 首选：`node dist/cli/index.js query -s "<symbol>"`
- 首选：`node dist/cli/index.js query -m "<module>"`
- 首选：`node dist/cli/index.js deps -m "<module>"`
- 首选：`node dist/cli/index.js impact -f "<file>"`
- 首选：`node dist/cli/index.js analyze <intent>`
- 回退：`rg -n`、`find`、直接读文件

若 CodeMap 失效或结果不足，记录问题并继续任务；不要因为工具问题卡死交付。

## 4. 实际可用命令

- 构建：`npm run build`
- 类型检查：`npm run typecheck`
- 测试：`npm test`
- 代码检查：`npm run lint`
- CLI 入口：`node dist/cli/index.js <command>`

注意：当前仓库真实输出目录是 `dist/`，不是 `build/`。

## 5. 改动策略

- 先做最小改动，再考虑扩展；优先根因修复。
- 不顺手修无关问题；发现额外问题可记录，但不要混入当前补丁。
- 保持现有风格与命名约定；不要在文档入口重复堆砌细节。
- 修改 TypeScript 非测试文件时，注意 `[META]` 与 `[WHY]` 文件头要求。
- 改动规则、设计、输出契约时，先判断是否需要同步相关 docs。

## 6. 验证策略

- 先跑最小相关验证，再扩大到更广的检查。
- 没有验证就不要声称“已解决”；若无法验证，必须说清阻塞点。
- 每次任务至少给出 1 个失败场景或具体风险模式。
- 涉及 CI / hooks / 提交规则时，必须给出失败场景与修复验证证据。
- 严禁通过 `--no-verify`、禁用 hooks、删除检查来规避失败。

## 7. 回复协议

- 每条关键信息用 `[证据]`、`[推论]`、`[假设]`、`[观点]` 标记。
- 仓库事实引用格式：`path:line`。
- 外部事实引用格式：URL。
- 不确定内容只能标 `[假设]`。
- 回答应优先短、准、可执行，避免重复粘贴大段项目百科。

## 8. 交付清单

- 说明修改了哪些文件。
- 说明这样改的原因与边界。
- 说明执行了哪些验证，结果如何。
- 说明尚存风险或未验证项。
- 明确判断是否需要同步 `AGENTS.md`、`CLAUDE.md`、`README.md`、`ARCHITECTURE.md`、相关 `docs/*`。

## 9. 这份文件不该再承载什么

- 不再承载完整项目百科。
- 不再内嵌大段配置样例或问题模板。
- 不再重复 `AGENTS.md` 已经定义的强约束。
- 不再把设计文档、执行计划、产品规格写回入口文件。

当入口文档再次膨胀时，应把知识下沉到 `ARCHITECTURE.md` 或相应 `docs/*`，并把这里恢复为高信号摘要。
