# Engineering Backlog

> 非 milestone 绑定的工程债务、优化机会与待决问题。
> 来源：开发过程中的发现，不阻塞当前 phase，但需在合适时机处理。

---

## Hook 双文件同步脆弱性

**发现日期:** 2026-05-06
**发现来源:** pre-commit hook 优化（`vitest --changed` → `related`）
**状态:** 已临时解决，架构待改进
**优先级:** 中

### 问题描述

pre-commit hook 存在**两个物理文件**维护同一份逻辑：

| 路径 | 作用 | 是否被 git 追踪 |
|------|------|----------------|
| `.githooks/pre-commit` | 版本控制的"源文件"（真源） | ✅ 是 |
| `.mycodemap/hooks/pre-commit` | 本地实际生效的 payload | ❌ 否（`.mycodemap/` 在 `.gitignore`） |

git 的执行链：
```
.git/hooks/pre-commit (shim)
    ↓ 调用
.mycodemap/hooks/pre-commit (payload)
    ↑ 由 mycodemap init 从 .githooks/pre-commit 复制生成
```

**风险：** 修改 `.githooks/pre-commit` 后，`.mycodemap/hooks/pre-commit` 不会自动更新。需要：
1. 开发者手动同步；或
2. 重新运行 `mycodemap init`

如果两边内容漂移，本地行为与版本控制不一致，容易在团队间产生"为什么我本地 hook 行为和你不同"的困惑。

### 当前状态

- `.githooks/pre-commit` 已更新为 `vitest related <staged>` + 单 fork 回退策略（commit `5d5aa09`）
- `.mycodemap/hooks/pre-commit` 已手动同步，当前与源文件内容一致
- `vitest.config.ts` 的 `maxThreads` 已从 4 降到 2（commit `d3be046`）

### 建议方案

**方案 A：Symlink（最简单）**
让 `.mycodemap/hooks/pre-commit` 变成 symlink 指向 `.githooks/pre-commit`，改一处即两处生效。

**方案 B：改 `src/cli/init/hooks.ts` 的安装逻辑**
在 `mycodemap init` 中，如果检测到 `.githooks/pre-commit` 与 `.mycodemap/hooks/pre-commit` 内容不一致，给出警告或自动重新同步。

**方案 C：弃用 `.githooks/`，直接以 `.mycodemap/hooks/` 为真源**
但 `.mycodemap/` 被 gitignore，不可行。

### 关联文件

- `.githooks/pre-commit`
- `.mycodemap/hooks/pre-commit`
- `.git/hooks/pre-commit`（shim）
- `src/cli/init/hooks.ts`（hook 安装逻辑）

---
