# AI Guide - 输出结构解析

> 命令输出的 JSON 结构详解，帮助 AI 正确解析和处理结果

---

## 何时使用 --json

| 场景 | 使用 `--json` | 原因 |
|------|--------------|------|
| 需要解析结果进行进一步处理 | ✅ 是 | 结构化数据便于解析 |
| 向用户展示结果 | ❌ 否 | 人类可读格式更好 |
| 需要提取文件路径列表 | ✅ 是 | 便于正则提取 |
| 需要计算统计数据 | ✅ 是 | JSON 可直接计算 |
| 需要过滤或排序结果 | ✅ 是 | 可编程处理 |
| 简单查询确认存在性 | ❌ 否 | 文本输出更直观 |

---

## query 命令输出结构

### JSON 输出 (-j)

```typescript
interface QueryOutput {
  type: 'symbol' | 'module' | 'deps' | 'search';
  query: string;
  count: number;
  results: QueryResult[];
  metrics?: {
    indexLoadTime: number;
    queryTime: number;
    totalTime: number;
    cacheHit: boolean;
    indexSize: number;
  };
}

interface QueryResult {
  name: string;
  path: string;
  kind: string;
  details: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  isExported: boolean;
  references?: Reference[];
  context?: ContextLine[];
}

interface Reference {
  file: string;
  line: number;
  type: 'import' | 'export';
}

interface ContextLine {
  line: number;
  content: string;
}
```

### 示例

```json
{
  "type": "symbol",
  "query": "IntentRouter",
  "count": 3,
  "results": [
    {
      "name": "IntentRouter",
      "path": "/project/src/orchestrator/intent-router.ts",
      "kind": "class",
      "details": "定义于 src/orchestrator/intent-router.ts:15",
      "location": {
        "file": "src/orchestrator/intent-router.ts",
        "line": 15,
        "column": 1
      },
      "isExported": true,
      "references": [
        { "file": "src/cli/commands/analyze.ts", "line": 1, "type": "import" }
      ]
    }
  ],
  "metrics": {
    "indexLoadTime": 12.34,
    "queryTime": 5.67,
    "totalTime": 18.01,
    "cacheHit": true,
    "indexSize": 1523
  }
}
```

---

## analyze 命令输出结构

### 标准 JSON 输出 (--json)

```typescript
interface AnalyzeOutput {
  schemaVersion: "v1.0.0";
  intent: "impact" | "dependency" | "search" | "documentation" | "complexity" | "overview" | "refactor" | "reference";
  tool: string;
  confidence: {
    score: number;        // 0.0 - 1.0
    level: "high" | "medium" | "low";
  };
  results: AnalyzeResult[];
  metadata: {
    total: number;
    scope: "direct" | "transitive";
    resultCount: number;
  };
}

interface AnalyzeResult {
  file: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  content?: string;         // 自然语言描述
  relevance: number;        // 0.0 - 1.0
  metadata?: {
    testFile?: string;      // 关联的测试文件
    complexity?: number;    // 复杂度分数
    [key: string]: any;
  };
}
```

### 纯结构化输出 (--structured --json)

移除了 `content` 字段，只保留结构化数据：

```typescript
interface StructuredAnalyzeOutput {
  schemaVersion: "v1.0.0";
  intent: string;
  tool: string;
  confidence: {
    score: number;
    level: "high" | "medium" | "low";
  };
  results: StructuredResult[];
  metadata: {
    total: number;
    scope: string;
    resultCount: number;
  };
}

interface StructuredResult {
  file: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  // 注意：没有 content 字段
  relevance: number;
  metadata?: {
    [key: string]: any;
  };
}
```

### 示例

```json
{
  "schemaVersion": "v1.0.0",
  "intent": "impact",
  "tool": "codemap-impact",
  "confidence": {
    "score": 0.85,
    "level": "high"
  },
  "results": [
    {
      "file": "src/cli/commands/analyze.ts",
      "location": {
        "file": "src/cli/commands/analyze.ts",
        "line": 45,
        "column": 1
      },
      "content": "导入自 src/orchestrator/intent-router.ts 的 IntentRouter 类",
      "relevance": 0.95,
      "metadata": {
        "testFile": "src/cli/commands/analyze.test.ts"
      }
    }
  ],
  "metadata": {
    "total": 8,
    "scope": "transitive",
    "resultCount": 8
  }
}
```

---

## impact 命令输出结构

### JSON 输出 (-j)

```typescript
interface ImpactOutput {
  file: string;
  direct: ImpactItem[];
  transitive?: ImpactItem[];
  stats: {
    directCount: number;
    transitiveCount?: number;
  };
}

interface ImpactItem {
  file: string;
  type: "import" | "export" | "dependency";
  relevance?: number;
}
```

### 示例

```json
{
  "file": "src/cli/index.ts",
  "direct": [
    { "file": "src/cli/commands/analyze.ts", "type": "import", "relevance": 0.95 },
    { "file": "src/cli/commands/query.ts", "type": "import", "relevance": 0.90 }
  ],
  "transitive": [
    { "file": "src/orchestrator/intent-router.ts", "type": "dependency", "relevance": 0.75 }
  ],
  "stats": {
    "directCount": 5,
    "transitiveCount": 12
  }
}
```

---

## deps 命令输出结构

### JSON 输出 (-j)

```typescript
interface DepsOutput {
  module: string;
  dependencies: DependencyItem[];
  dependents?: DependencyItem[];
}

interface DependencyItem {
  source: string;
  target: string;
  type: "import" | "export" | "dependency";
}
```

### 示例

```json
{
  "module": "src/domain/services",
  "dependencies": [
    {
      "source": "src/domain/services/CodeGraphBuilder.ts",
      "target": "src/interface/types",
      "type": "import"
    }
  ],
  "dependents": [
    {
      "source": "src/infrastructure/repositories",
      "target": "src/domain/services",
      "type": "import"
    }
  ]
}
```

---

## complexity 命令输出结构

### JSON 输出 (-j)

```typescript
interface ComplexityOutput {
  files: FileComplexity[];
  summary: {
    averageComplexity: number;
    maxComplexity: number;
    totalFiles: number;
  };
}

interface FileComplexity {
  file: string;
  complexity: number;
  maintainability: number;  // 0-100
  functions?: FunctionComplexity[];
}

interface FunctionComplexity {
  name: string;
  line: number;
  complexity: number;       // 圈复杂度
  cognitive: number;        // 认知复杂度
}
```

---

## cycles 命令输出结构

### JSON 输出 (-j)

```typescript
interface CyclesOutput {
  cycles: Cycle[];
  count: number;
  maxDepth: number;
}

interface Cycle {
  path: string[];           // 循环依赖的文件路径
  length: number;
}
```

### 示例

```json
{
  "cycles": [
    {
      "path": [
        "src/core/analyzer.ts",
        "src/core/global-index.ts",
        "src/core/analyzer.ts"
      ],
      "length": 3
    }
  ],
  "count": 1,
  "maxDepth": 3
}
```

---

## 输出处理工具函数

### TypeScript 示例

```typescript
// 从 analyze 结果中提取文件列表
function extractFilesFromAnalyze(output: string): string[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.results
    .map(r => r.location?.file || r.file)
    .filter((v, i, a) => a.indexOf(v) === i); // 去重
}

// 从 impact 结果中提取需要测试的文件
function extractTestCandidates(output: string): string[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.results
    .filter(r => r.metadata?.testFile)
    .map(r => r.metadata!.testFile!)
    .filter((v, i, a) => a.indexOf(v) === i);
}

// 检查置信度是否足够高
function isConfidenceHigh(output: string): boolean {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.confidence?.level === 'high' && 
         data.confidence?.score >= 0.7;
}

// 按相关度排序结果
function sortByRelevance(output: string): AnalyzeResult[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return [...data.results].sort((a, b) => b.relevance - a.relevance);
}

// 过滤结果（例如只取相关度 > 0.5 的）
function filterByRelevance(output: string, threshold: number): AnalyzeResult[] {
  const data: AnalyzeOutput = JSON.parse(output);
  return data.results.filter(r => r.relevance >= threshold);
}

// 分组统计（按文件目录）
function groupByDirectory(output: string): Record<string, number> {
  const data: AnalyzeOutput = JSON.parse(output);
  const groups: Record<string, number> = {};
  
  for (const result of data.results) {
    const dir = result.file.split('/').slice(0, -1).join('/');
    groups[dir] = (groups[dir] || 0) + 1;
  }
  
  return groups;
}
```

### Python 示例

```python
import json
from typing import List, Dict, Any

def extract_files_from_analyze(output: str) -> List[str]:
    data = json.loads(output)
    files = [r.get('location', {}).get('file') or r.get('file') 
             for r in data.get('results', [])]
    return list(set(files))  # 去重

def is_confidence_high(output: str) -> bool:
    data = json.loads(output)
    confidence = data.get('confidence', {})
    return (confidence.get('level') == 'high' and 
            confidence.get('score', 0) >= 0.7)

def sort_by_relevance(output: str) -> List[Dict[str, Any]]:
    data = json.loads(output)
    results = data.get('results', [])
    return sorted(results, key=lambda x: x.get('relevance', 0), reverse=True)
```

---

## 置信度解读

| 等级 | 分数范围 | 含义 | 建议 |
|------|---------|------|------|
| high | 0.7 - 1.0 | 高置信度 | 可放心使用结果 |
| medium | 0.4 - 0.7 | 中等置信度 | 建议人工复核 |
| low | 0.0 - 0.4 | 低置信度 | 扩大搜索范围或换关键词 |

---

## 相关度解读

| 分数范围 | 含义 |
|---------|------|
| 0.9 - 1.0 | 高度相关（精确匹配或核心依赖） |
| 0.7 - 0.9 | 非常相关（直接依赖） |
| 0.5 - 0.7 | 相关（间接依赖或相似命名） |
| 0.3 - 0.5 | 弱相关（可能相关） |
| 0.0 - 0.3 | 低相关（仅供参考） |
