---
name: release
description: 统一 `/release v{X.Y}` 发布治理技能。只做 milestone readiness、版本映射、双确认门与委托，不重建 `scripts/release.sh` 或 `.github/workflows/publish.yml`。适用于用户明确要执行 `/release`、发布治理检查、或核对 milestone ↔ npm release 绑定规则的场景。
user-invocable: true
---

# Release

> 单一权威：先读 `docs/rules/release.md`。本 skill 只是 Claude 运行时薄编排器，不是第二套发布手册。

## 适用场景

- 用户显式输入 `/release v{X.Y}`
- 用户要求把 milestone closeout 与 npm release 串成一次受控操作
- 用户需要检查 release readiness、版本映射、确认门或失败处理

## 绝对边界

- 发布属于 **L3**；没有用户显式确认前，**不得自主发布**
- 没有用户显式确认前，**不得**执行 `npm version`、git commit、git tag、`git push` 或任何会触发 `.github/workflows/publish.yml` 的动作
- 本 skill 是 **thin orchestrator**：只验证、展示、确认、委托
- 机械发布必须复用现有工具链：`$gsd-complete-milestone`、`scripts/release.sh`、`.github/workflows/publish.yml`
- 不得在仓库写入 `NPM_TOKEN` 或其他 secret；只允许使用环境变量 / GitHub Secrets

## 先读事实

1. `docs/rules/release.md`
2. `docs/rules/deployment.md`
3. `docs/rules/pre-release-checklist.md`
4. `.planning/ROADMAP.md`
5. `.planning/STATE.md`
6. `package.json`
7. `scripts/release.sh`
8. `.github/workflows/publish.yml`

## `/release v{X.Y}` 工作流

### 1. 解析输入并拒绝无效触发

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

### 2. 运行 readiness checks

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

### 3. Confirmation Gate #1

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

### 4. 计算版本映射并高亮 major jump

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

### 5. Confirmation Gate #2

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

### 6. 委托机械发布

只有在 **Confirmation Gate #2** 明确通过后，才允许调用：

```bash
rtk ./scripts/release.sh {X.Y}.0
```

说明：

- 这是对现有 helper 的委托，不在 skill 中重复实现 commit / tag / push 细节
- `scripts/release.sh` 自带确认提示，但它只是 helper 的附加交互，**不能替代** Gate #2
- 如果用户撤销或 helper 失败，停止流程并返回失败摘要

### 7. 验证发布触发

在 tag push 之后，展示并检查：

- GitHub Actions workflow：`.github/workflows/publish.yml`
- Actions URL：`https://github.com/yuanyuanyuan/mycodemap/actions/workflows/publish.yml`
- NPM package：`https://www.npmjs.com/package/@mycodemap/mycodemap`

如需轮询 Actions，作为后续人工选择，不在本 skill 首期 scope 内自动实现。

## 失败处理

| 场景 | 处理 |
|---|---|
| 无 active / completed milestone | 直接拒绝；要求先完成或归档 milestone |
| 工作区不干净 | 直接拒绝；先提交、stash 或清理 |
| major version jump | 继续前必须高亮警告并等待 Gate #2 |
| tag 冲突 | 直接拒绝；先查明是否重复发布 |
| closeout 后但发布前失败 | 保留 milestone 归档状态；修复后可重新运行 `/release` |
| helper 执行失败 | 返回 `scripts/release.sh` 失败摘要，不在 skill 内偷偷重试不可逆命令 |

## 禁止事项

- 不得绕过 `$gsd-complete-milestone`
- 不得绕过 `docs/rules/release.md` 的双确认门
- 不得把 `.github/workflows/publish.yml` 或 `scripts/release.sh` 的逻辑复制进 skill
- 不得在当前 milestone 的文档 / 验证阶段真实执行 release
- 不得因为用户说“继续”就默认发布；发布必须是显式 `/release v{X.Y}` + 两次确认

## 参考文档

- `docs/rules/release.md`
- `docs/rules/deployment.md`
- `docs/rules/pre-release-checklist.md`
- `AGENTS.md`
- `CLAUDE.md`
