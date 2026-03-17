# 验证规则

## 最小验证顺序

1. 先验证与你改动最相关的命令、测试或模块。
2. 若改动影响 agent 路由、CLI 示例、规则文档或测试事实，先执行 `npm run docs:check`。
3. 若改动同时影响 CLI 护栏入口，再补 `node dist/cli/index.js ci check-docs-sync`。
4. 再扩大到 `npm run typecheck`、`npm run lint`、`npm test`。
5. 涉及发布或打包时，再执行 `npm run build` 与 `npm run validate-pack`。

## CI Gateway 验证流程

CI Gateway 已集成以下自动检查（按执行顺序）：

1. `npm run docs:check` - 文档护栏检查
2. `npm run typecheck` - TypeScript 类型检查
3. `npm run lint` - ESLint 代码质量检查（渐进式规则，0 error 通过）
4. `npm test` - 单元测试
5. `npm run build` - 构建验证
6. CLI 相关检查（commit 格式、文件头等）

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
