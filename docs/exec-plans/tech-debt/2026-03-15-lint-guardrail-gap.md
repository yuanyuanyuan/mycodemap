# 2026-03-15 lint 护栏缺口

## 目标

- 记录当前仓库 `lint` 护栏无法纳入 CI Gateway 的根因、风险与后续 DoD。

## 限制条件

- 当前任务聚焦 CLI / CI 护栏最小可用落地，不能为了让 `npm run lint` 通过而一次性清洗全仓历史问题。
- 不能通过删除 `lint` 脚本、关闭检查或跳过 CI 来伪造“已解决”。

## 现状证据

- `package.json:25` 已声明 `npm run lint`，命令为 `eslint src --ext .ts`。
- `docs/rules/validation.md:8` 把 `npm run lint` 列为扩大量级验证的一部分。
- `CLAUDE.md:40` 与 `docs/design-docs/PUBLISH_NPM_DESIGN_FINAL.md:256` 都把 lint 视为仓库应有护栏。
- `npm run lint` 在 2026-03-15 的本轮验证中直接失败，错误为“ESLint couldn't find a configuration file”。
- 试跑一个临时 `eslint:recommended + plugin:@typescript-eslint/recommended` 配置后，仓库会暴露 249 个现存错误，说明问题不是单个命令参数，而是“缺配置 + 历史债务”叠加。

## 风险模式

- 若继续把 `lint` 留在文档里、却不让 CI 真正执行，团队会误以为仓库已有静态质量护栏。
- 若仓促接入推荐规则，CI 会被 180+ 到 249 个现存问题直接打红，阻断正常迭代。

## 后续 DoD

- 明确 ESLint 目标基线：只做 parser/syntax guardrail，还是逐步引入可修复规则集。
- 落地正式 ESLint 配置文件，并让 `npm run lint` 在当前仓库稳定通过。
- 把 `npm run lint` 纳入 `.github/workflows/ci-gateway.yml`，并补一条对应的失败回归测试或文档护栏。
- 同步 `README.md`、`docs/SETUP_GUIDE.md`、`docs/rules/validation.md` 中的验证顺序说明，避免再次漂移。
