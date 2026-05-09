# Requirements: CodeMap v2.4 parser-multilang-depth

**Defined:** 2026-05-09
**Core Value:** 为人类与 AI / Agent 提供可信的代码上下文、设计交接边界与后续演化决策依据。

## v2.4 Requirements

### Tree-sitter Python Grammar

- [ ] **PY-01**: `tree-sitter-python` WASM grammar 已安装并可在运行时加载，Python 文件的 AST 解析不再依赖 regex
- [ ] **PY-02**: Python Tree-sitter parser 能正确提取 imports、exports、symbols、classes、functions、decorators、async 定义和嵌套结构

### Multi-language Parser Switching

- [ ] **PY-03**: `TreeSitterParser` 支持按文件扩展名自动加载对应语言的 Tree-sitter grammar，不再硬编码 TypeScript
- [ ] **PY-04**: parser registry 在 Tree-sitter grammar 可用时路由 `.py` 文件到 AST parser，不可用时回退到 regex parser

### Python Type Enhancement

- [ ] **PY-05**: `PythonTypeEnhancer` 能从 Python docstring（Google/NumPy/Sphinx 风格）和 PEP 484 类型注解中提取类型信息
- [ ] **PY-06**: 增强后的类型元数据与 `TypeScriptTypeEnhancer` 产出的形状一致，持久化到 graph 中

### Python Analysis Features

- [ ] **PY-07**: Python call-graph 提取能识别文件内和跨文件的函数/方法调用，在 graph 中生成 dependency edges
- [ ] **PY-08**: Python complexity metrics（圈复杂度、认知复杂度）可计算并持久化到 symbol 定义旁

## v2.5+ Requirements

### Deep Analysis Hooks

- **HOOK-01**: hub / bridge detection
- **HOOK-02**: hook mechanism (first-remind-then-silent, Phase 58 integration)
- **HOOK-03**: node dedup (3-layer)

### Polish & Stabilize

- **POL-01**: Complexity calculation unify
- **POL-02**: MCP blank-line filter
- **POL-03**: Edge ID normalization
- **POL-04**: Interface Contract 1.0.0

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reopening v2.2 parser/storage/MCP baseline | v2.4 builds on the stable v2.2 baseline, not relitigating it |
| Reopening v2.3 graph schema | v2.4 consumes graph-native schema from v2.3, not redesigning it |
| Parser extension for Rust/Java/C++ (Tree-sitter grammar) | Deferred to v3.0+; v2.4 focuses on Python depth only |
| Surprise score / execution flow trace / bare-name resolution | These belong to agent-graph-experience, not parser depth |
| Agent integration features | Auto-Provisioned Agent Skills, MCP verify_contract remain v3.0+ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PY-01 | Phase 67 | Pending |
| PY-02 | Phase 67 | Pending |
| PY-03 | Phase 68 | Pending |
| PY-04 | Phase 68 | Pending |
| PY-05 | Phase 69 | Pending |
| PY-06 | Phase 69 | Pending |
| PY-07 | Phase 70 | Pending |
| PY-08 | Phase 70 | Pending |

**Coverage:**
- v2.4 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-09*
