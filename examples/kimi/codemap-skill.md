---
name: codemap
description: MyCodeMap 代码分析技能，用于项目结构分析、符号查询、依赖分析和影响评估。
---

# MyCodeMap Skill

## 环境检测

首先检测 CLI 是否可用：

```bash
# 检测全局安装的 mycodemap
if command -v mycodemap &> /dev/null; then
    CODEMAP_CMD="mycodemap"
# 检测本地安装的 mycodemap
elif [ -f "./node_modules/.bin/mycodemap" ]; then
    CODEMAP_CMD="./node_modules/.bin/mycodemap"
# 使用 npx
else
    CODEMAP_CMD="npx @mycodemap/mycodemap"
fi
```

## 常用命令

### 生成代码地图
```bash
$CODEMAP_CMD generate
```

### 查询符号
```bash
$CODEMAP_CMD query -s "<symbol-name>"
```

### 查询模块
```bash
$CODEMAP_CMD query -m "<module-path>"
```

### 模糊搜索
```bash
$CODEMAP_CMD query -S "<keyword>" -l 10
```

### 依赖分析
```bash
$CODEMAP_CMD deps -m "<module-path>"
```

### 影响范围分析
```bash
$CODEMAP_CMD impact -f "<file-path>"
```

### 循环依赖检测
```bash
$CODEMAP_CMD cycles
```

### 复杂度分析
```bash
$CODEMAP_CMD complexity -f "<file-path>"
```

## 使用场景

### 场景 1：理解项目结构

当用户询问项目结构或特定模块时：
1. 运行 `$CODEMAP_CMD generate` 生成最新代码地图
2. 阅读 `.mycodemap/AI_MAP.md` 获取项目概览
3. 根据需要使用 `query` 或 `deps` 获取详细信息

### 场景 2：代码变更影响分析

当用户要修改某个文件时：
1. 运行 `$CODEMAP_CMD impact -f "<file-path>" --transitive`
2. 分析输出结果，告知用户受影响的模块和文件

### 场景 3：查找代码定义

当用户询问某个类/函数的位置时：
1. 运行 `$CODEMAP_CMD query -s "<symbol-name>"`
2. 根据结果提供精确的文件路径和行号

## 输出处理

- 直接返回 CLI 输出给用户
- 使用 `-j` 参数获取 JSON 格式便于解析
- 复杂输出可重定向到临时文件分析
