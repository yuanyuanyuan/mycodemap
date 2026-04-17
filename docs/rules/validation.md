# 验证规则

## 最小验证顺序

1. 先验证与你改动最相关的命令、测试或模块。
2. 若改动影响 agent 路由、CLI 示例、规则文档或测试事实，先执行 `npm run docs:check`。
3. 若改动同时影响 CLI 护栏入口，再补 `node dist/cli/index.js ci check-docs-sync`；该命令会串联 docs guardrail 与 analyze generated block 校验。
4. 若改动涉及 `design validate` / `design map` / `design handoff` / `design verify` / `check` 链路，确认 README、AI 文档、`docs/rules/*` 与 `scripts/validate-docs.js` 同步到同一条链，并显式区分 review-needed / blocker / `severity:error` 退出语义。
5. 当前 canonical 设计链保持为 `design validate → design map → design handoff → design verify`，不要把 `workflow`、CI 或 ship 步骤混写进这条产品契约链。
6. 若改动涉及 repo-root `mycodemap.design.md` 或 contract gate，至少补跑 `node dist/cli/index.js check --contract mycodemap.design.md --against src`；PR 路径要验证 `--annotation-format github` + `github.event.pull_request.base.sha`，并补跑 `node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10`。
7. 若改动涉及 `analyze` canonical 示例、选项表或 `AI_GUIDE.md` 速查模板，优先用 `node scripts/sync-analyze-docs.js --check` 直接定位 generated block 漂移。
8. 若改动涉及产品定位、输出契约、共享文件发现规则或 `Server Layer` / `mycodemap server` 边界，确认 README、AI 文档、架构文档和 guardrail 脚本使用同一套措辞。
9. 若改动涉及 `docs/product-specs/*` 的现行规格，确认 `docs/product-specs/README.md`、相关规格文档与 `scripts/validate-docs.js` 同步；当前 docs guardrail 会显式校验 MVP3 三份架构规格的 shipped baseline 表述。
10. 若改动涉及 `mycodemap.config.json.storage` 或图数据库适配器，至少补跑对应 storage adapter 定点测试，并确认 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/SETUP_GUIDE.md`、`mycodemap.config.schema.json` 与 guardrail 脚本同步。
11. 若改动涉及 `check` / `ci assess-risk` / `history` / `analyze --include-git-history` 的统一 risk truth，至少补跑 `src/cli/commands/__tests__/analyze-command.test.ts`、`src/cli/commands/__tests__/ci-command-risk.test.ts`、`npm run build` 与 `node scripts/report-high-risk-files.mjs --top 3`。
12. 再扩大到 `npm run typecheck`、`npm run lint`、`npm test`。
13. 涉及发布或打包时，再执行 `npm run build` 与 `npm run validate-pack`。

## CI Gateway 验证流程

CI Gateway 已集成以下自动检查（按执行顺序）：

1. `npm run docs:check` - 文档护栏检查
2. `npm run typecheck` - TypeScript 类型检查
3. `npm run lint` - ESLint 代码质量检查（渐进式规则，0 error 通过）
4. `npm test` - 单元测试
5. `npm run build` - 构建验证
6. PR: `node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10` + `node dist/cli/index.js check --contract mycodemap.design.md --against src --base <sha> --annotation-format github`；push: full scan `warn-only / fallback`
7. CLI 相关检查（当前 CI Gateway 直接执行 `check-docs-sync`、commit 格式、文件头、risk、output contract；`ship` 的本地 CHECK 阶段复用 `check-working-tree`、`check-branch`、`check-scripts`）

> 当前 `check-docs-sync` 会串联 docs guardrail 与 analyze generated block 校验。
> 当前 contract gate truth：PR 默认 hard gate 仅在 calibration 通过且 `changed files <= 10` 时启用；超窗、`diff-scope-fallback` 或 `false-positive rate >10%` 时必须显式退回 `warn-only / fallback`。

## 强约束

- 没有验证，不得声称“已解决”。
- 失败时优先修根因，不绕过护栏。
- 涉及 CI / hooks / 输出契约时，必须给出失败场景与修复验证证据。
- 严禁使用 `--no-verify`、禁用 hooks、删除检查项规避失败。

## 典型失败模式

- 入口文档改成 AI-first，但 `scripts/validate-docs.js` 仍检查旧措辞 → `npm run docs:check` 失败。
- 把 `Server Layer` 和公共 `mycodemap server` 命令混写成同一件事 → 架构文档与命令文档发生边界漂移。
- 手改 `README.md`、`docs/ai-guide/COMMANDS.md` 或 `AI_GUIDE.md` 的 `analyze` canonical 代码块 / 选项表 / 速查模板，却没同步 generated block → `node scripts/sync-analyze-docs.js --check` 失败。
- 文档声称扫描类命令会尊重 `.gitignore`，但实现仍保留手写跳过规则 → `analyze` 与 `check-headers -d` 的文件集合漂移。
- 把 `workflow` 重新扩回非分析阶段，却没同步 README / AI 命令文档 / guardrail 脚本 → `npm run docs:check` 失败。
- 文档把 `design verify` 写成新的 workflow phase，或把 review-needed 路径写成 blocker failure → design docs 与命令退出语义漂移。
- `README.md` / `AI_GUIDE.md` / `docs/ai-guide/OUTPUT.md` 写了 `mycodemap check --contract mycodemap.design.md --against src`，但 `.github/workflows/ci-gateway.yml` 没有显式 PR base / push full scan 语义 → gate 本地与 CI 漂移。
- CI 把 `changed files <= 10` 之外的 PR 仍当成稳定 hard gate，或 calibration 已经显示 `false-positive rate >10%` 还继续阻断 → noisy fallback 被伪装成可靠门禁。
- `ci assess-risk`、`history --symbol` 与 `check` 的 risk 语义不同步，或 `analyze --include-git-history` 又退回 silent noop → public truth 分裂，CI 与人工诊断互相矛盾。
- `docs/product-specs/README.md` 仍写“当前活跃产品规格暂为空”，但目录里已经有现行规格 → 目录索引与规格正文自相矛盾。
- MVP3 规格文档继续把历史设计愿景写成当前现实（例如把 `neo4j`、14 种语言或公共 `server` 产品面写回去）→ `npm run docs:check` 失败。
- `config-loader` 已支持 `storage`，但 schema / README / AI 文档没同步 → 用户能写配置，编辑器和 guardrail 却仍把它当非法字段。
- 旧的 `neo4j` / `kuzudb` 配置已经不受支持，但文档还把它写成正式 backend，或把 `sqlite` 的运行时条件（`better-sqlite3` + Node.js `>=20`）/ 迁移诊断（`STORAGE_BACKEND_MIGRATED`、`SQLITE_NOT_AVAILABLE`）写错 → 现场排障方向错误，误判为实现 bug。

## 常用命令

```bash
npm run docs:check
node scripts/sync-analyze-docs.js --check
node dist/cli/index.js ci check-docs-sync
node scripts/calibrate-contract-gate.mjs --max-changed-files 10 --max-false-positive-rate 0.10
node dist/cli/index.js check --contract mycodemap.design.md --against src
node dist/cli/index.js check --contract mycodemap.design.md --against src --base origin/main --annotation-format github
node dist/cli/index.js history --symbol createCheckCommand
node dist/cli/index.js ci assess-risk -f src/cli/index.ts
node scripts/report-high-risk-files.mjs --top 3
node dist/cli/index.js design verify mycodemap.design.md --json
node dist/cli/index.js ci check-working-tree
node dist/cli/index.js ci check-branch
SHIP_IN_CI=1 node dist/cli/index.js ci check-scripts
npm run typecheck
npm test
npm run lint
npm run build
npm run validate-pack
```

## 退出语义速记

- `design validate → design map → design handoff → design verify` 是当前唯一对外文档化的 design contract 链。
- `review-needed 与 blocker 退出语义` 必须分开写：`review-needed` 表示需要人工确认但不等价于 contract blocker，`blocker` 与 `severity:error` 才是必须失败的 gate。
- `check --contract mycodemap.design.md --against src` 默认输出 JSON；若结果中存在 `severity:error`，命令必须返回非零退出码。
- `--annotation-format github|gitlab` 只改变渲染，不改变底层 `ContractCheckResult` truth；GitLab artifact 只应包含 line-scoped diagnostics。
- PR 默认 hard gate 只在 calibration 通过且 `changed files <= 10` 时启用；超窗、`diff-scope-fallback` 或 `false-positive rate >10%` 时，workflow 必须明确标为 `warn-only / fallback`，而不是继续伪装成通过中的 hard gate。
