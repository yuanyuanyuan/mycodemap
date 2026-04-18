# 验证规则

> 原则：先跑最相关检查，再扩大范围；没有验证，不得声称“已解决”。

## 最小验证顺序

| 场景 | 先跑什么 | 为什么 |
|---|---|---|
| 改 rules / CLAUDE / README / AI 文档 / 测试事实 | `npm run docs:check` | 先挡住文档漂移 |
| 改 repo-local 规则控制脚本或 hook 路由 | `python3 scripts/validate-rules.py code --report-only` | 先看 contract，不先硬阻断 |
| 改 CLI 文档入口或统一 guardrail | `node dist/cli/index.js ci check-docs-sync` | 同时验证 docs guardrail 与 analyze generated block |
| 改实现代码 | `npm run typecheck` → `npm run lint` → `npm test` | 从最小相关验证扩到基础回归 |
| 改发布/打包边界 | `npm run build` → `npm run validate-pack` | 确认 shipped artifact 仍成立 |

## Repo-local rule validator

### `validate-rules.py` exit-code 表

| 命令 | 退出码 | 含义 | 默认动作 |
|---|---:|---|---|
| `python3 scripts/validate-rules.py code --report-only` | `0` | pass / report-only | 只报告，不阻断 |
| `python3 scripts/validate-rules.py code` | `1` | `P0` | blocker |
| `python3 scripts/validate-rules.py code` | `2` | `P1` | warn-only |
| `python3 scripts/validate-rules.py code` | `3` | `P2` | notice-only |
| `python3 scripts/validate-rules.py code` | `4` | `unavailable` | 依赖缺失，必须显式处理 |

### 当前默认值

- `.claude/rule-system.config.json` 默认开启 `enabled: true` 与 `route_by_edit_path: true`。
- `soft_gate.change_analyzer` 默认开启；`hard_gate.mode` 默认是 `report-only`。
- 本阶段默认 contract 是“先报告、再决定是否强阻断”，不要把 report-only 误写成 enforce。

## CI Gateway 真实顺序

当前 CI Gateway 直接执行 `check-docs-sync`、commit 格式、文件头、risk、output contract；`ship` 的本地 CHECK 阶段复用 `check-working-tree`、`check-branch`、`check-scripts`。

| 顺序 | 命令 | 说明 |
|---|---|---|
| 1 | `npm run docs:check` | 文档护栏 |
| 2 | `npm run typecheck` | 类型检查 |
| 3 | `npm run lint` | lint |
| 4 | `npm test` | 单元测试 |
| 5 | `npm run build` | 构建验证 |
| 6 | `node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10` | 设计 contract 校准；`changed files <= 10` 才可能进入 hard gate |
| 7 | `node dist/cli/index.js check --contract mycodemap.design.md --against src --base origin/main --annotation-format github` | PR 注解与 contract gate |
| 8 | `node dist/cli/index.js ci check-docs-sync` | 统一 docs/AI guardrail |
| 9 | `node dist/cli/index.js ci assess-risk --threshold=0.7` | 风险评估 |

> PR 超窗、`diff-scope-fallback` 或 `false-positive rate >10%` 时，workflow 必须明确标为 `warn-only / fallback`。

## 需要特别补跑的场景

- 若改动涉及 `mycodemap.config.json.storage` 或图数据库适配器，至少补跑对应 storage adapter 定点测试，并确认 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/SETUP_GUIDE.md`、`mycodemap.config.schema.json` 与 guardrail 脚本同步。
- 若改动涉及 `check` / `ci assess-risk` / `history` / `analyze --include-git-history` 的统一 risk truth，至少补跑 `node dist/cli/index.js history --symbol createCheckCommand`、`node scripts/report-high-risk-files.mjs --top 3`、`npm run build`。
- 若改动涉及产品定位、输出契约、共享文件发现规则或 `Server Layer` / `mycodemap server` 边界，确认 README、AI 文档、架构文档和 guardrail 脚本使用同一套措辞。

## Design / Contract gate 速记

- 当前 canonical 设计链保持为 `design validate` / `design map` / `design handoff` / `design verify`，不要把 `workflow`、CI 或 ship 步骤混写进这条产品契约链。
- 需要验证完整链路时，直接运行 `design validate → design map → design handoff → design verify`。
- 常用命令：
  - `node dist/cli/index.js design validate mycodemap.design.md --json`
  - `node dist/cli/index.js design map mycodemap.design.md --json`
  - `node dist/cli/index.js design handoff mycodemap.design.md --json`
  - `node dist/cli/index.js design verify mycodemap.design.md --json`
  - `node dist/cli/index.js check --contract mycodemap.design.md --against src`
  - 裸 contract gate 片段必须保持为 `check --contract mycodemap.design.md --against src`
  - PR 路径必须显式使用 `github.event.pull_request.base.sha`
- `review-needed 与 blocker 退出语义` 必须分开写；`review-needed` 不是 blocker。

## 典型失败模式

| 失败模式 | 先看哪里 | 恢复方式 |
|---|---|---|
| `schema / README / AI 文档没同步` | `npm run docs:check` | 先修文档真相，再重跑 |
| 文档继续把历史设计写成当前现实 | `npm run docs:check` | 把 shipped baseline 与 future intent 分开 |
| 旧的 `neo4j` / `kuzudb` 配置已经不受支持，但文档还把它写成正式 backend | `README.md` / `AI_GUIDE.md` / schema | 改回 `filesystem` / `sqlite` / `memory` / `auto` 真实 contract |
| `storage.type="sqlite"` 运行时不满足要求 | Node.js `>=20`、`better-sqlite3`、`STORAGE_BACKEND_MIGRATED`、`SQLITE_NOT_AVAILABLE` | 修运行时或改配置，不要静默 fallback |
| 风险 truth 漂移 | `check` / `ci assess-risk` / `history` / `analyze --include-git-history` | 统一命令输出与文档措辞 |
| 把 `workflow` 写回非 analysis-only | `docs/rules/engineering-with-codex-openai.md` / README | 收敛回 `find → read → link → show` |
| 文档声称扫描类命令会尊重 `.gitignore`，但实现仍保留手写跳过规则 | `node dist/cli/index.js ci check-docs-sync` | 改回共享文件发现 contract，再重跑 docs guardrail |
| 把 `workflow` 重新扩回非分析阶段，却没同步 README / AI 命令文档 / guardrail 脚本 | `npm run docs:check` | 收敛回 analysis-only 边界，再同步文档 |

## 常用命令

```bash
python3 scripts/validate-rules.py code --report-only
npm run docs:check
node dist/cli/index.js ci check-docs-sync
node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10
node dist/cli/index.js check --contract mycodemap.design.md --against src
node dist/cli/index.js check --contract mycodemap.design.md --against src --base origin/main --annotation-format github
node dist/cli/index.js history --symbol createCheckCommand
node scripts/report-high-risk-files.mjs --top 3
npm run typecheck
npm run lint
npm test
npm run build
npm run validate-pack
```

## Rule Control QA

| 命令 | 目的 |
|---|---|
| `bash scripts/qa-rule-control.sh --scenario all` | 一键覆盖 capability、P0/P1/unavailable、disabled soft gate、rule-context、CI backstop 七个场景 |
| `python3 -m unittest scripts/tests/test_rule_control_workflow.py` | 锁住 helper scope、workflow `<rule_context>` 注入和 CI backstop 文本契约 |

## 强约束

- 没有验证，不得声称“已解决”。
- 失败时优先修根因，不绕过护栏。
- 涉及 CI / hooks / 输出契约时，必须给出失败场景与修复验证证据。
- 不得把 `warn-only / fallback` 伪装成 hard gate success。
