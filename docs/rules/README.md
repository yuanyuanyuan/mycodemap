# `docs/rules/` 速查索引

> 只保留会直接影响 agent / 人类开发行为的规则。每份文档都应短、可执行、可 grep。

## 先读哪份文档

| 场景 | 文档 | 主命令 |
|---|---|---|
| 改 TypeScript / Python 实现，担心触发红线 | `code-quality-redlines.md` | `npm run typecheck` / `npm run lint` |
| 改分层、依赖方向、模块边界 | `architecture-guardrails.md` | `node dist/cli/index.js deps -m "<module>"` |
| 改测试、fixture、测试文件布局 | `testing.md` | `npm test` |
| 改 hooks、CI、验证顺序、repo-local guardrail | `validation.md` | `npm run docs:check` / `python3 scripts/validate-rules.py code --report-only` |
| 改 agent 执行协议、CLI/CI 工程护栏 | `engineering-with-codex-openai.md` | `node dist/cli/index.js ci check-docs-sync` |
| 改发布/打包流程 | `deployment.md` | `npm run build` / `npm run validate-pack` |
| 改发布前 checklist / 版本同步 | `pre-release-checklist.md` | `npm run docs:check:pre-release` |

## 使用规则

- 入口文档先路由，再按需下钻；不要一次性读完整个 `docs/rules/`。
- 若规则变化会影响 agent 行为，同步检查 `AGENTS.md`、`CLAUDE.md`、`AI_GUIDE.md` 与相关 `docs/ai-guide/*.md`。
- 若规则来自代码事实，优先用 `package.json`、`.githooks/*`、`.github/workflows/*`、`scripts/*` 作为真相来源。
