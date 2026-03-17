# 基于 Codex 的工程落地规则

> 目标：把 OpenAI《Engineering with Codex》里的高信号原则，转成当前 CodeMap 仓库可执行的开发与交付规则。
> 适用范围：本仓库内使用 Codex / Claude / 其他 agent 进行分析、修改、验证、提交流程。

## 1. 先说边界

- 本项目当前主要交付形态是 npm 包与 CLI，不是长期运行的 Web 服务。
- 因此这里强调的是 `CLI` / `CI` 护栏，而不是 preview 环境或部署沙箱。
- 涉及长期稳定知识时，优先写入仓库文档与生成物；不要把关键约束留在聊天记录、口头约定或临时笔记里。

## 2. 核心原则

- 人类掌舵，agent 执行：人类负责定义目标、限制、DoD、依赖和验收；agent 负责检索、实现、验证和补文档。
- 地图优于手册：入口文档保持短小，只做路由；细节下沉到 `ARCHITECTURE.md`、`docs/rules/`、`docs/design-docs/`、`docs/exec-plans/`。
- 仓库是记录系统：规则、设计权衡、执行计划、生成产物、失败复盘都应进入版本控制。
- 检索优先于记忆：优先使用 `node dist/cli/index.js query|analyze|deps|impact` 获取事实，再回退到 `rg`、`find`、直接读文件。
- 规则优先编码：重复出现的评审意见、输出约束、结构边界，优先落为 CLI 子命令、hook、CI 检查或生成契约，而不是停留在 prose。

## 3. 当前项目的 CLI 护栏

- 仓库内调试与验证优先使用 `node dist/cli/index.js <command>`，因为当前真实 CLI 入口是 `dist/cli/index.js`。
- 需求澄清、影响分析、引用定位优先走 `query`、`analyze`、`deps`、`impact`，不要直接全仓漫游。
- 修改 `analyze`、`query`、`ci`、`workflow` 等高影响命令时，至少验证：
  - `--help` 输出与文档示例一致；
  - 受影响的真实子命令可以在当前仓库运行；
  - 若涉及机器输出，`--output-mode machine --json` 仍保持纯 JSON 契约。
- 若改动会影响 agent 执行手册、README 示例、测试事实或入口路由，先执行 `npm run docs:check`。
- 若希望通过统一 CLI 护栏入口执行同一检查，使用 `node dist/cli/index.js ci check-docs-sync`。
- 涉及发布边界时，再补 `npm run build` 与 `npm run validate-pack`；不要把本地临时产物当成发布事实。

## 4. 当前项目的 CI 护栏

- 本地护栏：
  - `.githooks/pre-commit` 会执行变更相关测试、文件头检查，并尝试生成 AI feed。
  - 当变更涉及 README、`docs/`、CLI 入口、测试配置或 CI 配置时，`.githooks/pre-commit` 还会执行 `npm run docs:check`。
  - `.githooks/commit-msg` 会校验 `[TAG] scope: message` 格式与单次 commit 文件数量。
- 服务端护栏：
  - `.github/workflows/ci-gateway.yml` 会执行 `npm run docs:check`、`npm run typecheck`、`npm test`、`npm run build`，然后再通过 `node dist/cli/index.js ci ...` 执行 `check-docs-sync`、`check-commits`、`check-commit-size`、`check-headers`、`assess-risk`、`check-output-contract` 与 AI feed 同步检查。
  - `.github/workflows/publish.yml` 会在发布前执行 `npm test` 与 `npm run build`。
- 仓库协议仍然禁止通过 `--no-verify`、关闭 hook、放宽阈值、删除检查项来“修复”问题。

## 5. 文档与知识落点

- 规则变化：写入 `docs/rules/`
- 设计权衡：写入 `docs/design-docs/`
- 执行计划、复盘、技术债：写入 `docs/exec-plans/`
- 生成物、快照、报告：写入 `docs/generated/`
- 外部资料摘要：写入 `docs/references/`

如果一次任务无法在 1 天内稳定完成，先拆成更小的执行单元；复杂任务的过程信息不要只留在对话里。

## 6. 失败预演

至少预演一个失败模式，而不是只验证 happy path。当前仓库已经出现过两类高信号风险：

- 文档漂移：例如测试规则曾与真实 `vitest.config.ts` 不一致，导致 agent 按旧规则执行错误命令。
- 文档检索盲区：当 `analyze documentation` 无法命中文档时，agent 需要立即回退到 `rg` / 直接读文件，并在适用时记录 CodeMap 缺陷，而不是假装“没问题”。

## 7. 最小交付清单

每次 agent 交付至少要说明：

- 改了什么；
- 为什么改；
- 按什么护栏验证；
- 失败场景或风险模式是什么；
- 是否需要同步 `AGENTS.md`、`CLAUDE.md`、`README.md`、`ARCHITECTURE.md`、相关 `docs/*`。

## 8. 参考来源

- OpenAI Engineering: https://openai.com/engineering/codex/
- 仓库入口协议：`AGENTS.md`
- 最小执行手册：`CLAUDE.md`
- 架构地图：`ARCHITECTURE.md`
- 当前验证规则：`docs/rules/validation.md`
- 当前发布规则：`docs/rules/deployment.md`
