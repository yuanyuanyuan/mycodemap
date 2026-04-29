# 版本发布工作流程

> 本文档定义 `/release` 命令的完整操作流程。
> 它是 milestone closeout 与 npm 发布的统一编排入口，也是 `/release` 的单一权威文档。
>
> **适用对象**：执行发布的 AI 助手或人类操作者。
> **前置阅读**：`docs/rules/pre-release-checklist.md`、`docs/rules/deployment.md`。

> **Runtime adapters**：`.claude/skills/release/SKILL.md` 与 `.agents/skills/release/SKILL.md` 只允许作为运行时薄适配器存在。它们必须回指本文档，不能替代这里的单一权威流程。

---

## 核心原则

1. **1:1 绑定**：每个 milestone 对应一个 npm release。
2. **版本统一**：milestone 版本即 npm 版本（`vX.Y → X.Y.0`，例如 `v1.9 → 1.9.0`）。
3. **二次确认**：在触发任何不可逆操作（版本 bump、tag 创建、远程推送）之前，必须等待用户显式确认。
4. **Thin orchestrator**：`/release` 只做编排和确认门，实际工作委托给现有工具链（`$gsd-complete-milestone`、`scripts/release.sh`、`.github/workflows/publish.yml`）。

---

## 角色分级

发布操作在 `AGENTS.md` 中定义为 **L3-禁止** 等级：

- AI **不得**自主执行版本号变更、tag 创建、远程推送。
- AI **可以**运行验证检查、准备方案、展示摘要、等待用户确认后执行。
- 用户确认是**必需**的，不是可选的。
- 本流程必须严格经过两道确认门；任何缺少显式确认的发布都视为无效。

---

## 触发条件

运行 `/release v{X.Y}` 命令必须同时满足：

1. 当前存在 **已完成且可 closeout** 的 milestone；如果 milestone 已归档，`/release` 只可在做版本发布补步骤时继续，不能跳过 readiness 检查。
2. 用户显式提供了目标版本号（如 `/release v1.9`）。
3. 当前工作区干净（无未提交修改）。
4. 当前分支为 `main`（或仓库定义的发布分支）。
5. 本地与远程都不存在冲突的目标 tag（例如 `v1.9.0`）。

如果以上任一不满足，`/release` 应拒绝执行并说明原因。

---

## 工作流程

```
/release v{X.Y}
  ↓
① 验证触发条件
② 检查 milestone readiness
③ 运行 `$gsd-complete-milestone v{X.Y}`
④ 【Confirmation Gate #1】展示归档摘要
⑤ 计算并展示版本映射
⑥ 【Confirmation Gate #2】展示发布摘要
⑦ 委托机械发布 helper
⑧ 验证 GitHub Actions 触发
⑨ 完成报告
```

### 步骤详解

#### ① 验证触发条件

检查以下项目，任一失败则终止并报告：

- [ ] 用户提供了明确的目标版本号（`v{X.Y}` 格式）
- [ ] `git status --porcelain` 为空（工作区干净）
- [ ] 当前分支为 `main`（或项目配置的 base branch）
- [ ] milestone 已完成并具备 closeout/readiness 证据
- [ ] 本地不存在目标 tag，远程也不存在同名发布 tag
- [ ] `package.json` 当前版本已读出，可计算目标版本映射

#### ② 检查 Milestone Readiness

运行以下检查，收集状态信息用于后续确认门：

```bash
# 运行 readiness gate（hard / warn-only / fallback 三层语义）
mycodemap readiness-gate

# 或结构化输出
mycodemap readiness-gate --json --structured

# 检查开放工件
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" audit-open 2>/dev/null

# 验证 roadmap 状态
# (roadmap analyze 输出)
```

要求：
- 所有 phase 有 `SUMMARY.md`
- 所有 requirement 已勾选（或已记录为 deferred）
- 无未解决的 blocker
- readiness gate 无 `fallback` 状态（若存在 fallback，需人工判断后方可继续）

如果有开放项目，展示给用户并要求选择：
- [R] 解决 — 停止，修复后重新运行 `/release`
- [A] 确认延期 — 记录到 `STATE.md` Deferred Items，继续
- [C] 取消 — 退出

#### ③ 运行 GSD Milestone Closeout

委托给现有 GSD 工具链：

```text
$gsd-complete-milestone v{X.Y}
```

此步骤自动完成：
- 归档 ROADMAP.md → `milestones/v{X.Y}-ROADMAP.md`
- 归档 REQUIREMENTS.md → `milestones/v{X.Y}-REQUIREMENTS.md`
- 更新 MILESTONES.md、PROJECT.md、STATE.md
- 更新 RETROSPECTIVE.md
- 创建安全 commit

等待此步骤完全完成后，继续下一步。

#### ④ 【Confirmation Gate #1】Milestone 归档摘要

展示：

```
Milestone v{X.Y} [{Name}] 归档完成

已归档：
- milestones/v{X.Y}-ROADMAP.md
- milestones/v{X.Y}-REQUIREMENTS.md
- MILESTONES.md 已更新
- PROJECT.md 已演进
- STATE.md 已更新

Phase 统计：{N} phases, {M} plans, {P} tasks
关键交付：
- {accomplishment 1}
- {accomplishment 2}
- ...
```

用户确认后继续（默认 N）。如果用户不确认，则流程停止，不进入任何发布准备步骤。

#### ⑤ 计算并展示版本映射

从 `package.json` 读取当前版本，计算新版本：

```
版本映射：
- Milestone:    v{X.Y}
- NPM 当前:     {current_version}
- NPM 目标:     {X.Y}.0
- 变更类型:     {major/minor/patch}

⚠️ 警告：当前版本 {current_version} → {X.Y}.0 是 {major} 版本跳跃。
   请确认这是预期行为。
```

当前仓库的已知映射示例：

```
v1.9 → 1.9.0
0.5.2-beta.1 → 1.9.0
```

如果版本跳跃跨越 major 边界（0.x → 1.x 或 1.x → 2.x），额外高亮警告并要求操作者重新确认。

#### ⑥ 【Confirmation Gate #2】发布摘要

在触发任何不可逆操作之前，完整展示：

```
═══════════════════════════════════════════════════════
  即将执行以下操作（不可撤销）：
═══════════════════════════════════════════════════════

1. 更新 package.json version: {current} → {X.Y}.0
2. 创建 git commit: "[RELEASE] bump version to v{X.Y}.0"
3. 创建 git tag: v{X.Y}.0
4. 推送到远程 origin
5. 触发 GitHub Actions: publish.yml
   → 构建、测试、NPM 发布、GitHub Release

确认后，以上操作将自动执行。

确认发布 v{X.Y}.0? (y/N):
```

用户必须输入 `y` 或 `Y` 才继续。任何其他输入都终止流程。未经过此 gate，不得执行 `npm version`、git commit、git tag、`git push` 或任何会触发 `.github/workflows/publish.yml` 的动作。

#### ⑦ 委托机械发布 helper

用户确认后，`/release` 默认**委托**给现有机械 helper，而不是在 skill 里重写版本 bump / tag / push 逻辑：

```bash
rtk ./scripts/release.sh {X.Y}.0
```

委托边界如下：

- `/release` 负责前置检查、milestone closeout、版本映射、major 跳跃高亮与 **Confirmation Gate #2**
- `scripts/release.sh` 负责执行既有的 `npm run check:all`、版本写入、git commit、git tag、`git push`
- `.github/workflows/publish.yml` 负责 tag push 后的构建、测试、NPM 发布与 GitHub Release

> 说明：`scripts/release.sh` 当前自带交互确认；它只能作为 `/release` 已通过 **Confirmation Gate #2** 之后的机械 helper，不能替代 `/release` 的安全门。
>
> 说明：Phase 31 / Phase 32 / Phase 33 只定义和验证该流程，不会在当前 milestone 内真的执行这些命令。

如需理解 helper 将触发的底层动作，可参考 `scripts/release.sh` 当前事实：它会写入 `package.json` / `package-lock.json` 版本、创建 `[RELEASE]` commit、创建 `v{X.Y}.0` tag，并推送分支与 tag 到远程。

#### ⑧ 验证 GitHub Actions 触发

推送后，验证 Actions 已触发：

```bash
# 给出 Actions 页面链接
echo "GitHub Actions 发布状态:"
echo "https://github.com/{owner}/{repo}/actions/workflows/publish.yml"
```

如需做**只读 follow-up observability**，统一使用独立命令：

```bash
mycodemap publish-status --tag v{X.Y}.0 --sha {headSha}
mycodemap publish-status --tag v{X.Y}.0 --sha {headSha} --json --structured
```

约束：

- `publish-status` 只读取 `.github/workflows/publish.yml` 的 snapshot truth
- 它必须依赖 `--tag + --sha` 做精确匹配；无法精确确认时返回 `unavailable` / `ambiguous`
- 它**不是**第二条发布路径；`/release` 仍是单一权威，`publish-status` 不得 rerun workflow、不得 dispatch、不得 publish、不得 push
- 默认只做一次 snapshot；是否继续跟进由人类或上层 agent 自主决定

可选：使用 `publish-status` 做非阻塞状态复核，但不要把它当成发布 authority 的一部分。

#### ⑨ 完成报告

```
✅ Release v{X.Y}.0 已触发

Milestone:     v{X.Y} — 已归档
NPM 版本:      {X.Y}.0 — 已推送 tag
GitHub Actions: 运行中

查看状态:
- Actions: https://github.com/{owner}/{repo}/actions
- NPM:     https://www.npmjs.com/package/@mycodemap/mycodemap
- Release: https://github.com/{owner}/{repo}/releases
- Follow-up: `mycodemap publish-status --tag v{X.Y}.0 --sha {headSha}`
```

---

## 错误处理与回滚

### 中途失败

如果在步骤 ③（GSD closeout）之前失败：无持久化副作用，直接终止。

如果在步骤 ③ 完成后、步骤 ⑦ 之前失败：milestone 已归档，但 npm 未发布。可以修复问题后重新运行 `/release`（GSD closeout 部分会检测到已归档并跳过）。

如果在步骤 ⑦ 中失败（如 push 被拒绝）：
- 若 commit 已创建但 push 失败：修复远程冲突后手动推送。
- 若 tag 已创建但 push 失败：手动 `git push origin v{X.Y}.0`。
- 若 package.json 已修改但 commit 未创建：`git checkout package.json package-lock.json` 回滚。

### 版本冲突

如果本地或远程已存在 `v{X.Y}.0` tag：
- 拒绝执行，报告冲突。
- 建议用户检查是否重复运行 `/release`。

如果 package.json 中版本已经是 `{X.Y}.0`：
- 跳过版本 bump，只创建 tag 和推送。

---

## 禁止事项

- **不得**在二次确认门之前执行任何 git 写操作（commit、tag、push）。
- **不得**跳过 GSD milestone closeout 直接执行 `scripts/release.sh`。
- **不得**在存在未解决 blocker 时继续发布（除非用户显式选择 [A] 确认延期）。
- **不得**将 `NPM_TOKEN` 硬编码到任何脚本或文档中。
- **不得**绕过 `docs:check:pre-release` 检查。
- **不得**把 `/release` 文档写成第二套 closeout 或 publish 实现；它必须是 thin orchestrator。

---

## 文档同步触发条件

以下变更会触发本文档需要更新：

- GSD closeout 工作流变更（步骤或顺序变化）
- `scripts/release.sh` 行为变更（参数、交互方式变化）
- `.github/workflows/publish.yml` 触发条件变化
- 版本映射规则变化
- 确认门内容或格式变化

---

*版本: 1.0.0 | 最后更新: 2026-04-22*
