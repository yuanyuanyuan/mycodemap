# ast-grep 与 qmd 能力边界对比分析

> 为 CodeMap 改造提供参考的技术调研报告

---

## ast-grep 能力分析

### 核心优势

#### 1. 精确的 AST 搜索能力
- **基于语法树的匹配**: 使用 code pattern 匹配 code，而非纯文本搜索
  - 示例: `ast-grep -p "console.log"` 精确匹配 `console.log` 调用，而非注释或字符串中的文本
  - 支持 meta 变量: `$X`, `$$$S` 匹配任意表达式/语句
- **严格程度控制**: 支持 CST/Smart/AST/Relaxed/Signature 五种匹配严格度
- **20+ 语言支持**: 基于 tree-sitter，支持 JS/TS、Python、Go、Rust、Java 等主流语言

#### 2. 强大的代码重写能力
- **CLI 即时重写**: `--rewrite` 参数支持单行命令式重构
  ```bash
  ast-grep -p 'var code = $PAT' --rewrite 'let code = $PAT' --lang js
  ```
- **YAML 规则系统**: 支持复杂的规则定义和批量重构
  - 使用 `fix` 字段指定替换模板
  - 支持 `expandStart`/`expandEnd` 扩展匹配范围（如删除对象属性时同时删除逗号）
  - 缩进敏感的重写，保持代码格式
- **交互式编辑**: `--interactive` 模式支持人工确认每次修改
- **转换函数**: 支持字符串转换（大小写、切片、正则替换等）

#### 3. 完整的工具链
- **Linter 功能**: `ast-grep scan` 支持项目级代码检查
- **测试框架**: `ast-grep test` 支持规则的自动化测试
- **LSP 支持**: 内置语言服务器，可与 VS Code 等编辑器集成
- **程序化 API**: Node.js 绑定，支持 jQuery-like 语法树遍历
- **性能**: Rust 实现，多核并行，秒级处理万级文件

### 适用场景

| 场景 | 示例 |
|-----|------|
| 批量重命名变量/函数 | `foo` → `bar`，但仅匹配标识符而非字符串 |
| 代码迁移/现代化 | `var` → `let/const`，回调 → async/await |
| 代码规范检查 | 检测特定反模式，如 `console.log` 遗留 |
| 框架迁移 | React class 组件 → Hooks，Vue2 → Vue3 |
| 提取/重构代码 | 提取重复模式为新函数/组件 |
| 安全审计 | 检测危险函数调用，如 `eval`、`innerHTML` |

### 与 CodeMap 对比

| 维度 | ast-grep | CodeMap |
|-----|----------|---------|
| **搜索层级** | AST 节点级（语法结构） | 模块/符号级（语义关系） |
| **搜索方式** | 代码 pattern 匹配 | 符号名称/类型查询 |
| **代码重写** | ✅ 强大支持 | ❌ 不支持 |
| **依赖分析** | ❌ 不支持 | ✅ 完整依赖图 |
| **影响分析** | ❌ 不支持 | ✅ 变更影响评估 |
| **复杂度分析** | ❌ 不支持 | ✅ 支持 |
| **语言支持** | 20+ 语言 | TypeScript/JavaScript 为主 |
| **性能** | 极快（Rust） | 快（基于本地 JSON） |
| **使用门槛** | 需理解 AST/语法 | 符号级，更易上手 |

**互补点**:
- ast-grep 能做 CodeMap 做不了的事：
  1. **代码重写/重构**: CodeMap 只读分析，ast-grep 支持代码修改
  2. **AST 级精确搜索**: CodeMap 是符号级，ast-grep 可深入到表达式/语句级
  3. **代码转换**: 支持复杂的代码迁移场景

- CodeMap 能做 ast-grep 做不了的事：
  1. **项目整体架构分析**: 模块依赖、调用链分析
  2. **变更影响评估**: 修改某文件会影响哪些模块
  3. **符号级导航**: 快速定位类、接口、函数定义

---

## qmd 能力分析

### 核心优势

#### 1. 先进的混合搜索流水线
```
User Query
    │
    ├──► Query Expansion (Fine-tuned LLM) ──┐
    │                                        │
    └──► Original Query (×2 weight) ◄────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
 Original      Expanded 1      Expanded 2
    │               │               │
 BM25 +      BM25 + Vector   BM25 + Vector
 Vector          │               │
    └───────────────┴───────────────┘
                    │
              RRF Fusion (k=60)
         Top-rank bonus: +0.05/#1
                    │
            Top 30 candidates
                    │
           LLM Re-ranking
       (Yes/No + logprob confidence)
                    │
         Position-Aware Blend
        Rank 1-3: 75% RRF / 25% LLM
        Rank 4-10: 60% RRF / 40% LLM
        Rank 11+: 40% RRF / 60% LLM
```

- **BM25 (FTS5)**: 快速关键词搜索
- **向量语义搜索**: 基于 300M 参数的 embedding 模型
- **查询扩展**: Fine-tuned 1.7B 模型生成 2 个变体查询
- **RRF 融合**: Reciprocal Rank Fusion 合并多路召回
- **LLM 重排**: 640M 参数的 Qwen3-reranker 精确排序

#### 2. 本地优先的架构
- **完全本地运行**: 无需联网，保护隐私
- **sqlite-vec 向量存储**: 本地 SQLite 存储 embedding
- **智能分块**: 900 tokens/chunk，15% 重叠，智能边界检测（标题、代码块保护）
- **模型自动下载**: 首次使用自动从 HuggingFace 拉取 GGUF 模型

#### 3. 丰富的 MCP 接口
```json
{
  "mcpServers": {
    "qmd": {
      "command": "qmd",
      "args": ["mcp"]
    }
  }
}
```

暴露的工具：
- `qmd_search` - 快速 BM25 搜索
- `qmd_vector_search` - 语义向量搜索
- `qmd_deep_search` - 深度混合搜索（最佳质量）
- `qmd_get` - 获取文档（支持模糊匹配）
- `qmd_multi_get` - 批量获取（支持 glob）
- `qmd_status` - 索引健康检查

#### 4. Agent 友好的输出
```bash
# JSON 输出
qmd search "authentication" --json -n 10

# 文件列表（适合 Agent 批量处理）
qmd query "error handling" --all --files --min-score 0.4

# Markdown/XML 输出
qmd search --md --full "API design"
```

### 适用场景

| 场景 | 说明 |
|-----|------|
| 个人知识库搜索 | 笔记、文档、会议记录的统一检索 |
| 项目文档问答 | 基于技术文档的语义问答 |
| Agent 记忆系统 | 为 AI Agent 提供长期记忆存储和检索 |
| 代码片段检索 | 基于自然语言搜索代码示例 |
| 日志/记录分析 | 会议记录、日志的语义搜索 |

### 与 CodeMap 对比

| 维度 | qmd | CodeMap |
|-----|-----|---------|
| **搜索对象** | Markdown 文档、笔记 | 代码文件、源代码 |
| **搜索类型** | 语义搜索 + 关键词 | 符号搜索 + 依赖 |
| **嵌入模型** | 本地 300M Gemma | 无（基于 AST 分析） |
| **重排序** | LLM Reranker | 无 |
| **代码结构** | ❌ 不理解 | ✅ 完整 AST 理解 |
| **依赖分析** | ❌ 不支持 | ✅ 完整支持 |
| **代码重写** | ❌ 不支持 | ❌ 不支持 |
| **架构分析** | ❌ 不支持 | ✅ 模块/复杂度分析 |
| **MCP 支持** | ✅ 原生支持 | ❌ 暂无 |
| **输出格式** | JSON/CSV/MD/XML | JSON（自定义） |

**互补点**:
- qmd 能做 CodeMap 做不了的事：
  1. **语义理解**: 理解自然语言查询，支持 "how to deploy" 这类问题
  2. **MCP 集成**: 标准化的 AI Agent 接口
  3. **文档级搜索**: 适合 README、设计文档、笔记的检索
  4. **混合排序**: 多路召回 + 重排序的高质量结果

- CodeMap 能做 qmd 做不了的事：
  1. **代码结构分析**: AST 级代码理解
  2. **依赖关系**: 模块依赖、调用链
  3. **类型信息**: TypeScript 类型分析
  4. **影响评估**: 代码变更的影响范围

---

## 集成建议

### 1. ast-grep 集成方案

#### 用途定位
- **代码重写引擎**: 弥补 CodeMap 只读分析的不足
- **精细化重构**: AST 级的代码迁移和转换
- **规则检查**: 作为 linter 补充代码规范检查

#### 集成方式
```typescript
// CodeMap 中调用 ast-grep 进行代码重写
class CodeRefactorer {
  async rewrite(pattern: string, replacement: string, files: string[]) {
    const { execa } = await import('execa');
    return execa('ast-grep', [
      'run',
      '--pattern', pattern,
      '--rewrite', replacement,
      '--json', 'compact',
      ...files
    ]);
  }
  
  // 基于 CodeMap 分析结果进行批量重构
  async refactorBasedOnImpact(symbol: string, newName: string) {
    // 1. 用 CodeMap 找到所有引用
    const impacts = await codemap.impact(symbol);
    
    // 2. 用 ast-grep 执行精确重写
    return this.rewrite(symbol, newName, impacts.files);
  }
}
```

#### 协作模式
```
CodeMap 分析 → 发现重构点 → 影响范围评估 → ast-grep 执行 → 验证结果
     │                │                │              │            │
     ▼                ▼                ▼              ▼            ▼
 依赖分析        符号定位        变更影响      精确重写      回归测试
```

### 2. qmd 集成方案

#### 用途定位
- **文档搜索引擎**: 为 CodeMap 添加文档级语义搜索
- **AI Agent 接口**: 通过 MCP 提供标准化服务
- **知识库**: 存储项目文档、设计决策、API 说明

#### 集成方式
```typescript
// CodeMap MCP 服务器添加 qmd 工具
class CodeMapMCPServer {
  tools = {
    // CodeMap 原有工具
    codemap_query_symbol: { /* ... */ },
    codemap_deps: { /* ... */ },
    codemap_impact: { /* ... */ },
    
    // 集成 qmd 的文档搜索
    qmd_search_docs: {
      description: '搜索项目文档',
      handler: async (query: string) => {
        return this.qmd.query(query);
      }
    },
    
    // 混合搜索：代码 + 文档
    codemap_hybrid_search: {
      description: '同时搜索代码符号和文档',
      handler: async (query: string) => {
        const [codeResults, docResults] = await Promise.all([
          this.codemap.query(query),
          this.qmd.search(query)
        ]);
        return { code: codeResults, docs: docResults };
      }
    }
  };
}
```

#### 协作模式
```
用户查询
    │
    ├──► CodeMap ──► 代码符号、依赖、架构
    │
    └──► qmd ──────► 文档、注释、设计说明
                │
                └──► 融合结果 ──► 完整上下文
```

### 3. 三者的协同架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户/AI Agent                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  ast-grep │    │ CodeMap │    │   qmd   │
    │  (重写)   │    │ (分析)  │    │ (搜索)  │
    └────┬────┘     └────┬────┘     └────┬────┘
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │AST 级   │     │符号级   │     │语义级   │
    │代码重构 │     │依赖分析 │     │文档检索 │
    └─────────┘     └─────────┘     └─────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
              ┌─────────────────────┐
              │   MCP Server 统一接口  │
              │  (对外暴露标准化工具)   │
              └─────────────────────┘
```

### 4. 实施优先级

| 优先级 | 集成项 | 理由 |
|-------|-------|------|
| P0 | MCP 服务器 | 对标 qmd，为 CodeMap 提供标准化 AI 接口 |
| P1 | ast-grep 重写 | 弥补 CodeMap 缺乏代码修改能力的短板 |
| P2 | 文档索引 (qmd 模式) | 扩展搜索范围到文档层面 |
| P3 | 混合搜索 | 统一代码+文档的搜索体验 |

---

## 总结

1. **ast-grep** 是 CodeMap 的**代码操作能力补充**，专注 AST 级搜索和重写
2. **qmd** 是 CodeMap 的**AI 接口和搜索能力参考**，其 MCP 设计和混合搜索值得借鉴
3. **三者结合** 可形成完整的代码智能体系：CodeMap 分析、ast-grep 重写、qmd 搜索
4. **建议 CodeMap 优先实现 MCP 服务器**，这是对接 AI Agent 生态的关键基础设施
