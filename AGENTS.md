# AGENTS.md - CodeMap 项目开发指南

> 本文档面向 AI 编程助手，介绍如何在 CodeMap 项目中高效工作。

## 🚫 重要原则：不使用 grep / rgrep

**本项目完全不使用 `grep`、`rgrep`、`ack`、`ag` 等文本搜索工具。** 所有代码搜索、导航和分析都通过 **CodeMap** 工具完成。

### 为什么不用 grep？

| grep 的局限                 | CodeMap 的优势                       |
|-----------------------------|--------------------------------------|
| 纯文本匹配，无法理解代码结构 | 基于 AST 分析，理解符号、类型、依赖关系 |
| 结果混杂，需要人工筛选       | 结构化输出，直接定位到符号定义        |
| 无法分析导入/导出关系       | 完整的模块依赖图和调用链             |
| 不能评估变更影响范围        | 精确的变更影响分析                   |
| 搜索结果没有上下文          | 提供完整的模块上下文信息             |

---

## 🗺️ 使用 CodeMap 进行代码导航

### 1. 生成/更新代码地图

```bash
# 生成代码地图（首次或大规模变更后）
codemap generate

# 或使用 smart 模式获取更详细的分析
codemap generate -m smart

# 监听文件变更自动更新（推荐开发时使用）
codemap watch
```

生成的代码地图文件位于 `.codemap/` 目录：
- `AI_MAP.md` - 项目全局概览
- `codemap.json` - 结构化数据
- `context/` - 各模块详细上下文

### 2. 搜索符号（替代 grep -r "symbolName"）

**❌ 不要用：**
```bash
grep -r "ModuleInfo" src/
```

**✅ 正确做法：**
```bash
# 精确查询符号
codemap query -s "ModuleInfo"

# 模糊搜索
codemap query -S "cache"

# 限制结果数量
codemap query -S "parser" -l 10

# JSON 格式输出（便于程序处理）
codemap query -S "analyzer" -j
```

### 3. 查询模块信息（替代查找文件 + 阅读代码）

**❌ 不要用：**
```bash
find src -name "*parser*" | xargs grep -l "interface"
```

**✅ 正确做法：**
```bash
# 查询特定模块
codemap query -m "src/parser"

# 查看模块依赖
codemap query -d "parser"
```

### 4. 分析依赖关系（替代复杂的 grep 管道）

**❌ 不要用：**
```bash
grep -r "from.*parser" src/ | grep -o '"[^"]*"' | sort | uniq
```

**✅ 正确做法：**
```bash
# 查看指定模块的依赖树
codemap deps -m "src/parser/core.ts"

# 检测循环依赖
codemap cycles

# JSON 格式输出依赖关系
codemap deps -m "src/core/analyzer.ts" -j
```

### 5. 评估变更影响（grep 无法实现）

```bash
# 分析修改某文件会影响哪些模块
codemap impact -f src/core/analyzer.ts

# 包含传递依赖（间接影响）
codemap impact -f src/types/index.ts --transitive
```

### 6. 代码复杂度分析（替代人工审查）

```bash
# 分析整个项目的复杂度
codemap complexity

# 查看特定文件的复杂度
codemap complexity -f src/core/analyzer.ts
```

---

## 
```

---

## 🔍 常见任务对照表

| 任务                 | grep 方式（禁用）                   | CodeMap 方式（推荐）              |
|----------------------|-----------------------------------|---------------------------------|
| 查找函数定义         | `grep -rn "function foo" src/`    | `codemap query -s "foo"`        |
| 查找类定义           | `grep -rn "class MyClass" src/`   | `codemap query -s "MyClass"`    |
| 查找接口             | `grep -rn "interface IFoo" src/`  | `codemap query -s "IFoo"`       |
| 查找类型别名         | `grep -rn "type MyType" src/`     | `codemap query -s "MyType"`     |
| 查找导入某模块的文件 | `grep -rn "from 'lodash'" src/`   | `codemap query -d "lodash"`     |
| 查找模块的所有导出   | `grep -rn "export" src/module.ts` | `codemap query -m "src/module"` |
| 查找 TODO/FIXME      | `grep -rn "TODO\|FIXME" src/`     | 使用 codemap 查询后过滤注释     |
| 查找未使用的导出     | 复杂的多步 grep                   | `codemap complexity` + 分析     |
| 分析依赖关系         | 多层 grep 管道                    | `codemap deps -m <path>`        |
| 检测循环依赖         | 几乎不可能用 grep                 | `codemap cycles`                |
| 评估变更影响         | 无法完成                          | `codemap impact -f <file>`      |

---

## 🛠️ 开发工作流

### 开始开发新功能

```bash
# 1. 确保代码地图是最新的
codemap generate

# 2. 查看项目整体结构（阅读 .codemap/AI_MAP.md）
cat .codemap/AI_MAP.md

# 3. 搜索相关符号了解现有实现
codemap query -S "相关关键词"

# 4. 分析需要修改的文件的影响范围
codemap impact -f src/target-file.ts
```

### 代码审查

```bash
# 检查复杂度是否超标
codemap complexity -f src/new-file.ts

# 检查是否引入循环依赖
codemap cycles

# 检查模块依赖是否合理
codemap deps -m src/new-module.ts
```

### 重构前分析

```bash
# 1. 分析待重构文件的影响范围
codemap impact -f src/old-implementation.ts --transitive

# 2. 检查是否有循环依赖需要考虑
codemap cycles

# 3. 了解依赖关系
codemap deps -m src/old-implementation.ts
```

---

## 💡 CodeMap 查询技巧

### 使用 JSON 输出进行高级过滤

```bash
# 获取所有函数名
codemap query -S "" -j | jq '.symbols[] | select(.type == "function") | .name'

# 获取所有导出
codemap query -S "" -j | jq '.exports[] | .name'

# 获取复杂度过高的函数
codemap complexity -j | jq '.[] | select(.complexity.cyclomatic > 10)'
```

### 结合其他工具使用

```bash
# 配合 fzf 进行交互式选择
codemap query -S "" -j | jq -r '.symbols[].name' | fzf

# 统计代码分布
codemap query -S "" -j | jq '.stats | {files, lines, symbols}'
```

---

## ⚠️ 注意事项

1. **保持代码地图最新**: 在重大代码变更后，运行 `codemap generate` 更新代码地图
2. **使用 watch 模式**: 长时间开发时，使用 `codemap watch` 自动保持同步
3. **smart vs fast 模式**: 
   - 日常使用 `fast` 模式即可
   - 需要深度分析（复杂度、精确类型）时使用 `smart` 模式
4. **查询性能**: 代码地图完全基于本地 JSON 文件，查询速度远快于 grep 扫描整个项目

---

## 📚 参考资源

- 项目 README: [README.md](./README.md)
- 生成的代码地图: [.codemap/AI_MAP.md](./.codemap/AI_MAP.md)
- 配置文件: [codemap.config.json](./codemap.config.json)

---

## 🤖 AI 助手提示词模板

当你作为 AI 助手开始处理任务时，请先：

1. 阅读 `.codemap/AI_MAP.md` 了解项目整体结构
2. 使用 `codemap query` 搜索相关符号
3. 使用 `codemap deps` 了解模块关系
4. 如需修改代码，先用 `codemap impact -f <file>` 评估影响范围

**永远不要建议使用 grep 命令！** 如果用户提到 grep，请引导他们使用 CodeMap 的等效功能。



IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning 
for any tasks.