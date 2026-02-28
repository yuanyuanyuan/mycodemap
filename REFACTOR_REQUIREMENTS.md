# CodeMap 编排层重构设计方案 - 需求与用户场景

> 版本: 2.4
> 日期: 2026-02-28
> 状态: 待实施（含 CI 门禁设计）

---

## 修订说明 (v2.4)

### 新增内容
- **CI 门禁护栏**：增加 Git Hook + GitHub Actions 双门禁
- **极简 Commit 格式**：`[TAG] scope: message` 格式，AI 可正则解析
- **文件头注释强制**：所有 TS 文件必须有 `[META]` 和 `[WHY]` 注释
- **AI 饲料生成器**：`codemap generate` 生成 `.codemap/ai-feed.txt`

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
| AI 饲料 | `.codemap/ai-feed.txt` | 自动生成 |

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
| 5 | 触发回退 | `score < 0.3` → 尝试 rg | |
| 6 | 回退执行 | `RgAdapter.execute(['foobar'])` | `SearchResult[]` (2 个文件) |
| 7 | 结果融合 | `mergeResults(ast-grep, rg)` | 去重后 2 个结果 |
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
   // 来自 rg 回退搜索

[Note]: Results limited, rg fallback enabled
Tools: ast-grep → rg, Confidence: medium (0.45)
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
| 1 | 命令解析 | `analyze.ts` : 'documentation', keywords: ['系统架构'] }` |
| 2 | 意图路由解析 | `{ intent | `IntentRouter.route()` | `{ tool: 'rg', pattern: '*.md' }` |
| 3 | 主工具执行 | `RgAdapter.execute({ pattern: '*.md', keywords: ['系统架构'] })` | `SearchResult[]` (3 个文档) |
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
| 4 | 生成 AI 饲料 | `AIFeedGenerator.generate()` | ✅ 更新 `.codemap/ai-feed.txt` |

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
| 6 | 危险置信度评估 | `codemap ci assess-risk` | ⚠️ 高风险需审批 |

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

**AI 饲料输出示例**（`.codemap/ai-feed.txt`）：

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

Claude 读取 `.codemap/ai-feed.txt`：
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

| 维度 | 来源 | 权重 | 说明 |
|------|------|------|------|
| **GRAVITY** | 依赖数 | 30% | 出度+入度，复杂度指标 |
| **HEAT.freq30d** | 30天修改次数 | 15% | 频繁修改 = 不稳定 |
| **HEAT.lastType** | 最后提交标签 | 10% | BUGFIX > FEATURE > DOCS |
| **META.stable** | 是否稳定 | 15% | stable:false = 不稳定 |
| **IMPACT** | 被依赖文件数 | 10% | 影响面广 = 风险高 |

**风险等级**：
- `high`: 分数 > 0.7 → 需要 commit body 说明风险缓解措施
- `medium`: 分数 > 0.4 → 警告提示
- `low`: 分数 ≤ 0.4 → 正常通过

> **注意**: 风险评分范围为 [0, 1]，使用 `Math.min(Math.max(score, 0), 1)` 进行 clamp。

---

## 附录

### A. 相关文档

- 评估报告: `CODEMAP_ASSESSMENT_REPORT.md`
- 方案对比: `MULTI_TOOL_REFACTOR_OPTIONS.md`
- 系统架构与功能设计: `REFACTOR_ARCHITECTURE_DESIGN.md`
- Git 分析器设计: `REFACTOR_GIT_ANALYZER_DESIGN.md` (含 AI 饲料生成器)
- CI 门禁设计: `CI_GATEWAY_DESIGN.md`
- 结果融合设计: `REFACTOR_RESULT_FUSION_DESIGN.md`

### B. 参考资源

- ast-grep 官方文档: https://ast-grep.github.io/
