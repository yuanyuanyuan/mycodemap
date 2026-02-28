# CodeMap 编排层重构设计方案 - 需求与用户场景

> 版本: 2.3
> 日期: 2026-02-28
> 状态: 待实施（修订版）

---

## 修订说明 (v2.3)

基于 Codex 评审意见修正：

### 需求范围更新
- **移除 qmd**：工具池从 `codemap + ast-grep + qmd + rg` 调整为 `codemap + ast-grep + rg`
- `--intent documentation` 场景保留，但改用 rg 替代 qmd

### 技术约束更新
- 所有外部命令调用改用安全参数方式（execFile）
- Token 计量使用 tokenizer 而非字符截断

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
| 基准集 | 30 条查询 | 预先定义的典型查询 |
| 搜索范围 | TS/JS + Markdown | 配置约束 |

### 1.3 技术约束

- 入口：单 CLI 编排（优先快速落地）
- 集成方式：fork 子进程调用外部工具

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
📊 影响范围分析
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

目标: src/cache/

🔍 相关文件 (ast-grep):
   • src/cache/lru-cache.ts (相关度: 95%)
   • src/cache/file-hash-cache.ts (相关度: 92%)
   • src/cache/parse-cache.ts (相关度: 88%)

⚠️ 风险等级: 高
   直接依赖: 12 个模块
   传递依赖: 38 个模块 (全项目 73%)

🔴 危险因素:
   • src/types/index.ts 被 35 个模块引用

📜 Git 历史:
   • 12 次相关提交
   • 近 30 天修改 8 次 (高频率)

🧪 相关测试:
   • src/cache/__tests__/lru-cache.test.ts
   • src/cache/__tests__/file-hash-cache.test.ts

💡 建议: 先修改接口定义，保持向后兼容

使用工具: codemap + ast-grep, 置信度: high (0.82)
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
🔍 搜索结果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

关键词: "foobar"

1. src/utils/helper.ts:45 (相关度: 30%)
   // 原始结果来自 ast-grep

2. src/config/default.ts:12 (相关度: 25%)
   // 来自 rg 回退搜索

⚠️ 结果较少，已启用 rg 回退搜索
使用工具: ast-grep → rg, 置信度: medium (0.45)
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
🔍 搜索结果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

关键词: "parser"

1. src/parser/index.ts:15 (相关度: 98%)
   class SmartParser { ... }

2. src/parser/index.ts:8 (相关度: 95%)
   export function createParser(...)

3. src/parser/implementations/fast-parser.ts:12 (相关度: 92%)
   class FastParser implements IParser { ... }

... (显示前 8 条)

使用工具: ast-grep, 置信度: high (0.85) ✓
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
📚 文档搜索结果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

关键词: "系统架构"

1. docs/architecture.md (相关度: 94%)
   片段: CodeMap 采用分层架构...
   位置: 第 15-20 行

2. refer/codemap-architecture-design.md (相关度: 87%)
   片段: 架构设计文档...
   位置: 第 1-10 行

使用工具: rg, 置信度: medium (0.65)
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
📋 功能实现参考
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

目标: 实现编辑页面功能
关键词: 编辑, edit, form

🔍 相关代码参考:
   • src/features/user/components/UserEdit.tsx (相关度: 95%)
     - 用户编辑表单组件，包含姓名、邮箱、角色字段
     - 使用 React Hook Form + Zod 验证
     - 依赖: api/user.ts, types/user.ts

   • src/features/product/components/ProductForm.tsx (相关度: 88%)
     - 产品编辑表单，包含名称、描述、价格、分类
     - 使用 Ant Design Form
     - 依赖: api/product.ts, types/product.ts

📦 依赖模块:
   • src/types/edit-form.ts (共享编辑表单类型)
   • src/hooks/useEditForm.ts (编辑表单 Hook)
   • src/components/FormField/ (通用表单字段组件)

🧪 相关测试:
   • src/features/user/__tests__/UserEdit.test.tsx
   • src/features/product/__tests__/ProductForm.test.tsx

💡 实现建议:
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

## 附录

### A. 相关文档

- 评估报告: `CODEMAP_ASSESSMENT_REPORT.md`
- 方案对比: `MULTI_TOOL_REFACTOR_OPTIONS.md`
- 系统架构与功能设计: `REFACTOR_ARCHITECTURE_DESIGN.md`

### B. 参考资源

- ast-grep 官方文档: https://ast-grep.github.io/
