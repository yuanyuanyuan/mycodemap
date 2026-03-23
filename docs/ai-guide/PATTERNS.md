# AI Guide - 使用模式与最佳实践

> 标准工作流模式和输出处理最佳实践

---

## 标准工作流模式

### 模式 A: 首次接触项目

**适用场景**: 初次了解一个 CodeMap 项目

**执行步骤**:

```bash
# Step 1: 生成代码地图
node dist/cli/index.js generate

# Step 2: 读取项目概览
read_file(".mycodemap/AI_MAP.md")

# Step 3: 分析项目结构
# - 查看入口点列表
# - 了解模块组织
# - 识别核心功能

# Step 4: 如果需要深入特定模块
node dist/cli/index.js query -m "src/core" -j

# Step 5: 获取依赖关系
node dist/cli/index.js deps -m "src" -j
```

**输出内容**:
- 项目基本信息（文件数、代码行数、模块数）
- 入口点列表
- 模块组织表
- Mermaid 依赖图
- 关键类型和导出

---

### 模式 B: 实现新功能

**适用场景**: 在项目中添加新功能

**执行步骤**:

```bash
# Step 1: 搜索相关代码
node dist/cli/index.js analyze -i search -k "相关关键词" --json

# Step 2: 分析影响范围（如果有修改现有代码）
node dist/cli/index.js analyze -i impact -t "目标文件" --include-tests --json

# Step 3: 检查复杂度（选择最佳实现位置）
node dist/cli/index.js analyze -i complexity -t "候选目录" --json

# Step 4: 实现代码
# - 遵循文件头规范
# - 添加 [META] 和 [WHY] 注释

# Step 5: 验证文件头
node dist/cli/index.js ci check-headers -f "新文件.ts"

# Step 6: 运行测试
npm test
```

**决策要点**:
- 选择复杂度低的模块作为实现点
- 避免影响范围过大的文件
- 确保有对应的测试文件

---

### 模式 C: 重构代码

**适用场景**: 改善代码结构而不改变外部行为

**执行步骤**:

```bash
# Step 1: 检测现有循环依赖
node dist/cli/index.js cycles -j

# Step 2: 分析目标模块复杂度
node dist/cli/index.js analyze -i complexity -t "目标模块" --json

# Step 3: 评估影响范围
node dist/cli/index.js analyze -i impact -t "目标文件" --scope transitive --json

# Step 4: 获取重构建议
node dist/cli/index.js analyze -i refactor -t "目标模块" --json

# Step 5: 执行重构

# Step 6: 验证无新增循环依赖
node dist/cli/index.js cycles -j

# Step 7: 验证复杂度降低
node dist/cli/index.js analyze -i complexity -t "目标模块" --json

# Step 8: 运行测试
npm test
```

**注意事项**:
- 确保有充分的测试覆盖
- 小步提交，每个重构步骤一个 commit
- 使用 `[REFACTOR]` 标签提交

---

### 模式 D: 修复 Bug

**适用场景**: 定位和修复代码缺陷

**执行步骤**:

```bash
# Step 1: 定位问题代码
node dist/cli/index.js query -s "Bug相关类名" -j

# Step 2: 分析影响范围
node dist/cli/index.js impact -f "问题文件" --transitive -j

# Step 3: 查找相关测试
node dist/cli/index.js query -s "相关测试" --include-references -j

# Step 4: 搜索相似代码（防止同类问题）
node dist/cli/index.js analyze -i search -k "问题模式" --json

# Step 5: 修复 Bug

# Step 6: 运行测试
npm test

# Step 7: 使用 [FIX] 标签提交
# [FIX] module: 修复 XXX 问题
```

---

### 模式 E: 代码审查

**适用场景**: 审查代码变更

**执行步骤**:

```bash
# Step 1: 检查提交格式
node dist/cli/index.js ci check-commits

# Step 2: 检查文件头
node dist/cli/index.js ci check-headers

# Step 3: 评估变更风险
node dist/cli/index.js ci assess-risk

# Step 4: 检查输出契约（如果修改了 analyze）
node dist/cli/index.js ci check-output-contract

# Step 5: 检查文档同步
node dist/cli/index.js ci check-docs-sync

# Step 6: 运行测试
npm test
```

---

### 模式 F: 复杂任务管理

**适用场景**: 需要多步骤完成的复杂开发任务

**执行步骤**:

```bash
# Step 1: 启动工作流
node dist/cli/index.js workflow start "实现用户认证模块"

# Step 2: 查看当前阶段建议
node dist/cli/index.js workflow status

# Step 3: 执行当前阶段的分析和实现

# Step 4: 完成阶段后推进
node dist/cli/index.js workflow proceed

# Step 5: 可视化进度
node dist/cli/index.js workflow visualize

# Step 6: 创建检查点（重要里程碑）
node dist/cli/index.js workflow checkpoint

# Step 7: 重复直到完成
```

**工作流阶段**:
1. `reference` - 参考搜索
2. `impact` - 影响分析
3. `risk` - 风险评估
4. `implementation` - 代码实现
5. `commit` - 提交验证
6. `ci` - CI 验证

---

## 输出处理模式

### 模式 1: 提取文件列表

```typescript
function extractFilesFromAnalyze(output: string): string[] {
  const data = JSON.parse(output);
  const files = data.results
    .map((r: any) => r.location?.file || r.file)
    .filter(Boolean);
  return [...new Set(files)]; // 去重
}

// 使用示例
const files = extractFilesFromAnalyze(analyzeOutput);
console.log(`将影响 ${files.length} 个文件`);
```

---

### 模式 2: 提取测试文件

```typescript
function extractTestFiles(output: string): string[] {
  const data = JSON.parse(output);
  const testFiles = data.results
    .filter((r: any) => r.metadata?.testFile)
    .map((r: any) => r.metadata.testFile)
    .filter(Boolean);
  return [...new Set(testFiles)];
}

// 使用示例
const tests = extractTestFiles(impactOutput);
console.log(`需要检查 ${tests.length} 个测试文件`);
```

---

### 模式 3: 检查置信度

```typescript
function checkConfidence(output: string): { ok: boolean; reason?: string } {
  const data = JSON.parse(output);
  const { level, score } = data.confidence || {};
  
  if (level === 'high' && score >= 0.7) {
    return { ok: true };
  }
  
  if (level === 'medium') {
    return { 
      ok: false, 
      reason: `中等置信度 (${score})，建议人工复核` 
    };
  }
  
  return { 
    ok: false, 
    reason: `置信度过低 (${score})，建议扩大搜索范围` 
  };
}

// 使用示例
const check = checkConfidence(analyzeOutput);
if (!check.ok) {
  console.warn(check.reason);
}
```

---

### 模式 4: 按相关度过滤

```typescript
function filterByRelevance(
  output: string, 
  threshold: number = 0.5
): any[] {
  const data = JSON.parse(output);
  return data.results.filter((r: any) => r.relevance >= threshold);
}

// 使用示例
const highRelevance = filterByRelevance(analyzeOutput, 0.7);
console.log(`高度相关结果: ${highRelevance.length} 个`);
```

---

### 模式 5: 按目录分组

```typescript
function groupByDirectory(output: string): Record<string, number> {
  const data = JSON.parse(output);
  const groups: Record<string, number> = {};
  
  for (const result of data.results) {
    const parts = result.file.split('/');
    const dir = parts.slice(0, -1).join('/') || 'root';
    groups[dir] = (groups[dir] || 0) + 1;
  }
  
  return groups;
}

// 使用示例
const groups = groupByDirectory(analyzeOutput);
// { 'src/cli': 5, 'src/core': 3, ... }
```

---

### 模式 6: 排序和分页

```typescript
function sortAndPaginate(
  output: string,
  sortBy: 'relevance' | 'file' = 'relevance',
  page: number = 1,
  pageSize: number = 10
): any[] {
  const data = JSON.parse(output);
  let results = [...data.results];
  
  // 排序
  if (sortBy === 'relevance') {
    results.sort((a, b) => b.relevance - a.relevance);
  } else {
    results.sort((a, b) => a.file.localeCompare(b.file));
  }
  
  // 分页
  const start = (page - 1) * pageSize;
  return results.slice(start, start + pageSize);
}
```

---

## 性能优化模式

### 缓存利用

```typescript
// 默认开启缓存，60秒 TTL
// 如果需要强制刷新
deleteCacheForProject(projectRoot);
```

### 批量查询

```typescript
// 不好的做法：多次查询
for (const file of files) {
  await exec(`mycodemap impact -f ${file}`); // 每次都要加载索引
}

// 好的做法：一次生成，多次查询
await exec('mycodemap generate');
// 后续 query 命令会利用缓存
```

---

## 安全模式

### 边界检查

```typescript
function safeParseOutput(output: string): any | null {
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function safeExtractFiles(output: string): string[] {
  const data = safeParseOutput(output);
  if (!data || !Array.isArray(data.results)) {
    return [];
  }
  return data.results.map((r: any) => r.file).filter(Boolean);
}
```

---

## 最佳实践总结

| 实践 | 说明 |
|------|------|
| 先生成后查询 | 首次使用必须先运行 `generate` |
| 优先使用 JSON | 需要解析结果时使用 `--json` |
| 检查置信度 | 低置信度结果需要人工复核 |
| 过滤后再处理 | 使用 `--topK` 或 relevance 过滤减少数据量 |
| 利用缓存 | 多次查询时缓存会自动生效 |
| 渐进式分析 | 先 overview → 再 specific |
| 验证后提交 | 使用 `ci` 命令验证后再提交 |
