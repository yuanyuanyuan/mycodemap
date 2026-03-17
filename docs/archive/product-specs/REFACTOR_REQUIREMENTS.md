# CodeMap 编排层重构设计方案 - 需求与用户场景

> 归档时间：2026-03-15
> 归档原因：历史需求/规格草稿，文档状态仍为“待实施”，已不适合作为当前契约。
> 当前依据：`ARCHITECTURE.md`、`docs/rules/*`、`src/cli/index.ts`
> 状态：仅供历史对照，不作为当前执行依据。


> 版本: 2.5
> 日期: 2026-02-28
> 状态: 待实施（含 CI 门禁设计）

---

## 修订说明 (v2.5)

### 新增内容
- **CI 门禁护栏**：增加 Git Hook + GitHub Actions 双门禁
- **极简 Commit 格式**：`[TAG] scope: message` 格式，AI 可正则解析
- **文件头注释强制**：所有 TS 文件必须有 `[META]` 和 `[WHY]` 注释
- **AI 饲料生成器**：`codemap generate` 生成 `.mycodemap/ai-feed.txt`
- **工作流上下文持久化协议**：`Map/Set` 显式序列化，恢复时反序列化
- **机器输出契约**：`--output-mode machine --json` 必须为纯 JSON（无前缀日志）
- **风险评分单一真源**：以本文第 8.6 节公式为唯一实现依据

### 设计原则更新
- **极简落地**：总代码量控制在 150 行以内
- **AI 优先**：纯文本结构化输出，无 emoji、无颜色
- **苏格拉底问题**：每个文件头回答"为什么存在"

---

## 1. 目标与约束

### 1.1 核心目标

增强 AI 大模型对项目代码的理解和查询能力，减少 token 消耗和搜索错误。

### 1.2 关键指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| Token 消耗降低 | >= 40% | 统计 analyze 输出 token 数 vs rg/grep 基准 |
| Hit@8 | >= 90% | Top-8 结果中包含用户期望结果的比率 |
| 默认输出规则 | Top-K=8、每条<=160 token | 代码约束 |
| 输出模式 | `--output-mode machine\|human` | CI/AI 链路使用 machine 模式 |
| 基准集 | 30 条查询 | 预先定义的典型查询 |
| 搜索范围 | TS/JS + Markdown | 配置约束 |
| Commit 格式 | `[TAG] scope: message` | 强制标签化 |
| 文件头注释 | `[META]`/`[WHY]` 必填 | CI 门禁 |
| AI 饲料 | `.mycodemap/ai-feed.txt` | 自动生成 |

### 1.3 技术约束

- 入口：单 CLI 编排（优先快速落地）
- 集成方式：fork 子进程调用外部工具
- CI 门禁：本地 pre-commit + 服务端 GitHub Actions

---

## 8. 详细用户场景

### 8.1 场景一：影响分析（带置信度和回退）

**场景**：用户想修改缓存相关代码，需要了解修改的影响范围

**用户输入（Claude Code 处理）**：
```
我需要修改 src/cache/ 目录下的缓存实现，会有什么影响？
```

**Claude Code 翻译**：
```bash
codemap analyze --intent impact --targets src/cache/ --scope transitive --include-tests --include-git-history
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `src/cli/commands/analyze.ts` 解析参数 | `{ intent: 'impact', targets: ['src/cache/'], scope: 'transitive' }` |
| 2 | 意图路由 | `src/orchestrator/intent-router.ts` 路由 | `{ tool: 'codemap', secondary: 'ast-grep' }` |
| 3 | 并行执行 | `ToolOrchestrator.executeParallel()` | 同时调用 codemap 和 ast-grep |
| 3.1 | ast-grep 搜索 | `AstGrepAdapter.execute(['缓存'])` | `SearchResult[]` (3 个文件) |
| 3.2 | codemap 影响分析 | `CodemapAdapter.execute({ targets: [...] })` | `DependencyResult` (12 个直接依赖) |
| 4 | 结果融合 | `ResultFusion.fuse(resultsByTool, { topK: 8 })` | `UnifiedResult[]` |
| 5 | 置信度计算 | `calculateConfidence(results, 'impact')` | `{ score: 0.82, level: 'high' }` |
| 6 | 测试关联（可选） | `TestLinker.findRelatedTests(targets)` | `['src/cache/__tests__/lru-cache.test.ts']` |
| 7 | Git 分析（可选） | `GitAnalyzer.findRelatedCommits(['缓存'])` | `CommitInfo[]` (12 次提交) |
| 8 | 输出裁剪 | `formatOutput(results, { topK: 8 })` | Markdown 输出 |

**返回结果**：
```
[IMPACT ANALYSIS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: src/cache/

[Related Files] (ast-grep):
   * src/cache/lru-cache.ts (relevance: 95%)
   * src/cache/file-hash-cache.ts (relevance: 92%)
   * src/cache/parse-cache.ts (relevance: 88%)

[Risk Level]: HIGH
   Direct dependencies: 12 modules
   Transitive dependencies: 38 modules (73% of project)

[Danger Factors]:
   * src/types/index.ts is depended on by 35 modules

[Git History]:
   * 12 related commits
   * 8 modifications in last 30 days (high frequency)

[Related Tests]:
   * src/cache/__tests__/lru-cache.test.ts
   * src/cache/__tests__/file-hash-cache.test.ts

[Suggestion]: Modify interface definitions first, maintain backward compatibility

Tools: codemap + ast-grep, Confidence: high (0.82)
```

### 8.2 场景二：置信度触发回退

**场景**：搜索一个罕见术语，ast-grep 返回结果很少

**用户输入**：
```
查找项目中 "foobar" 相关的代码
```

**Claude Code 翻译**：
```bash
codemap analyze --intent search --keywords foobar
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `analyze.ts` 解析 | `{ intent: 'search', keywords: ['foobar'] }` |
| 2 | 意图路由 | `IntentRouter.route()` | `{ tool: 'ast-grep' }` |
| 3 | 主工具执行 | `AstGrepAdapter.execute(['foobar'])` | `SearchResult[]` (1 个文件, score: 0.3) |
| 4 | 置信度计算 | `calculateConfidence(results, 'search')` | `{ score: 0.28, level: 'low', reasons: ['仅找到 1 个结果'] }` |
| 5 | 触发回退 | `score < 0.3` → 启动内部兜底链路 | |
| 6 | 回退执行 | `InternalFallbackAdapter.execute(['foobar'])` | `SearchResult[]` (2 个文件) |
| 7 | 结果融合 | `mergeResults(ast-grep, internal-fallback)` | 去重后 2 个结果 |
| 8 | 重新计算置信度 | `calculateConfidence(merged, 'search')` | `{ score: 0.45, level: 'medium' }` |
| 9 | 输出 | `formatOutput()` | 带回退说明的结果 |

**返回结果**：
```
[SEARCH RESULTS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keyword: "foobar"

1. src/utils/helper.ts:45 (relevance: 30%)
   // 原始结果来自 ast-grep

2. src/config/default.ts:12 (relevance: 25%)
   // 来自内部兜底链路

[Note]: Results limited, internal fallback enabled
Tools: ast-grep → internal-fallback, Confidence: medium (0.45)
```

### 8.3 场景三：代码搜索（高置信度场景）

**场景**：搜索常见关键词 "parser"

**用户输入**：
```
项目中 parser 是怎么实现的？
```

**Claude Code 翻译**：
```bash
codemap analyze --intent search --keywords parser --top-k 8
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `analyze.ts` 解析 | `{ intent: 'search', keywords: ['parser'], topK: 8 }` |
| 2 | 意图路由 | `IntentRouter.route()` | `{ tool: 'ast-grep' }` |
| 3 | 执行 ast-grep | `AstGrepAdapter.execute(['parser'])` | `SearchResult[]` (15 个结果) |
| 4 | 置信度计算 | `calculateConfidence(results, 'search')` | `{ score: 0.85, level: 'high' }` |
| 5 | 结果归一化 | 转换为 UnifiedResult | 统一格式 |
| 6 | 排序裁剪 | `sort + slice(0, 8)` | Top-8 结果 |
| 7 | Token 裁剪 | `truncate(content, 160)` | 每条 ≤160 token |

**返回结果**：
```
[SEARCH RESULTS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keyword: "parser"

1. src/parser/index.ts:15 (relevance: 98%)
   class SmartParser { ... }

2. src/parser/index.ts:8 (relevance: 95%)
   export function createParser(...)

3. src/parser/implementations/fast-parser.ts:12 (relevance: 92%)
   class FastParser implements IParser { ... }

... (showing first 8 results)

Tool: ast-grep, Confidence: high (0.85) [OK]
```

### 8.4 场景四：文档搜索（多工具融合）

**场景**：搜索系统设计文档

**用户输入**：
```
有没有关于系统架构的设计文档？
```

**Claude Code 翻译**：
```bash
codemap analyze --intent documentation --keywords "系统架构"
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `analyze.ts` 解析 | `{ intent: 'documentation', keywords: ['系统架构'] }` |
| 2 | 意图路由 | `IntentRouter.route()` | `{ tool: 'codemap' }` |
| 3 | 主工具执行 | `CodemapAdapter.queryDocs({ keywords: ['系统架构'] })` | `SearchResult[]` (3 个文档) |
| 4 | 置信度计算 | `calculateConfidence(results, 'documentation')` | `{ score: 0.65, level: 'medium' }` |
| 5 | 结果融合 | 转换为 UnifiedResult | 统一格式 |
| 6 | 排序裁剪 | 按 relevance 排序 | Top-8 |

**返回结果**：
```
[DOCUMENTATION SEARCH]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keyword: "系统架构"

1. docs/architecture.md (relevance: 94%)
   Fragment: CodeMap 采用分层架构...
   Location: Line 15-20

2. refer/codemap-architecture-design.md (relevance: 87%)
   Fragment: 架构设计文档...
   Location: Line 1-10

Tool: codemap, Confidence: medium (0.65)
```

### 8.5 场景五：功能实现辅助（参考现有实现）

**场景**：用户要实现一个新功能，需要参考项目中现有的类似实现

**用户输入**：
```
帮我实现一个编辑页面的功能
```

**Claude Code 翻译**：
```bash
codemap analyze --intent reference --keywords "编辑" --targets src/features/ --scope transitive --include-tests
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `analyze.ts` 解析 | `{ intent: 'reference', keywords: ['编辑'], targets: ['src/features/'] }` |
| 2 | 意图路由 | `IntentRouter.route()` | `{ tools: ['ast-grep', 'codemap'], strategy: 'parallel' }` |
| 3 | 并行搜索 | `ToolOrchestrator.executeParallel()` | |
| 3.1 | ast-grep 搜索 | `AstGrepAdapter.execute(['编辑', 'edit', 'form'])` | 找到相关代码文件 |
| 3.2 | codemap 依赖分析 | `CodemapAdapter.analyzeDependencies(targets)` | 找到依赖的模块 |
| 4 | 结果融合 | `ResultFusion.fuse()` | 合并并排序 |
| 5 | 测试关联 | `TestLinker.findRelatedTests()` | 找到相关测试 |
| 6 | 置信度计算 | `calculateConfidence(results, 'reference')` | `{ score: 0.78, level: 'high' }` |
| 7 | 输出 | `formatOutput()` | 返回参考上下文 |

**返回结果**：
```
[REFERENCE IMPLEMENTATION]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: 实现编辑页面功能
Keywords: 编辑, edit, form

[Code References]:
   * src/features/user/components/UserEdit.tsx (relevance: 95%)
     - 用户编辑表单组件，包含姓名、邮箱、角色字段
     - 使用 React Hook Form + Zod 验证
     - Dependencies: api/user.ts, types/user.ts

   * src/features/product/components/ProductForm.tsx (relevance: 88%)
     - 产品编辑表单，包含名称、描述、价格、分类
     - 使用 Ant Design Form
     - Dependencies: api/product.ts, types/product.ts

[Related Modules]:
   * src/types/edit-form.ts (共享编辑表单类型)
   * src/hooks/useEditForm.ts (编辑表单 Hook)
   * src/components/FormField/ (通用表单字段组件)

[Related Tests]:
   * src/features/user/__tests__/UserEdit.test.tsx
   * src/features/product/__tests__/ProductForm.test.tsx

[Implementation Suggestions]:
   1. 参考 UserEdit.tsx 的结构
   2. 使用 useEditForm Hook 处理表单逻辑
   3. 参考 ProductForm.tsx 的验证规则
```

**后续步骤**：Claude Code 根据返回的参考信息生成新的编辑页面代码。

**流程图**：
```
用户: "帮我实现编辑页面"
         │
         ▼
Claude Code 翻译
         │
         ▼
Codemap 分析 (reference intent)
   ├── ast-grep: 搜索"编辑"/"edit"/"form"
   ├── codemap: 依赖分析
   └── test-linker: 关联测试
         │
         ▼
返回参考上下文 (代码示例、类型、依赖)
         │
         ▼
Claude Code 根据参考生成代码
```

---

**场景说明**：`reference` 是一种特殊的 intent，它的目标不是搜索某个确定的代码，而是为"代码生成"提供上下文。Codemap 返回的是"有哪些可参考的实现"而不是"在哪里"。

---

### 8.6 场景六：CI 门禁护栏（新增 v2.4）

**场景**：开发者提交代码，触发 CI 门禁检查

**本地提交流程**：
```bash
git commit -m "[FEATURE] git-analyzer: add risk scoring"
```

**pre-commit Hook 执行**：

| 步骤 | 检查项 | 代码执行 | 结果 |
|------|--------|----------|------|
| 1 | 测试通过 | `npm test` | ✅ 所有测试通过 |
| 2 | Commit 格式 | `CommitValidator.validate()` | ✅ 符合 `[TAG]` 格式 |
| 3 | 文件头注释 | `FileHeaderScanner.validate()` | ✅ 所有修改文件有 `[META]`+`[WHY]` |
| 4 | 生成 AI 饲料 | `AIFeedGenerator.generate()` | ✅ 更新 `.mycodemap/ai-feed.txt` |

**提交成功** → 推送代码

---

**服务端 CI 流程 (GitHub Actions)**：

| 步骤 | 检查项 | 执行命令 | 失败处理 |
|------|--------|----------|----------|
| 1 | 安装依赖 | `npm ci` | ❌ 阻止合并 |
| 2 | 运行测试 | `npm test` | ❌ 阻止合并 |
| 3 | Commit 格式检查 | `codemap ci check-commits` | ❌ 阻止合并 |
| 4 | 文件头注释检查 | `codemap ci check-headers` | ❌ 阻止合并 |
| 5 | 生成并验证 AI 饲料 | `codemap generate && git diff --exit-code` | ❌ 阻止合并 |
| 6 | 危险置信度评估 | `codemap ci assess-risk` | ❌ 高风险阻断，需补充缓解说明后重试 |

**CI 通过** → 允许合并

---

**Commit 格式规范**：

```
[TAG] scope: message

TAG 类型:
  [BUGFIX]   - 修复问题 (风险值: 0.9)
  [FEATURE]  - 新功能 (风险值: 0.7)
  [REFACTOR] - 重构 (风险值: 0.8)
  [CONFIG]   - 配置变更 (风险值: 0.5)
  [DOCS]     - 文档 (风险值: 0.2)
  [DELETE]   - 删除代码 (风险值: 0.1)

示例:
  [BUGFIX] git-analyzer: fix risk score calculation
  [FEATURE] orchestrator: add confidence scoring
  [REFACTOR] parser: simplify token handling
```

---

**文件头注释规范**（所有 TS 文件强制）：

```typescript
// [META] since:2024-01 | owner:backend-team | stable:false
// [WHY] 处理JWT验证，因第三方Token刷新策略变更频繁不稳定
// [DEPS] src/db/connection.ts, src/types/auth.d.ts

// 实际代码从这里开始...
import { db } from "./db/connection";
```

| 标签 | 必填 | 说明 |
|------|------|------|
| `[META]` | ✅ | `since:日期` \| `owner:团队` \| `stable:布尔` |
| `[WHY]` | ✅ | 回答"为什么存在"（苏格拉底问题）|
| `[DEPS]` | ❌ | 关键依赖路径 |

---

**AI 饲料输出示例**（`.mycodemap/ai-feed.txt`）：

```text
# CODEMAP AI FEED
# Generated: 2026-02-28T19:30:00Z

FILE: src/orchestrator/git-analyzer.ts
GRAVITY: 15 | HEAT: 5/BUGFIX/2026-02-19
META: since=2024-03 stable=false why=分析Git历史，评估文件修改风险
IMPACT: 8 files depend on this
DEPS: src/types/index.ts, src/utils/exec.ts
---
FILE: src/utils/date.ts
GRAVITY: 0 | HEAT: 0/NEW/never
META: since=2023-06 stable=true why=日期工具函数，项目早期沉淀
IMPACT: 0 files depend on this
DEPS: none
---
```

**AI 使用场景**：

> 用户: "我要改 auth 模块，有什么风险？"

Claude 读取 `.mycodemap/ai-feed.txt`：
- `jwt.ts`: GRAVITY=12, HEAT=8/BUGFIX, IMPACT=15 → **火山灰，高风险**
- `date.ts`: GRAVITY=0, HEAT=0, IMPACT=0 → **沉积岩，低风险**

**瞬间输出**：
```
[WARNING] High risk file detected: src/auth/jwt.ts
   - 8 modifications in last 30 days, last change: BUGFIX
   - 15 files depend on this module
   - Marked as unstable

[Suggestion] Run related tests before modifying:
   npm test src/auth/
```

---

**危险置信度计算**（AI 饲料维度）：

> **单一真源说明**：风险评分实现（`GitAnalyzer`、`ResultFusion`、`codemap ci assess-risk`）必须严格使用本节公式与阈值。

| 维度 | 来源 | 权重 | 说明 |
|------|------|------|------|
| **GRAVITY** | 依赖数 | 30% | `gravityNorm = min(gravity/20, 1)` |
| **HEAT.freq30d** | 30天修改次数 | 15% | `freqNorm = min(freq30d/10, 1)` |
| **HEAT.lastType** | 最后提交标签 | 10% | `tagWeight(lastType)` |
| **META.stable** | 是否稳定 | 15% | `stableBoost = stable ? 0 : 0.15` |
| **IMPACT** | 被依赖文件数 | 10% | `impactNorm = min(impact/50, 1)` |

**统一公式**：

```text
score = gravityNorm * 0.30
      + freqNorm * 0.15
      + tagWeight(lastType) * 0.10
      + stableBoost
      + impactNorm * 0.10
score = clamp(score, 0, 1)
```

**风险等级**：
- `high`: 分数 > 0.7 → 需要 commit body 说明风险缓解措施
- `medium`: 分数 > 0.4 → 警告提示
- `low`: 分数 ≤ 0.4 → 正常通过

> **注意**: 风险评分范围为 [0, 1]，使用 `Math.min(Math.max(score, 0), 1)` 进行 clamp。

---

### 8.7 场景七：完整 E2E 开发流程（串联所有功能）

**场景**：开发者需要实现一个新的"文件重命名"功能，贯穿整个开发流程

**背景**：
- 项目是一个 TypeScript 代码分析工具
- 用户希望添加一个新功能：批量重命名文件并自动更新所有引用
- 这是一个中等复杂度的功能，涉及多个模块

---

#### 第一阶段：需求理解与参考搜索

**用户输入（Claude Code 处理）**：
```
我需要在项目中实现一个"文件重命名"功能，可以批量重命名文件并自动更新所有引用。先帮我找找项目中有没有类似的实现可以参考。
```

**Claude Code 翻译**：
```bash
codemap analyze --intent reference --keywords "重命名" "rename" "file" --targets src/ --include-tests
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `src/cli/commands/analyze.ts` 解析参数 | `{ intent: 'reference', keywords: ['重命名', 'rename', 'file'], targets: ['src/'], includeTests: true }` |
| 2 | 意图路由 | `src/orchestrator/intent-router.ts` 路由 | `{ tools: ['ast-grep', 'codemap'], strategy: 'parallel' }` |
| 3 | 并行执行 | `ToolOrchestrator.executeParallel()` | 同时调用多个工具 |
| 3.1 | ast-grep 搜索 | `AstGrepAdapter.execute(['重命名', 'rename', 'file', 'mv', 'move'])` | `SearchResult[]` (8 个相关文件) |
| 3.2 | codemap 依赖分析 | `CodemapAdapter.querySymbols({ keywords: ['rename', 'file'] })` | 符号查询结果 |
| 3.3 | 测试文件关联 | `TestLinker.searchTestFiles(['file', 'rename'])` | 潜在测试文件 |
| 4 | 结果融合 | `ResultFusion.fuse(resultsByTool, { topK: 8 })` | `UnifiedResult[]` |
| 5 | 置信度计算 | `calculateConfidence(results, 'reference')` | `{ score: 0.75, level: 'high' }` |
| 6 | 输出格式化 | `formatOutput(results, { mode: 'human' })` | Markdown 格式输出 |

**返回结果**：
```
[REFERENCE IMPLEMENTATION]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: 文件重命名功能
Keywords: 重命名, rename, file, mv, move

[Code References]:
   * src/watcher/file-watcher.ts (relevance: 92%)
     - 文件监听器，监控文件变化事件
     - Methods: onFileChange(), onFileCreate(), onFileDelete()
     - DEPS: src/utils/fs.ts, src/types/events.ts

   * src/cache/file-hash-cache.ts (relevance: 88%)
     - 文件哈希缓存，管理文件路径映射
     - Methods: get(), set(), invalidate(), rename()
     - DEPS: src/utils/md5.ts, src/types/cache.ts

   * src/parser/path-resolver.ts (relevance: 75%)
     - 路径解析器，处理相对/绝对路径转换
     - Methods: resolve(), relative(), rename()

[Similar Features]:
   * src/cli/commands/rename.ts - 已废弃的重命名命令 (参考价值: 低)

[Test References]:
   * src/watcher/__tests__/file-watcher.test.ts
   * src/cache/__tests__/file-hash-cache.test.ts

[Implementation Suggestions]:
   1. 复用 file-watcher.ts 的文件事件机制
   2. 参考 file-hash-cache.ts 的 invalidate/rename 逻辑
   3. 使用 path-resolver.ts 处理路径转换
   4. 需要处理: 原子操作、回滚机制、引用更新
```

---

#### 第二阶段：影响分析

**用户输入**：
```
好的，我了解了现有实现。现在帮我分析一下实现这个功能会影响哪些模块？
```

**Claude Code 翻译**：
```bash
codemap analyze --intent impact --targets src/watcher/,src/cache/ --scope transitive --include-git-history
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 命令解析 | `analyze.ts` 解析 | `{ intent: 'impact', targets: ['src/watcher/', 'src/cache/'], scope: 'transitive' }` |
| 2 | 意图路由 | `IntentRouter.route()` | `{ tool: 'codemap', secondary: 'ast-grep' }` |
| 3 | codemap 影响分析 | `CodemapAdapter.analyzeImpact({ targets: [...], scope: 'transitive' })` | `DependencyResult` |
| 3.1 | 直接依赖 | `DependencyGraph.getDirectDependents(targets)` | 15 个直接依赖 |
| 3.2 | 传递依赖 | `DependencyGraph.getTransitiveDependents(targets)` | 42 个传递依赖 |
| 4 | ast-grep 补充搜索 | `AstGrepAdapter.execute(['依赖', 'import', 'require'])` | 相关引用 |
| 5 | 结果融合 | `ResultFusion.fuse()` | 合并结果 |
| 6 | 置信度计算 | `calculateConfidence(results, 'impact')` | `{ score: 0.88, level: 'high' }` |
| 7 | Git 历史分析 | `GitAnalyzer.analyzeRelatedCommits(targets)` | 近期变更记录 |
| 8 | 输出 | `formatOutput()` | 影响分析报告 |

**返回结果**：
```
[IMPACT ANALYSIS]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: src/watcher/, src/cache/

[Impact Scope]:
   Direct dependents: 15 modules
   Transitive dependents: 42 modules (68% of project)

[High Risk Modules]:
   * src/types/index.ts - 被 38 个模块依赖
   * src/core/analyzer.ts - 被 24 个模块依赖
   * src/utils/fs.ts - 被 18 个模块依赖

[Git History]:
   * src/watcher/file-watcher.ts: 5 commits (30天内)
     - [BUGFIX] watcher: fix race condition (2026-02-20)
     - [FEATURE] watcher: add debounce support (2026-02-15)
   * src/cache/file-hash-cache.ts: 3 commits (30天内)
     - [REFACTOR] cache: optimize hash calculation (2026-02-10)

[Safety Suggestion]:
   1. 新功能应独立于现有 watcher/cache 核心逻辑
   2. 使用依赖注入，避免直接依赖高风险模块
   3. 优先修改稳定模块（如 fs.ts），避免 types/index.ts

Confidence: high (0.88)
```

---

#### 第三阶段：风险评估（AI 饲料）

**用户输入**：
```
这个功能风险评估怎么样？提交代码时需要注意什么？
```

**Claude Code 翻译**：
```bash
codemap generate --output .mycodemap/ai-feed.txt
codemap ci assess-risk --files src/features/rename/
```

**Codemap 执行流程**：

| 步骤 | 操作 | 代码执行 | 输出 |
|------|------|----------|------|
| 1 | 生成 AI 饲料 | `AIFeedGenerator.generate()` | 更新 `.mycodemap/ai-feed.txt` |
| 2 | 风险文件识别 | `RiskAssessor.identifyHighRiskFiles()` | 高风险文件列表 |
| 3 | 风险评分计算 | `RiskAssessor.calculateRiskScore(files)` | 每文件风险分 |
| 4 | 风险聚合 | `RiskAssessor.aggregateRisk()` | 整体风险评估 |
| 5 | 缓解建议 | `RiskAssessor.getMitigationSuggestions()` | 风险缓解措施 |

**返回结果**：
```
[RISK ASSESSMENT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feature: src/features/rename/
Calculated Risk: 0.52 (MEDIUM)

[Risk Breakdown]:
   * New feature: GRAVITY=5 (new module, no dependents)
   * Dependencies: 15 files, HEAT=avg(3.2), mostly STABLE=true
   * Test coverage: 0% (new module)

[Risk Factors]:
   ✓ Low: New module, no existing dependencies to break
   ⚠ Medium: Modifies file-watcher.ts and file-hash-cache.ts
   ⚠ Medium: No existing tests for rename functionality

[Mitigation Suggestions]:
   1. [REQUIRED] Add tests before commit: src/features/rename/__tests__/
   2. [REQUIRED] Add file header comments with [META] and [WHY]
   3. [SUGGESTED] Implement rollback mechanism for atomic operations
   4. [SUGGESTED] Add integration test with actual file operations
```

---

#### 第四阶段：代码实现与测试

**开发者编写代码**：

```typescript
// src/features/rename/file-rename.ts
// [META] since:2026-02 | owner:feature-team | stable:false
// [WHY] 实现文件批量重命名功能，自动更新所有引用
// [DEPS] src/watcher/file-watcher.ts, src/cache/file-hash-cache.ts, src/parser/path-resolver.ts

import { FileWatcher } from "../../watcher/file-watcher";
import { FileHashCache } from "../../cache/file-hash-cache";
import { PathResolver } from "../../parser/path-resolver";

export class FileRename {
  private watcher: FileWatcher;
  private cache: FileHashCache;
  private resolver: PathResolver;

  // ... 实现代码
}
```

**运行本地测试**：

| 步骤 | 操作 | 命令 | 结果 |
|------|------|------|------|
| 1 | 单元测试 | `npm test src/features/rename/` | ✅ 通过 |
| 2 | 集成测试 | `npm test -- --grep "rename"` | ✅ 通过 |
| 3 | 类型检查 | `npx tsc --noEmit` | ✅ 通过 |

---

#### 第五阶段：提交代码（CI 门禁）

**用户输入**：
```
代码写完了，帮我提交并检查是否符合规范
```

**Claude Code 翻译**：
```bash
git add src && git commit -/features/rename/m "[FEATURE] file-rename: add batch rename with auto-ref-update"
```

**pre-commit Hook 执行流程**：

| 步骤 | 检查项 | 代码执行 | 结果 |
|------|--------|----------|------|
| 1 | 测试通过 | `npm test` | ✅ 全部通过 |
| 2 | 类型检查 | `npx tsc --noEmit` | ✅ 通过 |
| 3 | Commit 格式 | `CommitValidator.validate('[FEATURE] file-rename: ...')` | ✅ 符合规范 |
| 4 | 文件头注释 | `FileHeaderScanner.validate('src/features/rename/')` | ✅ 有 [META] + [WHY] |
| 5 | 生成 AI 饲料 | `AIFeedGenerator.generate()` | ✅ 更新完成 |

**提交成功** → 推送代码

---

#### 第六阶段：CI 流水线验证

**GitHub Actions 执行流程**：

| 步骤 | 检查项 | 执行命令 | 失败处理 |
|------|--------|----------|----------|
| 1 | 安装依赖 | `npm ci` | ❌ 阻止合并 |
| 2 | 运行测试 | `npm test` | ❌ 阻止合并 |
| 3 | 类型检查 | `npx tsc --noEmit` | ❌ 阻止合并 |
| 4 | Commit 格式 | `codemap ci check-commits` | ❌ 阻止合并 |
| 5 | 文件头注释 | `codemap ci check-headers` | ❌ 阻止合并 |
| 6 | AI 饲料验证 | `codemap generate && git diff --exit-code` | ❌ 阻止合并 |
| 7 | 风险评估 | `codemap ci assess-risk --threshold 0.7` | ❌ 高风险阻断 |

**CI 通过** → 允许合并

---

#### 完整流程图

```
用户: "实现文件重命名功能"
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 阶段一：参考搜索 (intent=reference)                          │
    │   ├── IntentRouter → parallel (ast-grep + codemap)         │
    │   ├── ResultFusion → confidence=0.75                        │
    │   └── 返回参考实现列表                                       │
    └────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 阶段二：影响分析 (intent=impact)                             │
    │   ├── CodemapAdapter.analyzeImpact()                       │
    │   ├── GitAnalyzer.analyzeRelatedCommits()                 │
    │   ├── ResultFusion → confidence=0.88                       │
    │   └── 输出影响范围和高风险模块                               │
    └────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 阶段三：风险评估 (CI 维度)                                  │
    │   ├── AIFeedGenerator.generate()                           │
    │   ├── RiskAssessor.calculateRiskScore()                   │
    │   └── 返回风险等级和缓解建议                                │
    └────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 阶段四：代码实现                                            │
    │   ├── 开发者编写 src/features/rename/                      │
    │   ├── 添加单元测试                                         │
    │   └── 验证通过                                              │
    └────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 阶段五：提交 (pre-commit hook)                              │
    │   ├── CommitValidator.validate()                          │
    │   ├── FileHeaderScanner.validate()                        │
    │   └── AIFeedGenerator.generate()                          │
    └────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 阶段六：CI 流水线                                           │
    │   ├── npm test → npm run build                             │
    │   ├── codemap ci check-commits                             │
    │   ├── codemap ci check-headers                             │
    │   └── codemap ci assess-risk                               │
    └────────────────────────────────────────────────────────────┘
         │
         ▼
    合并成功 ✓
```

---

#### 涉及的组件调用汇总

| 组件 | 调用时机 | 场景 |
|------|----------|------|
| `IntentRouter` | 阶段一、二 | 路由到合适的工具 |
| `AstGrepAdapter` | 阶段一 | 搜索关键词代码 |
| `CodemapAdapter` | 阶段一、二 | 依赖分析和符号查询 |
| `ResultFusion` | 阶段一、二 | 融合多工具结果 |
| `ConfidenceCalculator` | 阶段一、二 | 计算置信度 |
| `GitAnalyzer` | 阶段二 | 分析 Git 历史 |
| `AIFeedGenerator` | 阶段三、五 | 生成 AI 饲料 |
| `RiskAssessor` | 阶段三、六 | 风险评估 |
| `CommitValidator` | 阶段五、六 | Commit 格式校验 |
| `FileHeaderScanner` | 阶段五、六 | 文件头注释校验 |

---

## 9. 工作流编排器设计 (v2.5 规划)

### 9.1 问题分析

当前场景设计存在阶段割裂问题：

| 问题 | 表现 | 影响 |
|------|------|------|
| 阶段连接不紧密 | 每个场景是独立单元测试 | 实际操作中容易迷失 |
| 上下文不传递 | 每个场景独立执行 | 重复分析，效率低 |
| 交付物不明确 | 没有检查点机制 | 无法验证阶段完成 |
| 中断无法恢复 | 无状态管理 | 长流程难以维护 |

### 9.2 解决方案：工作流编排器

**核心机制**：

1. **状态机**：每个阶段有 `pending` → `running` → `completed` → `verified` 状态转换
2. **检查点**：每个阶段结束时必须产出"交付物"才能进入下一阶段
3. **上下文持久化**：阶段间自动传递数据和产物到 `.mycodemap/workflow/`
4. **交互式引导**：CLI 交互式推进各阶段

### 9.3 阶段契约定义

| 阶段 | 入口条件 | 出口交付物 | 验证方法 |
|------|----------|------------|----------|
| 参考搜索 | 用户需求描述 | `reference-results.json` | 置信度 > 0.3 |
| 影响分析 | 参考结果 | `impact-report.json` | 风险文件已标注 |
| 风险评估 | 影响分析报告 | `risk-assessment.json` | 风险分 < 0.7 |
| 代码实现 | 风险评估 | PR/Commit 已创建 | CI 通过 |
| 提交验证 | Commit | `workflow-complete.json` | CI 全量通过 |

### 9.4 工作流命令

```bash
# 启动交互式工作流
codemap workflow start "实现文件重命名功能"

# 查看当前状态
codemap workflow status

# 可视化当前工作流
codemap workflow visualize

# 推进到下一阶段
codemap workflow proceed

# 恢复中断的工作流（默认恢复 active，可选指定 ID）
codemap workflow resume
codemap workflow resume <workflow-id>

# 手动创建检查点
codemap workflow checkpoint

# 模板管理与应用
codemap workflow template list --all
codemap workflow template apply bugfix
```

### 9.5 交互式引导示例

```bash
$ codemap workflow start "实现文件重命名功能"

🤖 CodeMap 工作流引导
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/6] 📚 参考搜索
  └─ 目标: 找到可参考的实现
  └─ 命令: codemap analyze --intent reference --keywords ...
  └─ 交付物: 参考代码列表
  └─ 状态: ⏳ 待开始

> 选择操作: [R]开始 [S]跳过 [Q]退出
```

### 9.6 上下文持久化

```json
// .mycodemap/workflow/{workflow-id}.json
{
  "id": "wf-20260228-001",
  "task": "实现文件重命名功能",
  "currentPhase": "impact",
  "phaseStatus": "completed",
  "artifacts": {
    "reference": {
      "phase": "reference",
      "results": [...],
      "confidence": { "score": 0.75, "level": "high" },
      "createdAt": "2026-02-28T10:00:00Z"
    },
    "impact": {
      "phase": "impact",
      "results": [...],
      "confidence": { "score": 0.88, "level": "high" },
      "createdAt": "2026-02-28T10:05:00Z"
    }
  },
  "cachedResults": {
    "reference": [...],
    "impact": [...]
  }
}
```

### 9.7 实施建议

**推荐组合：轻量状态机 + CLI 交互**

1. **底层**：工作流上下文持久化（JSON 文件）
2. **上层**：CLI 交互式引导（用户友好）
3. **扩展**：置信度驱动的自动推进

**预期效果**：
- ✅ 自动推进，无需用户记忆
- ✅ 中断可恢复
- ✅ 每个阶段有明确交付物
- ✅ 进度可视化

---

## 附录

### A. 相关文档

- 评估报告: `CODEMAP_ASSESSMENT_REPORT.md`
- 方案对比: `MULTI_TOOL_REFACTOR_OPTIONS.md`
- 系统架构与功能设计: `../design-docs/REFACTOR_ARCHITECTURE_OVERVIEW.md`
- Git 分析器设计: `../design-docs/REFACTOR_GIT_ANALYZER_DESIGN.md` (含 AI 饲料生成器)
- CI 门禁设计: `../design-docs/CI_GATEWAY_DESIGN.md`
- 结果融合设计: `../design-docs/REFACTOR_RESULT_FUSION_DESIGN.md`
- 编排层设计: `../design-docs/REFACTOR_ORCHESTRATOR_DESIGN.md` (含工作流编排器 v2.5 规划)

### B. 参考资源

- ast-grep 官方文档: https://ast-grep.github.io/
