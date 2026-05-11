# Release Verification Agent 详细流程

> 本文档是 SKILL.md 中 Release Verification Agent 角色的详细执行指南。

## 触发条件

- 用户输入 `/release-verify v{X.Y}`
- 用户问"发布成功了吗"、"NPM 更新了吗"、"Actions 跑完了吗"
- Orchestrator 委托完成后用户需要验证

## 执行流程

### 1. 查询 NPM 版本

```bash
npm view @mycodemap/mycodemap version
```

对比期望版本 `{X.Y}.0`：
- 如果一致 → ✅ NPM 发布成功
- 如果不一致 → ❌ NPM 未更新，移交 Recovery Agent

### 2. 查询 GitHub Actions 状态

优先使用 `gh` CLI（Claude runtime 通常已安装并认证）：

```bash
# 列出最近的 runs
gh run list --repo yuanyuanyuan/mycodemap --workflow "Publish to NPM" -L 5
gh run list --repo yuanyuanyuan/mycodemap --workflow "CI Gateway" -L 5

# 查看特定 run
gh run view {run_id} --repo yuanyuanyuan/mycodemap

# 查看失败日志
gh run view {run_id} --repo yuanyuanyuan/mycodemap --log-failed
```

关注点：
- 与当前 tag `v{X.Y}.0` / commit SHA 匹配的 workflow run
- `Publish to NPM` 的 conclusion: `success` / `failure` / `in_progress`
- `CI Gateway` 的 conclusion（push 到 main 触发）

如果 `gh` CLI 不可用，回退到 GitHub API：

```bash
curl -s "https://api.github.com/repos/yuanyuanyuan/mycodemap/actions/runs?event=push&per_page=5"
```

如果无法精确匹配 run（例如存在多个并发 run），返回 `ambiguous`，不要猜测。

### 3. 查询远程 tag 存在性

```bash
rtk proxy git ls-remote --tags origin "refs/tags/v{X.Y}.0"
```

### 4. 输出验证报告

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
