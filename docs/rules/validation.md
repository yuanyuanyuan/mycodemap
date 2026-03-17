# 验证规则

## 最小验证顺序

1. 先验证与你改动最相关的命令、测试或模块。
2. 若改动影响 agent 路由、CLI 示例、规则文档或测试事实，先执行 `npm run docs:check`。
3. 若改动同时影响 CLI 护栏入口，再补 `node dist/cli/index.js ci check-docs-sync`。
4. 再扩大到 `npm run typecheck`、`npm test`、`npm run lint`。
5. 涉及发布或打包时，再执行 `npm run build` 与 `npm run validate-pack`。

## 强约束

- 没有验证，不得声称“已解决”。
- 失败时优先修根因，不绕过护栏。
- 涉及 CI / hooks / 输出契约时，必须给出失败场景与修复验证证据。
- 严禁使用 `--no-verify`、禁用 hooks、删除检查项规避失败。

## 常用命令

```bash
npm run docs:check
node dist/cli/index.js ci check-docs-sync
npm run typecheck
npm test
npm run lint
npm run build
npm run validate-pack
```
