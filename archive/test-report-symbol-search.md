# CodeMap 符号搜索对比测试报告

## 测试概述

**测试目标**: 对比 `codemap query -s/-S` 与 `grep/rg` 在搜索代码符号时的差异

**测试环境**: /data/codemap 目录

**测试时间**: 2026-03-02

---

## 测试场景1: 精确搜索符号 "ModuleInfo"

### 测试目的
搜索项目中广泛使用的类型名称 "ModuleInfo"，对比各工具的精确匹配能力。

### CodeMap 执行
```bash
npx codemap query -s "ModuleInfo"
```

**输出:**
```
🔍 查询 "ModuleInfo" (symbol)
   找到 5 个结果

   moduleInfo
      类型: variable
      路径: /data/codemap/src/core/analyzer.ts
      定义于 src/core/analyzer.ts:55

   moduleInfo
      类型: variable
      路径: /data/codemap/src/core/analyzer.ts
      定义于 src/core/analyzer.ts:63

   moduleInfo
      类型: variable
      路径: /data/codemap/src/core/analyzer.ts
      定义于 src/core/analyzer.ts:76

   ModuleInfo
      类型: interface
      路径: /data/codemap/src/types/index.ts
      导出于 src/types/index.ts

   ModuleInfo
      类型: interface
      路径: /data/codemap/src/types/index.ts
      定义于 src/types/index.ts:154
```

**执行时间**: 0.538s (real)

### rg 执行
```bash
rg -n "ModuleInfo" src/
```

**输出:** (共找到 82 处匹配，以下为部分示例)
```
src/parser/index.ts:8:import type { ModuleInfo, ImportInfo, ExportInfo, ModuleSymbol, SymbolKind, DecoratorInfo } from '../types/index.js';
src/parser/index.ts:60:export async function parseFile(filePath: string): Promise<ModuleInfo> {
src/core/analyzer.ts:5:import type { CodeMap, AnalysisOptions, ModuleInfo, DependencyGraph, ProjectInfo, ProjectSummary } from '../types/index.js';
src/core/analyzer.ts:43:  const modules: ModuleInfo[] = [];
src/types/index.ts:154:export interface ModuleInfo {
src/cache/index.ts:10:import type { ModuleInfo } from '../types/index.js';
...
```

**执行时间**: 0.008s (real)

### grep 执行
```bash
grep -rn "ModuleInfo" src/
```

**输出:** (与 rg 类似，共 82 处匹配)

**执行时间**: 0.003s (real)

### 对比分析

| 维度 | CodeMap | rg | grep |
|------|---------|-----|------|
| **速度** | 0.538s | 0.008s | 0.003s |
| **结果数量** | 5 个符号定义 | 82 处匹配 | 82 处匹配 |
| **准确性** | 仅返回符号定义和导出 | 返回所有文本匹配 | 返回所有文本匹配 |
| **符号类型识别** | ✅ 是 (interface, variable) | ❌ 否 | ❌ 否 |
| **导出信息** | ✅ 显示导出位置 | ❌ 否 | ❌ 否 |
| **可读性** | 结构化，带类型标签 | 纯文本行 | 纯文本行 |

### 发现的问题

1. **CodeMap 速度较慢**: CodeMap 比 rg 慢约 67 倍，比 grep 慢约 179 倍
2. **CodeMap 结果不完整**: CodeMap 只返回 5 个结果，而 rg/grep 返回 82 处匹配
3. **CodeMap 区分大小写问题**: 搜索 "ModuleInfo" 时，变量名 "moduleInfo"（小写）也被返回，但可能并非用户期望的精确匹配
4. **rg/grep 缺乏语义**: 无法区分类型定义、变量声明和普通文本引用

---

## 测试场景2: 模糊搜索 "cache"

### 测试目的
使用模糊搜索查找与 "cache" 相关的符号，对比各工具的模糊匹配能力。

### CodeMap 执行
```bash
npx codemap query -S "cache"
```

**输出:**
```
🔍 查询 "cache" (search)
   找到 20 个结果

   cached
      类型: variable
      路径: /data/codemap/src/ai/factory.ts
      定义于 src/ai/factory.ts:25

   clearCache
      类型: method
      路径: /data/codemap/src/ai/factory.ts
      定义于 src/ai/factory.ts:95

   src/cache/file-hash-cache.ts
      类型: module
      路径: /data/codemap/src/cache/file-hash-cache.ts
      模块匹配

   FileHashCache
      类型: export (class)
      路径: /data/codemap/src/cache/file-hash-cache.ts
      导出于 src/cache/file-hash-cache.ts

   generateCacheKey
      类型: export (function)
      路径: /data/codemap/src/cache/file-hash-cache.ts
      导出于 src/cache/file-hash-cache.ts

   parseCacheKey
      类型: export (function)
      路径: /data/codemap/src/cache/file-hash-cache.ts
      导出于 src/cache/file-hash-cache.ts

   FileHashCache
      类型: class
      路径: /data/codemap/src/cache/file-hash-cache.ts
      定义于 src/cache/file-hash-cache.ts:66

   ... (共20个结果)
```

**执行时间**: 0.642s (real)

### rg 执行
```bash
rg -n "cache" src/ -i
```

**输出:** (共找到约 300+ 处匹配，以下为部分)
```
src/cache/file-hash-cache.ts:2:// File Hash Cache - 文件哈希缓存
src/cache/file-hash-cache.ts:66:export class FileHashCache {
src/cache/file-hash-cache.ts:67:  private hashCache = new Map<string, { hash: string; mtime: number }>();
src/cache/lru-cache.ts:2:// LRU Cache Implementation - 最近最少使用缓存
src/cache/lru-cache.ts:9:export class LRUCache<K, V> {
src/cache/index.ts:2:// Cache Module - 缓存系统入口
...
```

**执行时间**: 0.007s (real)

### 对比分析

| 维度 | CodeMap (-S) | rg (-i) |
|------|--------------|---------|
| **速度** | 0.642s | 0.007s |
| **结果数量** | 20 个符号 | 300+ 处文本匹配 |
| **匹配模式** | 符号级模糊匹配 | 文本级正则匹配 |
| **信息类型** | 符号定义、导出、模块 | 所有文本行 |
| **去重** | ✅ 符号去重 (如 FileHashCache 类只出现一次定义) | ❌ 每行都显示 |
| **可读性** | 结构化，带类型信息 | 纯文本，含代码上下文 |

### 发现的问题

1. **CodeMap 模糊搜索速度慢**: 比 rg 慢约 91 倍
2. **CodeMap 结果数量受限**: 仅返回 20 个结果，而 rg 返回 300+ 处
3. **CodeMap 不显示引用位置**: 只显示定义位置，不显示使用位置
4. **rg 结果噪音大**: 返回所有包含 "cache" 文本的行，包括注释、字符串、变量名等

---

## 测试场景3: 搜索类/接口定义 "Analyzer"

### 测试目的
搜索类或接口定义，对比各工具的类型识别能力。

### CodeMap 执行
```bash
npx codemap query -s "Analyzer"
```

**输出:**
```
🔍 查询 "Analyzer" (symbol)
   找到 1 个结果

   analyzer
      类型: variable
      路径: /data/codemap/src/orchestrator/__tests__/git-analyzer.test.ts
      定义于 src/orchestrator/__tests__/git-analyzer.test.ts:27
```

**执行时间**: 0.515s (real)

### rg 执行 (类/接口定义模式)
```bash
rg -n "class Analyzer|interface Analyzer" src/
```

**输出:**
```
(无匹配，退出码 1)
```

**执行时间**: 0.009s (real)

### rg 执行 (扩展搜索)
```bash
rg -n "Analyzer" src/ | head -30
```

**输出:**
```
src/cli/commands/ci.ts:9:import { GitAnalyzer } from '../../orchestrator/git-analyzer.js';
src/orchestrator/git-analyzer.ts:118: * GitAnalyzer 类
src/orchestrator/git-analyzer.ts:121:export class GitAnalyzer {
src/plugins/built-in/complexity-analyzer.ts:96:class ComplexityAnalyzerPlugin implements CodeMapPlugin {
src/orchestrator/index.ts:53:  GitAnalyzer,
...
```

### grep 执行
```bash
grep -rn "Analyzer" src/ | head -30
```

**输出:** (与 rg 类似)

### 对比分析

| 维度 | CodeMap | rg (class/interface) | rg (extended) |
|------|---------|---------------------|---------------|
| **速度** | 0.515s | 0.009s | 0.010s |
| **结果** | 1 个变量 | 0 个 | 约 50+ 处 |
| **类型过滤** | ❌ 未正确过滤 | ✅ 精确匹配模式 | ❌ 无过滤 |
| **大小写敏感** | ❌ 不敏感 ("analyzer" 匹配 "Analyzer") | ✅ 敏感 | ✅ 敏感 |

### 发现的问题

1. **CodeMap 搜索 "Analyzer" 未找到 GitAnalyzer 类**: 这是严重问题！项目中存在 `GitAnalyzer` 类和 `ComplexityAnalyzerPlugin` 类，但 CodeMap 只找到一个测试文件中的变量 `analyzer`。
2. **CodeMap 大小写不敏感问题**: 搜索 "Analyzer" 却匹配了 "analyzer" (小写变量名)。
3. **rg 精确模式有效但过于严格**: `class Analyzer|interface Analyzer` 精确模式没有匹配到 `class GitAnalyzer` (因为类名是 GitAnalyzer 不是 Analyzer)。
4. **CodeMap 缺少子串匹配**: CodeMap 似乎未将 "GitAnalyzer" 中的 "Analyzer" 子串作为匹配结果。

---

## 综合分析

### 速度对比

| 工具 | Test1 (ModuleInfo) | Test2 (cache) | Test3 (Analyzer) | 平均 |
|------|-------------------|---------------|------------------|------|
| CodeMap | 0.538s | 0.642s | 0.515s | **0.565s** |
| rg | 0.008s | 0.007s | 0.010s | **0.008s** |
| grep | 0.003s | - | - | **0.003s** |

**结论**: CodeMap 比 rg 慢约 70 倍，比 grep 慢约 188 倍。

### 准确性对比

| 场景 | CodeMap | rg/grep |
|------|---------|---------|
| 精确搜索 | ⚠️ 仅返回定义，遗漏大量引用 | ✅ 返回所有文本匹配 |
| 模糊搜索 | ✅ 返回相关符号，结构化 | ⚠️ 返回所有文本，噪音大 |
| 类型搜索 | ❌ 严重遗漏 (未找到 GitAnalyzer) | ⚠️ 需要复杂正则 |

### 信息丰富度对比

| 信息类型 | CodeMap | rg | grep |
|---------|---------|-----|------|
| 符号类型 | ✅ | ❌ | ❌ |
| 导出信息 | ✅ | ❌ | ❌ |
| 文件路径 | ✅ | ✅ | ✅ |
| 行号 | ✅ | ✅ | ✅ |
| 代码上下文 | ❌ | ✅ | ✅ |
| 依赖关系 | ❌ | ❌ | ❌ |

### 易用性对比

| 维度 | CodeMap | rg | grep |
|------|---------|-----|------|
| 命令简洁度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 输出可读性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 学习曲线 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 无需索引 | ❌ | ✅ | ✅ |

---

## 发现的关键问题

### 🔴 严重问题

1. **符号搜索遗漏严重**: CodeMap 在搜索 "Analyzer" 时完全遗漏了 `GitAnalyzer` 类和 `ComplexityAnalyzerPlugin` 类，只找到一个不相关的变量。
   - 检查 codemap.json 发现 GitAnalyzer 存在于索引中（多处）
   - 可能是搜索算法未正确处理子串匹配或类名前缀

2. **大小写处理不一致**: 
   - 搜索 "ModuleInfo" 返回了 "moduleInfo" (小写变量)
   - 搜索 "Analyzer" 返回了 "analyzer" (小写变量)
   - 但搜索 "cache" 却正确区分了大小写变体

### 🟡 中等问题

3. **速度性能差**: CodeMap 比传统工具慢 70-180 倍，对于大型项目可能无法接受。

4. **结果数量有限**: 模糊搜索仅返回 20 个结果，可能遗漏重要符号。

### 🟢 轻微问题

5. **缺少引用信息**: CodeMap 只返回定义位置，不显示符号在哪里被使用。

6. **无代码上下文**: 不像 rg/grep 那样显示匹配的代码行。

---

## 建议

### 对 CodeMap 的改进建议

1. **修复搜索算法**: 
   - 确保子串匹配正常工作（如 "Analyzer" 应匹配 "GitAnalyzer"）
   - 检查符号索引的查询逻辑

2. **优化性能**: 
   - 使用更高效的数据结构（如 Trie 树）进行符号查找
   - 考虑使用 SQLite 或嵌入式数据库加速查询

3. **增强搜索选项**:
   - 添加 `--case-sensitive` 和 `--case-insensitive` 选项
   - 添加 `--include-references` 选项显示符号引用位置
   - 添加 `-n/--limit` 选项控制结果数量

4. **显示代码上下文**:
   - 添加选项显示匹配行的代码片段

### 使用建议

| 场景 | 推荐工具 | 原因 |
|------|---------|------|
| 快速查找文本 | rg/grep | 速度快，无需索引 |
| 查找符号定义 | CodeMap | 结构化输出，带类型信息 |
| 理解代码结构 | CodeMap | 显示导出和模块关系 |
| 查找类/接口定义 | rg + 正则 | CodeMap 当前有遗漏问题 |
| 模糊探索代码库 | CodeMap | 符号级模糊匹配减少噪音 |

---

## 附录: 测试原始数据

### CodeMap 索引统计
- 总文件数: 104
- 总行数: 28,878
- 总模块数: 104
- 总导出: 378
- 总类型: 70

### 发现的符号
- `ModuleInfo` 接口定义于: src/types/index.ts:154
- `GitAnalyzer` 类定义于: src/orchestrator/git-analyzer.ts:121
- `ComplexityAnalyzerPlugin` 类定义于: src/plugins/built-in/complexity-analyzer.ts:96
