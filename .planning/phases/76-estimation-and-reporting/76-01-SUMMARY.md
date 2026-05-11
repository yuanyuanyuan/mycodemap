---
phase: 76-estimation-and-reporting
plan: 01
subsystem: cli
tags: [agent-metrics, reporting, json-contract, human-output, aggregation]

requires:
  - phase: 75-core-infrastructure-basic-token-analysis
    provides: persisted run/detail truth, token/report command family, and stable estimated-token fields
provides:
  - grouped query-type summaries in `agent-metrics` report output
  - summary-first human-readable report layout with grouped and raw-row sections
  - explicit `report` latest-run-only behavior distinct from bare root auto-run behavior
affects: [cli-surface, shared-output, interface-contract, report-aggregation]

tech-stack:
  added: []
  patterns: [read-time aggregation over persisted detail rows, summary-first terminal reporting, stable array-based contract enrichment]

key-files:
  created:
    - .planning/phases/76-estimation-and-reporting/76-RESEARCH.md
    - .planning/phases/76-estimation-and-reporting/76-01-PLAN.md
    - .planning/phases/76-estimation-and-reporting/76-01-SUMMARY.md
  modified:
    - src/orchestrator/agent-metrics-service.ts
    - src/orchestrator/__tests__/agent-metrics-service.test.ts
    - src/cli/commands/agent-metrics/index.ts
    - src/cli/commands/agent-metrics/human.ts
    - src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts
    - src/cli/interface-contract/commands/agent-metrics.ts

key-decisions:
  - "Grouped reporting truth stays in the service layer so human and JSON output reuse one aggregation path."
  - "Explicit `codemap agent-metrics report` no longer auto-runs measurement when no persisted run exists; bare `codemap agent-metrics` still may."
  - "Phase 76 stops grouped statistics at average + min/max and defers percentiles, trends, and thresholds."
  - "Grouped report summaries are exposed as an array schema (`queryTypeSummaries`) rather than dynamic object keys."

patterns-established:
  - "When a reporting phase enriches an existing JSON contract, keep legacy top-level fields stable and add first-class summary blocks incrementally."
  - "Command-path semantics that differ between explicit subcommands and bare-root convenience flows should be modeled as separate service calls, not renderer conditionals."

requirements-completed: [RPT-01, RPT-02, RPT-03]

completed: 2026-05-10
---

# Phase 76 Plan 01 Summary

**`codemap agent-metrics` report output now includes grouped query-type summaries, a summary-first human layout, and a strict split between explicit report mode and bare-root auto-run behavior**

## Accomplishments

- Extended `AgentMetricsService` so report results include `queryTypeSummaries` derived at read time from persisted Phase 75 detail rows.
- Added explicit latest-run-only report behavior through `requireLatestReport()`, while preserving bare `codemap agent-metrics` as the auto-run convenience path.
- Replaced the report-mode line dump with a summary-first human renderer that shows totals, grouped query-type statistics, and per-query rows in table form.
- Expanded the `agent-metrics` interface contract with a stable machine-readable grouped summary array.
- Tightened tests around grouped aggregation correctness, root/report command split, and explicit no-run error behavior.

## Verification

- `rtk ./node_modules/.bin/vitest run src/orchestrator/__tests__/agent-metrics-service.test.ts src/cli/commands/agent-metrics/__tests__/agent-metrics-command.test.ts`
- `rtk npm run typecheck`
- `rtk npm run build`
- `rtk node dist/cli/index.js agent-metrics report --json`
- `rtk node dist/cli/index.js agent-metrics --json`
- Failure path covered: `rtk node /data/codemap/dist/cli/index.js agent-metrics report --json` from `/tmp` now returns `AGENT_METRICS_REPORT_MISSING` with actionable remediation instead of silently creating a run
