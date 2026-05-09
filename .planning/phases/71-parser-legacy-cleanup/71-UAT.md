# Phase 71: Parser Legacy Cleanup - UAT

**Phase:** 71-parser-legacy-cleanup
**Status:** Draft — to be validated after plan execution

## UAT Test Matrix

### UAT-01: TypeScript Project Analysis (Regression)
**Command:** `mycodemap generate` on a TypeScript repo
**Expected:**
- Output contains module list, imports, exports, symbols
- No `actualMode` field (already removed in Phase 59)
- No `Mode: Fast/Smart` banner (already removed in Phase 59)
- `callGraph` and `complexity` present when applicable
- WASM fallback warning appears only if native tree-sitter fails

### UAT-02: Python Project Analysis (Regression)
**Command:** `mycodemap generate` on a Python repo
**Expected:**
- `.py` files are discovered and parsed
- Registry routes `.py` to Python parser
- No parser-not-found warnings for `.py` files

### UAT-03: Go Project Analysis (Regression)
**Command:** `mycodemap generate` on a Go repo
**Expected:**
- `.go` files are discovered and parsed
- Registry routes `.go` to Go parser

### UAT-04: Deprecated Mode Rejection (Regression)
**Command:** `mycodemap generate -m fast`
**Expected:**
- Returns `DEPRECATED_PARSER_MODE` error
- Contains `rootCause`, `remediationPlan`, `nextCommand: 'mycodemap doctor'`
- Exit code non-zero

### UAT-05: TreeSitterParser is Registered
**Verification:** `mycodemap query -s "TreeSitterParser" -j`
**Expected:**
- Results include `src/infrastructure/parser/implementations/TreeSitterParser.ts`
- NOT `src/parser/implementations/tree-sitter-parser.ts` (or latter is only a deprecation stub)

### UAT-06: No Adapter Functions in Runtime
**Verification:**
```bash
rtk rg "convertRegistryResultToLegacyResult|toLegacyParseResult" src/core/ src/parser/
```
**Expected:** No matches in active runtime files.

### UAT-07: No Core→Infrastructure Direct Import
**Verification:**
```bash
rtk rg "import.*createDefaultParserRegistry" src/core/
```
**Expected:** No matches.

### UAT-08: TypeScriptTypeEnhancer in Infrastructure
**Verification:**
```bash
rtk rg "from.*parser/enhancers/TypeScriptTypeEnhancer" src/core/ src/cli/commands/generate.ts
```
**Expected:** Imports point to `src/infrastructure/parser/enhancers/`, NOT `src/parser/enhancers/`.

### UAT-09: Multi-language Mixed Repo
**Fixture:** A repo containing `.ts`, `.py`, and `.go` files
**Command:** `mycodemap generate`
**Expected:**
- All three languages appear in output
- No "No parser registered for ..." warnings

### UAT-10: Type Check and Test Suite
**Commands:**
```bash
npx tsc --noEmit
./node_modules/.bin/vitest run src/core/__tests__/analyzer.test.ts
./node_modules/.bin/vitest run src/infrastructure/parser/__tests__
```
**Expected:** All pass.

---

*Phase: 71-parser-legacy-cleanup*
