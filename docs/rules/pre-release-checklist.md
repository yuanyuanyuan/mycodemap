# 发布前检查清单 (Pre-Release Checklist)

> 本文档定义了每次发布前必须通过的强制护栏规则。
> 
> **自动执行**: `npm run docs:check:pre-release`
> **CI 集成**: 发布工作流会自动运行此检查

---

## 🚨 关键原则

**任何发布都必须满足以下原则：**

1. **AI友好文档完整性** - 所有AI文档必须存在且符合标准
2. **版本一致性** - 所有文件中的版本号必须一致
3. **llms.txt 标准** - 必须符合 llmstxt.org 规范
4. **交叉引用有效性** - 所有内部链接必须有效
5. **CHANGELOG 同步** - 必须包含当前版本的更新记录
6. **OIDC 配置** - 使用 Trusted Publishing 方式发布

---

## 📋 检查项详情 (共10项)

### 1. AI 文档完整性检查

**目标**: 确保所有必需的AI文档存在且大小在合理范围内

**检查文件**:
| 文件 | 必需 | 最小大小 | 最大大小 |
|------|------|---------|---------|
| `llms.txt` | ✅ | 100B | 10KB |
| `AI_GUIDE.md` | ✅ | 1KB | 50KB |
| `AI_DISCOVERY.md` | ✅ | 1KB | 50KB |
| `ai-document-index.yaml` | ✅ | 500B | 50KB |
| `docs/ai-guide/README.md` | ✅ | 500B | 30KB |
| `docs/ai-guide/QUICKSTART.md` | ✅ | 1KB | 50KB |
| `docs/ai-guide/COMMANDS.md` | ✅ | 2KB | 100KB |
| `docs/ai-guide/OUTPUT.md` | ✅ | 2KB | 100KB |
| `docs/ai-guide/PATTERNS.md` | ✅ | 2KB | 100KB |
| `docs/ai-guide/PROMPTS.md` | ✅ | 2KB | 100KB |
| `docs/ai-guide/INTEGRATION.md` | ✅ | 2KB | 150KB |

**限制**:
- 单个文件最大 150KB
- 所有AI文档总计最大 500KB

### 2. llms.txt 标准格式检查

**目标**: 确保符合 [llmstxt.org](https://llmstxt.org/) 标准

**必需元素**:
- [ ] H1 标题 (`# CodeMap`)
- [ ] 摘要引用 (`> CodeMap 是...`)
- [ ] 文档章节 (`## 文档` 或 `## Docs`)
- [ ] 链接格式 (`[Title](./path.md)`)

**推荐元素**:
- [ ] 快速开始章节
- [ ] 完整文档章节
- [ ] 可选章节

**Token 效率**:
- llms.txt 估算 token 数必须 < 5,000

### 3. 版本一致性检查

**目标**: 确保所有文件中的版本号一致

**检查文件**:
- `package.json` - `version` 字段
- `llms.txt` - 文中版本号
- `ai-document-index.yaml` - `project.version`
- `AI_GUIDE.md` - 文中版本号
- `AI_DISCOVERY.md` - 文中版本号 (可选)

**要求**:
- 所有文件版本号必须完全一致
- 必须符合语义化版本规范 (`x.x.x`)
- 预发布版本可包含后缀 (`0.2.0-beta.1`)
- 预发布版本发布到 npm 时必须显式传 dist-tag（例如 `0.2.0-beta.1 -> --tag beta`）

**版本同步清单**:

更新版本号时必须同步以下文件:
- [ ] `package.json` - 主版本号
- [ ] `llms.txt` - 文中版本声明
- [ ] `ai-document-index.yaml` - `project.version`
- [ ] `AI_GUIDE.md` - 页眉版本信息
- [ ] `AI_DISCOVERY.md` - 页眉版本信息
- [ ] `CHANGELOG.md` - 版本条目

### 4. 交叉引用有效性检查

**目标**: 确保文档间的引用关系完整

**必需引用**:
| 源文件 | 必须引用 |
|--------|---------|
| `llms.txt` | `AI_GUIDE.md`, `ai-document-index.yaml` |
| `AI_GUIDE.md` | `AI_DISCOVERY.md`, `ai-document-index.yaml`, `docs/ai-guide/` |
| `README.md` | `AI_GUIDE.md` |
| `AGENTS.md` | AI 友好文档规范 |
| `CLAUDE.md` | `AI_GUIDE.md`, `docs/ai-guide/` |

**链接验证**:
- 所有内部链接必须指向存在的文件
- 锚点链接 (`#section`) 会被忽略

### 5. AI 友好性检查

**目标**: 确保 AI_GUIDE.md 符合 AI 阅读最佳实践

**检查项**:
- [ ] 层级标题 (`##`, `###`)
- [ ] 表格 (速查表)
- [ ] 代码块 (bash/typescript/json)
- [ ] TypeScript 接口定义
- [ ] 决策树/流程图
- [ ] 提示词模板

### 6. CHANGELOG 同步检查

**目标**: 确保 CHANGELOG 包含当前版本的更新记录

**要求**:
- 必须包含当前版本号的条目
- 推荐包含 AI 文档相关更新记录

**格式示例**:
```markdown
## [0.2.0] - 2026-03-17 - MVP3 Architecture Release

### 🐛 Bug Fixes
- ...

### 📚 Documentation
- ...
```

### 7. 发布必需文件检查

**目标**: 确保发布到 NPM/GitHub 所需的文件都存在

**必需文件**:
| 文件 | 用途 | 状态 |
|------|------|------|
| `CHANGELOG.md` | GitHub Release 引用 | 必需 |
| `LICENSE` | NPM 包许可证 | 必需 |
| `README.md` | NPM 包主页展示 | 必需 |

### 8. Git Tag 一致性检查

**目标**: 确保版本号与 git tag 一致

**检查项**:
- [ ] 本地 tag `v{x.x.x}` 是否存在
- [ ] Tag 是否指向当前 commit
- [ ] 远程 tag 是否已推送
- [ ] 当前分支是否为 main/master

**推荐发布入口**:

```bash
# milestone-bound release 的推荐方式只有 `/release vX.Y`
/release v1.9

# `/release` 会负责:
# 1. 检查 milestone readiness / 工作区 / 分支 / tag 冲突
# 2. 运行 milestone closeout 或确认已归档状态
# 3. 展示 Confirmation Gate #1 与 #2
# 4. 在最终确认后委托机械 helper
```

**手动例外（仅限人工受控且已完成等价 closeout + 双确认门）**:

```bash
# 只有在完成与 `/release` 等价的 closeout / Gate #1 / Gate #2 后
# 才允许调用机械 helper
rtk ./scripts/release.sh 1.9.0

# tag push 后由 GitHub Actions 自动完成:
# - 构建项目
# - 运行测试
# - 发布到 NPM (通过 OIDC)
# - 创建 GitHub Release
```

**Tag 命名规范**:
- 格式: `v{x.x.x}` (例如: `v0.2.0`)
- 必须带有 `v` 前缀
- 必须符合语义化版本规范

**GitHub Release**:
- 由 GitHub Actions 自动创建
- 基于 CHANGELOG.md 生成 release notes
- 包含预发布版本检测 (版本号包含 `-`)

### 9. OIDC 发布配置检查

**目标**: 确保使用 OIDC Trusted Publishing 方式发布

**配置要求**:

1. **NPM 端配置**:
   - 访问 `https://www.npmjs.com/package/@mycodemap/mycodemap/access`
   - 添加 GitHub Actions 作为 Trusted Publisher:
     - GitHub Organization: `yuanyuanyuan`
     - GitHub Repository: `mycodemap`
     - Workflow Name: `publish.yml`

2. **GitHub Secrets 检查**:
   - [ ] 默认可不设置 `NPM_TOKEN`，优先走 OIDC Trusted Publishing
   - [ ] 如果需要 token fallback，使用 `NPM_TOKEN` 并确保是 **Automation** 类型

3. **Workflow 权限配置**:
   ```yaml
   permissions:
     contents: write  # 用于创建 GitHub Release
     id-token: write  # 用于 OIDC trusted publishing (必需)
   ```

4. **发布命令**:
   ```yaml
   # 正确：stable 版本发布到 latest
   - name: Publish to NPM
     run: npm publish --access public --tag latest

   # 正确：prerelease 版本显式发布到 preid 对应 tag
   - name: Publish to NPM
     run: npm publish --access public --tag beta
   
   # 错误：设置 NODE_AUTH_TOKEN 会干扰 OIDC
   # env:
   #   NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

**验证命令**:
```bash
# 检查是否设置了 NPM_TOKEN（OIDC 方式应该为空）
gh secret list | grep NPM_TOKEN

# 如果存在，删除它
gh secret remove NPM_TOKEN
```

### 10. YAML 索引有效性检查

**目标**: 确保 `ai-document-index.yaml` 结构完整

**必需字段**:
- [ ] `project` 根字段
- [ ] `project.version` 版本号
- [ ] `documentation` 文档配置
- [ ] `documentation.ai_documents` AI文档列表
- [ ] `cli_commands` 命令索引
- [ ] `navigation` 导航配置

**引用验证**:
- YAML 中引用的所有文件路径必须存在

### 11. AGENTS.md 文档规范检查

**目标**: 确保 AGENTS.md 包含 AI 友好文档的强制要求

**必需章节**:
- [ ] AI 友好文档规范
- [ ] 结构清晰要求
- [ ] 决策树要求
- [ ] 速查表要求
- [ ] 代码可复现要求
- [ ] 类型定义要求
- [ ] 提示词模板要求

### 12. 真实场景验证检查（强制）

> **适用范围**：本检查项适用于 Phase 41 之后的所有新开发及对已有代码的后续修改。  
> **豁免条款**：Phase 41/42 已有实现（截至本规则生效日）不受追溯约束；后续任何修改必须合规。  
> **宪法依据**：→ `AGENTS.md` Section 8.1（真实场景验证阈值）、Section 8.2（豁免条款）  
> **详细规则**：→ `docs/rules/testing.md` "真实场景验证规则（强制）"

**目标**: 确保所有变更都经过真实场景验证，拒绝仅依赖单元测试断言的"纸面通过"

**检查项**:
- [ ] 每个修复/功能是否有真实环境验证证据（干净目录、真实数据、实际调用）
- [ ] 是否有失败场景验证（至少 1 个）
- [ ] 是否输出可信度自评（确定信息 / 推测信息 / 需验证信息 / 风险标记）
- [ ] 测试是否通过 `vitest run`（而非仅 `--changed` 的局部通过）

**验证命令**:
```bash
# 运行完整测试套件（非 --changed 子集）
npx vitest run

# 在干净环境中验证 CLI 行为（示例）
TMPDIR=$(mktemp -d) && cd "$TMPDIR" && node dist/cli/index.js --help
```

**阻断条件**:
- 任何声称"修复完成"但没有真实验证证据的提交，发布流程必须拒绝
- 可信度自评中"需验证信息"或"风险标记"非空的，必须补充验证后才能发布

---

## 🔧 使用方法

### 本地检查

```bash
# 运行完整的发布前检查
npm run docs:check:pre-release

# 查看详细输出
npm run docs:check:pre-release 2>&1 | less
```

### CI/CD 集成

发布工作流 (`.github/workflows/publish.yml`) 已自动集成此检查:

```yaml
- name: Run pre-release AI documentation check
  run: npm run docs:check:pre-release
```

### 发布前准备

**推荐方式: 使用 `/release vX.Y` 统一编排**

```bash
# milestone-bound release 的统一入口
/release v1.9

# `/release` 会负责:
# 1. 检查 milestone readiness / 工作区 / 分支 / tag 冲突
# 2. 运行 milestone closeout 或确认已归档状态
# 3. 展示 Confirmation Gate #1 与 #2
# 4. 在最终确认后委托 `rtk ./scripts/release.sh 1.9.0`
```

`scripts/release.sh` 是 Gate #2 之后的机械 helper，不是绕过 `/release` 的主入口。

**手动方式（仅限人工受控的例外流）**

```bash
# 1. 确保工作区干净
git status

# 2. 运行发布前检查
npm run docs:check:pre-release

# 3. 完成 milestone readiness 与双确认门
#    - Confirmation Gate #1: closeout 摘要确认
#    - Confirmation Gate #2: 版本 bump / tag / push 前最终确认

# 4. 构建和测试
npm run check:all

# 5. 仅在确认后调用机械 helper
rtk ./scripts/release.sh 1.9.0

# 6. 或者手动更新版本号（会自动创建 tag）
npm version patch|minor|major

# 7. 推送代码和 tag
git push origin main
git push origin --tags

# 8. GitHub Actions 自动完成发布
```

---

## ❌ 常见问题

### OIDC 发布失败

**问题**: GitHub Actions 发布失败，提示 403 Forbidden

**解决**:
1. 检查 NPM 端是否配置了 Trusted Publisher:
   - 访问 `https://www.npmjs.com/package/@mycodemap/mycodemap/access`
   - 确认已添加 GitHub Actions 作为 Trusted Publisher
2. 检查 workflow 权限:
   - 确保有 `id-token: write`
3. 检查是否意外设置了 `NPM_TOKEN`:
   ```bash
   gh secret list | grep NPM_TOKEN
   # 如果存在，删除：gh secret remove NPM_TOKEN
   ```
4. 检查 workflow 中是否设置了 `NODE_AUTH_TOKEN` 环境变量（不应该设置）

### 版本不一致

**问题**: 多个文件中的版本号不一致

**解决**:
```bash
# 统一更新所有文件中的版本号
VERSION="0.3.0"

# 更新 package.json
npm version $VERSION --no-git-tag-version

# 手动更新其他文件中的版本号
# - llms.txt
# - AI_GUIDE.md
# - AI_DISCOVERY.md
# - ai-document-index.yaml
```

### llms.txt 格式错误

**问题**: llms.txt 不符合标准格式

**解决**:
参考 [llmstxt.org](https://llmstxt.org/) 规范，确保包含:
- H1 标题
- 摘要引用 (blockquote)
- 文档章节

### CHANGELOG 缺少条目

**问题**: CHANGELOG 缺少当前版本的条目

**解决**:
```bash
# 在 CHANGELOG.md 顶部添加条目
## [x.x.x] - $(date +%Y-%m-%d) - 简短描述

### 🐛 Bug Fixes
- ...

### ✨ Features
- ...

### 📚 Documentation
- ...
```

---

## 📊 检查脚本架构

```
scripts/pre-release-check.js
├── checkRequiredFiles()      # 检查文件存在性和大小
├── checkLlmsTxtStandards()   # llms.txt 标准格式
├── checkVersionConsistency() # 版本一致性
├── checkCrossReferences()    # 交叉引用有效性
├── checkAIFriendliness()     # AI 友好性
├── checkChangelogSync()      # CHANGELOG 同步
├── checkYamlIndex()          # YAML 索引有效性
├── checkDocumentationStandards() # AGENTS.md 规范
├── checkReleaseFiles()       # 发布必需文件
└── checkGitTag()             # Git Tag 一致性
```

---

## 📝 变更历史

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-23 | 0.2.0 | 添加 OIDC Trusted Publishing 配置说明 |
| 2026-03-22 | 0.2.0 | 初始发布，基于 AI_FRIENDLINESS_AUDIT.md |

---

*此文档是发布流程的强制要求，任何变更都需要同步更新检查脚本。*
