# NPM 自动发布指南
3
> 本文档说明如何配置和触发 @mycodemap/mycodemap 的自动发布流程

## 📋 发布流程概览

```
本地执行 release.sh → 推送 tag → GitHub Actions → 发布到 NPM
```

## 🔧 前置配置

本项目使用 **OIDC Trusted Publishing** 方式发布，无需配置 NPM Token。

### OIDC Trusted Publishing 配置

1. **在 NPM 上配置 Trusted Publisher**
   - 访问包管理页面: https://www.npmjs.com/package/@mycodemap/mycodemap/access
   - 找到 "Publishing" 或 "Grant Access" 部分
   - 点击 "Add GitHub Actions as a trusted publisher"
   - 填写以下信息:
     - **GitHub Organization**: `yuanyuanyuan`
     - **GitHub Repository**: `mycodemap`
     - **Workflow Name**: `publish.yml`
     - **GitHub Environment**: (留空)

2. **确保没有设置 NPM_TOKEN**
   ```bash
   # 检查是否设置了 NPM_TOKEN
   gh secret list | grep NPM_TOKEN
   
   # 如果存在，删除它
   gh secret remove NPM_TOKEN
   ```

3. **验证权限配置**
   确保 workflow 中设置了正确的权限:
   ```yaml
   permissions:
     contents: write  # 用于创建 GitHub Release
     id-token: write  # 用于 OIDC trusted publishing (必需)
   ```

### 2FA/OTP 注意事项

如果你的 npm 账号启用了 2FA，使用 OIDC 发布**不需要**提供 OTP，因为 OIDC 会绕过 2FA 限制。

**注意**: 不要在 workflow 中设置 `NODE_AUTH_TOKEN` 环境变量，这会干扰 OIDC 认证。

## 🚀 发布操作

### 方法 1: 使用发布脚本 (推荐)

```bash
# 进入项目目录
cd /path/to/mycodemap

# 发布 patch 版本 (0.2.0 -> 0.2.1)
./scripts/release.sh patch

# 发布 minor 版本 (0.2.0 -> 0.3.0)
./scripts/release.sh minor

# 发布 major 版本 (0.2.0 -> 1.0.0)
./scripts/release.sh major

# 发布指定版本
./scripts/release.sh 0.2.1
```

脚本会自动：
1. 更新 `package.json` 和 `package-lock.json` 中的版本号
2. 运行完整的代码检查
3. 提交版本更新
4. 创建 git tag
5. 推送到远程仓库
6. 触发 GitHub Actions 发布流程

### 方法 2: 手动操作

```bash
# 1. 更新版本号
npm version patch  # 或 minor, major

# 2. 推送代码和标签
git push origin main --tags

# 或者直接推送特定标签
git push origin v0.2.1
```

### 方法 3: GitHub 网页手动触发

1. 进入仓库 Actions → Publish to NPM
2. 点击 "Run workflow"
3. 可选择输入版本号，或直接运行使用当前 package.json 版本

### 方法 4: 本地直接发布 (需要 2FA OTP)

**注意**: 如果账号启用了 2FA，本地发布需要提供 OTP：

```bash
# 确保所有检查通过
npm run check:all

# 发布到 npm (需要 2FA OTP)
npm publish --access public --otp=YOUR_OTP_CODE

# 例如
npm publish --access public --otp=250222
```

## ✅ 发布前完整检查流程

发布前必须执行以下检查：

```bash
# 1. 类型检查
npm run typecheck

# 2. 代码检查
npm run lint

# 3. 运行测试
npm test

# 4. 构建项目
npm run build

# 5. 打包验证
npm run validate-pack

# 6. 发布前 AI 文档检查
npm run docs:check:pre-release

# 7. 发布预览
npm pack --dry-run

# 或使用一键检查
npm run check:all
```

### 发布前检查清单

- [ ] 更新 `CHANGELOG.md` 记录本次变更
- [ ] 运行 `npm run docs:check:pre-release` - 确保 AI 文档检查通过
- [ ] 运行 `npm run typecheck` - 确保 0 errors
- [ ] 运行 `npm run lint` - 确保 0 errors (warnings 可接受)
- [ ] 运行 `npm test` - 确保所有测试通过
- [ ] 运行 `npm run validate-pack` - 确保打包验证通过
- [ ] 检查 `package.json` 版本号符合 [semver](https://semver.org/lang/zh-CN/) 规范
- [ ] 确保 git tag 与 package.json 版本一致
- [ ] 更新 `README.md` 中的版本说明（如需要）

## 🔧 GitHub Actions Workflow 配置

完整的 `.github/workflows/publish.yml` 配置：

```yaml
# [META] since:2026-03-04 | owner:release-team | stable:true
# [WHY] NPM package publishing workflow - 使用 OIDC Trusted Publishing

name: Publish to NPM

on:
  # 方式1: 推送 v* 标签时自动发布
  push:
    tags:
      - 'v*'
  
  # 方式2: 手动触发（推荐用于首次发布或特殊情况）
  workflow_dispatch:
    inputs:
      version:
        description: '版本号 (例如: 0.2.0)，留空则使用 package.json 中的版本'
        required: false
        type: string

jobs:
  publish:
    name: Build and Publish
    runs-on: ubuntu-latest
    permissions:
      contents: write  # 用于创建 GitHub Release
      id-token: write  # 用于 OIDC trusted publishing (必需)

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 获取完整历史用于生成 changelog

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'

      - name: Get version from package.json
        id: package-version
        run: |
          VERSION=$(node -p "require('./package.json').version")
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Package version: $VERSION"

      - name: Validate version
        run: |
          VERSION="${{ steps.package-version.outputs.version }}"
          if [ -z "$VERSION" ]; then
            echo "❌ Error: 无法从 package.json 读取版本号"
            exit 1
          fi
          echo "✅ Version: $VERSION"

      - name: Check tag matches version (tag 触发时)
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
        run: |
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          PKG_VERSION=${{ steps.package-version.outputs.version }}
          if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
            echo "❌ Error: Git tag version (v$TAG_VERSION) 与 package.json 版本 ($PKG_VERSION) 不匹配"
            exit 1
          fi
          echo "✅ Tag version matches package.json version"

      - name: Install dependencies
        run: npm ci

      - name: Run pre-release AI documentation check
        run: npm run docs:check:pre-release

      - name: Run typecheck
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Build package
        run: npm run build

      - name: Validate package contents
        run: npm run validate-pack

      # 使用 OIDC Trusted Publishing 发布
      # OIDC 通过 id-token: write 权限自动获取认证，不需要 NPM_TOKEN
      - name: Publish to NPM
        run: npm publish --access public --provenance

      - name: Generate Release Notes
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
        id: release-notes
        run: |
          VERSION="${{ steps.package-version.outputs.version }}"
          
          # 从 CHANGELOG.md 提取当前版本的变更记录
          if [ -f CHANGELOG.md ]; then
            NOTES=$(awk "/^## \[$VERSION\]/,/^## \[/" CHANGELOG.md | head -n -1)
            if [ -n "$NOTES" ]; then
              echo "Extracted release notes from CHANGELOG.md"
            else
              NOTES="See [CHANGELOG.md](https://github.com/${{ github.repository }}/blob/main/CHANGELOG.md) for details."
            fi
          else
            NOTES="See [CHANGELOG.md](https://github.com/${{ github.repository }}/blob/main/CHANGELOG.md) for details."
          fi
          
          # 转义特殊字符用于 GitHub Actions 输出
          NOTES="${NOTES//'%'/'%25'}"
          NOTES="${NOTES//$'\n'/'%0A'}"
          NOTES="${NOTES//$'\r'/'%0D'}"
          
          echo "notes<<EOF" >> $GITHUB_OUTPUT
          echo "$NOTES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release v${{ steps.package-version.outputs.version }}
          draft: false
          prerelease: ${{ contains(steps.package-version.outputs.version, '-') }}
          body: |
            ${{ steps.release-notes.outputs.notes }}

            ---

            ## Installation

            ```bash
            npm install @mycodemap/mycodemap@${{ steps.package-version.outputs.version }}
            ```

            ## AI Documentation

            This version includes updated AI-friendly documentation:
            - [AI Guide](https://github.com/${{ github.repository }}/blob/main/AI_GUIDE.md)
            - [llms.txt](https://github.com/${{ github.repository }}/blob/main/llms.txt)
```

## 🔍 验证发布

发布后验证：

```bash
# 查看 npm 上的最新版本
npm view @mycodemap/mycodemap version

# 安装测试
npm install -g @mycodemap/mycodemap

# 验证 CLI 版本
mycodemap --version

# 查看包详情
npm view @mycodemap/mycodemap
```

## 🐛 故障排查

### OIDC 发布失败

**现象**: 
```
npm ERR! code E403
npm ERR! 403 403 Forbidden - PUT https://registry.npmjs.org/@mycodemap%2fmycodemap
```

**原因**: 
1. NPM 端未正确配置 Trusted Publisher
2. `id-token: write` 权限未设置
3. 设置了 `NODE_AUTH_TOKEN` 环境变量干扰了 OIDC

**解决**:
1. 检查 NPM 配置: https://www.npmjs.com/package/@mycodemap/mycodemap/access
2. 确保 workflow 中有 `id-token: write` 权限
3. 确保没有设置 `NODE_AUTH_TOKEN` 环境变量
4. 确保没有设置 `NPM_TOKEN` secret

### 发布失败: "ENEEDAUTH"

**原因**: 虽然使用 OIDC，但可能配置了错误的认证方式

**解决**:
1. 检查 workflow 中是否设置了 `NODE_AUTH_TOKEN`（不应该设置）
2. 检查 GitHub Secrets 中是否意外设置了 `NPM_TOKEN`（应该删除）
3. 确认 `id-token: write` 权限已正确配置

### 发布失败: "EOTP"

**原因**: 使用了传统的 NPM_TOKEN 方式，且账号启用了 2FA

**解决**:
- 这是使用 OIDC 的场景，不应该出现此错误
- 检查是否正确配置了 OIDC Trusted Publishing
- 检查是否意外设置了 NPM_TOKEN

### 发布失败: "403 Forbidden"

**原因**: 没有包发布权限

**解决**:
1. 确认你是该 npm 包的维护者
2. 如果是 scoped package (@mycodemap/xxx)，确认已设置 `--access public`
3. 确认 NPM 端已添加 GitHub Actions 作为 Trusted Publisher

### 发布失败: "版本已存在"

**原因**: npm 上已有相同版本

**解决**:
1. 检查 package.json 中的版本号
2. npm 版本号不可重复，需要递增

### GitHub Actions 未触发

**原因**: tag 格式不正确或 workflow 配置错误

**解决**:
1. 确保 tag 格式为 `v*` (例如: v0.2.1)
2. 检查 `.github/workflows/publish.yml` 是否存在
3. 查看 Actions 日志排查问题

### npm warn publish "bin[xxx]" script name was invalid

**原因**: package.json 中的 bin 字段格式问题

**解决**:
```bash
# 运行 npm pkg fix 自动修复
npm pkg fix
```

### 版本不匹配错误

**原因**: Git tag 版本与 package.json 版本不一致

**解决**:
```bash
# 检查当前版本
cat package.json | grep '"version"'

# 检查 git tags
git tag -l | sort -V

# 确保 tag 与 package.json 版本一致
# 例如: package.json 为 0.2.0，则 tag 应为 v0.2.0
```

### npm registry 配置错误

**现象**: `npm whoami` 失败或发布到错误 registry

**解决**:
```bash
# 检查当前 registry
npm config get registry

# 设置为 npm 官方 registry
npm config set registry https://registry.npmjs.org/

# 验证登录状态
npm whoami
```

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `.github/workflows/publish.yml` | GitHub Actions 发布工作流 |
| `scripts/release.sh` | 本地发布助手脚本 |
| `scripts/validate-pack.js` | 打包验证脚本 |
| `scripts/pre-release-check.js` | 发布前 AI 文档检查脚本 |
| `package.json` | 版本号定义和发布配置 |
| `CHANGELOG.md` | 版本变更记录 |
| `tsconfig.json` | TypeScript 编译配置 |

## 📝 发布记录模板

发布后建议在 GitHub 创建 Release，格式如下：

```markdown
## Changes

### Features
- 新增 xxx 功能

### Fixes
- 修复 xxx 问题

### Improvements
- 优化 xxx 性能

## Installation

```bash
npm install @mycodemap/mycodemap@0.2.0
```
```

## 🔗 相关链接

- NPM 包页面: https://www.npmjs.com/package/@mycodemap/mycodemap
- GitHub Actions: https://github.com/yuanyuanyuan/mycodemap/actions
- 版本历史: https://www.npmjs.com/package/@mycodemap/mycodemap?activeTab=versions
