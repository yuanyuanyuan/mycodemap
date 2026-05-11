# Phase 84 Research: Why Human-Readable Hooks Were Not Enough

## Evidence Inputs

- `/data/codemap/session-review/session-retrospective.md`
- `/data/codemap/session-review/execution-timeline.md`
- 用户 2026-05-12 的 AI Agent 视角反馈：当前 hook 仍是“人类可读阻断通知”，不是“机器可执行控制协议”
- repo truth in `scripts/hooks/templates/*`, `src/cli/init/__tests__/hook-payloads.test.ts`, `scripts/smoke-commit-hooks.sh`, `scripts/tests/test_rule_control_workflow.py`

## Findings

### 1. Fail-fast ordering was incomplete

- `session-review/session-retrospective.md` 证明 staged file count limit 是真实高频 blocker。
- 用户反馈指出：如果 `staged-file-limit` 这种 O(1) 条件放在重型测试和 20s rule validation 后面，agent 会先浪费时间和 token，再发现真正问题只是需要 split commit。
- 结论：硬门槛必须前置，尤其是 `staged-file-limit`、docs guardrail trigger scan、header presence 等 cheap checks。

### 2. Natural-language FIX lines still forced agent-side translation

- 用户明确指出 `"Split the staged changes into smaller commits, then retry."` 仍然需要 agent 自己推导 `git reset HEAD`、分组方案、重试顺序与 commit message。
- 结论：需要结构化 `resolution.type`、`suggested_groups`、`verify_commands`、`reset_command`、`commit_with_context`，把“自然语言提示”升级成“可执行路由”。

### 3. Mixed output formats increased parsing cost

- 用户反馈同一次 pre-commit 内同时看到 `Tests passed`、`INFO` timeout、`WARNING`、最终 `ERROR` block，多套格式迫使 agent 写适配器。
- 结论：所有 blocker/pass path 都必须统一回收到 `CODEMAP_PRECHECK_PROTOCOL:<json>`，并让 `checks[]` 成为权威状态数组。

### 4. Commit-msg parity was missing

- 之前真正结构化的只有 `pre-commit` 改造；但 commit 失败常常发生在 `commit-msg` 阶段，例如 `[TAG] scope: message` 格式错误。
- 结论：`commit-msg` 也必须提供 schema、checks、rule metadata、resolution、attempt context，不能让 agent在第二个 hook 上回到纯自然语言模式。

### 5. Template truth mattered more than local patching

- 用户特别要求：不能只改当前项目的 `.mycodemap/hooks/pre-commit`，必须考虑“别人安装 mycodemap 后也能拿到这些 guardrail 和提示”。
- 结论：`scripts/hooks/templates/*` 必须是主改动面；managed copies 只作为 parity evidence，不得反客为主。

### 6. Testing guidance had to stay framework-agnostic

- 用户指出并不是每个项目都有 `vitest`；hook 不能把 verify route 写死为单仓库技术栈。
- 结论：related tests 只能输出 repo-detected test strategy、generic `verify_commands` 与 package/framework fallback；当前仓库虽然用 `vitest` 测 payload，但模板 contract 必须继续支持 `package-test` / `pytest` / `go test ./...` / `cargo test`。

## Design Decisions

1. 以 `CODEMAP_PRECHECK_PROTOCOL` 为统一 machine-readable envelope，而不是为每条规则发明新的 side channel
2. `pre-commit` 与 `commit-msg` 分别使用 `codemap.precommit.v1` 与 `codemap.commitmsg.v1`，但字段结构保持强一致
3. 用 `attempt_id` + `CODEMAP_AGENT_CONTEXT` + per-attempt log 路径补上 agent retry / state restore 线索
4. 继续保留人类可读 banner，但它只是解释层；agent 应优先消费 protocol JSON
5. 相关测试验证采用“双轨”：
   - contract test: payload shape、rule metadata、resolution route
   - real smoke: 真实 `git commit` blocker/pass path

## Non-Goals

- 不新增“允许 human override”的后门
- 不把 report-only timeout 升级成 hard blocker
- 不为单仓库测试框架写死 special-case prompt
- 不开启新的 product milestone；这是 between-milestones hardening follow-up
