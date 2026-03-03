# 测试场景 2: 模块依赖分析对比测试

**测试目标**: 对比 `codemap deps` 与手动 `grep` 分析模块依赖的差异

**测试环境**: /data/codemap 目录

---

## 测试 1: 查看 src/parser/index.ts 的依赖树

### 测试目的
对比 CodeMap 的依赖树展示能力与手动 grep 分析的效果

### CodeMap 执行
```bash
npx codemap deps -m "src/parser"
```
**执行时间**: 0.658s

**输出**:
```
📦 模块: src/parser/index.ts
──────────────────────────────────────────────────

⬇️  直接依赖 (dependencies):
   • typescript [source]
   • fs/promises [source]
   • path [source]
   • /data/codemap/src/types/index.js [source]
   • /data/codemap/src/parser/interfaces/IParser.js [source]
   • /data/codemap/src/parser/implementations/smart-parser.js [source]
   • /data/codemap/src/parser/implementations/fast-parser.js [source]

⬆️  被依赖 (dependents):
   • src/core/analyzer.ts
──────────────────────────────────────────────────
   依赖数量: 7
   被依赖数量: 1
```

### 传统工具执行
```bash
rg -n "import.*from" src/parser/index.ts
```
**执行时间**: 0.003s

**输出**:
```
5:import ts from 'typescript';
6:import fs from 'fs/promises';
7:import path from 'path';
8:import type { ModuleInfo, ImportInfo, ExportInfo, ModuleSymbol, SymbolKind, DecoratorInfo } from '../types/index.js';
9:import type { IParser, ParserOptions, ParserMode } from './interfaces/IParser.js';
10:import { SmartParser } from './implementations/smart-parser.js';
11:import { FastParser } from './implementations/fast-parser.js';
```

### 对比分析

| 维度 | CodeMap | 传统工具 (rg) | 结论 |
|------|---------|---------------|------|
| 速度 | 0.658s | 0.003s | rg 快 ~200倍 |
| 依赖方向 | 同时显示导入(⬇️)和被导入(⬆️) | 仅显示导入语句 | CodeMap 更全面 |
| 准确性 | 显示 .js 扩展名（构建后） | 显示源代码 .ts 扩展名 | rg 更准确反映源代码 |
| 结构化 | 分类显示，带统计信息 | 原始代码行 | CodeMap 更易读 |
| 被依赖分析 | ✅ 自动识别 | ❌ 需额外查找 | CodeMap 独有功能 |

### 发现的问题
1. **路径扩展名不一致**: CodeMap 显示 `.js` 扩展名，而源代码使用 `.ts`，可能造成混淆
2. **速度差距大**: CodeMap 启动开销明显高于 rg

---

## 测试 2: 查看 src/core/analyzer.ts 的依赖

### 测试目的
测试复杂模块的依赖分析能力

### CodeMap 执行
```bash
npx codemap deps -m "src/core/analyzer"
```
**执行时间**: 0.575s

**输出**:
```
📦 模块: src/core/analyzer.ts
──────────────────────────────────────────────────

⬇️  直接依赖 (dependencies):
   • path [source]
   • fs/promises [source]
   • globby [source]
   • /data/codemap/src/parser/index.js [source]
   • /data/codemap/src/types/index.js [source]
   • /data/codemap/src/parser/interfaces/IParser.js [source]
   • /data/codemap/src/core/global-index.js [source]

⬆️  被依赖 (dependents):
   • src/watcher/watch-worker.ts
   • src/core/__tests__/analyzer.test.ts
   • src/cli/__tests__/generate.test.ts
   • src/cli/commands/generate.ts
   • src/cli/commands/watch-foreground.ts
   • src/cli/commands/__tests__/watch-foreground.test.ts
──────────────────────────────────────────────────
   依赖数量: 7
   被依赖数量: 6
```

### 传统工具执行
```bash
rg -n "import" src/core/analyzer.ts
```
**执行时间**: 0.003s

**输出**:
```
1:import path from 'path';
2:import fs from 'fs/promises';
3:import { globby } from 'globby';
4:import { parseFile, createParser } from '../parser/index.js';
5:import type { CodeMap, AnalysisOptions, ModuleInfo, DependencyGraph, ProjectInfo, ProjectSummary } from '../types/index.js';
6:import type { ParseResult } from '../parser/interfaces/IParser.js';
7:import { createGlobalIndex, GlobalSymbolIndexBuilder } from './global-index.js';
142:    imports: result.imports,
197:        const edgeKey = `${mod.id}->${targetMod.id}:import`;
204:          type: 'import',
259:  importerPath: string,
269:    candidates.push(normalizePath(path.resolve(path.dirname(importerPath), rawDep)));
```

### 对比分析

| 维度 | CodeMap | 传统工具 (rg) | 结论 |
|------|---------|---------------|------|
| 速度 | 0.575s | 0.003s | rg 快 ~190倍 |
| 误报过滤 | 仅显示 import 语句 | 显示所有包含 "import" 的行 | CodeMap 更准确 |
| 被依赖识别 | ✅ 自动识别 6 个模块依赖此模块 | ❌ 无法识别 | CodeMap 独有功能 |
| 类型导入 | 不区分 type import | 显示 type 关键字 | rg 更详细 |

### 发现的问题
1. **rg 误报问题**: grep 匹配了所有包含 "import" 的行（包括变量名），需要更精确的 pattern
2. **CodeMap 不区分 import 类型**: 未显示哪些是 type-only import

---

## 测试 3: 完整的依赖统计

### 测试目的
对比全局依赖统计的能力

### CodeMap 执行
```bash
npx codemap deps
```
**执行时间**: 0.527s

**输出**:
```
📊 项目依赖分析
──────────────────────────────────────────────────

📦 模块依赖排名 (Top 20):
   1. src/orchestrator/workflow/workflow-orchestrator.ts
      依赖: 13, 类型: source
   2. src/cli/index.ts
      依赖: 12, 类型: source
   3. src/cli/commands/analyze.ts
      依赖: 11, 类型: source
   4. src/core/analyzer.ts
      依赖: 7, 类型: source
   5. src/parser/index.ts
      依赖: 7, 类型: source
   ...
──────────────────────────────────────────────────
   总模块数: 104
   有依赖的模块: 104
   总依赖关系: 350
```

### 传统工具执行
```bash
rg -n "^import|^export" src/ --stats
```
**执行时间**: 0.008s

**输出** (部分):
```
# 显示所有匹配行，包含文件路径和行号
# 需要手动统计每个文件的 import 数量
# 最后给出总体统计:
130 matches
13 files contained matches
52 files searched
0 bytes printed
```

### 对比分析

| 维度 | CodeMap | 传统工具 (rg) | 结论 |
|------|---------|---------------|------|
| 速度 | 0.527s | 0.008s | rg 快 ~65倍 |
| 排名统计 | ✅ 自动按依赖数排名 | ❌ 需手动统计 | CodeMap 大幅领先 |
| 模块分类 | ✅ 区分 source/test | ❌ 需手动过滤 | CodeMap 更智能 |
| 总计信息 | ✅ 总模块数、依赖关系数 | ⚠️ 仅匹配数 | CodeMap 更有用 |
| 可扩展性 | JSON 输出支持 | 需管道处理 | CodeMap 更友好 |

### JSON 输出测试
```bash
npx codemap deps --json
```

输出结构化 JSON，包含每个模块的依赖数量，便于程序化处理。

### 发现的问题
1. **rg 统计困难**: 需要复杂的管道命令才能获得类似统计
2. **CodeMap 缺少依赖图**: 仅显示数量排名，未展示依赖关系图

---

## 测试 4: 检测循环依赖

### 测试目的
对比循环依赖检测的能力

### CodeMap 执行
```bash
npx codemap cycles
```
**执行时间**: 0.677s

**输出**:
```
🔄 循环依赖检测
──────────────────────────────────────────────────

✅ 未检测到循环依赖！
```

### 传统工具尝试
手动检测循环依赖需要递归搜索每个依赖的依赖，复杂度极高：

```bash
# 步骤 1: 获取模块的所有导入
rg -n "import.*from" src/core/analyzer.ts

# 步骤 2: 对每个导入，检查是否反向依赖
# 这需要递归执行以下命令 N 次：
rg -n "import.*from.*analyzer" src/parser/
rg -n "import.*from.*parser" src/core/
# ... 以此类推
```

**复杂度分析**:
- 对于 N 个模块，平均每个模块 M 个依赖
- 需要执行 O(N × M) 次搜索
- 每次搜索可能需要检查多个目录
- 需要构建完整的依赖图才能检测循环

**手动尝试结果**:
```bash
# 尝试检测 ai <-> generator 循环
rg -n "import.*from.*generator" src/ai/      # 无结果
rg -n "import.*from.*ai" src/generator/      # 发现 1 条
# 实际: generator/ai-overview.ts -> ai/subagent-caller.js (单向，非循环)
```

### 对比分析

| 维度 | CodeMap | 传统工具 (rg) | 结论 |
|------|---------|---------------|------|
| 循环检测 | ✅ 一键检测 | ❌ 极其困难 | CodeMap 独有优势 |
| 算法复杂度 | O(N + E) 图遍历 | O(N² × M²) 搜索 | CodeMap 专业实现 |
| 准确性 | 构建完整依赖图 | 容易遗漏 | CodeMap 可靠 |
| 速度 | 0.677s | 可能需要数分钟 | CodeMap 高效 |
| 可视化 | ✅ 清晰的检测结果 | ❌ 无 | CodeMap 更友好 |

### 发现的问题
1. **手动检测几乎不可行**: 对于大型项目，手动 grep 几乎无法可靠检测循环依赖
2. **CodeMap 无循环路径展示**: 检测到循环时，应展示具体循环路径

---

## 综合评估

### 速度对比汇总

| 测试项 | CodeMap | rg | 速度比 (rg/CodeMap) |
|--------|---------|-----|---------------------|
| 单模块依赖 | 0.658s | 0.003s | 219x |
| 复杂模块依赖 | 0.575s | 0.003s | 191x |
| 全局依赖统计 | 0.527s | 0.008s | 65x |
| 循环依赖检测 | 0.677s | ~分钟级 | CodeMap 独有 |

### 核心优势对比

| 能力 | CodeMap | rg |
|------|---------|-----|
| 双向依赖分析 | ✅ | ❌ |
| 依赖排名统计 | ✅ | ❌ |
| 循环依赖检测 | ✅ | ❌ |
| 结构化输出 | ✅ | ⚠️ |
| 模块分类 | ✅ | ❌ |
| 原始代码匹配 | ⚠️ | ✅ |
| 速度 | ⚠️ | ✅ |
| 灵活性 | ⚠️ | ✅ |

### 主要发现的问题

1. **性能开销**: CodeMap 有显著的启动/解析开销（~0.6s），不适合频繁调用
2. **路径显示**: 显示 `.js` 而非 `.ts` 扩展名，与源代码不一致
3. **缺少传递依赖**: 不支持 `--depth` 选项查看传递依赖树
4. **循环路径**: 检测到循环时未展示具体路径
5. **Type Import**: 未区分 `import type` 和普通 `import`

### 改进建议

1. **性能优化**:
   - 实现缓存机制，避免重复解析
   - 支持守护进程模式 (daemon mode)
   - 延迟加载，按需解析

2. **功能增强**:
   - 添加 `--depth` 参数支持传递依赖分析
   - 循环检测显示完整路径 (A -> B -> C -> A)
   - 区分 type-only import
   - 生成依赖图可视化 (Mermaid/Graphviz)

3. **输出改进**:
   - 默认显示源代码路径 (.ts)
   - 添加 `--build-paths` 选项显示构建路径 (.js)
   - 支持更多输出格式 (CSV, HTML)

---

## 结论

**CodeMap** 在依赖分析的**功能完整性**上大幅领先传统工具：
- 独有的双向依赖分析
- 一键循环依赖检测
- 结构化排名统计
- 对大型项目不可或缺

**rg** 在**速度和灵活性**上保持优势：
- 适合快速查找特定模式
- 适合脚本化处理
- 无额外依赖

**推荐用法**:
- 日常开发、CI/CD 中使用 CodeMap 进行依赖分析
- 快速代码查找仍使用 rg
- 两者结合，发挥各自优势
