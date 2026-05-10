---
phase: 71
slug: parser-legacy-cleanup
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-10
---

# Phase 71 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

This audit was derived from implementation and verification artifacts because Phase 71 plans did not define a `<threat_model>` block and the summaries did not include a `Threat Flags` section.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| CLI composition root -> Core analyzer | Core must consume an injected parser registry and enhancers instead of constructing infrastructure internally | `AnalysisOptions.parserRegistry` and `typeEnhancers` -> `analyze()` |
| Legacy parser compatibility entry -> infrastructure parser stack | Deprecated external callers still traverse a compatibility wrapper that adds legacy fields around registry-native parse results | `RegistryParseResult` -> legacy-compatible parser output |
| Parser mode selection -> active parser runtime | Removed parser modes must fail closed instead of silently reviving deprecated flows | user-supplied `mode` -> parser selection / runtime entry |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-71-01 | Integrity | `src/core/analyzer.ts` wiring contract | mitigate | `analyze()` now requires `AnalysisOptions.parserRegistry`, and the composition root is the supported place to construct registry/enhancer dependencies | closed |
| T-71-02 | Tampering | legacy Tree-sitter implementation path | mitigate | Active TS/JS parsing moved to `src/infrastructure/parser/implementations/TreeSitterParser.ts`; the legacy `src/parser/implementations/tree-sitter-parser.ts` file was removed from the active codebase | closed |
| T-71-03 | Denial of service | deprecated parser mode selection | mitigate | Both active entrypoints reject deprecated parser modes with explicit errors instead of silently falling back to removed runtimes | closed |
| T-71-04 | Integrity | deprecated compatibility parser entry | accept | `src/parser/index.ts` still constructs registry/enhancer dependencies for external compatibility callers, but Core no longer depends on that path for the active runtime | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-71-01 | T-71-04 | Phase 71 intentionally preserves the deprecated parser compatibility entry for external callers; keeping that wrapper is a bounded backward-compatibility tradeoff rather than an active runtime control gap | Codex / phase security audit | 2026-05-10 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-10 | 4 | 4 | 0 | Codex / `$gsd-secure-phase 71` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-10
