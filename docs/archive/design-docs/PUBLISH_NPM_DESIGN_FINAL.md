# MyCodeMap NPM 发布最终设计方案（Merged V3）

> 归档时间：2026-03-15
> 归档原因：历史迁移设计稿，包含已完成的发布迁移前提与过程性判断。
> 当前依据：`docs/rules/deployment.md`、`package.json`、`.github/workflows/publish.yml`
> 状态：仅供历史对照，不作为当前执行依据。


> 版本：3.0（Final）  
> 日期：2026-03-04  
> 来源：合并 `docs/archive/PUBLISH_NPM_DESIGN_V1.md` + `docs/archive/PUBLISH_NPM_DESIGN_V2.md`

---

## 1. 目标与范围

- [证据] 目标是把当前 `codemap` 项目发布为可被外部项目直接使用的 npm 包，并建立可持续的发布流程。当前项目是 CLI + 库混合包（`package.json:2`, `package.json:7`, `src/cli/index.ts:1`）。
- [观点] 本方案采用“先发布闭环、后功能增强”的两阶段策略，避免一次性改动过大导致回归。

### 1.1 非目标（本次不做）

- [观点] 不在 P0 引入大范围新功能（如 `report`、`logs` 新命令、平台首启引导）。
- [推论] 这些内容可在 P1 增强中实现，避免与品牌/发布改造耦合。

---

## 2. 前置条件（DoD 前先定义）

### 2.1 目标

- [观点] 产出可发布、可验证、可回滚的 npm 包（scoped）。

### 2.2 限制条件

- [证据] 现有代码大量硬编码 `.codemap` 和 `codemap.json`（例如 `src/cli/commands/query.ts:320`, `src/orchestrator/workflow/ci-executor.ts:405-406`）。
- [证据] 当前仓库缺失 `LICENSE` 与 schema 文件（`ls LICENSE` 失败；`rg --files -g "*schema*.json"` 无结果）。
- [证据] 当前 `npm pack --dry-run --json` 实测包内缺失 `LICENSE`/`codemap.config.schema.json`/`CHANGELOG.md`。

### 2.3 验收标准

- [观点] P0 验收以“发布闭环可跑通”为准：构建、测试、打包内容、发布流程、安装验证全部通过。
- [观点] P1 验收以“可观测性增强”与“用户反馈链路”通过为准。

### 2.4 依赖关系

- [证据] npm 包内容控制遵循 `files`/`.npmignore` 规则（https://docs.npmjs.com/cli/v11/configuring-npm/package-json/）。
- [证据] scoped 包首次公开发布需 `--access public`（https://docs.npmjs.com/creating-and-publishing-scoped-public-packages）。
- [证据] 推荐使用 OIDC Trusted Publishing（https://docs.npmjs.com/trusted-publishers/）。

---

## 3. 关键评审结论（对两份方案的合并决策）

### 3.1 包命名与发布方式

- [证据] V1 使用 `mycodemap`（`docs/archive/PUBLISH_NPM_DESIGN_V1.md:159`），V2 使用 `@mycodemap/mycodemap`（`docs/archive/PUBLISH_NPM_DESIGN_V2.md:42`）。
- [观点] 采用 `@mycodemap/mycodemap` 作为最终包名（避免命名冲突、便于品牌命名空间）。
- [证据] scope 可避免同名冲突，且 scoped 包默认非公开，首次需 `--access public`（https://docs.npmjs.com/about-scopes, https://docs.npmjs.com/cli/v8/commands/npm-publish/）。

### 3.2 兼容策略（必须保留迁移窗口）

- [证据] 当前运行时日志环境变量是 `CODEMAP_*`（`src/cli/runtime-logger.ts:140-144`）。
- [观点] 采用“双前缀兼容一版”：`MYCODEMAP_*` 优先，`CODEMAP_*` 兜底并输出 deprecation 提示。

### 3.3 改名范围控制

- [证据] 代码中 `.codemap` 与 `codemap.json` 引用分布广（例如 `src/cli/index.ts:39`, `src/cli/commands/deps.ts:45`, `src/orchestrator/adapters/codemap-adapter.ts:56`）。
- [观点] P0 只改“入口命名 + 兼容层 + 默认输出目录策略”，不做全量硬替换；避免一次性回归。

### 3.4 发布安全基线

- [证据] npm 官方将 OIDC trusted publishing 作为推荐安全路径（https://docs.npmjs.com/trusted-publishers/）。
- [证据] trusted publishing 下可自动生成 provenance（https://docs.npmjs.com/trusted-publishers/）。
- [观点] P0 发布 workflow 默认使用 OIDC；token 方案仅作 fallback。

---

## 4. 最终方案（两阶段）

## Phase P0：发布闭环（必须先完成）

### P0-1 package.json 目标形态

```json
{
  "name": "@mycodemap/mycodemap",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js",
    "./package.json": "./package.json"
  },
  "bin": {
    "mycodemap": "./dist/cli/index.js",
    "codemap": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "mycodemap.config.schema.json"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

- [证据] `exports` 对新包推荐，且与 `main` 可并存（https://nodejs.org/api/packages.html#package-entry-points）。
- [证据] `files` 白名单是发布内容主控制项，根 `.npmignore` 不覆盖 `files`（https://docs.npmjs.com/cli/v11/configuring-npm/package-json/）。
- [观点] 保留 `codemap` bin 作为兼容别名 1 个小版本，降低现有脚本断裂风险。

### P0-2 配置/目录兼容策略

- [观点] 新默认：`mycodemap.config.json` + `.mycodemap/`。
- [观点] 读取策略：优先新命名，回退旧命名；发现旧命名时输出迁移提示。
- [观点] `codemap.json` 在 P0 保持文件名不变（仅目录可迁移），避免横向影响 orchestrator/query 流程。
- [证据] 当前 `codemap.json` 被多模块强依赖（`src/generator/index.ts:292`, `src/cli/commands/query.ts:320`, `src/orchestrator/workflow/ci-executor.ts:406`）。

### P0-3 环境变量兼容策略

- [观点] 新增解析：
  - `MYCODEMAP_RUNTIME_LOG_*`（新）
  - `CODEMAP_RUNTIME_LOG_*`（旧，低优先级）
- [证据] 现实现只识别旧前缀（`src/cli/runtime-logger.ts:140-144`）。

### P0-4 发布工作流（OIDC 优先）

- [观点] 新增 `.github/workflows/publish.yml`（tag 触发）。
- [证据] GitHub Actions 需 `id-token: write` 才能 OIDC 发布（https://docs.npmjs.com/trusted-publishers/）。
- [证据] 若使用 provenance，首次 scoped 公共发布命令为 `npm publish --provenance --access public`（https://docs.npmjs.com/generating-provenance-statements/）。

建议 workflow（简化）：

```yaml
name: Publish
on:
  push:
    tags: ["v*"]
permissions:
  id-token: write
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public
```

- [证据] trusted publishing 自动 provenance（公有仓库 + 公共包）可不显式加 `--provenance`（https://docs.npmjs.com/trusted-publishers/）。
- [假设] 若仓库/权限未满足 trusted publishing 条件，则暂用 granular token fallback。

### P0-5 预测试（强制）

- [证据] 实际失败案例：当前 `npm pack --dry-run --json` 缺失 `LICENSE`、schema、`CHANGELOG.md`。
- [观点] 在 CI 与本地都加“打包内容断言”：
  1. `npm pack --dry-run --json > pack.json`
  2. 断言包含：`dist/`、`README.md`、`LICENSE`、`CHANGELOG.md`、`mycodemap.config.schema.json`

---

## Phase P1：增强功能（发布后迭代）

- [观点] 新增 `report` / `logs` 命令。
- [观点] 平台检测与首次使用引导。
- [观点] 进一步品牌统一：评估 `codemap.json` 是否迁移到 `mycodemap.json`（若迁移需双写 + 弃用周期）。
- [证据] V1 中该类功能较完整但代码片段质量不稳定（如 `docs/archive/PUBLISH_NPM_DESIGN_V1.md:1005-1015` 结构风险），应在实现阶段重新设计而非直接复制。

### P1-1 功能范围冻结（合并自 V1/V2）

| 模块 | 目标能力 | 输入/输出 | 验收标准 |
|---|---|---|---|
| `report` 命令 | 采集诊断信息并脱敏导出 | 输入：`--output`、`--days`；输出：`mycodemap-report-*.json` | 报告生成成功，敏感值被脱敏，大小限制生效 |
| `logs` 命令 | 日志列表/导出/清理 | 输入：`logs`/`logs export`/`logs clear`；输出：终端提示 + zip | 可列出日志、可导出、可清理且不影响主流程 |
| 平台检测 | 启动时识别平台支持级别 | 输入：`os/arch/node`；输出：提示文案 | 不阻断已支持平台；不支持平台给出明确错误 |
| tree-sitter 按需检测 | 仅在需要 AST 的命令执行检测 | 输入：命令上下文；输出：错误提示/继续执行 | `init/query` 不触发检测；`generate/complexity/watch` 触发 |
| 首次运行引导 | 无配置时输出快速开始指南 | 输入：cwd 状态；输出：欢迎与下一步命令 | 首次展示，后续不重复打扰 |
| 迁移提示 | 检测旧配置与旧前缀 | 输入：`codemap.config.json`、`CODEMAP_*` | 输出 deprecation 提示且仍可运行 |

### P1-2 P1 实施约束

- [观点] P1 必须建立在 P0 已发布成功之上，不允许并行推进导致发布路径不稳定。
- [观点] P1 中任何新增命令都要附带测试（单测 + CLI 冒烟）。
- [证据] 项目测试框架为 Vitest（`vitest.config.ts:7`），P1 测试必须使用 Vitest 语法，不能使用 Jest 示例片段。

---

## 5. 文件改动清单（P0）

### 必改

- `package.json`
- `src/cli/index.ts`
- `src/cli/commands/init.ts`
- `src/cli/runtime-logger.ts`
- `src/cli/commands/{generate,watch,query,deps,cycles,complexity,impact,analyze}.ts`（统一输出目录读取逻辑）
- `src/orchestrator/adapters/codemap-adapter.ts`
- `src/orchestrator/workflow/{config.ts,workflow-persistence.ts,workflow-orchestrator.ts,templates.ts,ci-executor.ts}`
- `.github/workflows/ci-gateway.yml`（命令名迁移）
- `.githooks/pre-commit`
- `scripts/hooks/pre-commit`
- `README.md`

### 新增

- `LICENSE`
- `CHANGELOG.md`
- `mycodemap.config.schema.json`
- `.github/workflows/publish.yml`

---

## 6. 原子化实施步骤（每步 <= 1 天）

1. [观点] **Step A：发布元数据与缺失文件补齐**（`package.json` + `LICENSE` + `CHANGELOG` + schema）。
2. [观点] **Step B：CLI 命名与配置兼容层**（`mycodemap` 主命令 + `codemap` 兼容）。
3. [观点] **Step C：输出目录统一入口**（新增路径解析工具，替换分散硬编码）。
4. [观点] **Step D：环境变量双前缀兼容**（新前缀优先 + 弃用告警）。
5. [观点] **Step E：CI 与发布 workflow 更新**（CI 命令迁移 + publish.yml）。
6. [观点] **Step F：回归测试 + 打包验证 + npx 安装验证**。

---

## 7. 测试与验证计划

### 7.1 本地验证

```bash
npm run build
npm test
npm run typecheck
npm run lint
npm pack --dry-run --json
```

### 7.2 安装验证

```bash
# 本地临时安装包
npm pack
npm i -g ./mycodemap-*.tgz
mycodemap --version
codemap --version
```

### 7.3 CI 验证

- [观点] CI 必须包含：测试、类型、lint、打包内容断言、命令冒烟测试。

---

## 8. 失败场景与回滚

### 失败场景 A（已发生）

- [证据] `npm pack --dry-run --json` 缺失发布必需文件，导致发布包不完整。
- [观点] 处置：在发布前 gate 中强制检查 tarball 清单，不通过即阻断发布。

### 失败场景 B

- [假设] 全量替换 `.codemap` -> `.mycodemap` 导致旧脚本失效。
- [观点] 处置：P0 保留兼容读取；发布说明明确迁移窗口；下个小版本再移除旧路径。

### 回滚策略

- [观点] 若发布后发现严重问题：
  1. 立即发布修复补丁版本（不建议 unpublish）；
  2. README/CHANGELOG 标明受影响版本与规避方案；
  3. 必要时 `npm deprecate` 问题版本。

---

## 9. 风险矩阵（合并版）

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 一次性全量改名导致回归 | 中 | 高 | 分阶段 + 兼容层 |
| 包内容缺失 | 中 | 高 | `npm pack --dry-run --json` gate |
| scoped 首次发布权限错误 | 中 | 中 | 首次强制 `--access public` |
| CI token 泄漏 | 低 | 高 | OIDC trusted publishing |
| 旧用户迁移成本 | 中 | 中 | 双命令/双前缀兼容 + 弃用提示 |

---

## 10. 最终 DoD

- [ ] `@mycodemap/mycodemap` 成功发布并可 `npx` 运行
- [ ] `mycodemap --version` 与 `codemap --version` 均可用（兼容窗口）
- [ ] 新旧配置/目录/环境变量兼容策略按设计生效
- [ ] CI 发布流程可重复执行（含失败阻断）
- [ ] 文档（README/CHANGELOG/迁移说明）完整

---

## 11. 证据索引

### 11.1 本地代码证据

- `package.json:2`
- `package.json:7`
- `package.json:10`
- `src/cli/index.ts:25`
- `src/cli/index.ts:39`
- `src/cli/commands/init.ts:8`
- `src/cli/runtime-logger.ts:140`
- `src/generator/index.ts:292`
- `src/cli/commands/query.ts:320`
- `src/orchestrator/workflow/ci-executor.ts:405`
- `.github/workflows/ci-gateway.yml:33`
- `.githooks/pre-commit:55`

### 11.2 官方最佳实践证据

- npm package.json（`name`/`files`/`.npmignore` 规则）  
  https://docs.npmjs.com/cli/v11/configuring-npm/package-json/
- npm publish（scoped 默认 access 与 `--access public`）  
  https://docs.npmjs.com/cli/v8/commands/npm-publish/
- Scoped public package 发布指南  
  https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
- Trusted publishing（OIDC）  
  https://docs.npmjs.com/trusted-publishers/
- Provenance 生成与校验  
  https://docs.npmjs.com/generating-provenance-statements/
- Node package entry points（`exports` 推荐）  
  https://nodejs.org/api/packages.html#package-entry-points

---

## 12. 文档同步检查

- [观点] 本方案已作为实施基线文档；在代码实施完成后需同步检查：
  - `README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/` 中与发布流程相关文档

---

## 13. 实施执行附录（Runbook）

> 目标：把 P0/P1 变成可直接执行的“操作清单 + 验收门禁”。

### 13.1 P0 执行清单（发布闭环）

#### Step A（元数据与发布文件）

- 修改文件：`package.json`、新增 `LICENSE`、`CHANGELOG.md`、`mycodemap.config.schema.json`。
- 完成定义：
  1. `npm pack --dry-run --json` 包含 `LICENSE`、`CHANGELOG.md`、schema；
  2. `name`/`bin`/`publishConfig` 与第 4 节一致。
- 验证命令：

```bash
npm run build
npm pack --dry-run --json > /tmp/pack.json
```

#### Step B（CLI 命名与配置兼容）

- 修改文件：`src/cli/index.ts`、`src/cli/commands/init.ts`。
- 完成定义：
  1. 主命令文案为 `mycodemap`；
  2. 兼容 `codemap` 别名；
  3. `init` 生成新配置名并能识别旧配置。
- 验证命令：

```bash
node dist/cli/index.js --help
node dist/cli/index.js init -y
```

#### Step C（路径兼容层）

- 修改文件：`src/cli/commands/*`、`src/orchestrator/**` 涉及输出目录读取处。
- 实施策略：
  - 优先读 `.mycodemap`，不存在则回退 `.codemap`；
  - P0 保持 `codemap.json` 文件名不变。
- 验证命令：

```bash
node dist/cli/index.js generate
node dist/cli/index.js query -S "initCommand" -j
```

#### Step D（环境变量双前缀兼容）

- 修改文件：`src/cli/runtime-logger.ts`。
- 实施策略：
  - `MYCODEMAP_RUNTIME_LOG_*` 优先；
  - 旧前缀兜底；
  - 使用旧前缀时打印 deprecation。
- 验证命令：

```bash
MYCODEMAP_RUNTIME_LOG_ENABLED=true node dist/cli/index.js --version
CODEMAP_RUNTIME_LOG_ENABLED=true node dist/cli/index.js --version
```

#### Step E（CI 与发布流程）

- 修改文件：`.github/workflows/ci-gateway.yml`、新增 `.github/workflows/publish.yml`、`.githooks/pre-commit`、`scripts/hooks/pre-commit`。
- 完成定义：
  1. CI 使用新命令名；
  2. publish workflow 支持 OIDC trusted publishing；
  3. pre-commit 生成命令不引用过期命令名。

#### Step F（发布前总验收）

- 必跑：

```bash
npm test
npm run typecheck
npm run lint
npm pack --dry-run --json
```

- 冒烟：

```bash
npm pack
npm i -g ./mycodemap-*.tgz
mycodemap --version
codemap --version
```

### 13.2 P1 执行清单（增强功能）

#### Step P1-A：`report` 命令

- 新增：`src/cli/commands/report.ts`、`src/cli/utils/sanitize.ts`。
- 要求：脱敏路径/环境变量；支持 `--yes`；限制报告大小。
- 测试：`src/cli/commands/__tests__/report.test.ts`、`src/cli/__tests__/sanitize.test.ts`。

#### Step P1-B：`logs` 命令

- 新增：`src/cli/commands/logs.ts`（`list/export/clear`）。
- 要求：错误不影响 CLI 主流程；导出可附 Issue。

#### Step P1-C：平台与依赖检测

- 新增：`src/cli/platform-check.ts`、`src/cli/tree-sitter-check.ts`、`src/cli/first-run-guide.ts`。
- 要求：按需检测，避免全部命令开销；提示文案明确可执行。

#### Step P1-D：文档与迁移说明

- 修改：`README.md`、`AGENTS.md`、`CLAUDE.md`（如存在）、相关设计文档索引。
- 要求：包含旧命令/旧前缀/旧目录的迁移说明与截止版本。

### 13.3 阶段门禁（必须满足）

| 阶段 | 阻断条件 |
|---|---|
| P0 | `npm pack --dry-run --json` 缺文件；`mycodemap` 命令不可用；CI 不通过 |
| P1 | 新命令无测试；脱敏逻辑不完整；文档未同步 |

---

## 14. V1/V2 覆盖矩阵与归档

### 14.1 覆盖矩阵（证明 V3 可替代 V1/V2）

| 旧文档主题 | 覆盖位置（V3） | 状态 |
|---|---|---|
| 包命名、package.json、发布参数 | 第 3 节 + 第 4 节 + 第 13.1 Step A | 已覆盖 |
| `.npmignore` / `files` 发布内容策略 | 第 2.4 节 + 第 4 节（P0-1）+ 第 13.1 Step A/F | 已覆盖 |
| 目录/配置名迁移（`.codemap`、config） | 第 4 节（P0-2）+ 第 13.1 Step B/C | 已覆盖 |
| 环境变量迁移 | 第 3.2 节 + 第 4 节（P0-3）+ 第 13.1 Step D | 已覆盖 |
| CI/CD 与发布流程 | 第 4 节（P0-4）+ 第 13.1 Step E/F | 已覆盖 |
| 风险、失败场景、回滚 | 第 8 节 + 第 9 节 + 第 13.3 节 | 已覆盖 |
| report/logs/平台检测增强 | 第 4（P1）+ 第 13.2 节 | 已覆盖 |
| 验收标准（DoD） | 第 10 节 + 第 13.3 节 | 已覆盖 |

### 14.2 归档策略

- [观点] `docs/archive/PUBLISH_NPM_DESIGN_V1.md` 与 `docs/archive/PUBLISH_NPM_DESIGN_V2.md` 为历史参考，不再作为实施基线。
- [观点] `docs/design-docs/PUBLISH_NPM_DESIGN_FINAL.md` 作为唯一实施设计文档。
