# 预发布自动发布故障修复记录

> 日期：2026-04-19  
> 状态：已修复  
> 范围：npm Trusted Publishing / GitHub Actions 发布链路 / 发布前版本校验

## 问题摘要

- [证据] `v0.5.2-beta.0` 首次真实自动发布失败，失败 run 为 `24632519866`。
- [证据] 失败并不是 npm Trusted Publisher 配置缺失，而是发布链路中有两个代码层问题：
  1. `scripts/pre-release-check.js:112` 的 YAML 版本提取正则不支持 prerelease 版本；
  2. `.github/workflows/publish.yml:124` 在发布 prerelease 版本时没有显式传 `npm publish --tag <preid>`。
- [证据] 修复后，`v0.5.2-beta.1` 的真实自动发布成功，成功 run 为 `24632744587`。
- [证据] 发布完成后，npm dist-tag 状态为：
  - `latest -> 0.5.1`
  - `beta -> 0.5.2-beta.1`

## 现象

### 现象 1：发布前检查误判版本不一致

- [证据] `package.json`、`llms.txt`、`AI_GUIDE.md`、`AI_DISCOVERY.md` 都是 `0.5.2-beta.0`。
- [证据] 但 `scripts/pre-release-check.js` 把 `ai-document-index.yaml` 的版本解析成了 `0.5.2`，导致 prerelease 版本无法被完整识别。
- [推论] 这会让发布前检查在 beta/rc 版本上产生错误噪音，阻断或误导发布判断。

### 现象 2：GitHub Actions 在 npm publish 阶段失败

- [证据] `v0.5.2-beta.0` 的发布 run `24632519866` 在 `Publish to NPM` 步骤失败。
- [证据] 关键报错是：`You must specify a tag using --tag when publishing a prerelease version.`
- [推论] 这说明 Trusted Publishing 本身已经工作，问题不在 npm 仓库授权，而在 workflow 对 prerelease 版本没有传 dist-tag。

## 根因分析

### 根因 1：YAML prerelease 解析规则过窄

- [证据] `scripts/pre-release-check.js:114` 之前只匹配 `x.y.z`，不匹配 `x.y.z-beta.0` 这类版本。
- [证据] 修复提交：`73cf296 [BUGFIX] release: support prerelease YAML version checks`
- [推论] 只要版本同步文件里存在 prerelease，旧逻辑都会把它截断，导致版本一致性检查不可靠。

### 根因 2：npm@11 对 prerelease 发布要求显式 dist-tag

- [证据] `.github/workflows/publish.yml:83` 现在新增 `Determine npm dist-tag` 步骤，从版本号推导 npm tag。
- [证据] `.github/workflows/publish.yml:128` 现在会在 OIDC 与 `NPM_TOKEN` fallback 两条路径上统一传 `--tag "$DIST_TAG"`。
- [证据] 修复提交：`93a1a7a [BUGFIX] release: publish prereleases with dist-tags`
- [推论] 升级到 `npm@11.5.1` 以后，prerelease 发布必须显式指定 `--tag beta` / `--tag rc` 等，否则 registry 会拒绝发布。

## 修复方案

### 修复 1：放宽 prerelease 版本匹配

- [证据] 在 `scripts/pre-release-check.js:112` 附近，把 YAML 版本提取规则改为支持 `(\d+\.\d+\.\d+(?:-[\w.]+)?)`。
- [结果] `npm run docs:check:pre-release` 现在可以正确识别 `0.5.2-beta.1`。

### 修复 2：在 workflow 中显式推导并传递 npm dist-tag

- [证据] 在 `.github/workflows/publish.yml:83` 新增 `Determine npm dist-tag`：
  - 稳定版默认 `latest`
  - prerelease 从 preid 推导，例如 `beta`、`rc`
- [证据] 在 `.github/workflows/publish.yml:124` 的发布步骤中：
  - OIDC 路径使用 `npx npm@11.5.1 publish --tag "$DIST_TAG"`
  - Token fallback 路径使用 `npx npm@11.5.1 publish --tag "$DIST_TAG" --provenance`
- [结果] `v0.5.2-beta.1` 成功发布到 npm 的 `beta` dist-tag。

### 修复 3：同步发布说明与验证规则

- [证据] 文档已同步到以下位置：
  - `docs/PUBLISHING.md`
  - `docs/rules/validation.md`
  - `docs/rules/pre-release-checklist.md`
- [推论] 这一步是为了把“prerelease 必须显式传 dist-tag”的真实约束写回文档，避免下次再次按旧认知排障。

## 处理过程

1. [证据] 先完成 `0.5.2-beta.0` 版本准备并推送 tag，触发首次真实发布。
2. [证据] 发现本地 `docs:check:pre-release` 被 YAML prerelease 解析问题阻断。
3. [证据] 修复 `scripts/pre-release-check.js` 后，本地预检查、测试、构建、打包验证全部通过。
4. [证据] 首次远端 run `24632519866` 仍在 `Publish to NPM` 失败，暴露 `npm publish --tag` 缺失问题。
5. [证据] 修复 workflow 和文档后，准备 `0.5.2-beta.1` 并重新推送。
6. [证据] 第二次远端 run `24632744587` 成功完成 `Publish to NPM`、`Generate Release Notes`、`Create GitHub Release`。

## 验证结果

### 本地验证

- [证据] `npm run docs:check:pre-release` 通过
- [证据] `npm test` 通过，`916/916` 测试通过
- [证据] `npm run build` 通过
- [证据] `npm run validate-pack` 通过

### 远端验证

- [证据] GitHub Actions 成功 run：`24632744587`
- [证据] GitHub Release 已创建：`v0.5.2-beta.1`
- [证据] npm registry 已更新 `beta` dist-tag 到 `0.5.2-beta.1`

## 相关提交

- [证据] `73cf296 [BUGFIX] release: support prerelease YAML version checks`
- [证据] `93a1a7a [BUGFIX] release: publish prereleases with dist-tags`
- [证据] `0d7e8c0 [CONFIG] release: prepare v0.5.2-beta.1`

## 残留事项

- [证据] workflow 仍有非阻断告警：
  - `actions/create-release@v1` 使用 Node 20，将来需要升级
  - `set-output` 已废弃，后续应替换为环境文件方式
  - 存在一个 `git exit code 128` 注解噪音，但不影响发布成功
- [观点] 这些问题不影响当前发布结果，但建议作为下一轮 release-infra 清理项集中处理。

## 下次发布的最小检查清单

- [证据] 若版本是 prerelease，确认版本号包含 preid，例如 `0.5.2-beta.2`
- [证据] 先运行 `npm run docs:check:pre-release`
- [证据] 再运行 `npm test`、`npm run build`、`npm run validate-pack`
- [证据] 推送匹配版本的 tag，观察 `Publish to NPM` workflow
- [证据] 发布后检查：
  - `npm view @mycodemap/mycodemap version dist-tags --json`
  - `gh release view v<version>`

