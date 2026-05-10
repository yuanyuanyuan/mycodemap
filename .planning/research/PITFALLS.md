# Pitfalls Research: agent-metrics

**Domain:** CodeMap v2.7 agent-effectiveness-validation
**Researched:** 2026-05-10
**Confidence:** MEDIUM-HIGH (token estimation heuristics are inherently approximate; git history extraction quality is project-dependent)

## Summary

Adding `codemap agent-metrics` to an existing CLI infrastructure introduces a category of pitfalls that differ from the parser/graph work in v2.3-v2.5. The core risk is not implementation complexity -- the features are straightforward CLI commands. The risk is **misleading numbers that create false confidence or drive wrong decisions**. Token estimation, git history extraction, and CI threshold tuning are all areas where "the command runs and produces output" does not mean "the output is trustworthy."

The second major risk is scope creep. The ideation doc already catalogued ideas like A/B harnesses, behavioral telemetry, and adoption decay monitoring. These are genuinely valuable but explicitly out of scope for v2.7. The pitfall is that the infrastructure built in v2.7 naturally invites these extensions, and developers may silently expand scope while implementing what appears to be a small feature.

## Critical Pitfalls

### Pitfall 1: Token Estimation Accuracy Creates False Precision

**What goes wrong:** The 4 chars/token heuristic is a rough average that varies significantly across content types. JSON structural characters (`{}[]:,`) tokenize differently than natural language. Code tokens (identifiers, operators) have different char/token ratios than prose. The command produces numbers like "3,847 tokens" that look precise but could be off by 30-50%. Users treat these as ground truth and set CI thresholds based on them.

**Why it happens:** The requirements doc says "约 4 chars/token" and "不要求精确到个位 token," but once a number appears in a formatted table or JSON output, the precision illusion is automatic. Nobody reads the disclaimer; they read the number.

**Consequences:**
- CI gates based on inaccurate token counts create false positives (blocking good changes) or false negatives (missing real regressions)
- Developers optimize for the heuristic rather than actual token cost
- Trust in the entire agent-metrics system erodes if the numbers are obviously wrong on inspection

**Prevention:**
- Always display the estimation method alongside the number: "3,847 tokens (est. 4 chars/token)"
- Add a `--chars-only` mode that reports raw character counts without token conversion, so users can apply their own conversion
- In JSON output, include both `estimatedTokens` and `rawCharCount` fields
- Document the estimation accuracy range in the command help text
- Consider calibrating against a known tokenizer (e.g., tiktoken) for a small sample to establish project-specific conversion factors

**Detection:** If users start asking "why does this number not match what my LLM provider reports," the heuristic needs recalibration.

**Phase:** Should be addressed in the first implementation phase (token command), not deferred.

---

### Pitfall 2: Git History Extraction Produces Noisy or Unrepresentative Scenarios

**What goes wrong:** The ideation doc proposes extracting query scenarios from git history (commit message pattern -> query type mapping). In practice, git history is messy: merge commits have generic messages, squash commits lose granularity, conventional commit prefixes are inconsistent, and many commits don't map cleanly to CodeMap query types. The extracted scenarios end up being either too few (narrow coverage) or too noisy (many false mappings).

**Why it happens:** Real git history is not curated for scenario extraction. Unlike SWE-bench which cherry-picks high-quality GitHub issues, automatic extraction from a single project's history has no quality filter.

**Consequences:**
- Token reports based on unrepresentative scenarios give misleading cost profiles
- The "query scenarios extracted from git history automatically" feature looks impressive but produces garbage-in-garbage-out results
- Users lose trust in the feature after seeing irrelevant scenarios

**Prevention:**
- Start with a small, manually verified set of scenario extraction patterns rather than attempting comprehensive automatic extraction
- Provide a `--scenarios-file` option so users can supply their own curated scenarios as a fallback
- Log which commits were matched and which were skipped, with reasons, so extraction quality is auditable
- Limit initial extraction to clearly identifiable patterns: commits with "refactor", "impact", "dependency", "caller" in messages
- Consider a `--dry-run` mode that shows extracted scenarios without running the analysis

**Detection:** If more than 30% of extracted scenarios are "unknown" or "general" type, the extraction patterns need refinement.

**Phase:** Should be addressed in the scenario extraction implementation phase. Do not ship automatic extraction without a manual fallback.

---

### Pitfall 3: CI Gate Threshold Tuning Becomes a Political Problem

**What goes wrong:** The `--max-tokens-per-query` threshold is set too low (everything fails, developers ignore the gate) or too high (nothing fails, the gate is meaningless). Finding the right threshold requires running the metrics on the actual codebase first, but the pressure to ship the CI gate feature leads to arbitrary default values.

**Why it happens:** Threshold setting requires empirical data from the target codebase. The requirements doc acknowledges this ("需要先跑一次 token report 看实际数据分布"), but there is a strong temptation to pick a "reasonable" default and ship it.

**Consequences:**
- Too low: CI fails on every PR, developers add `--no-verify` or skip the check entirely
- Too high: the gate never fires, providing false sense of security
- Wrong granularity: a single global threshold does not account for query-type variance (impact analysis naturally produces more tokens than find-callers)

**Prevention:**
- Ship `agent-metrics report` first without any CI gate. Collect baseline data.
- After 1-2 weeks of baseline data, set thresholds per query type, not globally
- Default threshold should be "warn only" (exit code 0 with warning), not "block" (non-zero exit)
- Provide `--threshold-mode warn|block` so CI can be configured progressively
- Document that initial thresholds are empirical and will be adjusted

**Detection:** If developers start bypassing the CI gate or if the gate never triggers in practice, the thresholds need adjustment.

**Phase:** CI gate (R11, R12) should be a separate phase from the token analysis command, with baseline collection in between.

---

### Pitfall 4: Scope Creep into A/B Testing or Behavioral Telemetry

**What goes wrong:** While implementing token metrics, the natural next thought is "we should also track whether the agent actually uses the results" or "let's compare against rg/grep." These are the exact features explicitly deferred in the requirements doc (no A/B harness, no behavioral classification, no adoption decay). But the infrastructure being built (scenario execution, JSON output, CI integration) makes these extensions feel trivially close.

**Why it happens:** The gap between "run a query and count tokens" and "run a query, count tokens, and also observe what the agent does next" is architecturally small but scope-wise enormous. The latter requires MCP gateway instrumentation, agent session tracking, and behavior classification heuristics -- all explicitly out of scope.

**Consequences:**
- Milestone timeline doubles
- Core token metrics get less attention because effort splits across multiple features
- Half-implemented behavioral features ship without proper data collection infrastructure
- v2.7 becomes v2.7 + v2.8 merged together

**Prevention:**
- Every implementation decision should be checked against the "Scope Boundaries" section of the requirements doc
- If a feature idea is not in R1-R14, it does not get code in v2.7
- JSON output schema should be designed with future extensibility in mind (include a `version` field and allow additional properties), but future features are not implemented
- Code review should explicitly flag any code that touches MCP gateway, agent session, or behavioral classification

**Detection:** If a PR adds files outside `src/cli/commands/agent-metrics/` and `src/cli/commands/__tests__/`, scope creep is likely.

**Phase:** N/A -- this is a continuous discipline requirement, not a phase-specific fix.

---

### Pitfall 5: Confusing Correlation with Causation in Token Trends

**What goes wrong:** The report shows "token cost for impact analysis increased 40% this month." The team assumes this is a regression and starts investigating parser changes. In reality, the increase is because the test codebase grew larger (more symbols to traverse), or because the scenarios extracted from git history changed (different commits in the recent window). The metric is directionally correct but causally misleading.

**Why it happens:** Token cost is a function of both the tool's output format AND the input codebase. Without controlling for codebase size/complexity changes, token trends conflate tool behavior with codebase evolution.

**Consequences:**
- False regression alarms waste developer time
- Real regressions get dismissed as "probably just codebase growth"
- The metric loses credibility as a regression signal

**Prevention:**
- Normalize token counts by relevant codebase metrics (e.g., tokens per symbol, tokens per file)
- Report both absolute and normalized trends
- Include codebase metadata (file count, symbol count) in each report run so trends can be contextualized
- When reporting trend changes, automatically note whether the codebase changed significantly between runs

**Detection:** If trend reports frequently trigger false alarms that are explained by "the codebase got bigger," normalization is needed.

**Phase:** Trend tracking and normalization should be part of the initial report implementation, not a follow-up.

---

## Moderate Pitfalls

### Pitfall 6: JSON Output Schema Drifts Across Versions

**What goes wrong:** The `--json` output schema changes between versions without versioning. CI pipelines that consume the JSON break silently or parse wrong fields.

**Prevention:**
- Include a `schemaVersion` field in all JSON output from day one
- Document schema changes in changelog
- Consider a `--schema` flag that outputs the JSON schema definition (consistent with existing CodeMap interface contract patterns)

---

### Pitfall 7: Query Scenario Extraction Does Not Cover Python

**What goes wrong:** The existing CodeMap query surfaces (`query`, `deps`, `cycles`, `complexity`, `impact`, `analyze`) are tested primarily against TypeScript. The git history extraction patterns are tuned for TS/JS commits. Python scenarios (which are increasingly important after v2.4) are underrepresented or missing entirely.

**Prevention:**
- Ensure scenario extraction patterns include Python-specific commit patterns (e.g., "type annotation", "docstring", "import refactor")
- Test the token analysis against Python files as well as TypeScript
- Document which languages the scenario extraction covers

---

### Pitfall 8: Heuristic Token Estimation Breaks on Edge Cases

**What goes wrong:** The 4 chars/token heuristic fails badly on:
- Very short responses (1-2 lines): estimation rounds poorly
- Unicode-heavy content (CJK comments, emoji in identifiers): char count inflates
- Minified or compressed output: char/token ratio diverges from prose
- Binary-adjacent content (base64, hashes): extreme char/token ratios

**Prevention:**
- Document known edge cases and their expected accuracy degradation
- Add a `--verbose` mode that shows the raw data alongside estimates
- Consider a minimum response size threshold below which token estimation is not reported

---

### Pitfall 9: Report Command Reimplements Existing Output Infrastructure

**What goes wrong:** The `agent-metrics report` command builds its own table formatting, JSON serialization, and progress reporting, duplicating what already exists in the CodeMap CLI output layer (`src/cli/output/index.js`, `resolveOutputMode`, `renderOutput`).

**Why it happens:** The benchmark command already uses custom table formatting (see `benchmark.ts` lines 169-198). The temptation is to follow that pattern rather than integrating with the shared output infrastructure.

**Prevention:**
- Use the existing `resolveOutputMode` / `renderOutput` infrastructure from `src/cli/output/`
- If the existing infrastructure cannot handle the report's table format, extend it rather than bypassing it
- Align with the AGENTS.md requirement that new CLI commands follow the interface contract pattern

---

### Pitfall 10: Token Cost Analysis Runs Too Slowly for CI

**What goes wrong:** The token analysis actually executes CodeMap queries against the codebase to measure response sizes. On large repos, this takes minutes. CI pipelines time out or developers skip the check.

**Prevention:**
- Cache query results between runs (hash of codebase state + query parameters)
- Provide a `--quick` mode that runs a subset of representative scenarios
- Set a reasonable default timeout and document it
- Consider measuring response sizes from cached/stored results rather than re-executing queries

---

## Minor Pitfalls

### Pitfall 11: Help Text Does Not Explain What "Token" Means in Context

**What goes wrong:** Users see "token" in the command name and assume it relates to authentication tokens or API tokens, not LLM token consumption.

**Prevention:** First line of `--help` should be explicit: "Analyze estimated LLM token cost of CodeMap query responses."

---

### Pitfall 12: Exit Code Semantics Are Ambiguous

**What goes wrong:** The CI gate returns non-zero on threshold exceed, but other errors (missing index, invalid scenarios) also return non-zero. CI pipelines cannot distinguish "threshold exceeded" from "command failed."

**Prevention:** Use distinct exit codes: 0 = pass, 1 = threshold exceeded, 2 = execution error. Document in help text.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Token estimation implementation | False precision from 4 chars/token heuristic | Always show raw chars alongside estimates; include estimation method in output |
| Git history scenario extraction | Noisy/unrepresentative scenarios from real git history | Start with manually verified patterns; provide --scenarios-file fallback |
| CI gate threshold tuning | Arbitrary thresholds that are too high or too low | Ship report first without gate; collect baseline; set per-query-type thresholds |
| Report command implementation | Reimplementing existing output infrastructure | Use shared resolveOutputMode/renderOutput from src/cli/output/ |
| JSON output design | Schema drift across versions | Include schemaVersion from day one; align with interface contract patterns |
| Scope discipline | Creep into A/B testing or behavioral telemetry | Check every decision against R1-R14 scope boundaries |

## Failure Scenarios Worth Verifying

| Scenario | Why It Must Be Tested |
|----------|------------------------|
| Token estimate for a known response is within 50% of actual tokenizer count | proves heuristic is usable, not random |
| Scenario extraction from a repo with few conventional commits degrades gracefully | proves fallback to --scenarios-file works |
| CI gate with --max-tokens-per-query correctly distinguishes threshold exceed from execution error | proves exit code semantics are correct |
| Report on a codebase with 0 Python files does not crash or produce misleading output | proves language coverage is handled |
| JSON output includes schemaVersion and rawCharCount fields | proves schema is future-proof from day one |
| Trend report shows normalized (per-symbol) cost alongside absolute cost | proves causation confusion is mitigated |

## Anti-Features to Explicitly Avoid

These are features that seem natural to add but are explicitly out of scope. If code for these appears in a PR, it should be flagged.

| Anti-Feature | Why It Seems Natural | Why It Must Wait |
|--------------|---------------------|------------------|
| Comparing CodeMap tokens vs rg/grep tokens | "We need a baseline!" | Information density differs; direct comparison is misleading per R3 |
| Agent behavior classification (accepted/re-queried/abandoned) | "We should know if the agent liked the result!" | Requires MCP gateway real-time data; CLI-only cannot do this |
| A/B test harness (with/without CodeMap) | "We need to prove CodeMap helps!" | Requires ground truth definition; too heavy for v2.7 |
| Adoption decay monitoring | "We should track if agents keep using CodeMap!" | Requires continuous MCP gateway collection |
| Precision-weighted cost model | "Token cost should account for accuracy!" | Needs real agent session data to calibrate |

## Sources

- [docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md](/data/codemap/docs/brainstorms/2026-05-10-agent-effectiveness-validation-requirements.md) -- requirements doc with scope boundaries
- [docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md](/data/codemap/docs/ideation/2026-05-10-agent-effectiveness-validation-ideation.md) -- ideation doc cataloguing deferred features
- [src/cli/commands/benchmark.ts](/data/codemap/src/cli/commands/benchmark.ts) -- existing benchmark command pattern (custom table formatting to avoid)
- [src/cli/commands/ci.ts](/data/codemap/src/cli/commands/ci.ts) -- existing CI gate patterns (exit code conventions)
- [src/cli/output/index.js](/data/codemap/src/cli/output/index.js) -- shared output infrastructure to reuse
- [AGENTS.md](/data/codemap/AGENTS.md) -- interface contract and CLI conventions

---

*Pitfall research for: v2.7 agent-effectiveness-validation*
*Researched: 2026-05-10*
