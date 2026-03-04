# Findings: NPM 发布设计评审

## 2026-03-04 初始化
- 任务对象：
  - `docs/PUBLISH_NPM_DESIGN.md`
  - `docs/PUBLISH_NPM_DESIGN_V2.md`
- 会话恢复提示显示上次会话曾修改 V2 文档，需要重点检查其一致性与可执行性。
- 当前工作树 `git diff --stat` 为空，便于定位本次新增改动。

## 待补充证据清单
- 两份文档差异矩阵（范围/流程/风险/测试/CI）
- 本地代码现状（package.json、CLI 入口、配置命名、日志、hooks）
- 官方最佳实践：npm package.json、npmignore/files、provenance、semver、Node engines

## 2026-03-04 文档初读发现（本地证据）
1. 当前代码仍以 `codemap` 命名为主：
   - `package.json` 名称为 `codemap`，bin 为 `codemap`（`package.json:2`, `package.json:8`）。
   - CLI 名称为 `codemap`，默认输出目录为 `.codemap`（`src/cli/index.ts:25`, `src/cli/index.ts:39`）。
   - init 默认配置文件为 `codemap.config.json`（`src/cli/commands/init.ts:8`）。
2. 两份设计都要求迁移为 `mycodemap`，但 V1 与 V2 方案在包名、scope、环境变量迁移策略上不一致：
   - V1 用无 scope 包名 `mycodemap`（`docs/PUBLISH_NPM_DESIGN.md:159`）；
   - V2 用 scope 包名 `@mycodemap/mycodemap`（`docs/PUBLISH_NPM_DESIGN_V2.md:31`, `docs/PUBLISH_NPM_DESIGN_V2.md:42`）。
3. V1 含大量代码级实现片段，存在可编译性风险（示例代码结构不完整）：
   - `previewReport` 后疑似缺少函数闭合大括号，直接进入 `createReportCommand`（`docs/PUBLISH_NPM_DESIGN.md:1005-1015`）。
4. V1/V2 都包含待替换占位信息（作者、仓库地址），未满足可直接执行发布：
   - V2 `author: <需要填写>`（`docs/PUBLISH_NPM_DESIGN_V2.md:76`）和 `<your-github-username>`（`docs/PUBLISH_NPM_DESIGN_V2.md:80-85`）。

## 2026-03-04 官方最佳实践证据（网页）
1. npm `package.json` 建议用 `files` 白名单控制发布内容，且根目录 `.npmignore` 不会覆盖 `files`（而是子目录 `.npmignore` 有效）。
   - 证据：docs.npmjs.com package.json 文档（`files` 字段说明）。
2. npm 包名规则要求 URL-safe、不能大写，且可使用 scope 规避命名冲突。
   - 证据：docs.npmjs.com package.json 文档（`name` 字段约束）。
3. `npm publish` 默认包含 `package.json`/`README`/`LICENSE` 等；建议通过 `npm pack --dry-run` 预检发布内容。
   - 证据：docs.npmjs.com npm publish 文档。
4. 公开 scoped 包需 `npm publish --access public`。
   - 证据：docs.npmjs.com scoped packages 文档。
5. npm 推荐在 GitHub/GitLab 使用 trusted publishing（OIDC）+ provenance，而不是长期 token。
   - 证据：docs.npmjs.com trusted publishers / provenance 文档。
6. Node 官方建议新包使用 `exports` 定义公开入口（相对 `main` 更清晰）。
   - 证据：nodejs.org packages 文档（subpath exports）。

## 2026-03-04 关键冲突与风险归纳
1. 命名策略冲突：V1 为 `mycodemap`（无 scope），V2 为 `@mycodemap/mycodemap`（有 scope）。
2. 兼容策略冲突：V1 维持 `CODEMAP_*` 环境变量，V2 要求全部改 `MYCODEMAP_*`。
3. 迁移范围冲突：V2 以“全量替换”为核心，但未包含旧配置/旧命令兼容与迁移窗口。
4. 方案粒度失衡：V1 过度扩展（平台检测、首次引导、report 命令），超出“先发布”的最小目标。

## 2026-03-04 最终合并产物
- 已生成合并版：`docs/PUBLISH_NPM_DESIGN_FINAL.md`。
- 最终基线（用户确认）：
  1) scoped 包 `@mycodemap/mycodemap`
  2) 环境变量双前缀兼容一版（`MYCODEMAP_*` 优先，`CODEMAP_*` 兜底）
  3) 两阶段实施：P0 发布闭环，P1 功能增强
- 文档中已纳入：DoD、失败场景、回滚、风险矩阵、官方实践证据索引。
- 文档同步检查结论：本轮仅新增设计文档，不改现有 README/AGENTS/CLAUDE 内容；待代码实施落地后再同步更新。

## 2026-03-04 补充请求处理（Runbook + 归档）
- 已根据用户追加要求，将 V3 扩展为“可执行设计文档”：新增第 13 节实施执行附录（P0/P1 步骤、门禁、验证命令）与第 14 节覆盖矩阵。
- 已完成归档：
  - `docs/PUBLISH_NPM_DESIGN.md` → `docs/archive/PUBLISH_NPM_DESIGN_V1.md`
  - `docs/PUBLISH_NPM_DESIGN_V2.md` → `docs/archive/PUBLISH_NPM_DESIGN_V2.md`
- 已修复 V3 内对旧文档路径引用，确保证据路径可追踪。
