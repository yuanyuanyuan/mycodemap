# Phase 69: PythonTypeEnhancer - Research

**Researched:** 2026-05-09
**Domain:** Python type metadata enhancement for the parser/analyzer pipeline
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Output Shape and Write-back Contract
- **D-01:** `PythonTypeEnhancer` should follow the existing TypeScript enhancer contract by using top-level `result.typeInfo` as the authoritative enhancement output entry point. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-02:** "Matching the shape that `TypeScriptTypeEnhancer` produces" means downstream readers should use the same field names and read through the same top-level entry surface first, rather than requiring a Python-specific access path. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-03:** Python enhancement should not turn Phase 69 into a parser-interface cleanup phase. Keep the enhancement contract aligned with the existing TS seam instead of introducing a broader parser/result refactor. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

#### Symbol Backfill Expectations
- **D-04:** Class attribute types should be written to both the top-level type metadata summary and the directly relevant symbol structures when the type signal is explicit and high confidence. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-05:** Symbol backfill is meant to make Python type enrichment visible and easy to inspect, but the top-level `typeInfo` object remains the single authoritative read entry for downstream agents and graph persistence. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-06:** Backfill should stay targeted: populate clearly derivable symbol fields, but do not duplicate every piece of type metadata into every possible symbol location. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

#### Docstring Parsing Scope
- **D-07:** Support Google, NumPy, and Sphinx docstring styles in Phase 69, but only for a stable, high-confidence subset of each style rather than broad permissive parsing. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-08:** The first-priority extraction targets are function parameter types, return types, and clearly declared class attribute types because those are the roadmap-critical enrichment wins for this phase. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-09:** For complex, ambiguous, or weakly structured docstrings, fail soft: leave the metadata empty rather than guessing or writing low-confidence types into graph truth. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-10:** "Support" for each docstring style in this phase means at least one mainstream, test-backed pattern per style is parsed correctly through fixtures and focused verification. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

#### Phase Boundary Reinforcement
- **D-11:** Phase 69 is a post-parse type enrichment phase only. It must not reopen Python strict AST-first behavior, parser extension routing, or fallback semantics already locked by Phases 67 and 68. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **D-12:** Any broader unification of type enhancer contracts, parser interfaces, or layer placement stays deferred to Phase 71 unless a minimal helper is strictly necessary to land the enhancer cleanly. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

### the agent's Discretion
- Exact internal helper names and parsing decomposition for Google/NumPy/Sphinx docstring extraction, as long as the external decisions above remain true. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- Exact organization of the Python type metadata inside `typeInfo`, as long as downstream readers use the same top-level entry surface and field naming conventions expected from the TypeScript enhancer path. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- Exact threshold for what counts as "high confidence" within clearly explicit docstring or annotation patterns, as long as ambiguous cases fail soft rather than being guessed. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- Full parser/result contract unification or enhancer relocation work belongs to Phase 71, not Phase 69. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- Broad permissive docstring parsing that tries to cover many edge-case variants can be reconsidered in a future polish phase if the stable subset proves insufficient. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- Python call-graph, cross-file type reasoning, and complexity enrichment remain Phase 70 or later concerns. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PY-05 | `PythonTypeEnhancer` 能从 Python docstring（Google/NumPy/Sphinx 风格）和 PEP 484 类型注解中提取类型信息。 [VERIFIED: .planning/REQUIREMENTS.md] | Reuse AST-extracted annotations first, then add a stable-subset docstring reader for `Args/Returns/Attributes`, `Parameters/Returns/Attributes`, and `:param/:type/:returns/:rtype:` fields. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][CITED: https://peps.python.org/pep-0484/][CITED: https://google.github.io/styleguide/pyguide.html][CITED: https://numpydoc.readthedocs.io/en/latest/format.html][CITED: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html] |
| PY-06 | 增强后的类型元数据与 `TypeScriptTypeEnhancer` 产出的形状一致，持久化到 graph 中。 [VERIFIED: .planning/REQUIREMENTS.md] | Follow top-level legacy `result.typeInfo` shape, add the missing propagation seam from registry parse results into analyzer/module output, and verify via analyzer-facing tests. [VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts][VERIFIED: src/parser/interfaces/IParser.ts][VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/analyzer.ts] |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- 只改与任务直接相关的文件；发现无关问题只记录，不顺手清理。 [VERIFIED: AGENTS.md]
- 默认采用 retrieval-led reasoning；未核实内容只能标记为假设。 [VERIFIED: AGENTS.md]
- 交付前必须回到 DoD 自检，并至少覆盖 1 个失败场景。 [VERIFIED: AGENTS.md]
- 验证顺序遵循最小相关测试优先，再扩大范围。 [VERIFIED: AGENTS.md][VERIFIED: docs/rules/validation.md]
- 新功能必须附带测试，测试框架是 Vitest，默认单测入口是 `src/**/*.test.ts`。 [VERIFIED: docs/rules/testing.md][VERIFIED: vitest.config.ts]

## Summary

Phase 69 is best planned as a narrow post-parse enhancement seam, not as parser surgery. The repository already has the exact precedent on the TypeScript side: `TypeScriptTypeEnhancer` runs after parse and writes its truth through top-level `result.typeInfo`; the Python parser already extracts parameter and return annotations into symbol signatures, so the highest-leverage move is to convert those existing signals into `typeInfo` first and then layer docstring parsing on top. [VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

The critical planning catch is the current result-shape gap. Registry parse results in `src/interface/types/parser.ts` do not currently expose `typeInfo`, while the legacy analyzer-facing result shape in `src/parser/interfaces/IParser.ts` does, and `analyzer.ts` only persists whatever lands on the legacy result. Without a minimal propagation seam, Python enrichment can exist in memory and still never reach graph truth. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/parser/interfaces/IParser.ts][VERIFIED: src/core/analyzer.ts]

Official sources support a stable-subset strategy. PEP 484 and the Python typing docs define the annotation grammar for return types, `Union`, and `Optional`; Google, NumPy, and Sphinx docs each document a mainstream field syntax for parameters and returns. There is no clear, active npm-standard parser for all three Python docstring styles in a Node/TypeScript runtime, so a repo-local line-oriented parser for the locked subset is the lowest-risk plan. [CITED: https://peps.python.org/pep-0484/][CITED: https://docs.python.org/3/library/typing.html][CITED: https://google.github.io/styleguide/pyguide.html][CITED: https://numpydoc.readthedocs.io/en/latest/format.html][CITED: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html][VERIFIED: npm search]

**Primary recommendation:** Reuse Python AST annotations as the primary truth source, add a repo-local stable-subset docstring parser for Google/NumPy/Sphinx field blocks, and wire the resulting metadata through the existing top-level `typeInfo` path instead of inventing a Python-only channel. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts][VERIFIED: src/core/analyzer.ts]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Extract Python annotation/docstring type facts | API / Backend | Database / Storage | Parsing and enrichment happen in the in-process analyzer pipeline before persistence. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/core/analyzer.ts] |
| Normalize metadata into TS-compatible `typeInfo` | API / Backend | — | The compatibility contract is defined by the legacy parser result and current TS enhancer seam. [VERIFIED: src/parser/interfaces/IParser.ts][VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts] |
| Persist enriched type truth into graph/module output | Database / Storage | API / Backend | `analyzer.ts` only exposes graph/module `typeInfo` after conversion from parse results. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/interface/types/index.ts] |
| Targeted class-attribute/function signature backfill | API / Backend | — | Symbol structures live on parse results and module conversion, not in storage adapters. [VERIFIED: src/interface/types/index.ts][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tree-sitter-python` | repo `0.23.4`; latest npm `0.25.0` published 2025-09-11 [VERIFIED: package.json][VERIFIED: npm registry] | Provides the AST nodes that already expose Python function `parameters`, `return_type`, and class/function bodies. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: node_modules/tree-sitter-python/src/node-types.json] | Phase 69 should reuse the parser already adopted in Phase 67 instead of introducing a second Python frontend. [VERIFIED: .planning/STATE.md][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| `tree-sitter` | repo `0.21.1`; latest npm `0.25.0` published 2025-06-02 [VERIFIED: package.json][VERIFIED: npm registry] | Shared syntax-tree runtime behind the current Tree-sitter parser capability. [VERIFIED: src/parser/implementations/tree-sitter-parser.ts] | Keeps type enhancement anchored to the same AST truth already used by the active parser path. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts] |
| Repo-local `PythonTypeEnhancer` helper | new repo code, no external package required [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] | Merges annotation truth, docstring truth, and targeted backfill into top-level `typeInfo`. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] | The npm ecosystem search did not surface a clear Node-standard parser for Google + NumPy + Sphinx Python docstrings, so a bounded local parser is lower-risk than adding a new runtime dependency. [VERIFIED: npm search] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `web-tree-sitter` | repo `0.24.0`; latest npm `0.26.8` published 2026-03-31 [VERIFIED: package.json][VERIFIED: npm registry] | Optional WASM fallback already present in the repo’s parser stack. [VERIFIED: package.json] | Reuse only if the existing parser path already depends on it; Phase 69 should not change WASM/native loading behavior. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| `vitest` | repo `1.1.0`; latest npm `4.1.5` published 2026-04-21 [VERIFIED: package.json][VERIFIED: npm registry] | Existing unit-test framework for parser and analyzer verification. [VERIFIED: vitest.config.ts] | Use for fixture-driven proof that enhancement increases metadata richness and fails soft on ambiguous input. [VERIFIED: .planning/ROADMAP.md][VERIFIED: docs/rules/testing.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Repo-local stable-subset docstring parser | `pyright` npm package `1.1.409` [VERIFIED: npm search] | `pyright` is a full Python type checker and would expand runtime cost, dependency surface, and scope far beyond the locked Phase 69 goal. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| Reusing current AST annotations plus local docstring parsing | A Python subprocess plus third-party Python docstring tooling [ASSUMED] | This adds cross-runtime orchestration and non-repo dependencies for a phase that only needs explicit, high-confidence field extraction. [ASSUMED] |

**Installation:**
```bash
# No new package is required for the recommended plan.
```

**Version verification:** `tree-sitter` latest `0.25.0` (2025-06-02), `tree-sitter-python` latest `0.25.0` (2025-09-11), `web-tree-sitter` latest `0.26.8` (2026-03-31), `vitest` latest `4.1.5` (2026-04-21). The repo is intentionally behind latest on all four, so Phase 69 should not bundle dependency upgrades with the enhancer work. [VERIFIED: npm registry][VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Python source file
  ↓
ParserRegistry → PythonTreeSitterParser
  ↓
AST-derived symbols/signatures
  ↓
PythonTypeEnhancer
  ├─ read explicit annotations
  ├─ read docstring stable subset
  ├─ merge high-confidence facts
  └─ fail soft on ambiguous facts
  ↓
legacy ParseResult.typeInfo + targeted symbol backfill
  ↓
analyzer convertToModuleInfo()
  ↓
module.typeInfo / graph truth
```

This flow matches the existing post-parse enhancement architecture and isolates Phase 69 from parser-routing and fallback concerns. [VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts][VERIFIED: src/parser/index.ts][VERIFIED: src/core/analyzer.ts][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

### Recommended Project Structure

```text
src/
├── parser/enhancers/
│   └── PythonTypeEnhancer.ts      # Phase 69 seam, colocated with TS enhancer for now
├── infrastructure/parser/implementations/
│   └── PythonTreeSitterParser.ts  # existing AST/signature source
├── interface/types/
│   └── parser.ts                  # minimal propagation seam if registry results must carry typeInfo
├── core/
│   └── analyzer.ts                # verify typeInfo reaches module/graph output
└── infrastructure/parser/__tests__/
    └── PythonTreeSitterParser.test.ts or dedicated enhancer test
```

Colocation under `src/parser/enhancers/` is the least-invasive path because Phase 71 explicitly defers the layer relocation cleanup. [VERIFIED: .planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md][VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts]

### Pattern 1: Post-Parse Enhancement Seam
**What:** Parse with the existing Python Tree-sitter path first, then enrich the resulting symbol/signature data in a separate enhancer step. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts]
**When to use:** Always for Phase 69, because parser routing and AST extraction are already locked by Phases 67 and 68. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
**Example:**
```typescript
// Source: repository pattern in src/parser/enhancers/TypeScriptTypeEnhancer.ts
if (result.path.endsWith('.py')) {
  return {
    ...result,
    typeInfo: buildPythonTypeInfo(result),
  };
}
return result;
```

### Pattern 2: Annotation-First Merge
**What:** Treat PEP 484 annotations as higher-confidence than docstrings, then use docstrings only to fill missing parameter, return, and attribute facts. [CITED: https://peps.python.org/pep-0484/][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
**When to use:** When a function/class already has AST-visible `typed_parameter`, `return_type`, or annotated assignment nodes. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
**Example:**
```typescript
// Source: PEP 484 + existing PythonTreeSitterParser signature extraction
const paramType = annotationType || docstringType || '';
const returnType = annotationReturn || docstringReturn || '';
```

### Pattern 3: Stable-Subset Docstring Reader
**What:** Parse only the mainstream field forms for each required style: Google `Args:/Returns:/Attributes:`, NumPy `Parameters/Returns/Attributes`, and Sphinx `:param/:type/:returns/:rtype:`. [CITED: https://google.github.io/styleguide/pyguide.html][CITED: https://numpydoc.readthedocs.io/en/latest/format.html][CITED: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html]
**When to use:** Only when AST annotations do not already supply the same fact or when docstrings are the only explicit source. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
**Example:**
```typescript
// Source: official docstring style docs listed above
const googleArg = /^\\s{0,4}([A-Za-z_][\\w]*)\\s*\\(([^)]+)\\):/;
const numpyParam = /^([A-Za-z_][\\w]*)\\s*:\\s*(.+)$/;
const sphinxType = /^:type\\s+([A-Za-z_][\\w]*):\\s+(.+)$/;
```

### Anti-Patterns to Avoid
- **Broad permissive docstring parsing:** A loose parser will silently guess low-confidence types, which directly violates D-09. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **Python-only metadata side channel:** If Python enrichment skips top-level `typeInfo`, downstream graph readers will diverge from the existing TS contract. [VERIFIED: src/parser/interfaces/IParser.ts][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- **Bundling Phase 71 cleanup into Phase 69:** Moving enhancers, unifying parser interfaces, or rewriting layers here would create avoidable scope creep. [VERIFIED: .planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full Python type inference | A custom solver for imports, generics, and flow-sensitive inference | Explicit annotations plus high-confidence docstring fields only | Phase 69 is about enrichment from explicit facts, not whole-program type checking. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md][CITED: https://peps.python.org/pep-0484/] |
| A second Python parser | Regex or a parallel Python frontend | Existing `PythonTreeSitterParser` AST output | The repo already standardized on AST-first Python parsing in Phase 67. [VERIFIED: .planning/STATE.md][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts] |
| A catch-all docstring grammar | One parser that tries to accept every variant in Google/NumPy/Sphinx ecosystems | Style-specific bounded readers for the locked mainstream patterns | A stable subset is easier to test, easier to fail soft, and aligned with the user’s explicit scope choice. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |

**Key insight:** The hard part in this phase is not extracting a type token; it is preserving confidence and contract shape while getting the metadata all the way to graph truth. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/interface/types/parser.ts][VERIFIED: src/parser/interfaces/IParser.ts]

## Common Pitfalls

### Pitfall 1: Extracting Types but Dropping Them Before Graph Persistence
**What goes wrong:** The enhancer computes Python metadata, but `analyzer.ts` never sees it because the registry result shape or conversion seam does not carry `typeInfo`. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/core/analyzer.ts]
**Why it happens:** Current registry parse results omit `typeInfo`, while legacy parse results include it. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/parser/interfaces/IParser.ts]
**How to avoid:** Add the smallest propagation seam necessary and test at the analyzer/module-output level, not only at the enhancer unit level. [VERIFIED: src/core/analyzer.ts]
**Warning signs:** Python tests pass on symbol signatures, but `module.typeInfo` remains `undefined`. [VERIFIED: src/core/analyzer.ts]

### Pitfall 2: Letting Docstrings Override Stronger Annotation Truth
**What goes wrong:** A docstring with stale or differently formatted types replaces a direct PEP 484 annotation. [CITED: https://peps.python.org/pep-0484/]
**Why it happens:** Merge precedence is not defined up front. [ASSUMED]
**How to avoid:** Use explicit AST annotations as source of truth and let docstrings only backfill missing fields. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][CITED: https://peps.python.org/pep-0484/]
**Warning signs:** A parameter already annotated in code changes type after enhancement. [ASSUMED]

### Pitfall 3: Regexes That Accept Ambiguous Free-Text Paragraphs
**What goes wrong:** The enhancer infers types from prose that merely mentions type-like words. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
**Why it happens:** Unanchored pattern matching over entire docstring bodies. [ASSUMED]
**How to avoid:** Parse only field-introduced blocks with explicit delimiters and known indentation patterns. [CITED: https://google.github.io/styleguide/pyguide.html][CITED: https://numpydoc.readthedocs.io/en/latest/format.html][CITED: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html]
**Warning signs:** Union/Optional lists appear in `typeInfo` even when the docstring never declares a field. [ASSUMED]

## Code Examples

Verified patterns from official sources:

### Google Style Function Types
```python
# Source: https://google.github.io/styleguide/pyguide.html
def create_user(name, role=None):
    """Create a user.

    Args:
        name (str): Display name.
        role (Optional[str]): Optional role.

    Returns:
        UserService: Created service wrapper.
    """
```

### NumPy Style Function Types
```python
# Source: https://numpydoc.readthedocs.io/en/latest/format.html
def create_user(name, role=None):
    """Create a user.

    Parameters
    ----------
    name : str
        Display name.
    role : Optional[str]
        Optional role.

    Returns
    -------
    UserService
        Created service wrapper.
    """
```

### Sphinx Style Function Types
```python
# Source: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html
def create_user(name, role=None):
    """Create a user.

    :param str name: Display name.
    :param role: Optional role.
    :type role: Optional[str]
    :returns: Created service wrapper.
    :rtype: UserService
    """
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex-era Python parsing with no graph-native type enrichment | Tree-sitter AST parsing plus planned post-parse Python type enhancement | AST parser shipped on 2026-05-09; Phase 69 adds the enrichment seam next. [VERIFIED: .planning/STATE.md][VERIFIED: .planning/ROADMAP.md] | Type metadata can now be derived from explicit syntax instead of regex heuristics. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts] |
| Type enhancement only for `.ts`/`.tsx` through `TypeScriptTypeEnhancer` | Shared top-level `typeInfo` contract for both TS and Python | Python parity is the locked Phase 69 goal. [VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] | Downstream graph readers can stay format-stable. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| Silent best-effort guesses are tempting in docstring parsing | Fail-soft on ambiguity, enrich only explicit high-confidence fields | Locked in Phase 69 context on 2026-05-09. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] | Reduces false graph truth at the cost of lower initial coverage, which is the correct tradeoff here. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |

**Deprecated/outdated:**
- Reopening parser routing, fallback semantics, or broader contract cleanup inside Phase 69 is outdated for this milestone and explicitly deferred to Phase 71. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md][VERIFIED: .planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A Python subprocess plus third-party Python docstring tooling is a realistic alternative implementation path. [ASSUMED] | Standard Stack / Alternatives Considered | Could waste planning time on a path the repo should reject immediately. |
| A2 | Merge-precedence bugs are likely if annotation-vs-docstring ordering is not explicitly specified. [ASSUMED] | Common Pitfalls | Could miss a regression source until late tests are written. |
| A3 | Unanchored regex matching over free-text docstrings is the most likely source of false positives. [ASSUMED] | Common Pitfalls | Could under-specify guardrails around parser implementation. |

## Open Questions (RESOLVED)

1. **RESOLVED — Where should the minimal `typeInfo` propagation seam live?**
   - What we know: Registry parse results currently omit `typeInfo`, legacy parse results include it, and analyzer output only persists legacy `result.typeInfo`. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/parser/interfaces/IParser.ts][VERIFIED: src/core/analyzer.ts]
   - Final decision: Add optional `typeInfo` directly to the registry `ParseResult`, then explicitly forward it through both `toLegacyParseResult()` and `convertRegistryResultToLegacyResult()`. [RESOLVED from D-01, D-02, D-03, D-05 in .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
   - Rationale: This is still the narrowest seam that preserves the existing TS-compatible top-level contract without reopening parser cleanup scope or inventing a Python-only side channel. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md][VERIFIED: .planning/phases/71-parser-legacy-cleanup/71-CONTEXT.md]

2. **RESOLVED — What exact symbol slot should receive class-attribute backfill?**
   - What we know: `ModuleSymbol` already supports `members`, `type`, and `signature`, while current Python class symbols only populate `extends` and decorators. [VERIFIED: src/interface/types/index.ts][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
   - Final decision: Backfill explicit high-confidence class attributes into `members[]` on the owning class symbol, while keeping top-level `result.typeInfo` as the authoritative aggregate store. Do not create extra pseudo-symbols in Phase 69. [RESOLVED from D-04, D-05, D-06 in .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
   - Rationale: `members[]` matches the existing class/type-definition shape, satisfies the locked “symbol + 顶层汇总” decision, and avoids expanding scope into symbol-model redesign. [VERIFIED: src/interface/types/index.ts][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Analyzer, parser, tests | ✓ [VERIFIED: local runtime] | `v24.14.0` [VERIFIED: local runtime] | — |
| npm | Package/version verification and test scripts | ✓ [VERIFIED: local runtime] | `11.9.0` [VERIFIED: local runtime] | — |
| Python 3 | Fixture sanity checks and any optional docstring comparison experiments | ✓ [VERIFIED: local runtime] | `3.12.3` [VERIFIED: local runtime] | Not required for the recommended implementation path. [VERIFIED: local runtime] |
| git | Dirty-worktree awareness and optional commit step | ✓ [VERIFIED: local runtime] | `2.43.0` [VERIFIED: local runtime] | — |

**Missing dependencies with no fallback:**
- None for the recommended implementation path. [VERIFIED: local runtime][VERIFIED: package.json]

**Missing dependencies with fallback:**
- None. [VERIFIED: local runtime]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `1.1.0` in repo; latest npm `4.1.5` verified separately. [VERIFIED: package.json][VERIFIED: npm registry] |
| Config file | `vitest.config.ts` and `vitest.e2e.config.ts`. [VERIFIED: vitest.config.ts][VERIFIED: vitest.e2e.config.ts] |
| Quick run command | `rtk ./node_modules/.bin/vitest run src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/core/__tests__/analyzer.test.ts` [VERIFIED: package.json][VERIFIED: docs/rules/validation.md] |
| Full suite command | `rtk npm test` [VERIFIED: package.json][VERIFIED: docs/rules/validation.md] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PY-05 | Google/NumPy/Sphinx docstring fields and PEP 484 annotations enrich parameter/return/class-attribute types. [VERIFIED: .planning/REQUIREMENTS.md] | unit | `rtk ./node_modules/.bin/vitest run src/parser/enhancers/__tests__/PythonTypeEnhancer.test.ts` [VERIFIED: package.json] | ❌ Wave 0 file to be created by Phase 69 plan 01. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-01-PLAN.md] |
| PY-06 | Enriched `typeInfo` reaches analyzer/module output as the current graph truth surface in the same top-level shape used by TS. [VERIFIED: .planning/REQUIREMENTS.md] | integration | `rtk ./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts` [VERIFIED: package.json] | ✅ existing analyzer test file; needs Python-focused same-source A/B case. [VERIFIED: src/core/__tests__/analyzer.test.ts] |

### Sampling Rate

- **Per task commit:** `rtk ./node_modules/.bin/vitest run src/parser/enhancers/__tests__/PythonTypeEnhancer.test.ts src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts src/core/__tests__/analyzer.test.ts`
- **Per wave merge:** `rtk npm test`
- **Phase gate:** `rtk npm run typecheck` → `rtk npm run lint` → `rtk npm test` before `$gsd-verify-work`. [VERIFIED: docs/rules/validation.md][VERIFIED: package.json]

### Wave 0 Gaps

- [ ] Add at least one fixture-backed analyzer test that compares the same Python file with and without docstring enhancement and asserts richer graph/output `typeInfo`. [VERIFIED: .planning/ROADMAP.md][VERIFIED: src/core/__tests__/analyzer.test.ts]
- [ ] Add an analyzer-level assertion that `module.typeInfo` is populated for `.py` input after enhancement and treated as the current graph truth surface, not just symbol signatures. [VERIFIED: src/core/analyzer.ts][VERIFIED: src/core/__tests__/analyzer.test.ts]
- [ ] Add an ambiguity/fail-soft test proving unsupported docstring prose does not emit guessed types. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Not relevant to an internal parser/enhancer phase. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| V3 Session Management | no | Not relevant to an internal parser/enhancer phase. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| V4 Access Control | no | Not relevant to an internal parser/enhancer phase. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| V5 Input Validation | yes | Bounded line-oriented parsing, explicit field prefixes, and fail-soft behavior on malformed or ambiguous docstrings. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md][CITED: https://google.github.io/styleguide/pyguide.html][CITED: https://numpydoc.readthedocs.io/en/latest/format.html][CITED: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html] |
| V6 Cryptography | no | No cryptographic operation is required in this phase. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Catastrophic regex or pathological scan time on large docstrings | Denial of Service | Keep regexes anchored per line, avoid nested catastrophic patterns, and parse only known blocks. [ASSUMED][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| False graph truth from ambiguous prose | Tampering | Fail soft and only emit types from explicit annotations or style-defined fields. [VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md] |
| Untrusted type strings polluting downstream displays | Tampering | Normalize to plain strings, keep them as metadata, and avoid executing or evaluating parsed type text. [ASSUMED] |

## Sources

### Primary (HIGH confidence)
- `src/parser/enhancers/TypeScriptTypeEnhancer.ts` - current post-parse enhancer seam and top-level `typeInfo` contract. [VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts]
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` - existing Python AST/signature extraction that Phase 69 should reuse. [VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts]
- `src/parser/interfaces/IParser.ts` and `src/interface/types/parser.ts` - current legacy-vs-registry result-shape mismatch around `typeInfo`. [VERIFIED: src/parser/interfaces/IParser.ts][VERIFIED: src/interface/types/parser.ts]
- `src/core/analyzer.ts` - analyzer/module conversion path that determines whether enrichment reaches graph truth. [VERIFIED: src/core/analyzer.ts]
- https://peps.python.org/pep-0484/ - PEP 484 annotation semantics and `Optional` / `Union` guidance. [CITED: https://peps.python.org/pep-0484/]
- https://docs.python.org/3/library/typing.html - current Python typing docs for union expressions and optional types. [CITED: https://docs.python.org/3/library/typing.html]
- https://google.github.io/styleguide/pyguide.html - Google style docstring fields. [CITED: https://google.github.io/styleguide/pyguide.html]
- https://numpydoc.readthedocs.io/en/latest/format.html - NumPy docstring section structure. [CITED: https://numpydoc.readthedocs.io/en/latest/format.html]
- https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html - Sphinx `:param:` / `:type:` / `:returns:` / `:rtype:` field lists. [CITED: https://www.sphinx-doc.org/en/master/usage/restructuredtext/domains.html]

### Secondary (MEDIUM confidence)
- `npm view` / `npm search` results for `tree-sitter`, `tree-sitter-python`, `web-tree-sitter`, `vitest`, `typescript`, `zod`, and candidate alternatives such as `pyright`. [VERIFIED: npm registry][VERIFIED: npm search]

### Tertiary (LOW confidence)
- None beyond items explicitly marked `[ASSUMED]`. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - core repo/runtime facts and package versions are verified, but the “no external docstring parser is worth adding” conclusion depends on current ecosystem search rather than a formal benchmark. [VERIFIED: package.json][VERIFIED: npm search][VERIFIED: npm registry]
- Architecture: HIGH - the current TS seam, Python parser behavior, and analyzer propagation gap are directly visible in repository code and locked phase context. [VERIFIED: src/parser/enhancers/TypeScriptTypeEnhancer.ts][VERIFIED: src/infrastructure/parser/implementations/PythonTreeSitterParser.ts][VERIFIED: src/core/analyzer.ts][VERIFIED: .planning/phases/69-pythontypeenhancer/69-CONTEXT.md]
- Pitfalls: MEDIUM - the contract-drop pitfall is directly verified in code, while some parser-failure modes are still informed by engineering judgment. [VERIFIED: src/interface/types/parser.ts][VERIFIED: src/parser/interfaces/IParser.ts][ASSUMED]

**Research date:** 2026-05-09
**Valid until:** 2026-06-08 for repo-internal code facts; 2026-05-16 for package-version and ecosystem-search conclusions
