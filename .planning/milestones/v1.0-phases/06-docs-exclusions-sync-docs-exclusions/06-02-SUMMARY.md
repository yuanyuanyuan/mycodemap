# 06-02 Summary

## 完成内容

- README 补齐共享 `.gitignore` 感知发现契约，并把默认 `exclude` 修正为真实递归模式。
- `AI_GUIDE.md` / `docs/ai-guide/COMMANDS.md` / `docs/ai-guide/OUTPUT.md` 新增或强化了文件发现契约、workflow 四阶段与 ship 复用 ci gate checks 的说明。
- `docs/rules/engineering-with-codex-openai.md` 与 `docs/rules/validation.md` 改写为“ci-gateway 当前直接执行哪些检查、哪些 gate checks 由 ship 复用”的真实边界。

## 验证

- `npm run docs:check`
- `node dist/cli/index.js ci check-docs-sync`

## 失败场景预演

- 若 README / AI docs 重新把 workflow 扩回实现型阶段，docs guardrail 将失败。
- 若规则文档继续把 `check-working-tree` / `check-branch` / `check-scripts` 误写成 ci-gateway 当前直接执行项，文档与仓库 workflow 会再次分叉。

## 剩余风险

- 文档已经同步，但还需要脚本和测试把这些事实编码化；留给 `06-03` 收口。
