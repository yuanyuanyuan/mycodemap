# 03-03 Summary

## 完成内容
- 新增 `src/cli/commands/__tests__/analyze-command.test.ts`，为 public `find/read/link/show`、legacy compat warning，以及 `E0001_INVALID_INTENT` / `E0002_MISSING_REQUIRED_PARAM` 建立专门回归测试。
- 把 `README.md`、`AI_GUIDE.md`、`CLAUDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/ai-guide/OUTPUT.md`、`docs/rules/engineering-with-codex-openai.md` 的 `analyze` 事实统一切到四意图契约，并明确 legacy alias / `warnings[]` / `E0001_INVALID_INTENT` 的当前现实。
- 更新 `scripts/validate-docs.js` 与 `src/cli/__tests__/validate-docs-script.test.ts`，让 docs guardrail 改为校验四意图示例、新 schema 与 legacy warning 事实，并在旧 8-intent 示例或旧 schema 被写回时直接失败。
- 后续补丁修复 `parseAnalyzeArgs()` 把 `parseArgs({ argv })` 误写成非标准字段的问题，恢复 direct-call / 单测 / CLI 进程对传入参数的稳定解析。
- 再后续补丁新增 `src/cli/commands/analyze-options.ts`，把 `Commander 注册`、`parseArgs options` 与手写 help 文案的 option schema 收口到同一来源，减少 `help / parse / 测试` 的事实重复。
- 再再后续补丁把手写 `printHelp()` 中的 analyze 示例列表也收口到共享常量，并新增 help 输出回归测试，避免示例文本单独漂移。
- 最后续补丁把 `Commander --help` 与 `analyzeCommand()` 无参数路径统一到同一份 Commander help 信息，并校准空行差异，确保两条路径输出完全一致。

## 验证
- `pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts`
- `pnpm exec vitest run src/cli/__tests__/validate-docs-script.test.ts`
- `pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts src/cli/__tests__/validate-docs-script.test.ts`
- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`
- `node dist/cli/index.js analyze --help`
- `npm run build`
- `node dist/cli/index.js analyze --intent refactor --targets src/cache`
- `node dist/cli/index.js analyze --intent read`
- `node dist/cli/index.js analyze --help`
- `pnpm exec vitest run src/cli/commands/__tests__/analyze-command.test.ts`
- `node dist/cli/index.js analyze`
- `diff -u /tmp/analyze-noarg.out /tmp/analyze-help2.out`

## 失败场景预演
- 若 README / AI 文档重新写回 `impact/dependency/overview/...` 等旧 analyze 示例，`scripts/validate-docs.js` 会直接失败，避免旧 8-intent 事实再次漂移进主文档。
- 若 `OUTPUT.md` 重新写回旧 intent union，而不再记录 `warnings[]` / `analysis`，docs guardrail 测试会失败，防止 machine-readable schema 再次倒退。

## 剩余风险
- 当前 `analyze` 的 option / 示例 / help 主体已收口；剩余可选优化主要是是否把 README / docs 中的 CLI 示例也进一步自动生成，但这已超出本 phase 的最小修复范围。
