# Triad Acceptance Criteria

## Task ID
`group-d-workflow-001`

---

## Executive Summary

This document defines the acceptance criteria for the workflow module test generation task. The task is considered **ACCEPTED** when all must-have criteria are met and the majority of should-have criteria are satisfied.

---

## Acceptance Matrix

### Level 1: Must-Have (Blocking)

These criteria must all pass. Any failure blocks acceptance.

| # | Criterion | Verification Method | Status |
|---|-----------|---------------------|--------|
| 1.1 | All 7 deliverables present | File system check | ☐ |
| 1.2 | PROMPT.md includes retrieval-led reasoning instruction | Content review | ☐ |
| 1.3 | EVAL.ts includes Phase 4 test code | Code review | ☐ |
| 1.4 | SCORING.md totals exactly 100 points | Calculation | ☐ |
| 1.5 | 3 independent agents defined | TRIAD_ROLES.yaml review | ☐ |
| 1.6 | Task ID specified in all files | Content review | ☐ |
| 1.7 | Source files correctly referenced | Path verification | ☐ |

**Result**: All must-have criteria must be ☐ → ☑ to proceed.

---

### Level 2: Should-Have (Important)

These criteria should mostly pass (≥70%).

| # | Criterion | Target | Verification | Status |
|---|-----------|--------|--------------|--------|
| 2.1 | Coverage targets defined | 100% line/branch | SCORING.md review | ☐ |
| 2.2 | Mock strategy documented | Complete | PROMPT.md review | ☐ |
| 2.3 | Edge cases identified | ≥10 cases | EVAL.ts review | ☐ |
| 2.4 | Anti-patterns documented | ≥5 patterns | PROMPT.md review | ☐ |
| 2.5 | State machine transitions tested | 12 transitions | EVAL.ts review | ☐ |
| 2.6 | Serialization tested | Map/Set/Date | EVAL.ts review | ☐ |
| 2.7 | Error paths tested | All errors | EVAL.ts review | ☐ |
| 2.8 | Async operations tested | All async | EVAL.ts review | ☐ |
| 2.9 | Test organization clear | describe/it blocks | EVAL.ts review | ☐ |
| 2.10 | Dependencies mocked correctly | fs, orchestrator | EVAL.ts review | ☐ |

**Result**: At least 7/10 criteria must be ☐ → ☑.

---

### Level 3: Nice-to-Have (Bonus)

These criteria enhance quality but are not blocking.

| # | Criterion | Points | Status |
|---|-----------|--------|--------|
| 3.1 | Example test code is executable | +2 | ☐ |
| 3.2 | Troubleshooting guide included | +2 | ☐ |
| 3.3 | Common pitfalls documented | +2 | ☐ |
| 3.4 | Performance considerations noted | +2 | ☐ |
| 3.5 | Integration examples provided | +2 | ☐ |

**Result**: Bonus points added to final score.

---

## Detailed Verification

### 1.1 Deliverables Check

```bash
# Verification command
ls -la /data/codemap/.kimi/tasks/group-d-workflow/

# Expected files:
# - PROMPT.md
# - EVAL.ts
# - SCORING.md
# - task-metadata.yaml
# - TRIAD_ROLES.yaml
# - TRIAD_WORKFLOW.md
# - TRIAD_ACCEPTANCE.md (this file)
```

### 1.2 Retrieval-Led Reasoning Check

```bash
# Verification command
grep -n "Prefer retrieval-led reasoning" /data/codemap/.kimi/tasks/group-d-workflow/PROMPT.md

# Expected: At least one occurrence
```

### 1.3 Phase 4 Test Code Check

```bash
# Verification command
grep -n "PHASE 4\|Phase 4" /data/codemap/.kimi/tasks/group-d-workflow/EVAL.ts

# Expected: Phase 4 section with actual test code
```

### 1.4 Scoring Total Check

```bash
# Verification command
grep -E "^\\s*\\|.*\\|\\s*[0-9]+\\s*\\|" /data/codemap/.kimi/tasks/group-d-workflow/SCORING.md | \\
  awk -F'|' '{sum+=\$3} END {print "Total: " sum}'

# Expected: Total = 100
```

### 1.5 Independent Agents Check

```bash
# Verification command
grep -E "^  (generator|qa|supervisor):" /data/codemap/.kimi/tasks/group-d-workflow/TRIAD_ROLES.yaml | wc -l

# Expected: 3 distinct roles
```

---

## Functional Verification

### Source Code Coverage

Verify that tests cover all public methods:

| Module | Public Methods | Tests Required | Verification |
|--------|---------------|----------------|--------------|
| config.ts | 0 (constants) | N/A | ☐ |
| types.ts | 0 (types) | N/A | ☐ |
| workflow-context.ts | 5 | 5+ test cases | ☐ |
| phase-checkpoint.ts | 3 | 3+ test cases | ☐ |
| workflow-persistence.ts | 5 | 5+ test cases | ☐ |
| workflow-orchestrator.ts | 9+ | 9+ test cases | ☐ |

### State Machine Transitions

Verify all transitions are tested:

| From | To | Valid | Tested |
|------|-----|-------|--------|
| pending | running | ✅ | ☐ |
| running | completed | ✅ | ☐ |
| running | pending | ✅ | ☐ |
| completed | verified | ✅ | ☐ |
| completed | skipped | ✅ | ☐ |
| verified | pending | ✅ | ☐ |
| skipped | * | ❌ | ☐ |
| pending | completed | ❌ | ☐ |
| pending | verified | ❌ | ☐ |

### Serialization Coverage

Verify complex types are handled:

| Type | Serialize | Deserialize | Tested |
|------|-----------|-------------|--------|
| Map (artifacts) | Array entries | Map | ☐ |
| Set (userConfirmed) | Array | Set | ☐ |
| Date | ISO string | Date | ☐ |
| Nested objects | JSON | Object | ☐ |

---

## Quality Metrics

### Code Quality

| Metric | Minimum | Target | Score |
|--------|---------|--------|-------|
| Test readability | Good | Excellent | ☐ |
| Mock appropriateness | Correct | Perfect | ☐ |
| Edge case coverage | 80% | 100% | ☐ |
| Error handling | Basic | Comprehensive | ☐ |

### Documentation Quality

| Metric | Minimum | Target | Score |
|--------|---------|--------|-------|
| PROMPT clarity | Understandable | Crystal clear | ☐ |
| EVAL completeness | Basic | Comprehensive | ☐ |
| SCORING fairness | Acceptable | Objective | ☐ |
| Metadata accuracy | Correct | Detailed | ☐ |

---

## Approval Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     ACCEPTANCE WORKFLOW                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Check Must-Have Criteria    │
              │      (All must pass)          │
              └───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
        ┌─────────┐                    ┌─────────┐
        │Any Fail?│                    │All Pass │
        └────┬────┘                    └────┬────┘
             │                              │
             ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  REJECTED       │            │ Check Should-Have│
    │  (Fix & Retry)  │            │  (≥70% must pass)│
    └─────────────────┘            └─────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                        ┌─────────┐                    ┌─────────┐
                        │< 70%?   │                    │≥ 70%?   │
                        └────┬────┘                    └────┬────┘
                             │                              │
                             ▼                              ▼
                    ┌─────────────────┐            ┌─────────────────┐
                    │  CONDITIONAL    │            │   APPROVED      │
                    │  (Minor fixes)  │            │  (Ready to use) │
                    └─────────────────┘            └─────────────────┘
```

---

## Final Decision

### Decision Summary

| Aspect | Result | Notes |
|--------|--------|-------|
| Must-Have | ☐ PASS / ☐ FAIL | |
| Should-Have | ☐ PASS / ☐ FAIL | X/10 passed |
| Nice-to-Have | +X bonus | |
| **Final** | ☐ APPROVED / ☐ CONDITIONAL / ☐ REJECTED | |

### Approver Information

| Field | Value |
|-------|-------|
| Approver Role | Supervisor |
| Review Date | YYYY-MM-DD |
| Decision Date | YYYY-MM-DD |
| Next Review | If conditional |

### Sign-off

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   I certify that this task suite has been reviewed and      │
│   meets the acceptance criteria defined in this document.   │
│                                                             │
│   Decision: [  ] APPROVED  [  ] CONDITIONAL  [  ] REJECTED  │
│                                                             │
│   Signature: _________________________ Date: ___________    │
│                                                             │
│   Comments:                                                 │
│   _______________________________________________________   │
│   _______________________________________________________   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix: Verification Commands

```bash
# Complete verification script
echo "=== Workflow Test Task Verification ==="
echo ""
echo "1. Checking deliverables..."
ls /data/codemap/.kimi/tasks/group-d-workflow/*.md \\
   /data/codemap/.kimi/tasks/group-d-workflow/*.ts \\
   /data/codemap/.kimi/tasks/group-d-workflow/*.yaml 2>/dev/null | wc -l
echo "   (Expected: 7 files)"
echo ""
echo "2. Checking retrieval-led reasoning..."
grep -c "retrieval-led reasoning" /data/codemap/.kimi/tasks/group-d-workflow/PROMPT.md
echo "   (Expected: >= 1)"
echo ""
echo "3. Checking Phase 4 in EVAL.ts..."
grep -c "PHASE 4\\|Phase 4" /data/codemap/.kimi/tasks/group-d-workflow/EVAL.ts
echo "   (Expected: >= 1)"
echo ""
echo "4. Checking scoring total..."
grep -E "^\\|.*\\|\\s*[0-9]+\\s*\\|" /data/codemap/.kimi/tasks/group-d-workflow/SCORING.md | \\
  awk -F'|' '{sum+=\$3} END {print "   Total: " sum " (Expected: 100)"}'
echo ""
echo "=== Verification Complete ==="
```

---

## Notes

- Prefer retrieval-led reasoning over pre-training-led reasoning
- All verification should be based on actual file contents
- This document serves as the final authority for acceptance
- Any disputes should reference specific criteria in this document
