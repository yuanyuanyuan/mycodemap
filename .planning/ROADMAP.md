# Milestone v2.4: parser-multilang-depth

**Status:** IN PROGRESS
**Phases:** 67-71
**Total Plans:** TBD

## Overview

在 `v2.2` 已收敛 parser registry 路由和 `v2.3` 已建立 graph-native schema 的基础上，`v2.4` 的目标是把 Python 解析从 regex-based MVP 升级为 Tree-sitter AST-based 深度解析，并建立多语言 parser 切换机制，让 CodeMap 对 Python 项目的分析质量达到 TypeScript 同等水平。

## Phases

### Phase 67: Tree-sitter Python Grammar Integration ✓ COMPLETE (2026-05-09)

**Goal:** Install `tree-sitter-python` WASM grammar and create a Python-specific Tree-sitter parser that can produce full AST-based analysis for Python files, replacing the regex-based PythonParser for the main analysis path.
**Depends on:** None
**Requirements:** PY-01, PY-02
**Plans:** 1 (TREE-SITTER-PYTHON) — complete

**Success Criteria:** ALL MET
1. `tree-sitter-python@0.23.4` installed and loadable via WASM. ✓
2. `PythonTreeSitterParser` extracts imports, exports, symbols, classes, functions, decorators, async via AST. ✓
3. `PythonParser` remains in codebase (not registered, backward compat). ✓
4. Comparison test proves AST finds nested `Config` class, regex misses it. ✓

**Commits:** 91e7d19, e5cecdd, 41b6ee9, 3baa9ae, dde7e55, 2ff39c0

### Phase 68: Multi-language Parser Switching

**Goal:** Generalize the `TreeSitterParser` from its current TypeScript-hardcoded implementation to a language-agnostic parser that can switch Tree-sitter grammars based on file extension, enabling a single parser class to serve TypeScript, JavaScript, Python, and future languages.
**Depends on:** Phase 67
**Requirements:** PY-03, PY-04
**Plans:** TBD

**Success Criteria:**
1. `TreeSitterParser` accepts a language parameter or auto-detects language from file extension, and loads the corresponding Tree-sitter grammar.
2. The parser registry routes `.py` files to the Tree-sitter Python parser when the grammar is available, falling back to regex when not.
3. TypeScript/JavaScript parsing behavior is unchanged — no regression in existing Tree-sitter analysis quality.
4. At least one test proves that the same `TreeSitterParser` class can parse both `.ts` and `.py` files with correct language-specific AST output.

### Phase 69: PythonTypeEnhancer

**Goal:** Build a `PythonTypeEnhancer` (following the `TypeScriptTypeEnhancer` pattern) that infers type information from Python docstrings, type annotations, and common patterns, enriching the graph truth with type metadata for Python symbols.
**Depends on:** Phase 67
**Requirements:** PY-05, PY-06
**Plans:** 2 plans

Plans:
- [ ] `69-01-PLAN.md` — Build `PythonTypeEnhancer` with annotation-first merge, bounded Google/NumPy/Sphinx docstring parsing, and fail-soft fixture coverage
- [ ] `69-02-PLAN.md` — Wire Python type metadata through parser/analyzer seams and prove `module.typeInfo` persistence end-to-end

**Success Criteria:**
1. `PythonTypeEnhancer` extracts type information from Python docstrings (Google, NumPy, Sphinx styles) and PEP 484 type annotations.
2. Enhanced type metadata is persisted in the graph alongside symbol definitions, matching the shape that `TypeScriptTypeEnhancer` produces for `.ts` files.
3. The enhancer handles common patterns: function return types, parameter types, class attribute types, and Optional/Union types.
4. At least one test proves that a Python file with docstring types produces richer graph metadata than the same file without enhancement.

### Phase 70: Python Call-graph & Complexity

**Goal:** Implement the call-graph, cross-file-analysis, and complexity-metrics features for Python that are currently declared in `supportedFeatures` but have empty method bodies, making Python analysis quality comparable to TypeScript.
**Depends on:** Phase 67, Phase 68
**Requirements:** PY-07, PY-08
**Plans:** TBD

**Success Criteria:**
1. Python call-graph extraction identifies function/method calls within and across files, producing dependency edges in the graph.
2. Python complexity metrics (cyclomatic complexity, cognitive complexity) are computed and persisted alongside symbol definitions.
3. Cross-file analysis for Python resolves import references to actual symbol definitions in the same project.
4. At least one test proves that a Python project with cross-file imports produces a connected dependency graph, not isolated per-file fragments.

### Phase 71: Parser Legacy Cleanup

**Goal:** Close parser architecture debt left after Phase 59 (parser cutover) and Phase 68 (multi-language parser switching). Unify `ILanguageParser` as the single canonical interface, remove adapter shims (`convertRegistryResultToLegacyResult`, `toLegacyParseResult`), relocate `TreeSitterParser` into Infrastructure layer and register it in `ParserRegistry`, decouple Core layer from direct Infrastructure imports, and relocate `TypeScriptTypeEnhancer` out of the legacy layer.
**Depends on:** Phase 59, Phase 68
**Requirements:** PAR-09, PAR-10, PAR-11
**Plans:** 3 planned (71-01 type unification, 71-02 TreeSitterParser relocation, 71-03 layer decoupling)

**Success Criteria:**
1. `ILanguageParser` is the single internal parser interface; Legacy `IParser` is marked `@deprecated` and unused internally.
2. No adapter functions (`convertRegistryResultToLegacyResult`, `toLegacyParseResult`) exist in active runtime code.
3. `TreeSitterParser` lives in `src/infrastructure/parser/implementations/`, extends `ParserBase`, and is registered in `ParserRegistry`.
4. `src/core/analyzer.ts` does not directly import `createDefaultParserRegistry` from Infrastructure layer.
5. `TypeScriptTypeEnhancer` lives in `src/infrastructure/parser/enhancers/` and is imported from there by all consumers.
6. All existing tests pass; no regression in `mycodemap generate` for TS/Python/Go projects.

## Milestone Summary

**Key Objectives:**

- Upgrade Python parsing from regex-based MVP to Tree-sitter AST-based deep analysis.
- Establish a multi-language parser switching mechanism that serves TypeScript, Python, and future languages from a single parser class.
- Build PythonTypeEnancer for docstring/annotation-based type inference.
- Implement Python call-graph, complexity metrics, and cross-file analysis.
- Preserve the v2.2 parser/storage/MCP baseline and v2.3 graph schema while extending Python analysis depth.

**Coverage:**

- `5` phases
- Phase numbering continues from `66` to `67-71`

**Deferred Beyond v2.4:**

- `v2.5+`: hub/bridge detection, hook mechanism, node dedup
- `v2.6+`: complexity calculation unify, MCP blank-line filter, edge ID normalization
- `v3.0+`: Auto-Provisioned Agent Skills, architecture-intelligence features, Parser extension for Rust/Java/C++ (Tree-sitter grammar)

---

_For active planning truth, see `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and `.planning/STATE.md`._
