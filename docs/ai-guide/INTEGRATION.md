# AI Guide - 集成与错误处理

> 与 AI 工作流的集成方式和常见错误处理

---

## 与 AI 工作流的集成

### MCP (Model Context Protocol) 集成

将 CodeMap 注册为 MCP 工具：

```json
{
  "tools": [
    {
      "name": "codemap_generate",
      "description": "生成代码地图，必须在其他命令之前执行",
      "command": "mycodemap generate",
      "timeout": 60000
    },
    {
      "name": "codemap_query_symbol",
      "description": "查询符号定义位置",
      "command": "mycodemap query -s {symbol} -j",
      "parameters": {
        "symbol": { "type": "string", "description": "符号名称" }
      }
    },
    {
      "name": "codemap_read",
      "description": "分析文件变更的影响范围",
      "command": "mycodemap analyze -i read -t {target} --scope transitive --json",
      "parameters": {
        "target": { "type": "string", "description": "目标文件路径" }
      }
    },
    {
      "name": "codemap_find",
      "description": "搜索与关键词相关的代码",
      "command": "mycodemap analyze -i find -k {keyword} --json",
      "parameters": {
        "keyword": { "type": "string", "description": "搜索关键词" }
      }
    },
    {
      "name": "codemap_check_ci",
      "description": "执行 CI 门禁检查",
      "command": "mycodemap ci {check_type}",
      "parameters": {
        "check_type": { 
          "type": "string", 
          "enum": ["check-commits", "check-headers", "assess-risk"],
          "description": "检查类型"
        }
      }
    }
  ]
}
```

---

### Skill/Knowledge 集成

#### Kimi CLI Skill

```markdown
---
name: codemap
description: CodeMap 代码分析工具，用于项目结构分析、符号查询、依赖分析和影响评估
---

## 环境检测

首先检测 CLI 是否可用：

```bash
if command -v mycodemap &> /dev/null; then
    CODEMAP="mycodemap"
elif [ -f "./node_modules/.bin/mycodemap" ]; then
    CODEMAP="./node_modules/.bin/mycodemap"
else
    CODEMAP="npx @mycodemap/mycodemap"
fi
```

## 使用原则

1. **首次使用必须先执行 generate**
   ```bash
   $CODEMAP generate
   ```

2. **查询符号定义**
   ```bash
   $CODEMAP query -s "SymbolName" -j
   ```

3. **分析变更影响**
   ```bash
   $CODEMAP analyze -i read -t "file.ts" --scope transitive --json
   ```

4. **搜索代码**
   ```bash
   $CODEMAP analyze -i find -k "keyword" --json
   ```

## 完整文档

参考项目根目录的 `AI_GUIDE.md` 和 `docs/ai-guide/` 目录。
```

#### Claude Code Skill

```markdown
# CodeMap Code Analysis

## Overview

Use CodeMap CLI for TypeScript/JavaScript project analysis.

## Commands

### Generate Code Map (Required First Step)
```bash
mycodemap generate
```

### Query Symbol
```bash
mycodemap query -s "SymbolName" -j
```

### Analyze Impact
```bash
mycodemap analyze -i read -t "file.ts" --scope transitive --json
```

### Search Code
```bash
mycodemap analyze -i find -k "keyword" --json
```

## Decision Tree

1. Understanding project structure → `generate` + read `AI_MAP.md`
2. Finding symbol location → `query -s`
3. Assessing change impact → `analyze -i read`
4. Searching related code → `analyze -i find`

## Reference

See `AI_GUIDE.md` in project root for complete documentation.
```

#### Codex CLI Agent

```markdown
# CodeMap Agent

## Description

Code analysis tool for TypeScript projects.

## Available Tools

- `codemap_generate`: Generate code map
- `codemap_query`: Query symbols
- `codemap_read`: Analyze change impact and surrounding context
- `codemap_find`: Search code

## Workflow

1. Always start with `codemap_generate`
2. Use `codemap_query` to find definitions
3. Use `codemap_read` before making changes
4. Use `codemap_find` to find related code

## Documentation

Full guide: `AI_GUIDE.md`
```

---

## 错误处理

### 常见错误及处理

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `代码地图不存在，请先运行 codemap generate` | 未生成代码地图 | 执行 `mycodemap generate` |
| `符号未找到` | 拼写错误或不存在 | 使用 `query -S` 模糊搜索 |
| `模块未找到` | 路径错误或已删除 | 检查路径或使用 `query -m` 部分匹配 |
| `tree-sitter 不可用` | 原生模块未编译 | 安装构建工具后重新安装 |
| `文件头缺少 [META]` | 新文件未加头 | 添加标准文件头注释 |
| `提交格式错误` | 不符合 [TAG] 格式 | 修改为 `[TAG] scope: message` |
| `风险评分过高` | 变更文件太多 | 拆分提交或添加解释 |
| `输出契约验证失败` | analyze 输出格式变更 | 检查 schemaVersion 和字段 |
| `pluginReport.diagnostics` 出现 `initialize` / `generate` 错误 | 插件加载或执行失败 | 检查 `mycodemap.config.json` 的 `plugins` 段、插件导出格式和生成路径 |
| `UNSUPPORTED_STORAGE_TYPE` / `STORAGE_BACKEND_MIGRATED` / `SQLITE_NOT_AVAILABLE` | 图存储后端配置不受支持、仍在使用旧 `neo4j` / `kuzudb` 配置，或显式 `sqlite` 时运行时不满足条件 | 检查 `mycodemap.config.json.storage`；把旧配置迁移到 `filesystem` / `sqlite` / `memory` / `auto`；确认已安装 `better-sqlite3` 且 Node.js `>=20`；若使用 `auto`，SQLite 不可用时会 warning 后回退 `filesystem` |

---

### 错误处理代码模式

#### TypeScript

```typescript
// 模式 1: 代码地图过期/不存在
async function ensureCodeMap(): Promise<boolean> {
  const codemapPath = '.mycodemap/codemap.json';
  
  if (!existsSync(codemapPath)) {
    console.log('代码地图不存在，正在生成...');
    await exec('mycodemap generate');
    return true;
  }
  
  // 检查是否过期（超过 1 小时）
  const stat = statSync(codemapPath);
  const age = Date.now() - stat.mtimeMs;
  if (age > 3600000) {
    console.log('代码地图已过期，正在更新...');
    await exec('mycodemap generate');
  }
  
  return true;
}

// 模式 2: 查询无结果，逐级回退
async function findSymbol(symbolName: string): Promise<any[]> {
  // 尝试 1: 精确查询
  let result = await exec(`mycodemap query -s "${symbolName}" -j`);
  let data = JSON.parse(result);
  
  if (data.count > 0) {
    return data.results;
  }
  
  // 尝试 2: 模糊搜索
  console.log('精确查询无结果，尝试模糊搜索...');
  result = await exec(`mycodemap query -S "${symbolName}" -l 20 -j`);
  data = JSON.parse(result);
  
  if (data.count > 0) {
    return data.results;
  }
  
  // 尝试 3: 统一搜索
  console.log('模糊搜索无结果，尝试统一搜索...');
  result = await exec(`mycodemap analyze -i find -k "${symbolName}" --topK 20 --json`);
  data = JSON.parse(result);
  
  return data.results || [];
}

// 模式 3: 影响范围太大，缩小范围
async function analyzeImpact(file: string, maxFiles: number = 50): Promise<any> {
  // 先尝试不包含传递依赖
  let result = await exec(`mycodemap impact -f "${file}" -j`);
  let data = JSON.parse(result);
  
  const totalFiles = (data.direct?.length || 0) + (data.transitive?.length || 0);
  
  if (totalFiles > maxFiles) {
    console.warn(`影响范围过大 (${totalFiles} 个文件)，仅返回直接依赖`);
    return {
      ...data,
      transitive: [],
      warning: '影响范围过大，仅显示直接依赖'
    };
  }
  
  return data;
}

// 模式 4: 置信度太低，扩大搜索
async function searchWithFallback(keyword: string): Promise<any[]> {
  let result = await exec(`mycodemap analyze -i find -k "${keyword}" --topK 8 --json`);
  let data = JSON.parse(result);
  
  if (data.confidence?.level === 'low') {
    console.log('置信度较低，扩大搜索范围...');
    result = await exec(`mycodemap analyze -i find -k "${keyword}" --topK 20 --json`);
    data = JSON.parse(result);
  }
  
  return data.results || [];
}

// 模式 5: 安全的 JSON 解析
function safeParseJSON<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    console.error('JSON 解析失败，使用默认值');
    return defaultValue;
  }
}
```

#### Python

```python
import json
import subprocess
import os
from typing import List, Dict, Any, Optional

def ensure_code_map() -> bool:
    """确保代码地图存在"""
    codemap_path = '.mycodemap/codemap.json'
    
    if not os.path.exists(codemap_path):
        print('代码地图不存在，正在生成...')
        subprocess.run(['mycodemap', 'generate'], check=True)
        return True
    
    # 检查是否过期（超过 1 小时）
    import time
    mtime = os.path.getmtime(codemap_path)
    if time.time() - mtime > 3600:
        print('代码地图已过期，正在更新...')
        subprocess.run(['mycodemap', 'generate'], check=True)
    
    return True

def find_symbol(symbol_name: str) -> List[Dict[str, Any]]:
    """查找符号，逐级回退"""
    # 尝试 1: 精确查询
    result = subprocess.run(
        ['mycodemap', 'query', '-s', symbol_name, '-j'],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    
    if data.get('count', 0) > 0:
        return data['results']
    
    # 尝试 2: 模糊搜索
    print('精确查询无结果，尝试模糊搜索...')
    result = subprocess.run(
        ['mycodemap', 'query', '-S', symbol_name, '-l', '20', '-j'],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    
    if data.get('count', 0) > 0:
        return data['results']
    
    # 尝试 3: 统一搜索
    print('模糊搜索无结果，尝试统一搜索...')
    result = subprocess.run(
        ['mycodemap', 'analyze', '-i', 'find', '-k', symbol_name, '--topK', '20', '--json'],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    
    return data.get('results', [])

def safe_parse_json(json_str: str, default_value: Any) -> Any:
    """安全的 JSON 解析"""
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        print('JSON 解析失败，使用默认值')
        return default_value
```

---

### 边界情况处理

```typescript
// 情况 1: 大项目处理
async function handleLargeProject() {
  // 使用 fast 模式
  await exec('mycodemap generate -m fast');
  
  // 分块查询
  const modules = ['src/cli', 'src/core', 'src/domain'];
  for (const module of modules) {
    await exec(`mycodemap analyze -i show -t "${module}" --json`);
  }
}

// 情况 2: 并发查询控制
async function batchQuery(symbols: string[], concurrency: number = 5) {
  const results = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(s => exec(`mycodemap query -s "${s}" -j`).catch(() => null))
    );
    results.push(...batchResults.filter(Boolean));
  }
  return results;
}

// 情况 3: 超时处理
async function execWithTimeout(command: string, timeoutMs: number = 30000) {
  return new Promise((resolve, reject) => {
    const child = exec(command, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    
    setTimeout(() => {
      child.kill();
      reject(new Error('Command timeout'));
    }, timeoutMs);
  });
}
```

---

## 性能优化

### 缓存策略

```typescript
// 利用 CodeMap 内置缓存（60秒 TTL）
// 第一次查询后，后续查询会自动使用缓存

// 如果需要清除缓存
function clearCodeMapCache() {
  // 删除索引缓存文件
  const cacheDir = '.mycodemap/cache';
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true });
  }
}
```

### 批量处理

```typescript
// 不好的做法：串行执行
for (const file of files) {
  await exec(`mycodemap impact -f "${file}"`);
}

// 好的做法：先生成，再批量查询
await exec('mycodemap generate');
const results = await Promise.all(
  files.map(f => exec(`mycodemap impact -f "${f}" -j`))
);
```

---

## 安全注意事项

1. **命令注入防护**: 始终对用户输入进行转义
   ```typescript
   const safeSymbol = symbolName.replace(/["'`]/g, '');
   await exec(`mycodemap query -s "${safeSymbol}"`);
   ```

2. **路径遍历防护**: 验证文件路径
   ```typescript
   if (!filePath.startsWith('src/')) {
     throw new Error('Invalid path');
   }
   ```

3. **敏感信息**: 输出中可能包含文件路径，注意隐私

---

## 故障排除

### CLI 未找到

```bash
# 检查安装
which mycodemap || echo "未安装"

# 解决方案 1: 全局安装
npm install -g @mycodemap/mycodemap

# 解决方案 2: 使用 npx
alias mycodemap='npx @mycodemap/mycodemap'

# 解决方案 3: 本地安装
npm install --save-dev @mycodemap/mycodemap
./node_modules/.bin/mycodemap
```

### tree-sitter 构建失败

```bash
# Ubuntu/Debian
sudo apt-get install build-essential

# macOS
xcode-select --install

# 然后重新安装
npm rebuild
```

### 代码地图过期

```bash
# 强制重新生成
mycodemap generate --force

# 或重新运行一次 generate 刷新输出
mycodemap generate
```
