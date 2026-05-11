# Release Recovery Agent 详细流程

> 本文档是 SKILL.md 中 Release Recovery Agent 角色的详细执行指南，包含已知失败模式。

## 触发条件

- 用户输入 `/release-diagnose v{X.Y}`
- 用户问"为什么发布失败"、"Actions 失败了怎么修"
- Verification Agent 发现失败后用户请求排查

## 绝对边界

- **只分析、建议，不自动执行修复**（除非用户显式确认）
- 涉及删除远程 tag、force push、重新 release 等操作，必须视为 L3，等待用户确认
- 不得擅自修改 `scripts/release.sh` 或 `.github/workflows/publish.yml` 的核心逻辑，除非定位到明确的 bug

## 执行流程

### 1. 收集失败证据

优先使用 `gh` CLI 获取 Actions 日志：

```bash
# 列出失败的 runs
gh run list --repo yuanyuanyuan/mycodemap --workflow "Publish to NPM" -L 5

# 查看失败的 job 详情
gh run view {run_id} --repo yuanyuanyuan/mycodemap

# 查看失败日志
gh run view {run_id} --repo yuanyuanyuan/mycodemap --log-failed

# 下载完整日志（如需 deeper analysis）
gh run view {run_id} --repo yuanyuanyuan/mycodemap --log
```

如果 `gh` CLI 不可用，回退到 GitHub API 或让用户手动提供日志片段。

### 2. 根因分类

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

### 3. 已知的具体失败模式（来自实际发布经验）

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

**模式 5: 测试硬编码路径（2026-05-11 发现）**
- 测试中硬编码 `/data/codemap` 路径，CI 环境路径为 `/home/runner/work/mycodemap/mycodemap`
- 表现：`expected "/data/codemap" to be "/home/runner/work/mycodemap/mycodemap"`
- **修复**: 将硬编码路径改为 `process.cwd()` 或动态获取

**模式 6: 测试依赖索引文件不存在（2026-05-11 发现）**
- 测试期望 `MISSING_QUERY_TYPE` 错误，但 CI 环境没有 `.mycodemap/codemap.json` 索引文件，返回 `INDEX_NOT_FOUND`
- 测试期望 `status: 'ok'`，但 CI 环境没有索引文件，返回 `status: 'error'`
- 涉及文件：
  - `src/server/mcp/__tests__/dynamic-server.test.ts`
  - `src/server/mcp/__tests__/CodeMapMcpServer.test.ts`
  - `src/cli/commands/__tests__/env-contract-command.test.ts`
  - `tests/e2e/headless-subagent-verification.test.ts`
- **修复**: 修改测试，使其在没有索引文件时也能通过（检查 `INDEX_NOT_FOUND` 错误或跳过测试）

**模式 7: esbuild ETXTBSY 错误（2026-05-11 发现）**
- CI 中 `npm ci` 时 esbuild 安装失败，报 `ETXTBSY` 错误
- 这是 GitHub Actions 的临时问题，不是代码问题
- **修复**: 重新触发 workflow 即可

### 4. 输出诊断报告

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

### 5. 修复执行（需用户确认）

如果用户确认修复，Recovery Agent 可以：
- 修改源文件（AI 文档版本、CHANGELOG、scripts/release.sh 等）
- commit 修复
- **删除远程 tag 并重新创建**（L3，必须显式确认）
- 推送修复后的 commit 和 tag
- 建议用户重新运行 `/release-verify v{X.Y}`
