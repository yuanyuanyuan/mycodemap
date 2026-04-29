---
name: release
description: 统一 `/release v{X.Y}` 发布治理技能。包含发布编排、发布验证、失败排查三个独立执行面。只做 milestone readiness、版本映射、双确认门与委托，不重建 `scripts/release.sh` 或 `.github/workflows/publish.yml`。适用于用户明确要执行 `/release`、发布治理检查、或核对 milestone ↔ npm release 绑定规则的场景。
user-invocable: true
---

# Release

> 单一权威：先读 `docs/rules/release.md`。本 skill 只是 Claude 运行时薄编排器，不是第二套发布手册。

## 角色分工

本 skill 包含三个独立执行面，用户可按需单独调用。每个角色有明确的 autonomy 边界：

| 角色 | 触发词 | 职责 | 权限 |
|------|--------|------|------|
| **Release Orchestrator** | `/release v{X.Y}` | readiness → closeout → 双确认门 → helper 委托 | 可执行 git 写操作（经用户确认后） |
| **Release Verification Agent** | `/release-verify v{X.Y}` 或用户问"发布成功了吗" | 查询 NPM 版本、GitHub Actions 状态、生成验证报告 | **只读**，不修改仓库 |
| **Release Recovery Agent** | `/release-diagnose v{X.Y}` 或用户问"为什么发布失败" | 分析 Actions 失败日志、定位根因、提出修复方案 | 可建议修复操作，执行前需用户确认 |

---

## 角色 A: Release Orchestrator

### 适用场景

- 用户显式输入 `/release v{X.Y}`
- 用户要求把 milestone closeout 与 npm release 串成一次受控操作
- 用户需要检查 release readiness、版本映射、确认门或失败处理

### 绝对边界

- 发布属于 **L3**；没有用户显式确认前，**不得自主发布**
- 没有用户显式确认前，**不得**执行 `npm version`、git commit、git tag、`git push` 或任何会触发 `.github/workflows/publish.yml` 的动作
- 本 skill 是 **thin orchestrator**：只验证、展示、确认、委托
- 机械发布必须复用现有工具链：`$gsd-complete-milestone`、`scripts/release.sh`、`.github/workflows/publish.yml`
- 不得在仓库写入 `NPM_TOKEN` 或其他 secret；只允许使用环境变量 / GitHub Secrets

### 先读事实

1. `docs/rules/release.md`
2. `docs/rules/deployment.md`
3. `docs/rules/pre-release-checklist.md`
4. `.planning/ROADMAP.md`
5. `.planning/STATE.md`
6. `package.json`
7. `scripts/release.sh`
8. `.github/workflows/publish.yml`

### `/release v{X.Y}` 工作流

#### 1. 解析输入并拒绝无效触发

如果用户没有提供目标版本，直接拒绝并要求显式格式：

```text
/release v1.9
```

以下任一条件不满足时，必须拒绝继续：

- 没有 active milestone，且也没有与 `v{X.Y}` 对应的已完成 / 已归档 milestone
- 工作区不干净（`rtk git status --short` 非空）
- 当前分支不是 `main`（`rtk git rev-parse --abbrev-ref HEAD`）
- milestone readiness 不足：开放项未处理、缺 summary / verification、requirements 未关闭或未 deferred
- 本地或远程已存在冲突 tag（例如 `v1.9.0`）
- `package.json` 无法读取当前版本，无法计算 `vX.Y → X.Y.0`

#### 2. 运行 readiness checks

优先收集以下事实：

```bash
rtk git status --short
rtk git rev-parse --abbrev-ref HEAD
rtk npm run docs:check:pre-release
rtk node dist/cli/index.js ci check-docs-sync
rtk gsd-sdk query roadmap.analyze
rtk proxy git tag -l "v{X.Y}.0"
```

如果 milestone 尚未归档，再准备委托：

```text
$gsd-complete-milestone v{X.Y}
```

如果 milestone 已归档，只展示现有 closeout 证据，不重复 closeout。

#### 3. Confirmation Gate #1

在进入发布准备前，必须先展示 milestone 归档摘要，并等待用户显式确认：

```text
Confirmation Gate #1 — Milestone closeout summary

Milestone: v{X.Y}
Archive status: {ready / already archived}
Phases: {count}
Requirements: {resolved summary}
Key accomplishments:
- ...
- ...

继续进入版本发布准备吗？(y/N)
```

默认是 **No**。任何非 `y` / `Y` 输入都立即停止。

#### 4. 计算版本映射并高亮 major jump

从 `package.json` 读取当前版本，然后展示：

```text
Milestone → npm 版本映射
- Rule: vX.Y → X.Y.0
- Target milestone: v1.9
- Current package.json: 0.5.2-beta.1
- Target npm version: 1.9.0
- Mapping: 0.5.2-beta.1 → 1.9.0
```

如果是 major 跳跃（包括 `0.x → 1.x`），必须额外高亮：

```text
⚠️ Major version jump detected.
请确认这是预期行为；如果不是，停止 `/release`，先修正版本策略。
```

#### 5. Confirmation Gate #2

在任何不可逆动作之前，必须展示完整发布摘要，并且只接受明确的 `y / Y`：

```text
Confirmation Gate #2 — irreversible release actions

即将委托 `scripts/release.sh {X.Y}.0`，它会执行：
1. npm / docs / test / lint checks
2. 版本写入
3. git commit
4. git tag
5. git push
6. 触发 .github/workflows/publish.yml

确认发布 v{X.Y}.0? (y/N)
```

规则：

- 只接受单独的 `y` 或 `Y`
- 任何其他输入都视为取消
- 未通过本 gate，**不得**调用 `scripts/release.sh`

#### 6. 委托机械发布

只有在 **Confirmation Gate #2** 明确通过后，才允许调用：

```bash
rtk ./scripts/release.sh {X.Y}.0
```

说明：

- 这是对现有 helper 的委托，不在 skill 中重复实现 commit / tag / push 细节
- `scripts/release.sh` 自带确认提示，但它只是 helper 的附加交互，**不能替代** Gate #2
- 如果用户撤销或 helper 失败，停止流程并返回失败摘要

#### 7. 移交验证

委托完成后，Orchestrator 的职责结束。必须向用户明确移交：

```text
✅ Release Orchestrator 已完成委托

下一步请执行：
1. 等待 GitHub Actions 完成（约 2-5 分钟）
2. 运行 /release-verify v{X.Y} 验证发布结果
3. 如果验证失败，运行 /release-diagnose v{X.Y} 排查原因
```

Orchestrator **不得**自动执行验证或排查。这是 Verification Agent 和 Recovery Agent 的职责。

---

## 角色 B: Release Verification Agent

### 触发条件

- 用户输入 `/release-verify v{X.Y}`
- 用户问"发布成功了吗"、"NPM 更新了吗"、"Actions 跑完了吗"
- Orchestrator 委托完成后用户需要验证

### 执行流程

#### 1. 查询 NPM 版本

```bash
npm view @mycodemap/mycodemap version
```

对比期望版本 `{X.Y}.0`：
- 如果一致 → ✅ NPM 发布成功
- 如果不一致 → ❌ NPM 未更新，移交 Recovery Agent

#### 2. 查询 GitHub Actions 状态

优先使用 `gh` CLI（Claude runtime 通常已安装并认证）：

```bash
# 列出最近的 runs
gh run list --repo {owner}/{repo} --workflow "Publish to NPM" -L 5
gh run list --repo {owner}/{repo} --workflow "CI Gateway" -L 5

# 查看特定 run
gh run view {run_id} --repo {owner}/{repo}

# 查看失败日志
gh run view {run_id} --repo {owner}/{repo} --log-failed
```

关注点：
- 与当前 tag `v{X.Y}.0` / commit SHA 匹配的 workflow run
- `Publish to NPM` 的 conclusion: `success` / `failure` / `in_progress`
- `CI Gateway` 的 conclusion（push 到 main 触发）

如果 `gh` CLI 不可用，回退到 GitHub API：

```bash
curl -s "https://api.github.com/repos/{owner}/{repo}/actions/runs?event=push&per_page=5"
```

如果无法精确匹配 run（例如存在多个并发 run），返回 `ambiguous`，不要猜测。

#### 3. 查询远程 tag 存在性

```bash
rtk proxy git ls-remote --tags origin "refs/tags/v{X.Y}.0"
```

#### 4. 输出验证报告

```text
═══════════════════════════════════════════════════════
  Release Verification Report — v{X.Y}.0
═══════════════════════════════════════════════════════

NPM Registry:
  期望版本: {X.Y}.0
  实际版本: {version}
  状态: {✅ 已发布 / ❌ 未更新}

GitHub Actions:
  Publish to NPM: {success / failure / in_progress / unavailable}
  CI Gateway:     {success / failure / in_progress / unavailable}
  Run ID:         {id}
  Commit SHA:     {sha}

Remote Tag:
  v{X.Y}.0: {✅ 存在 / ❌ 缺失}

结论: {全部通过 / 部分失败 / 需要排查}
```

如果任何一项失败，提示用户运行 `/release-diagnose v{X.Y}`。

---

## 角色 C: Release Recovery Agent

### 触发条件

- 用户输入 `/release-diagnose v{X.Y}`
- 用户问"为什么发布失败"、"Actions 失败了怎么修"
- Verification Agent 发现失败后用户请求排查

### 绝对边界

- **只分析、建议，不自动执行修复**（除非用户显式确认）
- 涉及删除远程 tag、force push、重新 release 等操作，必须视为 L3，等待用户确认
- 不得擅自修改 `scripts/release.sh` 或 `.github/workflows/publish.yml` 的核心逻辑，除非定位到明确的 bug

### 执行流程

#### 1. 收集失败证据

优先使用 `gh` CLI 获取 Actions 日志：

```bash
# 列出失败的 runs
gh run list --repo {owner}/{repo} --workflow "Publish to NPM" -L 5

# 查看失败的 job 详情
gh run view {run_id} --repo {owner}/{repo}

# 查看失败日志
gh run view {run_id} --repo {owner}/{repo} --log-failed

# 下载完整日志（如需 deeper analysis）
gh run view {run_id} --repo {owner}/{repo} --log
```

如果 `gh` CLI 不可用，回退到 GitHub API 或让用户手动提供日志片段。

#### 2. 根因分类

根据日志定位到具体失败的 step，分类如下：

| 失败类别 | 常见表现 | 排查方向 |
|---------|---------|---------|
| **pre-release guardrail** | `docs:check:pre-release` 失败 | 版本号不一致、CHANGELOG 缺失、AI 文档版本漂移 |
| **commit format** | `git commit` 被 hook 拒绝 | commit-msg hook 要求 `[TAG] scope: message`，检查 `scripts/release.sh` 的 commit message 格式 |
| **test failure** | `npm test` 或 `test:e2e` 失败 | 本地通过但 CI 失败 = 环境差异；本地也失败 = 代码问题 |
| **build failure** | `npm run build` 失败 | TypeScript 编译错误、构建脚本问题 |
| **publish auth** | `npm publish` 失败 | `NPM_TOKEN` 缺失 / 过期、OIDC 配置问题、registry 访问权限 |
| **validate-pack** | `npm run validate-pack` 失败 | 打包内容不符合预期（文件缺失、体积超限等） |
| **workflow infra** | `actions/checkout` 或 `setup-node` 失败 | GitHub Actions 服务问题、deprecated action 版本 |

#### 3. 已知的具体失败模式（来自实际发布经验）

**模式 1: AI 文档版本号未同步**
- `scripts/release.sh` 只更新 `package.json`，没有同步 `llms.txt`、`ai-document-index.yaml`、`AI_GUIDE.md`、`AI_DISCOVERY.md`
- `pre-release-check.js` 会报 `[version_mismatch] 版本号不一致`
- **修复**: 手动同步上述文件的版本号，或修改 `scripts/release.sh` 在 bump 版本时同步 AI 文档

**模式 2: CHANGELOG 缺失**
- `pre-release-check.js` 报 `[changelog_not_synced] CHANGELOG.md 缺少当前版本条目`
- **修复**: 在 `CHANGELOG.md` 顶部添加对应版本的条目

**模式 3: commit-msg hook 格式冲突**
- `.githooks/commit-msg` 要求格式 `[TAG] scope: message`，有效 TAG: `BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE`
- `scripts/release.sh` 的默认 commit message `[RELEASE] bump version to vX.Y.Z` 不符合要求
- **修复**: 修改 `scripts/release.sh` 的 commit message 为 `[CONFIG] version: bump to vX.Y.Z`

**模式 4: CI 环境测试差异**
- 本地 `npm test` 通过，但 CI 中 `validate-rules.py` 报告 `test` failed
- 可能原因：缺少系统依赖（如 `ast-grep`）、SQLite 超时、文件系统差异
- **修复**: 查看 CI 具体失败的 test 名称，针对性修复或调整超时配置

#### 4. 输出诊断报告

```text
═══════════════════════════════════════════════════════
  Release Diagnosis Report — v{X.Y}.0
═══════════════════════════════════════════════════════

失败 Workflow: {Publish to NPM / CI Gateway}
失败 Step:     {step name}
Run ID:        {id}

根因分类: {category}

详细错误:
{log excerpt}

修复建议:
1. {action 1}
2. {action 2}
3. {action 3}

如需执行修复，请确认。涉及的操作可能包括:
- 修改文件并 commit
- 删除并重新创建远程 tag v{X.Y}.0
- 重新触发 release
```

#### 5. 修复执行（需用户确认）

如果用户确认修复，Recovery Agent 可以：
- 修改源文件（AI 文档版本、CHANGELOG、scripts/release.sh 等）
- commit 修复
- **删除远程 tag 并重新创建**（L3，必须显式确认）
- 推送修复后的 commit 和 tag
- 建议用户重新运行 `/release-verify v{X.Y}`

---

## 失败处理

| 场景 | 处理 |
|---|---|
| 无 active / completed milestone | 直接拒绝；要求先完成或归档 milestone |
| 工作区不干净 | 直接拒绝；先提交、stash 或清理 |
| major version jump | 继续前必须高亮警告并等待 Gate #2 |
| tag 冲突 | 直接拒绝；先查明是否重复发布 |
| closeout 后但发布前失败 | 保留 milestone 归档状态；修复后可重新运行 `/release` |
| helper 执行失败 | 返回 `scripts/release.sh` 失败摘要，移交 Recovery Agent |
| Actions 失败（已推送 tag） | Recovery Agent 分析 → 修复 → 删除并重打 tag → 重新验证 |
| NPM 未更新（Actions success） | 检查 `publish.yml` 的 `npm publish` 步骤，可能是 dist-tag 或 registry 问题 |

## 禁止事项

- 不得绕过 `$gsd-complete-milestone`
- 不得绕过 `docs/rules/release.md` 的双确认门
- 不得把 `.github/workflows/publish.yml` 或 `scripts/release.sh` 的逻辑复制进 skill
- 不得在当前 milestone 的文档 / 验证阶段真实执行 release
- 不得因为用户说"继续"就默认发布；发布必须是显式 `/release v{X.Y}` + 两次确认
- Orchestrator **不得**自动执行 Verification 或 Recovery；必须明确移交
- Recovery Agent **不得**在未经用户确认的情况下删除远程 tag 或 force push

## 参考文档

- `docs/rules/release.md`
- `docs/rules/deployment.md`
- `docs/rules/pre-release-checklist.md`
- `AGENTS.md`
- `CLAUDE.md`
