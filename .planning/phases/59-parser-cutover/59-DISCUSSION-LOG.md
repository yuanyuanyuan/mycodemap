# Phase 59: Parser Cutover - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 59-parser-cutover
**Areas discussed:** Parser 主入口归属, SmartParser 收缩策略, 废弃模式失败语义, 多语言路由时机

---

## Parser 主入口归属

| Option | Description | Selected |
|--------|-------------|----------|
| MVP3 ParserRegistry | 已有 getParserByFile() 多语言路由、TS/Python/Go 三种语言已注册 | ✓ |
| Legacy createParser() 改造 | 保留 createParser() 作为主入口，但内部只返回 TreeSitterParser | |
| 新建统一入口 | 在 src/interface/ 层新建一个统一的 parser entry | |

**User's choice:** MVP3 ParserRegistry
**Notes:** 与架构演进方向一致，已有成熟的多语言路由能力

| Option | Description | Selected |
|--------|-------------|----------|
| 薄封装委托 | createParser() 内部委托给 ParserRegistry.getParserByFile()，保留签名兼容性 | ✓ |
| 直接替换、删除旧入口 | 让所有调用方使用 ParserRegistry，删除 createParser() | |

**User's choice:** 薄封装委托
**Notes:** 保留签名兼容性，外部调用方无需改动

| Option | Description | Selected |
|--------|-------------|----------|
| 改内部实现 | analyzer.ts 内部改用 registry 获取 parser，保留 analyze() 函数签名不变 | ✓ |
| 完全重写 analyzer.ts | 重写为 MVP3 风格，调用 CodeGraphBuilder 和 domain 层 | |

**User's choice:** 改内部实现
**Notes:** 最小变动原则，避免超出 Phase 59 scope

| Option | Description | Selected |
|--------|-------------|----------|
| 移除 actualMode 字段 | 已收敛到 ParserRegistry，内部不区分模式 | ✓ |
| 保留但固定返回值 | 保留 actualMode 但固定返回 'smart' | |

**User's choice:** 移除 actualMode 字段
**Notes:** 语义准确性优先于向后兼容

---

## SmartParser 收缩策略

| Option | Description | Selected |
|--------|-------------|----------|
| 后处理增强层 | SmartParser 保留为独立后处理器，在 TreeSitterParser 解析结构后补充类型推断 | ✓ |
| 内联到 TreeSitterParser | 将 SmartParser 类型推断逻辑内联到 TreeSitterParser 中 | |
| 完全删除 SmartParser | 依赖 tree-sitter-typescript grammar 提供所有信息 | |

**User's choice:** 后处理增强层
**Notes:** 保留深度类型分析能力，与 PAR-06 PythonTypeEnhancer 模式一致

| Option | Description | Selected |
|--------|-------------|----------|
| TypeScriptTypeEnhancer | 放在 src/parser/enhancers/ 下，不实现 IParser 接口 | ✓ |
| 保留 SmartParser 名称 | 改为只做类型增强，保留 IParser 接口 | |

**User's choice:** TypeScriptTypeEnhancer
**Notes:** 命名准确反映职责，与 IParser 接口解耦

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 TS/TSX | TypeScriptTypeEnhancer 只在解析 TS/TSX 文件时应用 | ✓ |
| TS + JS 文件 | 也包含 JS/JSX 文件 | |

**User's choice:** 仅 TS/TSX
**Notes:** TS Compiler API 对纯 JS 的类型推断有限

| Option | Description | Selected |
|--------|-------------|----------|
| 默认启用、可关闭 | parser.enhanceTypes: false 可关闭 | ✓ |
| 始终启用、不可关闭 | 没有关闭选项 | |
| 默认关闭、可启用 | 用户显式启用 | |

**User's choice:** 默认启用、可关闭
**Notes:** 保持灵活性，CI 快速扫描等场景可关闭

---

## 废弃模式失败语义

| Option | Description | Selected |
|--------|-------------|----------|
| Failure-to-Action | DEPRECATED_PARSER_MODE 错误码 + rootCause + remediation + nextCommand | ✓ |
| stderr 错误 + exit 1 | 简单 stderr 错误消息 + exit 1 | |
| 警告 + 自动降级 | stderr 警告 + 自动降级到 tree-sitter | |

**User's choice:** Failure-to-Action Protocol
**Notes:** 与 v2.0 错误协议一致，结构化修复指引

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 -m 但拒绝旧值 | 传 fast/smart/hybrid 触发 DEPRECATED_PARSER_MODE 错误 | ✓ |
| 直接删除 -m 选项 | 破坏向后兼容 | |
| 保留 -m 但忽略 | 可能让用户误以为 mode 仍在生效 | |

**User's choice:** 保留 -m 但拒绝旧值
**Notes:** 友好的迁移路径，而不是粗暴删除

| Option | Description | Selected |
|--------|-------------|----------|
| 保留字段但拒绝旧值 | config.json 中 parser.mode 只接受 'tree-sitter' 或省略 | ✓ |
| 删除 parser.mode 字段 | 包含此字段的配置文件会在 doctor 检查时被标记 | |

**User's choice:** 保留字段但拒绝旧值
**Notes:** 与 CLI 行为一致

| Option | Description | Selected |
|--------|-------------|----------|
| 三步修复指引 | (1) 移除 -m 或改为默认值 (2) 更新 config.json (3) 运行 codemap doctor | ✓ |
| 简短提示 | 只说 '此模式已废弃，请使用默认 parser' | |

**User's choice:** 三步修复指引
**Notes:** 具体可操作，用户知道要改什么

---

## 多语言路由时机

| Option | Description | Selected |
|--------|-------------|----------|
| Wave 1 全接 | 59-01 建立 ParserRegistry 主流程，59-02 把 TS/Python/Go 都接进去 | ✓ |
| Wave 1 只做 TS | Python/Go 留到 Wave 2 | |
| 注册但不验证 | Python/Go 只注册到 registry 但不验证端到端 | |

**User's choice:** Wave 1 全接
**Notes:** 三个 parser 已在 registry 中，接线工作量可控

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展默认 include | discoverProjectFiles 默认扫描 .ts/.tsx/.js/.jsx/.py/.go | ✓ |
| 保持默认、用户配置 | 用户需在 config.json 中添加 Python/Go glob 模式 | |

**User's choice:** 扩展默认 include
**Notes:** 多语言项目零配置即可工作

| Option | Description | Selected |
|--------|-------------|----------|
| 不阻塞 | GoParser/PythonParser MVP debt 不阻塞 Phase 59 | ✓ |
| 同时清理 MVP debt | 清理 TODO-DEBT 标记但扩大 scope | |

**User's choice:** 不阻塞
**Notes:** 基本结构解析能力已具备，深度分析留后续

---

## Claude's Discretion

- TypeScriptTypeEnhancer 的具体接口设计（enhance 方法签名、ParseResult 增量合并策略）
- FastParser 和 TreeSitterParser 的代码清理/合并策略
- Server API 和 AnalysisHandler 中 mode 参数的迁移方式
- CLI-new 和 interface types 中 mode 类型定义的清理

## Deferred Ideas

None — discussion stayed within phase scope
