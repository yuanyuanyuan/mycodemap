# Release Orchestrator 详细流程

> 本文档是 SKILL.md 中 Release Orchestrator 角色的详细执行指南。

## 先读事实

```bash
# 必读文档
docs/rules/release.md
docs/rules/deployment.md
docs/rules/pre-release-checklist.md
.planning/ROADMAP.md
.planning/STATE.md
package.json

# 必读脚本
scripts/release.sh
.github/workflows/publish.yml
```

## 步骤 1: 解析输入并拒绝无效触发

如果用户没有提供目标版本，直接拒绝并要求显式格式：

```text
/release v1.9
```

以下任一条件不满足时，必须拒绝继续：

- 没有 active milestone，且也没有与 `v{X.Y}` 对应的已完成 / 已归档 milestone
- 工作区不干净（`rtk git status --short` 非空）
- 当前分支不是 `main`（`rtk git rev-parse --abbrev-ref HEAD`）
- milestone readiness 不足：开放项未处理、缺 summary / verification、requirements 未关闭或未 deferred
- 远程已存在冲突 tag（例如 `v1.9.0`）— 本地存在冲突 tag 时可选择使用它
- `package.json` 无法读取当前版本，无法计算 `vX.Y → X.Y.0`

## 步骤 2: 运行 readiness checks

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

## 步骤 2.5: 检查已有本地 tag

检查本地是否已存在目标 tag：

```bash
rtk proxy git tag -l "v{X.Y}.0"
```

如果本地已存在该 tag，向用户展示选择：

```text
本地已存在 tag: v{X.Y}.0 (commit: abc1234)

选项:
1. 使用此已有 tag（跳过创建 tag 步骤）
2. 删除并重新创建 tag
3. 取消发布

请选择 (1/2/3):
```

- 选择 1：后续调用 `scripts/release.sh {X.Y}.0 --use-tag v{X.Y}.0`
- 选择 2：先执行 `git tag -d v{X.Y}.0`，然后正常流程
- 选择 3：立即停止

如果本地不存在该 tag，继续正常流程。

## 步骤 3: Confirmation Gate #1

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

## 步骤 4: 计算版本映射并高亮 major jump

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

## 步骤 5: Confirmation Gate #2

在任何不可逆动作之前，必须展示完整发布摘要，并且只接受明确的 `y / Y`：

**使用已有 tag 时：**

```text
Confirmation Gate #2 — irreversible release actions

即将委托 `scripts/release.sh {X.Y}.0 --use-tag v{X.Y}.0`，它会执行：
1. npm / docs / test / lint checks
2. 版本写入
3. git commit
4. 使用已有 tag: v{X.Y}.0（跳过创建）
5. git push
6. 触发 .github/workflows/publish.yml

确认发布 v{X.Y}.0? (y/N)
```

**创建新 tag 时：**

```text
Confirmation Gate #2 — irreversible release actions

即将委托 `scripts/release.sh {X.Y}.0`，它会执行：
1. npm / docs / test / lint checks
2. 版本写入
3. git commit
4. git tag（新建 v{X.Y}.0）
5. git push
6. 触发 .github/workflows/publish.yml

确认发布 v{X.Y}.0? (y/N)
```

规则：

- 只接受单独的 `y` 或 `Y`
- 任何其他输入都视为取消
- 未通过本 gate，**不得**调用 `scripts/release.sh`

## 步骤 6: 委托机械发布

只有在 **Confirmation Gate #2** 明确通过后，才允许调用：

**使用已有 tag 时：**

```bash
rtk ./scripts/release.sh {X.Y}.0 --use-tag v{X.Y}.0
```

**创建新 tag 时：**

```bash
rtk ./scripts/release.sh {X.Y}.0
```

说明：

- 这是对现有 helper 的委托，不在 skill 中重复实现 commit / tag / push 细节
- `scripts/release.sh` 自带确认提示，但它只是 helper 的附加交互，**不能替代** Gate #2
- 如果用户撤销或 helper 失败，停止流程并返回失败摘要
- `--use-tag` 选项会让脚本跳过创建 tag 步骤，直接使用指定的已有 tag

## 步骤 7: 移交验证

委托完成后，Orchestrator 的职责结束。必须向用户明确移交：

```text
✅ Release Orchestrator 已完成委托

下一步请执行：
1. 等待 GitHub Actions 完成（约 2-5 分钟）
2. 运行 /release-verify v{X.Y} 验证发布结果
3. 如果验证失败，运行 /release-diagnose v{X.Y} 排查原因
```

Orchestrator **不得**自动执行验证或排查。这是 Verification Agent 和 Recovery Agent 的职责。
