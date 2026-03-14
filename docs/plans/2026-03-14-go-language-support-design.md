# Go 语言支持设计文档

**日期**: 2026-03-14
**目标**: 为 CodeMap 添加 Go 语言分析支持
**模式**: Fast + Smart（分阶段实现）

## 1. 架构概览

```
TreeSitterParser (扩展)
├── 语言检测 → 根据文件扩展名 (.go / .ts / .js)
├── 动态加载语言模块 → tree-sitter-go / tree-sitter-typescript
└── 节点提取 → 通过 AST 遍历提取 Import/Export/Symbol
```

## 2. 核心改动

### 2.1 依赖更新

- 新增：`tree-sitter-go` 包

### 2.2 TreeSitterParser 改造

```typescript
// 构造函数中根据语言动态加载
constructor(options: ParserOptions) {
  this.rootDir = options.rootDir;
  this.parser = new Parser();
  // 语言在 parseFile 时根据扩展名动态设置
}

// 新增语言检测方法
private detectLanguage(filePath: string): Language {
  const ext = path.extname(filePath);
  switch (ext) {
    case '.go': return Go;
    case '.ts':
    case '.tsx': return TypeScript.typescript;
    case '.js':
    case '.jsx': return TypeScript.javascript;
  }
}
```

### 2.3 节点类型映射（Go 特有）

| 概念 | TypeScript 节点 | Go 节点 |
|------|-----------------|---------|
| 导入 | `import_statement` | `import_declaration` |
| 导出 | `export_statement` | `exported_decl` |
| 函数 | `function_declaration` | `function_declaration` |
| 类型 | `type_alias_declaration` | `type_spec` |
| 结构体 | `class_declaration` | `struct_type` |

### 2.4 Go 特定逻辑

- 解析 `go.mod` 提取模块名作为顶级依赖
- 测试文件识别：`_test.go` 后缀 → `type: 'test'`

### 2.5 DefaultParserFactory 更新

```typescript
getSupportedExtensions(): string[] {
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.go'];
}
```

## 3. 实施步骤（分阶段）

### 第一阶段：基础支持
1. 安装 `tree-sitter-go` 依赖
2. 扩展 `TreeSitterParser` 支持语言动态切换
3. 添加 Go AST 节点映射逻辑
4. 更新 `DefaultParserFactory` 支持 `.go`
5. 添加单元测试
6. 验证功能

### 第二阶段（后续迭代）
- 复用 `typhonjs-escomplex` 进行 Go 复杂度分析
- 实现调用图分析

## 4. 风险与注意事项

- Go 的 AST 节点类型与 TypeScript 有差异，需要单独处理
- 需要确保 tree-sitter-go 版本与 tree-sitter 核心库兼容
- Go 的 import 路径解析需要考虑模块名（go.mod）的情况
