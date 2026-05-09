# Phase 68: Multi-language Parser Switching - Research

**Date:** 2026-05-09
**Phase:** 68-multi-language-parser-switching
**Status:** Complete

---

## Research Question

What is the safest way to deliver a shared multi-language Tree-sitter parser for TypeScript/JavaScript and Python, wire it into the real registry-backed main path, preserve Phase 67's strict Python grammar failure semantics, and avoid prematurely consuming Phase 71 cleanup scope?

---

## Executive Summary

Phase 68 should not be planned as a full parser-layer migration. The repository still has a transitional split between legacy `src/parser/` and infrastructure `src/infrastructure/parser/`, and Phase 71 already owns interface unification, adapter removal, and layer relocation. The best fit for Phase 68 is:

1. Extend the existing Tree-sitter grammar loader so it can provide both TypeScript and Python grammars.
2. Introduce a shared Tree-sitter capability that can switch grammar based on file extension and expose parse results for both TS/JS and Python.
3. Cut the registry-backed TS/JS main path over to that shared capability.
4. Preserve explicit Python grammar-missing errors; do not reintroduce silent regex fallback.
5. Update benchmark/tests/registry expectations so the shared parser is proven on the real path, not only in isolated tests.

This keeps Phase 68 capability-focused while leaving the heavy cleanup items (`ILanguageParser` unification, adapter deletion, Core → Infrastructure decoupling, legacy path removal) to Phase 71 exactly as intended.

---

## Locked Inputs from Prior Phases

### From Phase 59

- Registry-backed parsing is already the single active parser orchestration path in the runtime.
- `createParser()` and `analyzer.ts` still preserve compatibility through legacy adapters.
- `TypeScriptTypeEnhancer` is TS-only post-processing and should remain orthogonal to parser switching.

**Planning implication:** Phase 68 should build on the registry rather than inventing a parallel execution seam.

### From Phase 67

- `tree-sitter-python` is already installed and wired through `PythonTreeSitterParser`.
- Python grammar loading already supports native-first, WASM-fallback behavior.
- Python grammar unavailability is a strict explicit error, not silent regex fallback.
- `parserUsed` is already part of the registry-shaped `ParseResult`.

**Planning implication:** Phase 68 should reuse Python grammar-loading and AST extraction knowledge instead of rebuilding Python support from scratch.

### From Phase 71

- Phase 71 explicitly owns:
  - `ILanguageParser` unification as the single canonical interface
  - `convertRegistryResultToLegacyResult()` and `toLegacyParseResult()` removal
  - relocating `TreeSitterParser` into Infrastructure
  - Core layer decoupling from direct Infrastructure imports
  - moving `TypeScriptTypeEnhancer`

**Planning implication:** Phase 68 should avoid broad cleanup that would collapse into 71.

---

## Current Code Reality

### 1. The existing legacy `TreeSitterParser` is hardcoded to TypeScript

`src/parser/implementations/tree-sitter-parser.ts` currently:

- loads `loadTreeSitter()`
- immediately calls `this.parser.setLanguage(TypeScript.typescript)`
- reads file content internally from disk in `parseFile(filePath)`
- returns legacy `IParser`-shaped results (`path`, `type`, `stats`, etc.), not registry `ParseResult`

**Impact:** It cannot simply be dropped into the registry as-is for Python. It needs grammar switching and result-shape adaptation before it can serve as a shared capability.

### 2. The existing grammar loader only returns TypeScript

`src/parser/implementations/tree-sitter-loader.ts` currently returns:

- `Parser`
- `TypeScript`

It loads native `tree-sitter` + `tree-sitter-typescript`, or the WASM equivalents, but has no Python grammar in its return shape.

**Impact:** A shared multi-language parser needs a loader contract that can provide Python as well as TypeScript grammars.

### 3. Python AST capability already exists, but only in a Python-specific class

`src/infrastructure/parser/implementations/PythonTreeSitterParser.ts` already:

- handles native/WASM Python grammar loading
- enforces explicit failure when grammar is unavailable
- produces registry `ParseResult`
- covers decorators, async, nested definitions, multiline imports, `__all__`, inheritance

**Impact:** Phase 68 should reuse this behavior or its parsing logic instead of recreating Python AST extraction from zero.

### 4. TS/JS main path still uses regex parser

`src/infrastructure/parser/index.ts` currently registers:

- `new TypeScriptParser()`
- `new GoParser()`
- `new PythonTreeSitterParser()`

So the runtime today is hybrid in a different sense:

- TS/JS → regex `TypeScriptParser`
- Python → AST `PythonTreeSitterParser`
- Go → regex `GoParser`

**Impact:** Phase 68 is not complete unless `createDefaultParserRegistry()` changes the TS/JS default to the shared Tree-sitter capability.

### 5. Analyzer tests and benchmark code assume current TS parser identity

Examples:

- `src/core/__tests__/analyzer.test.ts` spies on `TypeScriptParser.prototype.parseFile`
- `src/infrastructure/parser/__tests__/ParserRegistry.test.ts` registers `TypeScriptParser` directly
- `src/infrastructure/parser/__tests__/TypeScriptParser.test.ts` encodes the current regex parser behavior
- `src/cli/commands/benchmark.ts` constructs `new TreeSitterParser({ rootDir: target, mode: 'fast' })`

**Impact:** The phase touches not just parser code, but also benchmark behavior, registry tests, and main-path regression tests.

---

## Candidate Implementation Strategies

### Option A: Directly generalize the legacy `TreeSitterParser` and register it

**Shape**

- Extend `loadTreeSitter()` to return Python grammar too.
- Refactor `src/parser/implementations/tree-sitter-parser.ts` so it:
  - chooses grammar by file extension
  - can parse TS/JS/Python
  - exposes enough hooks or wrapper behavior to serve registry-backed main path
- Update the registry to use it for TS/JS and Python.

**Pros**

- Closest to roadmap wording ("generalize the TreeSitterParser").
- Reuses the mature TS AST extraction already in that class.
- Keeps the shared capability concept explicit.

**Cons**

- The class still speaks legacy `IParser` shape, not `ILanguageParser`.
- Direct registry use would bleed Phase 71 cleanup work into Phase 68 unless wrapped carefully.
- Python AST extraction logic is currently elsewhere, so the class would need dispatch by language plus a second extraction family.

**Assessment**

Viable only if wrapped to avoid turning Phase 68 into full legacy/infrastructure migration.

### Option B: Create a shared Tree-sitter engine/helper and let registry-facing parsers delegate to it

**Shape**

- Extend `loadTreeSitter()` to return both grammars.
- Create a shared engine/helper that:
  - initializes the parser
  - selects language by extension
  - parses TS/JS/Python
  - exposes AST traversal helpers by language
- Update TS/JS and Python registry-facing parsers to delegate to this engine.

**Pros**

- Best matches the user’s "capability-first, migration-later" choice.
- Keeps registry-facing `ILanguageParser` contracts stable.
- Avoids prematurely moving files or deleting adapters.
- Makes it easier for Phase 71 to later consolidate/rehome the shared engine.

**Cons**

- The "same parser class" proof may need careful naming and testing so it does not look like disguised parallel parsers.
- Slightly more indirection than a brute-force rewrite.

**Assessment**

Best fit for the locked context.

### Option C: Replace `TypeScriptParser` with a new infrastructure `TreeSitterParser` immediately

**Shape**

- Add a new infrastructure `TreeSitterParser` extending `ParserBase`
- register it for TS/JS and Python
- begin infrastructure migration in 68

**Pros**

- Aligns with where the architecture is going.
- Makes Phase 71 smaller.

**Cons**

- Collides directly with Phase 71’s explicit scope.
- Pulls in `ILanguageParser` unification, relocation, and compatibility cleanup earlier than the user asked.

**Assessment**

Too broad for the chosen scope.

---

## Recommended Direction

**Recommendation: Option B**

Create a shared multi-language Tree-sitter capability beneath the registry-facing parsers and use it to cut the TS/JS main path over, while preserving current parser-layer boundaries.

Concretely, the plan should aim for:

1. **Loader generalization**
   - update `loadTreeSitter()` so it can load and return Python grammar alongside TypeScript
   - preserve native-first and WASM-fallback behavior

2. **Shared Tree-sitter capability**
   - add one shared engine/helper/class responsible for:
     - file-extension → grammar selection
     - parser lifecycle
     - language-aware AST dispatch
   - ensure one implementation can prove TS and Python parsing in tests

3. **Main-path cutover**
   - cut `createDefaultParserRegistry()` over so TS/JS defaults to the shared AST path instead of regex `TypeScriptParser`
   - preserve explicit Python grammar error semantics

4. **Compatibility containment**
   - keep legacy adapters and broader relocation work untouched
   - do not remove `TypeScriptParser` or `PythonParser` from the codebase unless they become dead-simple wrappers or explicit non-default fallbacks

---

## Specific Planning Constraints

### Constraint 1: Do not implement roadmap fallback literally

The roadmap still says Python should fallback to regex when grammar is unavailable, but the newer, user-approved Phase 67 and Phase 68 context explicitly override that.

**Planning rule:** every plan must preserve explicit Python failure, not auto-fallback.

### Constraint 2: The benchmark command is part of the blast radius

`src/cli/commands/benchmark.ts` constructs the legacy `TreeSitterParser` directly. If the shared capability changes constructor shape, parse API, or initialization semantics, benchmark must be updated in the same phase.

**Planning rule:** benchmark compatibility must be part of the implementation, not a later follow-up.

### Constraint 3: Existing tests encode current parser identity

Current tests assume:

- TS main path = `TypeScriptParser`
- Python AST path = `PythonTreeSitterParser`

Once TS/JS cuts over, these expectations must be rewritten around behavior and shared capability identity rather than old class names where appropriate.

**Planning rule:** include dedicated verification work; do not bury all regression proof inside implementation tasks.

### Constraint 4: Do not let Go get accidentally coupled

Go remains regex-based and out of scope for this phase.

**Planning rule:** shared Tree-sitter capability should target TS/JS/Python only; Go should remain untouched on the registry main path.

---

## Likely Files in Scope

### High-confidence implementation files

- `src/parser/implementations/tree-sitter-loader.ts`
- `src/parser/implementations/tree-sitter-parser.ts`
- `src/infrastructure/parser/index.ts`
- `src/infrastructure/parser/implementations/TypeScriptParser.ts`
- `src/infrastructure/parser/implementations/PythonTreeSitterParser.ts`
- `src/parser/index.ts`
- `src/core/analyzer.ts`
- `src/cli/commands/benchmark.ts`

### High-confidence verification files

- `src/infrastructure/parser/__tests__/ParserRegistry.test.ts`
- `src/infrastructure/parser/__tests__/TypeScriptParser.test.ts`
- `src/infrastructure/parser/__tests__/PythonTreeSitterParser.test.ts`
- `src/core/__tests__/analyzer.test.ts`
- possibly new shared-parser focused tests if existing test files become semantically misleading

### Low-confidence / maybe-touch files

- `src/cli/tree-sitter-check.ts` if diagnostics assume TS-only loader contract
- `src/interface/types/parser.ts` if additional parser metadata is required for shared identity proof

---

## Verification Recommendations

Plans should prove four things explicitly:

1. **Shared capability proof**
   - at least one test using the same shared parser implementation on both `.ts` and `.py`

2. **Registry cutover proof**
   - TS/JS files now resolve to the shared Tree-sitter path on the main runtime

3. **No-regression proof**
   - analyzer-level or parser-level tests show TS/JS parsing still returns imports/exports/symbols correctly

4. **Strict Python failure proof**
   - missing grammar still throws explicit error, not regex fallback

These should be separate acceptance criteria, not one broad "tests pass" statement.

---

## Risks

### R1. Scope bleed into Phase 71

If implementation starts deleting adapters or relocating parser layers, the phase will expand unnecessarily and destabilize future work.

**Mitigation:** keep compatibility shims in place; focus only on shared capability and registry cutover.

### R2. Shared parser identity vs. current class naming

The user wants "same parser class", but the current codebase is split across legacy and infrastructure seams.

**Mitigation:** plans should define an explicit shared capability and proof artifact, even if wrappers remain temporarily.

### R3. TS/JS regression hidden by tests that only assert shallow parsing

Switching from regex to Tree-sitter may change output shape or edge cases that current TS parser tests do not fully cover.

**Mitigation:** include analyzer-level verification and targeted AST behavior tests, not just class construction tests.

### R4. Benchmark path drift

Direct `new TreeSitterParser(...)` usage in benchmark can silently fall behind the main runtime path.

**Mitigation:** treat benchmark as part of the same cutover plan.

---

## Planning Recommendation

The phase likely wants **2 plans**:

1. **Shared capability + main-path cutover**
   - loader generalization
   - shared parser switching
   - registry TS/JS cutover
   - benchmark/runtime wiring

2. **Regression + proof**
   - registry/analyzer/parser tests
   - shared-class proof for `.ts` + `.py`
   - explicit strict-failure verification

This split keeps implementation and proof separate enough for clear verification without over-fragmenting the phase.

---

## Output

`68-RESEARCH.md` is ready for planner consumption.

## RESEARCH COMPLETE
