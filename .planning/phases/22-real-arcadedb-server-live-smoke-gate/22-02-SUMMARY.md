---
phase: 22-real-arcadedb-server-live-smoke-gate
plan: 02
subsystem: "live-smoke-evidence-and-gate-decision"
tags: [arcadedb, smoke, evidence, gate, blocked]
requires:
  - phase: 22-01
    provides: live smoke runbook, gate rubric, minimal execution context
provides:
  - real execution evidence for the Phase 22 smoke attempt
  - blocked gate decision with explicit unlock rule for Phase 23
  - verification artifact that halts autonomous continuation on missing server reachability
affects: [phase-23, autonomous-routing]
tech-stack:
  added: []
  patterns: [blocked-is-valid, external-prereq-first, no-fake-pass]
key-files:
  created:
    - .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-LIVE-SMOKE-EVIDENCE.md
    - .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-RESULT.md
    - .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-VERIFICATION.md
  modified: []
key-decisions:
  - "Phase 22 gate result 固定为 blocked，因为当前缺的是 reachable server/provisioning path，而不是已经证明需要 public-surface change"
  - "Phase 23 在 Phase 22 gate 通过前保持锁定，不允许 benchmark / latency 叙事继续"
requirements-completed: [PROTO-01]
completed: 2026-03-30
---

# Phase 22-02 Summary

**Wave 2 已把 `Phase 22` 收口成真实阻断结论：脚本 contract 仍成立，但 live smoke 被外部 server 可达性与 Docker provisioning 问题卡住，因此 gate 被判为 `blocked`。**

## Accomplishments

- 新增 `22-LIVE-SMOKE-EVIDENCE.md`，把真实执行命令、脱敏 endpoint、auth mode、TLS mode 和阻断原因写实记录
- 新增 `22-GATE-RESULT.md`，明确 `Gate outcome: blocked` 与 `Phase 23 blocked`
- 新增 `22-VERIFICATION.md`，让 autonomous workflow 能读到 `gaps_found`，而不是因为缺少 verification artifact 直接崩掉

## Verification

- `node --check scripts/experiments/arcadedb-http-smoke.mjs`
- `node scripts/experiments/arcadedb-http-smoke.mjs --help`
- `ARCADEDB_HTTP_URL=http://127.0.0.1:2480 ARCADEDB_DATABASE=Imported ARCADEDB_USERNAME=root ARCADEDB_PASSWORD=<redacted> node scripts/experiments/arcadedb-http-smoke.mjs`
- `curl -sS -m 3 http://127.0.0.1:2480/`
- `rg -n "Live smoke command|Observed outcome|Failure reason|No shipped runtime/config changes were made during Phase 22 execution" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-LIVE-SMOKE-EVIDENCE.md`
- `rg -n "Gate outcome: (pass|blocked|fail)|Phase 23 blocked|No benchmark claims yet" .planning/phases/22-real-arcadedb-server-live-smoke-gate/22-GATE-RESULT.md`

## Decisions & Deviations

- 关键决策：把 Docker daemon 代理超时 + `ECONNREFUSED` 归类为外部前置条件阻断，因此结果是 `blocked` 而不是伪造 `pass`
- 偏差：未得到真实成功的 live smoke；这是本 phase 的真实结果，不再继续推进 `Phase 23`
