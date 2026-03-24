# 验证规则

## 最小验证顺序

1. 先验证与你改动最相关的命令、测试或模块。
2. 若改动影响 agent 路由、CLI 示例、规则文档或测试事实，先执行 `npm run docs:check`。
3. 若改动同时影响 CLI 护栏入口，再补 `node dist/cli/index.js ci check-docs-sync`。
4. 若改动涉及 `analyze` canonical 示例、选项表或 `AI_GUIDE.md` 速查模板，确认 `README.md`、`docs/ai-guide/COMMANDS.md` 与 `AI_GUIDE.md` 的 generated block 仍能通过 `node scripts/sync-analyze-docs.js --check`。
5. 若改动涉及产品定位、输出契约、共享文件发现规则或 `Server Layer` / `mycodemap server` 边界，确认 README、AI 文档、架构文档和 guardrail 脚本使用同一套措辞。
6. 若改动涉及 `mycodemap.config.json.storage` 或图数据库适配器，至少补跑对应 storage adapter 定点测试，并确认 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/COMMANDS.md`、`docs/SETUP_GUIDE.md`、`mycodemap.config.schema.json` 与 guardrail 脚本同步。
7. 再扩大到 `npm run typecheck`、`npm run lint`、`npm test`。
8. 涉及发布或打包时，再执行 `npm run build` 与 `npm run validate-pack`。

## CI Gateway 验证流程

CI Gateway 已集成以下自动检查（按执行顺序）：

1. `npm run docs:check` - 文档护栏检查
2. `npm run typecheck` - TypeScript 类型检查
3. `npm run lint` - ESLint 代码质量检查（渐进式规则，0 error 通过）
4. `npm test` - 单元测试
5. `npm run build` - 构建验证
6. CLI 相关检查（当前 CI Gateway 直接执行 `check-docs-sync`、commit 格式、文件头、risk、output contract；`ship` 的本地 CHECK 阶段复用 `check-working-tree`、`check-branch`、`check-scripts`）

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
- `config-loader` 已支持 `storage`，但 schema / README / AI 文档没同步 → 用户能写配置，编辑器和 guardrail 却仍把它当非法字段。
- 图数据库后端缺少 `kuzu` / `neo4j-driver` 或连接失败，却被文档写成会自动 fallback → 现场排障方向错误，误判为实现 bug。

## 常用命令

```bash
npm run docs:check
node scripts/sync-analyze-docs.js --check
node dist/cli/index.js ci check-docs-sync
node dist/cli/index.js ci check-working-tree
node dist/cli/index.js ci check-branch
SHIP_IN_CI=1 node dist/cli/index.js ci check-scripts
npm run typecheck
npm test
npm run lint
npm run build
npm run validate-pack
```
