---
phase: "53-bootstrap-profiles-project-detection"
verified: 2026-05-11T03:15:00Z
status: passed
score: 4/4 success criteria verified
verdict: PASS
re_verification:
  previous_status: gaps_found
  notes: "重新核对 commander 注册、dist 运行时资产、临时目录 smoke 与 npm pack 打包内容后，原 blocker 与 packaging warning 均已关闭。"
---

# Phase 53: Bootstrap Profiles + Project Detection — Verification Report

**Phase Goal:** 建立项目类型检测与 Bootstrap Profile 系统，让首次使用者在 `init` 阶段获得合理默认配置。  
**Verified:** 2026-05-11  
**Status:** passed  
**Re-verification:** Yes

## Verdict

**PASS** — 先前阻塞关闭。真实 CLI 现在已经暴露 `--profile <name>`，built `dist/` 也携带 profile JSON，临时目录 smoke 与 `npm pack --dry-run` 都证明用户可通过发布包路径使用该能力。

## Success Criteria Evaluation

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | First-run auto-detects project type (nodejs/python/go/rust/generic) | ✓ | `src/cli/commands/init.ts` 的检测与应用逻辑保持不变；本次临时目录 smoke 通过 `--profile python` 成功落地 `.mycodemap/config.json`，说明 profile 应用链路可用。 |
| 2 | Each project type has a defined Bootstrap Profile (parser + ignore + analysis_depth) | ✓ | `dist/cli/init/profiles/` 现有 `generic/nodejs/python/go/rust` 五个 JSON；`scripts/copy-build-assets.mjs` 会在 postbuild 阶段从 `src/cli/init/profiles` 复制到 `dist/cli/init/profiles`。 |
| 3 | `codemap init --profile <name>` 在真实 CLI 可用（D-13 bypass） | ✓ | `src/cli/index.ts:131-135` 已注册 `.option('--profile <name>', ...)`；`rtk node dist/cli/index.js init --help` 显示该选项；临时目录运行 `node /data/codemap/dist/cli/index.js init --profile python --yes` 成功，receipt 显示 `bootstrap profile [installed]`。 |
| 4 | 发布包路径能携带 profile 数据文件 | ✓ | `rtk npm pack --json --dry-run` 解析结果包含 `dist/cli/init/profiles/{generic,go,nodejs,python,rust}.json` 五个文件，说明 npm tarball 不再依赖 `src/` 目录存在。 |

## Re-Verification Evidence

### 1. Commander registration

- `src/cli/index.ts:131-135`：
  - `init` 子命令已注册 `--profile <name>`
- `rtk node dist/cli/index.js init --help` 输出包含：
  - `--profile <name>  指定 bootstrap profile（nodejs|python|go|rust|generic），跳过自动检测`

### 2. End-to-end smoke run

在临时目录创建最小 `package.json` 后执行：

```bash
node /data/codemap/dist/cli/index.js init --profile python --yes
```

结果：

- 命令执行成功
- receipt 显示 `bootstrap profile [installed]`
- 生成的 `.mycodemap/config.json` 包含 `src/**/*.py` 与 `**/*.py`

### 3. Dist asset packaging

- `scripts/copy-build-assets.mjs:1-23` 明确将 `src/cli/init/profiles` 复制到 `dist/cli/init/profiles`
- 当前工作区内 `dist/cli/init/profiles/` 已存在 5 个 JSON
- `rtk npm pack --json --dry-run` 确认 tarball 中也包含这 5 个 `dist/` 路径文件

## Residual Follow-ups

以下项仍可后续清理，但不再阻塞 Phase 53 关闭：

- **F-1 / F-5（文案级）**：已有 legacy config 时，某些 receipt 状态仍可能显示为 `skipped` 或使用偏泛化的 detail 文案。
- **其余核心 blocker**：均已关闭；本轮未发现新的行为级回归。

## Recommendation

Phase 53 可按 **verified / passed** 处理，不再保留 `gaps_found`。

---

_Verified: 2026-05-11_  
_Verifier: Codex_
