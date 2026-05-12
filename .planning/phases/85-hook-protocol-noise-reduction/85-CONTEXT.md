# Phase 85 Context: Hook Protocol Noise Reduction

## Goal

在不削弱任何 commit guardrail 的前提下，继续把 hook 输出从“对人类友好的混合日志”压缩成“对 AI Agent 更稳定、低噪音、可恢复的控制协议”：补齐 protocol-only 模式、显式 log path、`not_applicable` 状态，以及 report-only rule validation 的低误导文案。

## Locked Scope

- 只处理 `scripts/hooks/templates/{pre-commit,commit-msg}`、managed copies `.mycodemap/hooks/{pre-commit,commit-msg}` 及最相关的 payload / smoke / workflow tests。
- 允许新增环境变量开关、protocol envelope 字段、status 细化、smoke runtime case。
- 不放宽任何 blocker，不引入 `--no-verify`、override bypass 或 repo-specific hidden behavior。
- 不扩展到新的 product surface；仍以 installable hook template 为主真相源。

## Must Stay True

- `CODEMAP_PROTOCOL_ONLY=1` 必须真正 suppress 人类日志，只保留 agent 需要的 protocol 输出。
- 机器协议必须始终保留可恢复路径；若 stdout 被截断，agent 仍能借助 `log_path` 找到完整 payload。
- `not_applicable` 只能表示“该检查当前不适用”，不能混淆 `blocked-by-*` 这类真正 skipped path。
- report-only rule validation 仍保持 non-blocking；只是文案和结构化状态更清楚，不能意外升级成 blocker。

## Relevant Code Facts

- `scripts/hooks/templates/pre-commit` 已有 `checks[]`、`attempt.log_path`、`resolution`、`rule metadata`，但输出仍同时混有人类日志和协议行。
- `scripts/hooks/templates/commit-msg` 已有 protocol parity，但缺少 `CODEMAP_PROTOCOL_ONLY` 和显式 `CODEMAP_PRECHECK_LOG_PATH`。
- `session-review` 中用户明确指出 `timed out after 20s` 可能触发 agent 的异常处理路径，并建议 `CODEMAP_PROTOCOL_ONLY=1`。
- `src/cli/init/__tests__/hook-payloads.test.ts` 与 `scripts/smoke-commit-hooks.sh` 已具备真实 commit blocker/pass harness，适合验证协议降噪不破坏行为。

## Success Criteria

1. `CODEMAP_PROTOCOL_ONLY=1` 时 hook 只输出 `CODEMAP_PRECHECK_LOG_PATH` 与 `CODEMAP_PRECHECK_PROTOCOL`
2. `checks[].status` 明确区分 `not_applicable` 与 `skipped`
3. report-only limit-reached 文案不再使用 `timed out`，协议细节里明确 `result=limit-reached` 且 `non_blocking=true`
4. payload test、workflow unittest、smoke commit 都覆盖到新 contract
