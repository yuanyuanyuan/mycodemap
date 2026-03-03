# 测试场景5: 查询功能和JSON输出测试报告

## 测试概览

**测试目标**: 测试 `codemap query` 的多种查询模式和JSON输出的实用性
**测试环境**: /data/codemap (Node.js CLI 版本)
**测试时间**: $(date)
**测试执行者**: CodeMap 测试专家

---

## 1. 不同查询模式测试

### 1.1 符号查询 (-s, --symbol)

**命令**:
```bash
npx codemap query -s "ModuleInfo"
```

**执行时间**: 0.583s (real)

**输出结果**:
```
🔍 查询 "ModuleInfo" (symbol)
   找到 5 个结果

   moduleInfo
      类型: variable
      路径: /data/codemap/src/core/analyzer.ts
      定义于 src/core/analyzer.ts:55

   ModuleInfo
      类型: interface
      路径: /data/codemap/src/types/index.ts
      导出于 src/types/index.ts
      ...
```

**结果分析**:
- ✅ 成功找到 5 个匹配结果
- ✅ 区分大小写（找到 `moduleInfo` 变量和 `ModuleInfo` 接口）
- ✅ 提供符号类型（variable, interface）
- ✅ 显示文件路径和行列号
- ✅ 识别导出/定义位置

---

### 1.2 模块查询 (-m, --module)

**命令**:
```bash
npx codemap query -m "src/cache"
```

**执行时间**: 0.613s (real)

**输出结果**:
```
🔍 查询 "src/cache" (module)
   找到 6 个结果

   src/cache/file-hash-cache.ts
      类型: source
      路径: /data/codemap/src/cache/file-hash-cache.ts
      导出: computeFileHash, computeFileHashes, ...

   src/cache/index.ts
      类型: source
      路径: /data/codemap/src/cache/index.ts
      导出: LRUCache, LRUCacheWithTTL, ...
      ...
```

**结果分析**:
- ✅ 找到 6 个匹配模块（含测试文件）
- ✅ 正确区分 source 和 test 类型
- ✅ 列出每个模块的导出符号
- ✅ 支持部分路径匹配

---

### 1.3 依赖查询 (-d, --deps)

**命令**:
```bash
npx codemap query -d "analyzer"
```

**执行时间**: 0.585s (real)

**输出结果**:
```
🔍 查询 "analyzer" (deps)
   找到 20 个结果

   /data/codemap/src/orchestrator/git-analyzer.ts
      类型: dependency
      路径: /data/codemap/src/orchestrator/ai-feed-generator.ts
      被 src/orchestrator/ai-feed-generator.ts 引用

   ./git-analyzer
      类型: import
      路径: /data/codemap/src/orchestrator/ai-feed-generator.ts
      导入自 src/orchestrator/ai-feed-generator.ts
      ...
```

**结果分析**:
- ✅ 找到 20 个依赖关系
- ✅ 区分 dependency 和 import 类型
- ✅ 显示引用方向和来源
- ✅ 包含相对路径和绝对路径
- ⚠️ 存在重复（dependency 和 import 成对出现）

---

### 1.4 模糊搜索 (-S, --search)

**命令**:
```bash
npx codemap query -S "parser"
```

**执行时间**: 0.544s (real)

**输出结果**:
```
🔍 查询 "parser" (search)
   找到 20 个结果

   parseResponse
      类型: method
      路径: /data/codemap/src/ai/claude.ts
      定义于 src/ai/claude.ts:192

   src/parser/index.ts
      类型: module
      路径: /data/codemap/src/parser/index.ts
      模块匹配
      ...
```

**结果分析**:
- ✅ 找到 20 个相关结果
- ✅ 匹配符号名、模块名、文件名
- ✅ 支持子字符串匹配（parseResponse, ParseResult 都匹配）
- ✅ 显示多种结果类型（method, module, class, export）

---

## 2. JSON 输出格式测试

### 2.1 符号查询 JSON 输出

**命令**:
```bash
npx codemap query -s "ModuleInfo" -j
```

**执行时间**: 0.577s (real)

**输出结构**:
```json
{
  "type": "symbol",
  "query": "ModuleInfo",
  "count": 5,
  "results": [
    {
      "name": "moduleInfo",
      "path": "/data/codemap/src/core/analyzer.ts",
      "kind": "variable",
      "details": "定义于 src/core/analyzer.ts:55"
    },
    {
      "name": "ModuleInfo",
      "path": "/data/codemap/src/types/index.ts",
      "kind": "interface",
      "details": "导出于 src/types/index.ts"
    }
  ]
}
```

**结构验证**:
- ✅ JSON 格式有效（通过 python3 -m json.tool 验证）
- ✅ 包含元数据（type, query, count）
- ✅ 每个结果有 name, path, kind, details 字段
- ✅ 数组结构便于程序解析
- ⚠️ details 字段为自然语言描述，不利于机器解析

---

### 2.2 模糊搜索 JSON 带限制

**命令**:
```bash
npx codemap query -S "cache" -j -l 3
```

**输出结构**:
```json
{
  "type": "search",
  "query": "cache",
  "count": 3,
  "results": [
    {
      "name": "cached",
      "path": "/data/codemap/src/ai/factory.ts",
      "kind": "variable",
      "details": "定义于 src/ai/factory.ts:25"
    },
    {
      "name": "src/cache/file-hash-cache.ts",
      "path": "/data/codemap/src/cache/file-hash-cache.ts",
      "kind": "module",
      "details": "模块匹配"
    }
  ]
}
```

**功能验证**:
- ✅ -l 3 参数正确限制结果数量为 3
- ✅ JSON 结构保持一致
- ✅ 混合返回不同类型结果（variable, module）

---

### 2.3 依赖查询 JSON 输出

**命令**:
```bash
npx codemap deps -m "src/core" -j
```

**输出结构**:
```json
{
  "module": {
    "path": "/data/codemap/src/core/analyzer.ts",
    "relativePath": "src/core/analyzer.ts",
    "dependencies": [
      "path",
      "fs/promises",
      "globby",
      "/data/codemap/src/parser/index.js",
      ...
    ],
    "dependents": [
      "iucg3n",
      "xg0gnk",
      ...
    ]
  }
}
```

**结构分析**:
- ✅ 嵌套结构清晰（module 对象）
- ✅ 分离 dependencies 和 dependents
- ⚠️ dependents 使用 ID 而非路径，可读性较差
- ⚠️ 与 `query -d` 输出格式不一致

---

## 3. 结果数量限制测试

### 3.1 限制 -l 5

**命令**:
```bash
npx codemap query -S "export" -l 5
```

**结果**: 找到 5 个结果 ✅

### 3.2 限制 -l 20

**命令**:
```bash
npx codemap query -S "export" -l 20
```

**结果**: 找到 20 个结果 ✅

### 3.3 限制功能分析

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 默认限制 | ✅ | 默认限制 20 条 |
| 自定义限制 | ✅ | -l 参数有效 |
| JSON 模式下限制 | ✅ | 同时工作正常 |
| 限制准确性 | ✅ | 严格按指定数量返回 |

---

## 4. 边界测试

### 4.1 搜索不存在的符号

**命令**:
```bash
npx codemap query -s "NonExistentSymbol123"
```

**输出**:
```
🔍 查询 "NonExistentSymbol123" (symbol)
   找到 0 个结果

   未找到匹配结果
```

**JSON 输出**:
```json
{
  "type": "symbol",
  "query": "NonExistentSymbol123",
  "count": 0,
  "results": []
}
```

**评价**:
- ✅ 退出码为 0（正常退出）
- ✅ 人类可读输出友好
- ✅ JSON 输出结构完整
- ✅ 空数组而非 null

---

### 4.2 空查询

**命令**:
```bash
npx codemap query
```

**输出**:
```
❌ 请指定查询类型: --symbol, --module, --deps, 或 --search

用法:
   codemap query --symbol <name>    # 查询符号
   codemap query --module <path>   # 查询模块
   codemap query --deps <name>    # 查询依赖
   codemap query --search <word>  # 模糊搜索
```

**评价**:
- ✅ 退出码为 1（错误退出）
- ✅ 错误信息清晰
- ✅ 提供使用帮助
- ✅ 中文本地化友好

---

### 4.3 特殊字符查询

**命令**:
```bash
npx codemap query -S "<any>"
```

**输出**:
```
🔍 查询 "<any>" (search)
   找到 0 个结果

   未找到匹配结果
```

**评价**:
- ✅ 未报错或崩溃
- ✅ 正确处理特殊字符
- ✅ 返回空结果而非异常

---

## 5. 与传统工具对比

### 5.1 速度对比

| 查询类型 | CodeMap | grep | rg | 结论 |
|----------|---------|------|----|----|
| 符号搜索 | 0.583s | 0.003s | 0.007s | 传统工具快 ~100x |
| 模糊搜索 | 0.544s | 0.003s | - | 传统工具快 ~180x |
| 模块搜索 | 0.613s | 0.002s (find) | - | 传统工具快 ~300x |

### 5.2 功能对比

| 功能 | CodeMap | grep/rg | 说明 |
|------|---------|---------|------|
| 符号类型识别 | ✅ | ❌ | CodeMap 知道是 interface 还是 variable |
| 文件类型过滤 | ✅ | 部分 | CodeMap 自动区分 source/test |
| 导出信息 | ✅ | ❌ | CodeMap 显示模块导出 |
| 依赖关系 | ✅ | ❌ | CodeMap 显示谁引用了谁 |
| JSON 输出 | ✅ | ❌ | CodeMap 支持结构化输出 |
| 结果限制 | ✅ | 需管道 | CodeMap 内置 -l 参数 |
| 正则表达式 | ❌ | ✅ | grep/rg 支持复杂模式 |
| 实时搜索 | ❌ | ✅ | grep/rg 无需预构建索引 |

### 5.3 信息丰富度对比

**CodeMap 输出**:
```
ModuleInfo
   类型: interface
   路径: /data/codemap/src/types/index.ts
   定义于 src/types/index.ts:154
```

**grep 输出**:
```
src/types/index.ts:export interface ModuleInfo {
```

**结论**: CodeMap 提供语义化信息，grep 提供原始上下文。

---

## 6. 发现的问题

### 问题1: 性能差距明显
**描述**: CodeMap 查询速度比 grep/rg 慢 100-300 倍
**影响**: 高频查询场景可能不适用
**建议**: 
- 添加性能提示说明（基于索引的查询 vs 实时搜索）
- 考虑引入内存缓存机制
- 对于简单文本搜索，建议用户直接使用 grep

### 问题2: JSON 中 details 字段不够结构化
**描述**: `details` 字段是自然语言描述，如 "定义于 src/types/index.ts:154"
**影响**: API 消费者需要正则解析来获取行号
**建议**:
```json
{
  "location": {
    "file": "src/types/index.ts",
    "line": 154,
    "column": 1
  },
  "isExported": true
}
```

### 问题3: 依赖查询结果存在重复
**描述**: `query -d` 同时返回 dependency 和 import 类型，内容重复
**影响**: 结果集膨胀，可读性下降
**建议**: 合并或去重，或添加去重选项

### 问题4: deps 命令与 query -d 输出格式不一致
**描述**: `deps -j` 和 `query -d -j` 返回完全不同的 JSON 结构
**影响**: API 使用混乱
**建议**: 统一输出格式或明确文档说明差异

### 问题5: dependents 使用内部 ID
**描述**: `deps` 命令返回的 dependents 是 "iucg3n" 等 ID
**影响**: 无法直接识别是哪个模块
**建议**: 返回模块路径或提供 ID 到路径的映射

### 问题6: 缺少正则表达式支持
**描述**: 模糊搜索仅支持子字符串，不支持正则
**影响**: 复杂查询场景受限
**建议**: 添加 `--regex` 模式支持

---

## 7. 优点总结

### 7.1 语义化查询
- 理解代码结构（interface, class, function）
- 区分定义和引用
- 识别模块边界

### 7.2 友好的 CLI 体验
- 中文输出本地化
- 清晰的错误提示
- 彩色输出（如果支持）

### 7.3 结构化输出
- JSON 格式便于集成
- 一致的输出结构
- 空结果处理得当

### 7.4 多功能集成
- 单一工具覆盖多种查询场景
- 无需组合多个命令
- 内置结果限制

---

## 8. API 集成价值评估

### 8.1 适用场景
| 场景 | 适用性 | 说明 |
|------|--------|------|
| IDE 插件 | ⭐⭐⭐⭐⭐ | 符号跳转、代码补全 |
| CI/CD 检查 | ⭐⭐⭐⭐ | 依赖分析、影响评估 |
| 代码审查工具 | ⭐⭐⭐⭐ | 变更影响分析 |
| 文档生成 | ⭐⭐⭐⭐⭐ | 自动提取 API |
| 实时搜索 | ⭐⭐ | 性能不足 |
| 日志分析 | ⭐⭐⭐ | 需要配合其他工具 |

### 8.2 建议的 API 封装
```javascript
// 理想的高级 API
const codemap = require('codemap-api');

// 符号查询
const symbols = await codemap.query({
  type: 'symbol',
  name: 'ModuleInfo',
  includeLocation: true  // 返回结构化位置
});

// 依赖分析
const deps = await codemap.dependencies({
  module: 'src/core',
  depth: 2,  // 依赖深度
  format: 'graph'  // 图结构输出
});
```

---

## 9. 改进建议

### 9.1 短期（高优先级）
1. **优化 details 字段结构**: 添加 location 对象
2. **统一命令输出格式**: deps 和 query -d 保持一致
3. **解决 dependents ID 可读性**: 返回路径而非内部 ID

### 9.2 中期（中优先级）
4. **添加性能指标**: 显示索引加载时间和查询时间
5. **支持正则搜索**: 添加 --regex 选项
6. **结果排序选项**: 按相关性、字母顺序、文件位置排序

### 9.3 长期（低优先级）
7. **增量索引更新**: 减少索引重建时间
8. **查询缓存**: 缓存热点查询结果
9. **高级过滤**: 按文件类型、符号类型、时间范围过滤

---

## 10. 总体评价

### 评分 (满分 10 分)

| 维度 | 得分 | 说明 |
|------|------|------|
| 功能完整性 | 8/10 | 覆盖主要查询场景，缺少正则支持 |
| JSON 结构化 | 7/10 | 结构一致，但 details 字段需改进 |
| 错误处理 | 9/10 | 友好的错误提示，合适的退出码 |
| 性能 | 5/10 | 相比传统工具较慢，但可接受 |
| API 集成价值 | 8/10 | 适合工具链集成，需改进输出结构 |
| **总分** | **37/50** | **良好，有改进空间** |

### 结论

CodeMap 的查询功能在**语义化代码理解**方面表现出色，适合需要代码结构感知的场景。JSON 输出为工具链集成提供了基础，但部分字段的结构化程度有待提升。

**推荐使用场景**:
- IDE/编辑器插件开发
- 代码分析工具集成
- CI/CD 流程中的依赖检查
- 自动化文档生成

**不推荐使用场景**:
- 纯文本快速搜索（使用 rg/grep 更合适）
- 高频实时查询（性能瓶颈）

---

## 附录: 测试命令汇总

```bash
# 符号查询
npx codemap query -s "ModuleInfo"
npx codemap query -s "ModuleInfo" -j

# 模块查询
npx codemap query -m "src/cache"

# 依赖查询
npx codemap query -d "analyzer"
npx codemap deps -m "src/core" -j

# 模糊搜索
npx codemap query -S "parser"
npx codemap query -S "cache" -j -l 3

# 结果限制
npx codemap query -S "export" -l 5
npx codemap query -S "export" -l 20

# 边界测试
npx codemap query -s "NonExistentSymbol123"
npx codemap query -s "NonExistentSymbol123" -j
npx codemap query
npx codemap query -S "<any>"

# 对比测试
grep -r "ModuleInfo" src/ --include="*.ts"
rg "ModuleInfo" src/ --type ts
find src/ -path "*cache*" -name "*.ts"
```

---

*报告生成时间: $(date)*
*CodeMap 版本: 通过 CLI 测试*
