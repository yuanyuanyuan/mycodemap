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

---

## 📋 检查项详情

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

### 7. YAML 索引有效性检查

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

### 8. AGENTS.md 文档规范检查

**目标**: 确保 AGENTS.md 包含 AI 友好文档的强制要求

**必需章节**:
- [ ] AI 友好文档规范
- [ ] 结构清晰要求
- [ ] 决策树要求
- [ ] 速查表要求
- [ ] 代码可复现要求
- [ ] 类型定义要求
- [ ] 提示词模板要求

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

```bash
# 1. 更新版本号
npm version patch|minor|major

# 2. 更新所有文档中的版本号
#    - llms.txt
#    - AI_GUIDE.md
#    - AI_DISCOVERY.md
#    - ai-document-index.yaml

# 3. 更新 CHANGELOG.md

# 4. 运行发布前检查
npm run docs:check:pre-release

# 5. 构建和测试
npm run check:all

# 6. 提交并推送
git add .
git commit -m "[RELEASE] Bump version to x.x.x"
git push origin main
git push origin v$(node -p "require('./package.json').version")
```

---

## ❌ 常见问题

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
└── checkDocumentationStandards() # AGENTS.md 规范
```

---

## 📝 变更历史

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-03-22 | 0.2.0 | 初始发布，基于 AI_FRIENDLINESS_AUDIT.md |

---

*此文档是发布流程的强制要求，任何变更都需要同步更新检查脚本。*
