---
date: 2026-05-10
topic: agent-effectiveness-validation
focus: 验证 mycodemap 工具已完成功能是否真正为 AI agent 产生了积极效果，需要数据指标支撑
mode: repo-grounded
---

# Ideation: CodeMap Agent 效果验证——如何证明工具真的有用

## Grounding Context

**Codebase:** CodeMap v2.0.0, TypeScript, CLI/MCP/HTTP API surfaces, architecture CLI→Server→Domain→Infrastructure→Interface.

**Key existing evidence:**
- Comprehensive test report (2026-03): 5-scenario comparison, 3.35/5 overall score, 60-300x slower than rg but near-zero false positives
- Agent dogfood report (2026-04-17): 6/10 agent-friendliness, controlled A/B showing 6+→1 calls for impact analysis
- Validation guardrails (Phase 40.1): real-world validation as hard constraint
- Ghost command detection (Phase 46): docs accuracy validation

**Critical gap:** No continuous effectiveness metrics, no automated validation pipeline, no agent feedback loop.

**External benchmarks:** SWE-bench, HumanEval, GitHub Copilot (55% speed improvement), METR (AI tools may slow senior devs by 19%), Anthropic tool design evaluation, LangSmith, SPACE framework.

## Topic Axes

1. Agent task completion efficiency
2. Token/call efficiency
3. Accuracy/precision
4. Agent behavior quality
5. Developer experience

## Ranked Ideas

### 1. Agent Task Completion A/B Harness

**Description:** Build a harness that runs identical agent prompts (find callers, assess impact, trace dependencies) against two conditions: CodeMap-enabled vs text-search-only. Measures task completion rate, time-to-solution, and answer correctness. Runs as CI gate on every release.

**Axis:** Agent task completion efficiency

**Basis:** `direct:` Dogfood report (2026-04-17) showed 6+→1 calls for impact analysis, but was one-time manual evaluation with no repeatable infrastructure. The grounding summary explicitly states "No continuous effectiveness metrics, no automated validation pipeline."

**Rationale:** This is the foundational validation question. Without A/B infrastructure, every claim about CodeMap's value remains a proxy metric. The actual question — "does the agent solve the task better with CodeMap?" — is unanswered. All other metrics (speed, accuracy, tokens) are intermediate proxies of this core question.

**Downsides:** Requires defining ground truth for agent tasks (non-trivial). Agent variability adds noise. Needs 2-3 weeks of dedicated effort.

**Confidence:** 90%

**Complexity:** High

**Status:** Unexplored

---

### 2. Zero-Touch Benchmark from Git History

**Description:** Mine the repo's git history for real impact analysis, dependency tracing, and refactoring commits. Replay those exact scenarios through CodeMap automatically. Every merged PR becomes a free test case with ground truth (the human did the work). Eliminates manual test scenario design entirely.

**Axis:** Accuracy/precision

**Basis:** `direct:` Phase 40.1 established real-world validation as hard constraint. `external:` SWE-bench uses this exact pattern — GitHub issues + merged PRs as ground truth for agent evaluation.

**Rationale:** Currently validation requires manually constructing scenarios. This eliminates that cost — every merged PR in every participating repo becomes a growing validation dataset with zero human effort. Compounds over time: more PRs = stronger signal.

**Downsides:** Git history quality varies; not all commits have clear "ground truth." Requires mapping commit types to CodeMap query types. Initial harness investment needed.

**Confidence:** 85%

**Complexity:** Medium

**Status:** Unexplored

---

### 3. Token Cost Accounting

**Description:** Tag each CodeMap response with estimated token cost (input + output). Compare against raw-text alternatives (rg, grep). Build per-query-type token baselines. Expose as `codemap benchmark --token-report` command. Enables agents to make informed tool-choice decisions.

**Axis:** Token/call efficiency

**Basis:** `direct:` Dogfood report showed 6+→1 call reduction but never measured total token consumption. A single CodeMap call returning 50KB JSON might cost 15K tokens vs 200 bytes from rg. `external:` GitHub Copilot research (55% speed improvement) and Anthropic tool design emphasize minimizing agent processing burden.

**Rationale:** Agents pay for tokens, not tool calls. The 6+→1 reduction is CodeMap's strongest claim, but if each response is 50x larger, token savings may be negated. This is the cheapest metric to implement (just count) and most directly actionable (maps to real cost).

**Downsides:** Token estimation is approximate. Response size varies by query and codebase. Doesn't capture downstream token savings (agent doesn't need to read files).

**Confidence:** 85%

**Complexity:** Low

**Status:** Unexplored

---

### 4. Ghost Feedback — Agent Behavior Telemetry

**Description:** Instrument the MCP gateway to log post-CodeMap agent behavior. Classify into: "accepted" (moved on), "re-queried" (response insufficient), "abandoned" (fell back to rg/grep). Requires no cooperation from agents — just server-side observation. Produces continuous effectiveness signal.

**Axis:** Agent behavior quality

**Basis:** `direct:` Grounding summary identifies "no agent feedback loop" as key gap. Phase 46 ghost command detection shows infrastructure for detecting unexpected tool usage patterns already exists. `external:` METR finding that "AI tools may slow senior devs by 19%" suggests adoption friction matters more than tool capability.

**Rationale:** The agent dogfood report was one-time manual evaluation. Without continuous behavioral telemetry, we cannot detect regressions (parser change makes output harder to parse), adoption drops (agents learn to avoid CodeMap), or feature-specific problems. This is the cheapest continuous signal — captured automatically during normal operation.

**Downsides:** Classification of "accepted" vs "abandoned" requires heuristics that may be noisy. Privacy considerations for logging agent behavior. Doesn't capture WHY behavior changed.

**Confidence:** 80%

**Complexity:** Low-Medium

**Status:** Unexplored

---

### 5. Agent-Perceived Latency vs Raw Latency

**Description:** Redefine the benchmark: instead of comparing CodeMap-WASM vs CodeMap-Native, compare CodeMap single-call total time vs equivalent multi-call raw-tool workflow total time. An agent waiting 2s for CodeMap that replaces 6 rg calls (200ms each = 1200ms total) has net latency reduction. Set thresholds based on agent-perceived delta.

**Axis:** Developer experience

**Basis:** `direct:` Benchmark command states "[WHY] Compare WASM vs Native performance to verify <1s startup penalty on 10K-file repos." The 2026-03 report found "CodeMap 60-300x slower than rg" — but this compares single-call latency without accounting for multi-call alternative workflow.

**Rationale:** Current benchmark creates a false optimization target. If we optimize WASM from 800ms to 400ms, that's 50% improvement on benchmark — but agents don't care because the alternative (6×200ms = 1200ms) is still slower. Agent-perceived latency reframes the metric to what actually matters for agent workflows.

**Downsides:** Defining "equivalent workflow" requires judgment. Different task types have different alternative workflows. May need per-query-type latency budgets.

**Confidence:** 80%

**Complexity:** Low

**Status:** Unexplored

---

### 6. Adoption Decay Monitoring

**Description:** Track, over time, what percentage of eligible agent queries use CodeMap vs raw-text alternatives (rg, grep). A declining adoption rate is the ultimate effectiveness signal — it means the tool is failing at its core mission. Report weekly. Compare against baseline.

**Axis:** Agent behavior quality

**Basis:** `external:` METR's finding that AI tools may slow senior devs by 19% implies adoption decay is a real phenomenon — tools that don't deliver value get abandoned. `direct:` Grounding summary notes "no continuous effectiveness metrics" and "no agent feedback loop."

**Rationale:** All other metrics (speed, accuracy, token cost) are intermediate proxies. Adoption rate is the ground truth. If agents stop using CodeMap, nothing else matters. Tracking adoption decay is the cheapest, most informative validation we can build — it's the "vital sign" of tool effectiveness.

**Downsides:** Requires instrumenting agent tool selection (may not be available in all environments). Defining "eligible queries" needs thought. Adoption may fluctuate for reasons unrelated to tool quality.

**Confidence:** 75%

**Complexity:** Low-Medium

**Status:** Unexplored

---

### 7. Precision-Weighted Cost Model

**Description:** Quantify the downstream cost of false positives and false negatives in CodeMap outputs. Formula: `cost = (fp_rate × wasted_action_cost) + (fn_rate × missed_issue_cost)`. Track across query types. Reveals which query types have asymmetric costs (missing a security dependency is worse than listing an unused one).

**Axis:** Accuracy/precision

**Basis:** `direct:` 2026-03 test report showed near-zero false positives but measured in isolation. Dogfood report's 6/10 agent-friendliness suggests accuracy alone doesn't guarantee usefulness. `external:` METR findings imply tool outputs must be high-signal to justify integration cost.

**Rationale:** Transforms accuracy from binary metric ("is it correct?") to economic one ("what does correctness cost?"). Once established, lets you set precision thresholds per feature type and make trade-off decisions objective. Reveals where to invest accuracy improvements for maximum impact.

**Downsides:** Requires estimating "wasted action cost" and "missed issue cost" (judgment-dependent). Needs real agent session data to calibrate. May oversimplify complex failure modes.

**Confidence:** 75%

**Complexity:** Medium

**Status:** Unexplored

---

## Cross-Cutting Combinations

### CC1: Behavioral Telemetry + Adoption Decay (Ideas 4 + 6)
Micro-level (per-call behavior) + macro-level (adoption trends) = complete agent trust picture. Telemetry shows WHAT agents do; adoption shows WHETHER they keep doing it.

### CC2: Zero-Touch Git History + A/B Harness (Ideas 1 + 2)
Git mining generates test cases automatically; A/B harness runs them with/without CodeMap = continuous validation from real usage with zero manual effort.

### CC3: Token Accounting + Agent-Perceived Latency (Ideas 3 + 5)
Token cost per response + total workflow time comparison = true efficiency picture. Both reframe "CodeMap is slow" into "CodeMap is efficient when measured correctly."

---

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1.2 | Dead Man's Switch | Overlaps with 1.1 (A/B harness); harder to implement, same insight |
| 1.3 | Production Shadow Tracing | Overlaps with 4 (Ghost Feedback); same telemetry, less structured |
| 1.4 | Agent-Native Validation Harness | Duplicate of 1.1 with different framing |
| 1.5 | Comparative A/B in Production | Duplicate of 1.1 at workflow level |
| 1.6 | Session Replay Infrastructure | Overlaps with 1.1; higher complexity for marginal gain |
| 1.8 | Pharmaceutical Clinical Trials | Same concept as 1.1, academic framing |
| 1.9 | Automated SWE-bench Pipeline | Same as 1.1, higher ambition not justified now |
| 1.10 | Open Benchmark Community | Too expensive for current stage; internal benchmarks sufficient |
| 2.3 | Automated Token-Per-Insight | Duplicate of 3 (Token Cost Accounting) |
| 2.4 | Token-Efficiency First-Class | Duplicate of 3 |
| 2.5 | Token Delta Tracking | Duplicate of 3 + 2.2 combined |
| 2.6 | Sports Biomechanics | Too academic; actionable metric is token cost (covered by 3) |
| 2.7 | Sharpe Ratio | Interesting reframing but overlaps with 7 (Precision-Weighted Cost) |
| 2.8 | Token Budget Pressure Test | Duplicate of 2.2 (Call Collapse) + 3 (Token Accounting) |
| 3.4 | "Fool the Agent" Adversarial | Overlaps with 3.5; 3.3 (Git History) more pragmatic |
| 3.5 | Red-Team Adversarial | Overlaps with 3.3 (Git History); git history provides real adversarial cases |
| 3.6 | Regression Canary | Overlaps with 3.3 (Git History); git mining is more comprehensive |
| 3.8 | Cross-Codebase Generalization | Good but lower priority than 3.3; can be added later |
| 4.3 | Behavioral Fingerprinting | Overlaps with 4 (Ghost Feedback); same signal, more complex |
| 4.4 | Agent-as-Judge | Overlaps with 4 (Ghost Feedback); explicit feedback less reliable than behavioral |
| 4.5 | Shadow-Mode Effect | Too complex for current stage; 4 (Ghost Feedback) captures similar signal |
| 4.6 | Measure What Don't Ask | Duplicate of 6 (Adoption Decay) |
| 4.7 | Override Signal | Overlaps with 4 (Ghost Feedback); override is one behavior class |
| 4.8 | Aviation Intervention Rate | Academic reframing of 4.7; same insight |
| 5.2 | Delete the Docs | Interesting but risky; 5 (Agent-Perceived Latency) more actionable |
| 5.3 | Single-User Instrumentation | Overlaps with 4 (Ghost Feedback); manual vs automated |
| 5.4 | Continuous Satisfaction Signal | Duplicate of 4 (Ghost Feedback) |
| 5.5 | Latency Budget | Good CI gate but subset of 5 (Agent-Perceived Latency) |
| 5.6 | Learning Curve Analysis | Too academic; adoption decay (6) captures similar signal |
