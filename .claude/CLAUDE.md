# .claude/CLAUDE.md — Claude Adapter

> Claude Code 会自动读取本文件；它只负责把 Claude 连接到仓库里的**共享真相**。
> 本文件不是执行手册，也不是第二套规则入口。

## Authority Chain

1. `AGENTS.md` — 仓库级宪法与硬约束
2. 根 `CLAUDE.md` — 入口路由，告诉你下一步去哪读
3. 对应的 live docs — `docs/rules/*`、`AI_GUIDE.md`、`ARCHITECTURE.md`

## Claude-Specific Notes

- Claude 自动读取本文件，但**不应**把本文件当作最高权威；权威始终在 `AGENTS.md`。
- 若你需要执行协议、验证顺序、CLI/MCP 指南，请立即转到根 `CLAUDE.md` 提供的目标文档。
- 若未来确实需要写 Claude-only 说明，只能写**读取/装配差异**，不能复制通用工程政策。

## Go Next

- 需要仓库级约束 → `AGENTS.md`
- 需要路由到下一份文档 → `CLAUDE.md`
- 需要工程执行协议 → `docs/rules/engineering-with-codex-openai.md`
- 需要验证规则 → `docs/rules/validation.md`
- 需要产品 / CLI / MCP 使用指南 → `AI_GUIDE.md`

## Non-Goals

- 不在这里维护 TDD、commit、验证命令、交付 checklist、快速参考或任务模板。
- 不在这里维护第二套“Claude 专属规则正文”。
