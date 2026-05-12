---
name: mycodemap-release
description: CodeMap 项目专用发布治理技能。统一 `/release v{X.Y}` 发布编排，包含 milestone readiness、版本映射、双确认门、发布验证和失败排查。适用于：(1) 执行 `/release v{X.Y}` 发布；(2) 验证发布结果 `/release-verify v{X.Y}`；(3) 排查发布失败 `/release-diagnose v{X.Y}`；(4) 用户询问"发布成功了吗"或"为什么发布失败"。发布属于 L3 级操作，必须经过双确认门。
user-invocable: true
---

# MyCodeMap Release

> 单一权威：先读 `docs/rules/release.md`。本 skill 是 Claude 运行时薄编排器，不是第二套发布手册。

## 核心约束

- 发布属于 **L3**：没有用户显式确认前，**不得**执行 `npm version`、git commit、git tag、`git push`
- 本 skill 是 **thin orchestrator**：只验证、展示、确认、委托
- 机械发布复用现有工具链：`$gsd-complete-milestone`、`scripts/release.sh`、`.github/workflows/publish.yml`
- 不得在仓库写入 `NPM_TOKEN` 或其他 secret

## 角色分工

本 skill 包含三个独立执行面，用户可按需调用：

| 角色 | 触发词 | 职责 | 权限 |
|------|--------|------|------|
| **Release Orchestrator** | `/release v{X.Y}` | readiness → closeout → 双确认门 → helper 委托 | 可执行 git 写操作（经用户确认后） |
| **Release Verification Agent** | `/release-verify v{X.Y}` | 查询 NPM 版本、GitHub Actions 状态、生成验证报告 | **只读** |
| **Release Recovery Agent** | `/release-diagnose v{X.Y}` | 分析 Actions 失败日志、定位根因、提出修复方案 | 可建议修复，执行前需用户确认 |

---

## 角色 A: Release Orchestrator

### 触发条件

- 用户输入 `/release v{X.Y}`
- 用户要求把 milestone closeout 与 npm release 串成一次受控操作

### 工作流概览

```
/release v{X.Y}
  ↓
① 解析输入并拒绝无效触发
② 运行 readiness checks
③ 委托 milestone closeout
④ 【Confirmation Gate #1】展示归档摘要
⑤ 计算版本映射并高亮 major jump
⑥ 【Confirmation Gate #2】展示发布摘要
⑦ 委托机械发布 helper
⑧ 移交验证
```

### 先读事实

```bash
# 必读文档
docs/rules/release.md
docs/rules/pre-release-checklist.md
.planning/ROADMAP.md
package.json

# 必读脚本
scripts/release.sh
.github/workflows/publish.yml
```

### 关键检查点

**拒绝条件**（任一不满足则拒绝）：
- 没有 active milestone，且也没有与 `v{X.Y}` 对应的已完成 / 已归档 milestone
- 工作区不干净（`rtk git status --short` 非空）
- 当前分支不是 `main`
- milestone readiness 不足：开放项未处理、缺 summary / verification
- 远程已存在冲突 tag（例如 `v1.9.0`）— 本地存在冲突 tag 时可选择使用它
- `package.json` 无法读取当前版本

**版本映射规则**：`vX.Y → X.Y.0`（例如 `v1.9 → 1.9.0`）

**Major Jump 警告**：如果是 major 跳跃（包括 `0.x → 1.x`），必须额外高亮警告。

### Confirmation Gates

**Gate #1**：展示 milestone 归档摘要，等待用户确认（默认 No）

**Gate #2**：展示完整发布摘要，只接受单独的 `y` 或 `Y`

### 委托机械发布

只有在 Gate #2 明确通过后：

**使用已有 tag 时：**

```bash
rtk ./scripts/release.sh {X.Y}.0 --use-tag v{X.Y}.0
```

**创建新 tag 时：**

```bash
rtk ./scripts/release.sh {X.Y}.0
```

### 移交验证

Orchestrator 完成委托后，**不得**自动执行验证。必须向用户明确移交：

```text
✅ Release Orchestrator 已完成委托

下一步请执行：
1. 等待 GitHub Actions 完成（约 2-5 分钟）
2. 运行 /release-verify v{X.Y} 验证发布结果
3. 如果验证失败，运行 /release-diagnose v{X.Y} 排查原因
```

> 详细流程参见 [references/orchestrator.md](references/orchestrator.md)

---

## 角色 B: Release Verification Agent

### 触发条件

- 用户输入 `/release-verify v{X.Y}`
- 用户问"发布成功了吗"、"NPM 更新了吗"、"Actions 跑完了吗"

### 执行流程

1. **查询 NPM 版本**：`npm view @mycodemap/mycodemap version`
2. **查询 GitHub Actions 状态**：使用 `gh run list` 和 `gh run view`
3. **查询远程 tag 存在性**：`rtk proxy git ls-remote --tags origin`
4. **输出验证报告**：包含 NPM、Actions、Remote Tag 状态

> 详细流程参见 [references/verification.md](references/verification.md)

---

## 角色 C: Release Recovery Agent

### 触发条件

- 用户输入 `/release-diagnose v{X.Y}`
- 用户问"为什么发布失败"、"Actions 失败了怎么修"

### 绝对边界

- **只分析、建议，不自动执行修复**（除非用户显式确认）
- 涉及删除远程 tag、force push 等操作，必须视为 L3，等待用户确认

### 执行流程

1. **收集失败证据**：使用 `gh run view --log-failed` 获取 Actions 日志
2. **根因分类**：pre-release guardrail / commit format / test failure / build failure / publish auth / validate-pack / workflow infra
3. **输出诊断报告**：失败 Workflow、失败 Step、根因分类、修复建议
4. **修复执行**（需用户确认）：修改文件、commit、删除并重新创建远程 tag

> 详细流程和已知失败模式参见 [references/recovery.md](references/recovery.md)

---

## 失败处理速查

| 场景 | 处理 |
|---|---|
| 无 active / completed milestone | 直接拒绝；要求先完成或归档 milestone |
| 工作区不干净 | 直接拒绝；先提交、stash 或清理 |
| major version jump | 继续前必须高亮警告并等待 Gate #2 |
| 远程 tag 冲突 | 直接拒绝；先查明是否重复发布 |
| 本地 tag 冲突 | 提供选择：使用已有 tag / 删除并重建 / 取消发布 |
| closeout 后但发布前失败 | 保留 milestone 归档状态；修复后可重新运行 `/release` |
| helper 执行失败 | 返回 `scripts/release.sh` 失败摘要，移交 Recovery Agent |
| Actions 失败（已推送 tag） | Recovery Agent 分析 → 修复 → 删除并重打 tag → 重新验证 |
| NPM 未更新（Actions success） | 检查 `publish.yml` 的 `npm publish` 步骤，可能是 dist-tag 或 registry 问题 |
| CHANGELOG 缺失 | 在 `CHANGELOG.md` 顶部添加版本条目 |
| 测试硬编码路径 | 将 `/data/codemap` 改为 `process.cwd()` |
| 测试依赖索引文件 | 修改测试以处理 `INDEX_NOT_FOUND` 错误 |
| esbuild ETXTBSY | 重新触发 workflow（GitHub Actions 临时问题） |

---

## 禁止事项

- 不得绕过 `$gsd-complete-milestone`
- 不得绕过 `docs/rules/release.md` 的双确认门
- 不得把 `.github/workflows/publish.yml` 或 `scripts/release.sh` 的逻辑复制进 skill
- 不得在当前 milestone 的文档 / 验证阶段真实执行 release
- 不得因为用户说"继续"就默认发布；发布必须是显式 `/release v{X.Y}` + 两次确认
- Orchestrator **不得**自动执行 Verification 或 Recovery；必须明确移交
- Recovery Agent **不得**在未经用户确认的情况下删除远程 tag 或 force push

---

## 参考文档

- `docs/rules/release.md` — 发布流程单一权威
- `docs/rules/deployment.md` — 部署配置
- `docs/rules/pre-release-checklist.md` — 发布前检查清单
- `AGENTS.md` — 仓库级宪法
