# Phase 67: Tree-sitter Python Grammar Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 67-tree-sitter-python-grammar
**Areas discussed:** WASM Grammar 选择, Parser 架构策略, Fallback 回退策略, Python AST 特性边界

---

## WASM Grammar 选择

| Option | Description | Selected |
|--------|-------------|----------|
| 原生绑定优先 | 使用 tree-sitter-python npm 包的原生绑定。性能最好，但需要 node-gyp 编译。 | |
| WASM-only | 用 web-tree-sitter + 预编译 .wasm 文件。零编译依赖。 | |
| 双路径 (原生+WASM) | 原生优先，WASM 回退 — 复用现有 tree-sitter-loader.ts 的双路径模式。 | ✓ |

**User's choice:** 双路径 (原生+WASM)
**Notes:** 与现有 TypeScript tree-sitter 加载模式一致。

| Option | Description | Selected |
|--------|-------------|----------|
| npm 包 | 直接 npm install tree-sitter-python，与现有 tree-sitter-typescript 一致。 | ✓ |
| 手动管理 .wasm | 从 GitHub releases 下载预编译 .wasm，放到项目资源目录。 | |

**User's choice:** npm 包

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展现有 loader | 扩展 loadTreeSitter() 返回 TypeScript + Python grammar，或按需加载。 | ✓ |
| 通用语言加载器 | 创建 loadTreeSitterLanguage(lang) 函数，按语言名加载对应 grammar。 | |

**User's choice:** 扩展现有 loader

| Option | Description | Selected |
|--------|-------------|----------|
| 匹配当前版本 | tree-sitter 0.21.1 + tree-sitter-python 兼容版本。 | ✓ |
| 升级到最新 | 升级到最新 tree-sitter + tree-sitter-python。可能引入破坏性变更。 | |

**User's choice:** 匹配当前版本

| Option | Description | Selected |
|--------|-------------|----------|
| npm 包内路径 | 通过 require.resolve('tree-sitter-python/tree-sitter-python.wasm') 找到 npm 包中的 .wasm 文件。 | ✓ |
| 项目资源目录 | 将 .wasm 复制到 .mycodemap/wasm/ 或项目资源目录。 | |

**User's choice:** npm 包内路径

---

## Parser 架构策略

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 PythonTreeSitterParser | 在 src/infrastructure/parser/ 下新建，继承 ParserBase，与 PythonParser 并存。 | ✓ |
| 扩展 TreeSitterParser 多语言 | 让 TreeSitterParser 支持语言参数，一个类服务多语言。 | |
| PythonParser 双模式 | PythonParser 内部增加 tree-sitter 路径，通过配置切换 regex/AST 模式。 | |

**User's choice:** 独立 PythonTreeSitterParser
**Notes:** 用户强调"修改不互相影响"和"边界清晰"。从维护性、独立性、测试验收和 debug 角度分析后确认。

| Option | Description | Selected |
|--------|-------------|----------|
| src/infrastructure/ | 与 PythonParser、TypeScriptParser 同级。遵循分层架构。 | ✓ |
| src/parser/ | 与现有 TreeSitterParser 同级。 | |

**User's choice:** src/infrastructure/parser/implementations/

| Option | Description | Selected |
|--------|-------------|----------|
| AST 优先替换 | tree-sitter-python 可用时注册为 python parser，替换 regex PythonParser。 | ✓ |
| 双注册 + 运行时选择 | 同时注册两个 parser，通过配置选择。 | |
| 内部路由 | PythonTreeSitterParser 内部先尝试 AST，失败再用 regex。 | |

**User's choice:** AST 优先替换
**Notes:** 经过四维度分析（修改独立性、边界清晰、测试/验收、Debug）确认为最优选择。

| Option | Description | Selected |
|--------|-------------|----------|
| ILanguageParser / ParserBase | 与 PythonParser 一致，产出 Module、ModuleSymbol、ImportInfo、ExportInfo。 | ✓ |
| IParser | 与旧 TreeSitterParser 一致，产出 ParseResult。 | |

**User's choice:** ILanguageParser / ParserBase

---

## Fallback 回退策略

| Option | Description | Selected |
|--------|-------------|----------|
| 静默降级 + warning | WASM 加载失败时静默降级到 regex PythonParser，输出 warning 但不报错。 | |
| 显式报错 | 降级时显式报错，让用户知道 AST 解析不可用。 | ✓ |
| partialFailure 元数据 | 降级时返回 partialFailure 元数据，让调用方决定如何处理。 | |

**User's choice:** 显式报错
**Notes:** 比 ROADMAP 要求更严格。ROADMAP 要求"regex 保留为 fallback"，用户选择"报错 + 不降级"。

| Option | Description | Selected |
|--------|-------------|----------|
| 永久保留 regex | 保留 regex PythonParser 作为永久回退路径。 | |
| 稳定后 deprecated | tree-sitter-python 稳定后标记 regex PythonParser 为 deprecated。 | ✓ |

**User's choice:** 稳定后 deprecated

| Option | Description | Selected |
|--------|-------------|----------|
| init 时检测 | ParserRegistry.init() 时检测 tree-sitter-python 可用性。 | |
| 每次解析时检测 | 每次 parseFile() 时检测，动态切换。 | ✓ |
| 配置驱动 | 通过配置文件或环境变量强制指定。 | |

**User's choice:** 每次解析时检测

| Option | Description | Selected |
|--------|-------------|----------|
| parseResult 标记 | 在 parseResult 中添加 metadata 标记使用了哪个 parser。 | ✓ |
| 仅日志记录 | 只在日志中记录，parseResult 不变。 | |
| module warning 字段 | 降级时在返回的 module 上添加 warning 字段。 | |

**User's choice:** parseResult 标记

| Option | Description | Selected |
|--------|-------------|----------|
| 报错 + 不降级 | tree-sitter-python 不可用时抛出错误，不降级。 | ✓ |
| 报错 + 降级 | 报错但同时降级到 regex 并在 parseResult 中标记。 | |
| 静默降级 | 降级到 regex，仅在日志中 warning。 | |

**User's choice:** 报错 + 不降级
**Notes:** 这是 ROADMAP 决策覆盖——用户选择比原始要求更严格的行为。

---

## Python AST 特性边界

**Phase 67 覆盖特性（全部选中）：**
- 装饰器 (decorators)
- 异步函数 (async/await)
- 嵌套定义 (nested class/function)
- 类型注解 (type annotations)
- 复杂导入 (multi-line, nested)
- __all__ 导出
- 多重继承 (multiple inheritance)
- 控制流 (exception handling)

| Option | Description | Selected |
|--------|-------------|----------|
| 分层实现 | Phase 67 先实现高优先级，类型注解和控制流在 Phase 69/70 处理。 | ✓ |
| 一次全做 | Phase 67 一次性实现所有选中的 AST 特性。 | |
| 最小可用 | Phase 67 只实现最基本的 AST 解析。 | |

**User's choice:** 分层实现

| Option | Description | Selected |
|--------|-------------|----------|
| 对比测试 | 至少一个测试证明 Tree-sitter 路径正确解析了 regex 路径遗漏的内容。 | ✓ |
| 逐特性测试 | 每个 AST 特性一个独立测试。 | |
| 综合文件测试 | 用一个综合 Python 文件测试所有特性。 | |

**User's choice:** 对比测试

| Option | Description | Selected |
|--------|-------------|----------|
| fixture 文件 | 在 tests/fixtures/ 下创建 Python 测试文件。 | ✓ |
| 内联代码片段 | 测试代码内联 Python 片段。 | |

**User's choice:** fixture 文件

---

## Claude's Discretion

No areas where user said "you decide" — all decisions were explicitly made by the user.

## Deferred Ideas

None — discussion stayed within phase scope.
