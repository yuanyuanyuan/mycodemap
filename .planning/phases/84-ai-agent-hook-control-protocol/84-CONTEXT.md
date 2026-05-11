# Phase 84 Context: AI Agent Hook Control Protocol

## Goal

在不放宽任何 guardrail、不断开 installable hook template 真相源、也不把规则退化成人类提示词的前提下，把 `git commit` 护栏升级为 **AI Agent 可直接消费的 fail-fast 控制协议**：`pre-commit` 和 `commit-msg` 都要输出统一、结构化、可恢复的 machine-readable route。

## Locked Scope

- 只处理 installable hook 真源 `scripts/hooks/templates/{pre-commit,commit-msg}`、managed copies `.mycodemap/hooks/{pre-commit,commit-msg}` 及其最相关测试/烟雾验证。
- 允许扩展 hook payload、attempt/context、rule metadata、structured resolution、real smoke coverage。
- 不新增 `--no-verify`、人工 override、隐藏 side channel、repo-specific prompt snippet。
- 不把 related tests 绑定到单一框架；模板必须继续支持不同项目技术栈的 generic fallback。
- 本次 phase 是 `between-milestones` 期间的 special follow-up，不打开新 milestone，也不重写 `v2.6` / `v2.7` 历史归档。

## Must Stay True

- O(1) 的硬门槛必须先于重型检查执行，避免 agent 先消耗测试/规则验证 token，最后才知道真正 blocker 是 staged file count。
- hook 输出必须同时对人类可读、对 agent 可机读，但 machine-readable protocol 才是权威恢复路线。
- `scripts/hooks/templates/*` 是安装/部署真源；managed copies 必须保持协议一致，不能只修当前仓库本地 hook。
- related test guidance 必须保持 framework-aware / fallback-safe，不能假设所有用户项目都用 `vitest`。
- `commit-msg` 不能再落后于 `pre-commit`；两者都要提供 `attempt_id`、`CODEMAP_AGENT_CONTEXT`、`checks[]`、`block.rule`、`resolution`、`next_action`。

## Relevant Code Facts

- `scripts/hooks/templates/pre-commit` 已承担 staged file limit、docs guardrail、related tests、repo-local rule validation 等主要 guardrail，但历史上输出仍混有人类语言和不一致格式。
- `scripts/hooks/templates/commit-msg` 之前缺少和 `pre-commit` 对齐的 protocol parity，agent 只能从自然语言报错里反推重写动作。
- `src/cli/init/__tests__/hook-payloads.test.ts` 已覆盖真实临时仓库 commit 阻断场景，适合锁定 protocol contract。
- `scripts/smoke-commit-hooks.sh` 已能执行真实 `git commit` case，是验证 fail-fast / blocker ordering / allowed-vs-blocked protocol 的最佳 smoke surface。
- `scripts/tests/test_rule_control_workflow.py` 已同时检查 template 与 managed hook copies，适合承接 installable-truth parity。

## Success Criteria

1. `pre-commit` 对 staged-file-limit 等 O(1) blocker fail fast，并输出 `codemap.precommit.v1`
2. `commit-msg` 输出对齐的 `codemap.commitmsg.v1`，让 agent 直接获得 `rewrite_commit_message` 路由
3. protocol 提供 `attempt_id`、`CODEMAP_AGENT_CONTEXT`、`checks[]`、`block.rule.defined_at`、`doc_ref`、`resolution` 与 `next_action`
4. related test remediation 保持 framework-aware / generic fallback，而不是硬编码到单一测试框架
5. 真源 template、managed hook copy、payload test、workflow test、real smoke commit 同时验证通过
